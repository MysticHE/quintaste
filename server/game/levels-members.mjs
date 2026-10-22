import { CommunityError } from '../community/http.mjs';
import { notRestricted } from '../community/router.mjs';
import { allowed } from '../operations.mjs';

/**
 * Member levels (GAME_CONTENT_PLAN Phase 4; RECIPE_LEVELS_PLAN §5, §7, §11): a member asks for a level from their own published
 * recipe (one they wrote, or an AI recipe they asked for). It is private to them until staff make it public, and the same QT bots
 * make it as staff levels (levels-worker.mjs). Making a level is an AI feature, so the route asks for an AI Recipes plan.
 */
export const LEVELS_PER_DAY = 5, LEVELS_AT_ONCE = 2;
export const OPEN = ['queued', 'waiting', 'claimed', 'answered'];
const MEMBER_RECIPE = /^member-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** The member's own live recipe, by its public id ('member-<uuid>'), or a clear refusal. */
async function ownRecipe(db, me, recipeId) {
  const match = MEMBER_RECIPE.exec(String(recipeId ?? ''));
  if (!match) throw new CommunityError(400, 'Choose one of your recipes.');
  const row = (await db.query(`SELECT live_revision FROM recipes.recipe WHERE id::text = $1 AND author_id = $2 AND live IS NOT NULL AND hidden_at IS NULL
    AND ${notRestricted('author_id')}`, [match[1], me])).rows[0];
  if (!row) throw new CommunityError(404, 'Only your published recipes can become levels.');
  return { revision: row.live_revision ?? 1 };
}

/**
 * Puts a member's recipe in line for a private level, or answers with the level already made for this revision (public or
 * theirs) or the job already in line. `daily` and `atOnce` apply the limits (an unlimited account skips the daily one; an AI
 * recipe's level comes with its request, so it skips both). Run inside a transaction.
 */
export async function requestLevel(db, me, recipeId, { daily = true, atOnce = true } = {}) {
  if (!await allowed('game_levels') || !await allowed('recipes')) throw new CommunityError(503, 'Making levels is paused right now.', 'SERVICE_PAUSED');
  const { revision } = await ownRecipe(db, me, recipeId);
  await db.query('SELECT pg_advisory_xact_lock(1902916, hashtext($1))', ['level-request:' + me]);
  const made = (await db.query(`SELECT hash FROM game.recipe_level WHERE recipe_id = $1 AND recipe_revision = $2 AND status = 'ready' AND (owner_id IS NULL OR owner_id = $3)
    ORDER BY owner_id NULLS FIRST LIMIT 1`, [recipeId, revision, me])).rows[0];
  if (made) return { status: 'ready', hash: made.hash };
  const open = (await db.query(`SELECT id FROM game.level_job WHERE recipe_id = $1 AND owner_id = $2 AND status = ANY($3)`, [recipeId, me, OPEN])).rows[0];
  if (open) return { status: 'waiting', job: open.id };
  const counts = (await db.query(`SELECT count(*) FILTER (WHERE status = ANY($2))::int AS open, count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today
    FROM game.level_job WHERE owner_id = $1`, [me, OPEN])).rows[0];
  if (atOnce && counts.open >= LEVELS_AT_ONCE) throw new CommunityError(429, 'Two levels are already in line. Wait for one to finish.');
  if (daily && counts.today >= LEVELS_PER_DAY) throw new CommunityError(429, 'That is five levels today. Try again tomorrow.');
  const job = (await db.query(`INSERT INTO game.level_job(recipe_id, requested_by, owner_id, priority) VALUES($1, 'member', $2, 1) RETURNING id`, [recipeId, me])).rows[0];
  return { status: 'waiting', job: job.id };
}

/** The member's recent level requests, newest first: waiting, done (with the level) or failed (with the reason). */
export async function myLevels(db, me) {
  const rows = (await db.query(`SELECT id, recipe_id, status, message, pack, created_at FROM game.level_job WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 20`, [me])).rows;
  return rows.map(r => ({ id: r.id, recipeId: r.recipe_id, status: OPEN.includes(r.status) ? 'waiting' : r.status, message: r.status === 'failed' ? r.message : '',
    hash: r.pack ?? null, createdAt: r.created_at }));
}
