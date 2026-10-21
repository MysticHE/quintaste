import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import path from 'node:path';
import { pool } from '../config.mjs';
import { allowed, restricted } from '../operations.mjs';
import { CommunityError, communityRouter, errors, member, text } from '../community/http.mjs';
import { publicId } from '../recipes/rules.mjs';
import { GeminiError } from './gemini.mjs';
import { engineReady } from './engine.mjs';
import { parseLink } from './video.mjs';
import { MAX_FILE_BYTES, VIDEO_TYPES } from './files.mjs';
import { UPLOAD_DIR } from './work.mjs';
import { parseUpload } from './pipeline.mjs';
import { normaliseTerm } from '../cook-search/terms.mjs';
import { AT_ONCE, DAILY_PER_MEMBER, MAX_VIDEO_SECONDS, RAN, dailyCap, jobsLastDay, planAccess, usedLastDay } from './limits.mjs';

/** Members queue AI recipe jobs here and watch them; guests see nothing. Three jobs a day per member for now. */
export const aiRecipes = communityRouter({ guests: true, bodyLimit: '8kb' });
const sha = value => createHash('sha256').update(value).digest('hex');
const view = row => {
  const upload = parseUpload(row.input);
  return { id: row.id, kind: row.kind, input: upload ? 'Uploaded video' : row.input, retryable: !upload && row.status === 'failed', status: row.status,
    message: row.message, createdAt: row.created_at, finishedAt: row.finished_at, recipeId: row.recipe_id ? publicId(row.recipe_id) : null };
};
/** Feature switches and account restriction; every job route runs this first, including the duplicate shortcut. */
async function available(me) {
  if (!await engineReady() || !await allowed('ai_recipes') || !await allowed('recipes')) throw new CommunityError(503, 'AI recipes are not available right now.');
  if (await restricted(me)) throw new CommunityError(403, 'Your account cannot use this right now.');
  if ((await planAccess(me)).needsPlan) throw new CommunityError(402, 'Choose a plan to get AI recipes.', 'PLAN_REQUIRED');
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
  const [mine, all, open, cap] = await Promise.all([
    usedLastDay(me),
    jobsLastDay(),
    pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND status IN ('queued','working')`, [me]),
    dailyCap(),
  ]);
  // The master account bypasses the per-member count, as for avatars; the global cap and two-at-a-time still apply.
  if (!(await planAccess(me)).unlimited && mine + pending >= DAILY_PER_MEMBER) throw new CommunityError(429, `You can start ${DAILY_PER_MEMBER} AI recipes a day. Try again tomorrow.`);
  if (all >= cap) throw new CommunityError(503, 'AI recipes are fully booked for today. Try again tomorrow.');
  if (open.rows[0].n + pending >= AT_ONCE) throw new CommunityError(429, 'Wait for your current AI recipes to finish first.');
}

/** Recipes a member started this Singapore calendar month (failed jobs and reused recipes do not count); the plans screen shows it. */
async function usedThisMonth(me) {
  return (await pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND status <> 'failed' AND ${RAN}
    AND created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'`, [me])).rows[0].n;
}
aiRecipes.get('/status', async (_req, res) => {
  // AI recipes publish into the member recipe feed, so the recipes control must be on as well.
  // `plan` is null until payments are connected (docs/COOK_DISCOVERY_PLAN.md §6). `needsPlan`: AI recipes are paid only,
  // so a member without a plan is sent to the plans screen. `fullToday` means everyone's daily total is used.
  const me = res.locals.user?.id ?? null;
  const [enabled, month, today, all, cap, access] = await Promise.all([
    (async () => await engineReady() && await allowed('ai_recipes') && await allowed('recipes'))(),
    me ? usedThisMonth(me) : 0, me ? usedLastDay(me) : 0, jobsLastDay(), dailyCap(), planAccess(me)]);
  res.json({ enabled, dailyPerMember: DAILY_PER_MEMBER, plan: null, needsPlan: access.needsPlan, usedThisMonth: month, usedToday: today, fullToday: all >= cap,
    limits: { videoMinutes: MAX_VIDEO_SECONDS / 60, videoMb: Math.round(MAX_FILE_BYTES / 1048576), atOnce: AT_ONCE } });
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
    // "Laksa for 2!" and "laksa" are the same dish, and match the wanted recipes made from Cook searches.
    else { input = text(req.body?.input, 300, { min: 3, field: 'Describe the dish' }); hash = sha(normaliseTerm(input) || input.toLowerCase().replace(/\s+/g, ' ')); }
  } catch (error) { if (error instanceof GeminiError) throw new CommunityError(error.status, error.message); throw error; }
  // A live recipe from the same video, or from the same dish asked for in the last 90 days, is reused instead of written again.
  // Reviewed jobs keep status "review" after staff publish, so a live recipe is what counts.
  const existing = (await pool.query(`SELECT j.recipe_id FROM recipes.ai_job j JOIN recipes.recipe r ON r.id=j.recipe_id
    WHERE j.input_hash=$1 AND j.status IN ('published','review') AND r.live IS NOT NULL AND r.hidden_at IS NULL
      AND ($2 = 'video' OR j.finished_at > now() - interval '90 days') ORDER BY j.finished_at DESC LIMIT 1`, [hash, kind])).rows[0];
  if (existing) {
    const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash, status, recipe_id, finished_at, message)
      VALUES ($1, $2, $3, $4, 'published', $5, now(), $6) RETURNING *`,
      [me, kind, input, hash, existing.recipe_id, kind === 'video' ? 'Someone already imported this video.' : 'We already have this recipe.'])).rows[0];
    return res.status(201).json(view(row));
  }
  const row = await exclusive(me, async () => {
    await withinQuota(me);
    return (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash) VALUES ($1, $2, $3, $4) RETURNING *`, [me, kind, input, hash])).rows[0];
  });
  res.status(201).json(view(row));
});

