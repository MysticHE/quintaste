import { createHash } from 'node:crypto';
import { pool } from '../config.mjs';
import { allowed, restricted } from '../operations.mjs';
import { CommunityError, communityRouter, errors, member, text } from '../community/http.mjs';
import { publicId } from '../recipes/rules.mjs';
import { GeminiError, geminiConfig } from './gemini.mjs';
import { parseLink } from './video.mjs';
import { MAX_FILE_BYTES, VIDEO_TYPES, deleteFile, storeFile } from './files.mjs';
import { parseUpload } from './pipeline.mjs';

/** Members queue AI recipe jobs here and watch them; guests see nothing. Three jobs a day per member for now. */
export const aiRecipes = communityRouter({ guests: true, bodyLimit: '8kb' });
export const DAILY_PER_MEMBER = 3;
const sha = value => createHash('sha256').update(value).digest('hex');

async function dailyCap() {
  const row = (await pool.query("SELECT notice FROM ops.control WHERE key='ai_recipes'")).rows[0];
  const cap = /daily=(\d+)/.exec(row?.notice ?? '')?.[1];
  return cap ? Number(cap) : 500;
}
const view = row => {
  const upload = parseUpload(row.input);
  return { id: row.id, kind: row.kind, input: upload ? 'Uploaded video' : row.input, retryable: !upload && row.status === 'failed', status: row.status,
    message: row.message, createdAt: row.created_at, finishedAt: row.finished_at, recipeId: row.recipe_id ? publicId(row.recipe_id) : null };
};
/** Feature switches and account restriction; every job route runs this first, including the duplicate shortcut. */
async function available(me) {
  if (!(await geminiConfig()).enabled || !await allowed('ai_recipes') || !await allowed('recipes')) throw new CommunityError(503, 'AI recipes are not available right now.');
  if (await restricted(me)) throw new CommunityError(403, 'Your account cannot use this right now.');
}
/** Uploads in flight per member: they hold a quota slot before their job row exists (one app process). */
const uploading = new Map();
const chains = new Map();
/** Runs `work` for one member at a time, so the quota check and the job insert (or upload reservation) cannot interleave. */
async function exclusive(me, work) {
  const previous = chains.get(me) ?? Promise.resolve();
  /** @type {(value?: unknown) => void} */
  let release = () => {};
  const turn = new Promise(resolve => { release = resolve; });
  const tail = previous.then(() => turn);
  chains.set(me, tail);
  await previous;
  try { return await work(); }
  finally { release(); if (chains.get(me) === tail) chains.delete(me); }
}
/** Daily and concurrent quota for a member, counting uploads still in flight; call inside exclusive(). */
async function withinQuota(me) {
  const pending = uploading.get(me) ?? 0;
  const [mine, all, open] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND created_at > now() - interval '1 day' AND status <> 'failed'`, [me]),
    pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE created_at > now() - interval '1 day'`),
    pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND status IN ('queued','working')`, [me]),
  ]);
  if (mine.rows[0].n + pending >= DAILY_PER_MEMBER) throw new CommunityError(429, `You can start ${DAILY_PER_MEMBER} AI recipes a day. Try again tomorrow.`);
  if (all.rows[0].n >= await dailyCap()) throw new CommunityError(503, 'AI recipes are fully booked for today. Try again tomorrow.');
  if (open.rows[0].n + pending >= 2) throw new CommunityError(429, 'Wait for your current AI recipes to finish first.');
}

aiRecipes.get('/status', async (_req, res) => {
  // AI recipes publish into the member recipe feed, so the recipes control must be on as well.
  res.json({ enabled: (await geminiConfig()).enabled && await allowed('ai_recipes') && await allowed('recipes'), dailyPerMember: DAILY_PER_MEMBER });
});

aiRecipes.get('/mine', member, async (_req, res) => {
  const rows = (await pool.query(`SELECT * FROM recipes.ai_job WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [res.locals.user.id])).rows;
  res.json({ items: rows.map(view) });
});

