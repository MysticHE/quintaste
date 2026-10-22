import { createHash } from 'node:crypto';
import { pool, logger } from '../config.mjs';
import { GeminiError, generate } from './gemini.mjs';
import { demandPrompt, recipeSchema, requestPrompt, searchSystem, structureSystem } from './prompts.mjs';
import { clip, parseUpload, toRecipe } from './recipe.mjs';
import { fromVideo } from './video-job.mjs';
import { nutritionFor } from '../nutrition/service.mjs';
import { recipeKeys } from '../nutrition/dynamic.mjs';
import { linkRecipe } from '../nutrition/learned.mjs';
import { transaction } from '../community/http.mjs';
import { requestLevel } from '../game/levels-members.mjs';

export { parseUpload, toRecipe };

/** Confidence below this goes to staff review instead of straight to the feed. */
export const REVIEW_BELOW = 0.6;

async function fromRequest(job, signal, usage, progress) {
  await progress('Finding rated recipes…');
  const prompt = job.kind === 'demand' ? demandPrompt(job.input) : requestPrompt(job.input);
  const research = await generate({ parts: [{ text: prompt }], system: searchSystem, tools: [{ google_search: {} }], signal, maxOutputTokens: 6000 });
  usage.calls.push(research.usage);
  await progress('Writing the recipe…');
  const structured = await generate({ parts: [{ text: 'Research notes and proposed version:\n\n' + research.data }], schema: recipeSchema, system: structureSystem, signal });
  usage.calls.push(structured.usage);
  const sources = [...new Set(research.sources)].slice(0, 6);
  return { recipe: toRecipe(structured.data, { source: { kind: 'request', request: clip(job.input, 200), urls: sources } }), photos: null };
}

/** Saves the recipe and its photos together (live, or pending for staff review); steps with a photo are marked. */
async function save(job, recipe, photos, review, nutritionComplete) {
  const steps = recipe.steps.map(({ shotAt, ...step }, index) => photos?.kinds.has(index) ? { ...step, image: photos.kinds.get(index) } : step);
  const saved = { ...recipe, steps };
  const cover = photos?.cover ?? (photos?.steps.size ? photos.steps.get(Math.max(...photos.steps.keys())) : null);
  const version = review ? 'pending' : 'live';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query(`INSERT INTO recipes.recipe (author_id, draft_key, live, live_revision, pending, pending_revision, pending_state, submitted_at, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8) RETURNING id`,
      [job.user_id, 'ai-' + job.id, review ? null : saved, review ? null : 1, review ? saved : null, review ? 1 : null, review ? 'review' : null, review ? null : new Date()])).rows[0];
    const images = [...(cover ? [['cover', cover]] : []), ...[...(photos?.steps ?? new Map())].map(([index, bytes]) => ['step-' + index, bytes])];
    for (const [slot, bytes] of images) {
      await client.query('INSERT INTO recipes.photo (recipe_id, version, slot, bytes, digest) VALUES ($1, $2, $3, $4, $5)',
        [row.id, version, slot, bytes, createHash('sha256').update(bytes).digest('hex')]);
    }
    // A live recipe is linked to its ingredient names, so later corrections in the ingredient database reach it; when
    // some names were left for later (AI off or failed) the hourly refresh checks it again.
    if (!review) await linkRecipe(client, row.id, 1, recipeKeys(saved.ingredients), nutritionComplete);
    await client.query('COMMIT');
    return { id: row.id, photos: images.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

/**
 * The shared end of every job, whichever engine wrote the recipe: nutrition, staff review or live, saved with photos.
 * `aiNutrition: false` keeps the nutrition step to the ingredient table (the bots engine makes no Gemini calls).
 */
export async function finishJob(job, recipe, photos, usage, { aiNutrition = true, signal = undefined } = {}) {
  await progress(job)('Working out the nutrition…');
  const { nutrition, complete } = await nutritionFor(recipe, { usage, signal, ai: aiNutrition });
  if (nutrition) recipe.nutrition = nutrition;
  // Nobody asked for a wanted recipe in these words, so staff always read it before it goes public.
  const review = job.kind === 'demand' || recipe.source.confidence < REVIEW_BELOW;
  const saved = await save(job, recipe, photos, review, complete);
  const status = review ? 'review' : 'published';
  await pool.query(`UPDATE recipes.ai_job SET status=$2, recipe_id=$3, message=$4, usage=$5, finished_at=now() WHERE id=$1`,
    [job.id, status, saved.id, job.kind === 'demand' ? 'Waiting for staff review.' : review ? 'Some quantities or steps were unclear, so staff will check it before it goes public.' : '', { ...usage, photos: saved.photos }]);
  logger.info({ event: 'ai_recipe_job_done', kind: job.kind, engine: usage.engine ?? 'gemini', status, calls: usage.calls.length, photos: saved.photos });
  if (status === 'published' && job.user_id) await levelFor(job.user_id, saved.id);
  return status;
}

/**
 * An AI recipe a member asked for gets its private Rush Hour level with the request (RECIPE_LEVELS_PLAN §11), outside the daily
 * level limits. While level making or member recipes are switched off it is simply not queued; the recipe is unaffected either way.
 */
async function levelFor(userId, recipeUuid) {
  try { await transaction(db => requestLevel(db, userId, 'member-' + recipeUuid, { daily: false, atOnce: false })); }
  catch (error) { if (error?.code !== 'SERVICE_PAUSED') logger.warn({ event: 'ai_recipe_level_not_queued', detail: String(error?.message ?? error).slice(0, 160) }); }
}

/** Marks a job failed with a member-readable message (GeminiError messages are written for members). */
export async function failJob(job, error, usage) {
  const message = error instanceof GeminiError ? error.message : 'Something went wrong reading this. Try again later.';
  await pool.query(`UPDATE recipes.ai_job SET status='failed', message=$2, usage=$3, finished_at=now() WHERE id=$1`, [job.id, message.slice(0, 500), usage]);
  logger.warn({ event: 'ai_recipe_job_failed', kind: job.kind, engine: usage.engine ?? 'gemini', status: error instanceof GeminiError ? error.status : 'internal', detail: error instanceof GeminiError ? undefined : String(error?.message ?? error).slice(0, 200) });
  return 'failed';
}

export const progress = job => message => pool.query("UPDATE recipes.ai_job SET message=$2 WHERE id=$1 AND status='working'", [job.id, message]).catch(() => {});

/** Runs one job end to end with Gemini and stores the result; returns the new job status. */
export async function runJob(job, signal) {
  const usage = { calls: [], bytes: 0 };
  try {
    const { recipe, photos } = job.kind === 'video' ? await fromVideo(job, signal, usage, progress(job)) : await fromRequest(job, signal, usage, progress(job));
    return await finishJob(job, recipe, photos, usage, { signal });
  } catch (error) {
    return failJob(job, error, usage);
  }
}