/**
 * A video file from the member's phone (for TikTok, Instagram and YouTube, which block servers). The body is the raw
 * video, saved to the app's disk with its length enforced; `source` is an optional original link for credit.
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

const EXTENSIONS = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp', 'video/x-matroska': 'mkv' };
/** Saves the body to the app's disk for the worker (it reads the video and takes step photos from it), then records the job. */
async function finishUpload(req, res, me, { mimeType, size, link }) {
  const ext = EXTENSIONS[mimeType];
  if (!ext) throw new CommunityError(415, 'Pick an MP4, MOV, WebM or 3GP video.');
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = randomUUID() + '.' + ext, file = path.join(UPLOAD_DIR, name);
  const digest = createHash('sha256');
  const out = createWriteStream(file, { flags: 'wx', mode: 0o600 });
  let received = 0, kept = false;
  try {
    for await (const chunk of req) {
      received += chunk.length;
      if (received > size) throw new CommunityError(400, 'The upload was larger than it said. Try again.');
      digest.update(chunk);
      if (!out.write(chunk)) await once(out, 'drain');
    }
    if (received !== size) throw new CommunityError(400, 'The upload was cut short. Try again.');
    out.end();
    await finished(out);
    const hash = sha(digest.digest('hex') + (link ?? ''));
    const existing = (await pool.query(`SELECT j.recipe_id FROM recipes.ai_job j JOIN recipes.recipe r ON r.id=j.recipe_id
      WHERE j.input_hash=$1 AND j.status='published' AND r.live IS NOT NULL AND r.hidden_at IS NULL ORDER BY j.finished_at DESC LIMIT 1`, [hash])).rows[0];
    const input = 'upload local/' + name + ' ' + mimeType + (link ? ' ' + link : '');
    if (existing) {
      const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash, status, recipe_id, finished_at, message)
        VALUES ($1, 'video', $2, $3, 'published', $4, now(), 'This video was already imported.') RETURNING *`, [me, input, hash, existing.recipe_id])).rows[0];
      return res.status(201).json(view(row));
    }
    const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash) VALUES ($1, 'video', $2, $3) RETURNING *`, [me, input, hash])).rows[0];
    kept = true;
    res.status(201).json(view(row));
  } catch (error) {
    out.destroy();
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(400, 'The upload did not finish. Try again.');
  } finally {
    if (!kept) await rm(file, { force: true }).catch(() => {});
  }
}

aiRecipes.use(errors);