aiRecipes.post('/', member, async (req, res) => {
  const me = res.locals.user.id;
  await available(me);
  const kind = req.body?.kind === 'video' ? 'video' : req.body?.kind === 'request' ? 'request' : null;
  if (!kind) throw new CommunityError(400, 'Choose a video link or a dish request.');
  let input, hash;
  try {
    if (kind === 'video') { const link = parseLink(req.body?.input); input = link.canonical; hash = sha(input); }
    else { input = text(req.body?.input, 300, { min: 3, field: 'Describe the dish' }); hash = sha(input.toLowerCase().replace(/\s+/g, ' ')); }
  } catch (error) { if (error instanceof GeminiError) throw new CommunityError(error.status, error.message); throw error; }
  const existing = (await pool.query(`SELECT j.recipe_id FROM recipes.ai_job j JOIN recipes.recipe r ON r.id=j.recipe_id
    WHERE j.input_hash=$1 AND j.status='published' AND r.live IS NOT NULL AND r.hidden_at IS NULL ORDER BY j.finished_at DESC LIMIT 1`, [hash])).rows[0];
  if (existing && kind === 'video') {
    const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash, status, recipe_id, finished_at, message)
      VALUES ($1, $2, $3, $4, 'published', $5, now(), 'Someone already imported this video.') RETURNING *`, [me, kind, input, hash, existing.recipe_id])).rows[0];
    return res.status(201).json(view(row));
  }
  const row = await exclusive(me, async () => {
    await withinQuota(me);
    return (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash) VALUES ($1, $2, $3, $4) RETURNING *`, [me, kind, input, hash])).rows[0];
  });
  res.status(201).json(view(row));
});

/**
 * A video file from the member's phone (for TikTok and Instagram, which block servers). The body is the raw video,
 * streamed straight to Gemini file storage with its length enforced; `source` is an optional original link for credit.
 * The edge allows 63 MB on this path only (deploy/avatar.compose.yml).
 */
aiRecipes.post('/upload', member, async (req, res) => {
  const me = res.locals.user.id;
  const mimeType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  const size = Number(req.headers['content-length']);
  if (!VIDEO_TYPES.includes(mimeType)) throw new CommunityError(415, 'Pick a video file.');
  if (!Number.isInteger(size) || size <= 0) throw new CommunityError(411, 'The upload had no size. Try again.');
  if (size > MAX_FILE_BYTES) throw new CommunityError(413, 'Videos can be up to 60 MB. Trim it or pick a shorter clip.');
  let link = null;
  if (typeof req.query.source === 'string' && req.query.source.trim()) {
    try { link = parseLink(req.query.source).canonical; } catch (error) { if (error instanceof GeminiError) throw new CommunityError(400, error.message); throw error; }
  }
  await available(me);
  await exclusive(me, async () => { await withinQuota(me); uploading.set(me, (uploading.get(me) ?? 0) + 1); });
  try { await finishUpload(req, res, me, { mimeType, size, link }); }
  finally { const left = (uploading.get(me) ?? 1) - 1; if (left > 0) uploading.set(me, left); else uploading.delete(me); }
});

/** Streams the body to Gemini file storage, then records the job (or reuses an earlier recipe for the same video). */
async function finishUpload(req, res, me, { mimeType, size, link }) {
  const digest = createHash('sha256');
  let received = 0, bodyError = null;
  async function* body() {
    for await (const chunk of req) {
      received += chunk.length;
      if (received > size) throw (bodyError = new CommunityError(400, 'The upload was larger than it said. Try again.'));
      digest.update(chunk);
      yield chunk;
    }
    if (received !== size) throw (bodyError = new CommunityError(400, 'The upload was cut short. Try again.'));
  }
  let stored;
  // The fetch body wraps a generator error in its own TypeError; report the member's real problem instead.
  try { stored = await storeFile({ body: body(), size, mimeType, displayName: 'member-upload', wait: false }); }
  catch (error) {
    if (bodyError) throw bodyError;
    if (error instanceof GeminiError) throw new CommunityError(error.status >= 400 && error.status < 500 ? error.status : 502, error.message);
    throw error;
  }
  const hash = sha(digest.digest('hex') + (link ?? ''));
  const existing = (await pool.query(`SELECT j.recipe_id FROM recipes.ai_job j JOIN recipes.recipe r ON r.id=j.recipe_id
    WHERE j.input_hash=$1 AND j.status='published' AND r.live IS NOT NULL AND r.hidden_at IS NULL ORDER BY j.finished_at DESC LIMIT 1`, [hash])).rows[0];
  if (existing) {
    await deleteFile(stored.name);
    const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash, status, recipe_id, finished_at, message)
      VALUES ($1, 'video', $2, $3, 'published', $4, now(), 'This video was already imported.') RETURNING *`, [me, 'upload ' + stored.name + ' ' + stored.mimeType, hash, existing.recipe_id])).rows[0];
    return res.status(201).json(view(row));
  }
  const input = 'upload ' + stored.name + ' ' + stored.mimeType + (link ? ' ' + link : '');
  const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash) VALUES ($1, 'video', $2, $3) RETURNING *`, [me, input, hash])).rows[0];
  res.status(201).json(view(row));
}

aiRecipes.use(errors);
