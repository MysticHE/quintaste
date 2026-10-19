import { createHash } from 'node:crypto';
import { pool } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { CommunityError, communityRouter, errors, member, text } from '../community/http.mjs';
import { restricted } from '../operations.mjs';
import { publicId } from '../recipes/rules.mjs';
import { geminiConfig } from './gemini.mjs';
import { parseLink } from './video.mjs';
import { GeminiError } from './gemini.mjs';

/** Members queue AI recipe jobs here and watch them; guests see nothing. Three jobs a day per member for now. */
export const aiRecipes = communityRouter({ guests: true, bodyLimit: '8kb' });
export const DAILY_PER_MEMBER = 3;
const sha = value => createHash('sha256').update(value).digest('hex');

async function dailyCap() {
  const row = (await pool.query("SELECT notice FROM ops.control WHERE key='ai_recipes'")).rows[0];
  const cap = /daily=(\d+)/.exec(row?.notice ?? '')?.[1];
  return cap ? Number(cap) : 500;
}
const view = row => ({ id: row.id, kind: row.kind, input: row.input, status: row.status, message: row.message, createdAt: row.created_at,
  finishedAt: row.finished_at, recipeId: row.recipe_id ? publicId(row.recipe_id) : null });

aiRecipes.get('/status', async (_req, res) => {
  // AI recipes publish into the member recipe feed, so the recipes control must be on as well.
  res.json({ enabled: geminiConfig().enabled && await allowed('ai_recipes') && await allowed('recipes'), dailyPerMember: DAILY_PER_MEMBER });
});

aiRecipes.get('/mine', member, async (_req, res) => {
  const rows = (await pool.query(`SELECT * FROM recipes.ai_job WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [res.locals.user.id])).rows;
  res.json({ items: rows.map(view) });
});

aiRecipes.post('/', member, async (req, res) => {
  const me = res.locals.user.id;
  if (!geminiConfig().enabled || !await allowed('ai_recipes') || !await allowed('recipes')) throw new CommunityError(503, 'AI recipes are not available right now.');
  if (await restricted(me)) throw new CommunityError(403, 'Your account cannot use this right now.');
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
  const [mine, all] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND created_at > now() - interval '1 day' AND status <> 'failed'`, [me]),
    pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE created_at > now() - interval '1 day'`),
  ]);
  if (mine.rows[0].n >= DAILY_PER_MEMBER) throw new CommunityError(429, `You can start ${DAILY_PER_MEMBER} AI recipes a day. Try again tomorrow.`);
  if (all.rows[0].n >= await dailyCap()) throw new CommunityError(503, 'AI recipes are fully booked for today. Try again tomorrow.');
  const open = (await pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND status IN ('queued','working')`, [me])).rows[0].n;
  if (open >= 2) throw new CommunityError(429, 'Wait for your current AI recipes to finish first.');
  const row = (await pool.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash) VALUES ($1, $2, $3, $4) RETURNING *`, [me, kind, input, hash])).rows[0];
  res.status(201).json(view(row));
});

aiRecipes.use(errors);
