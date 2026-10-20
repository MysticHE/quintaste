import { createHash } from 'node:crypto';
import { pool, logger } from '../config.mjs';
import { GeminiError, generate } from './gemini.mjs';
import { recipeSchema, requestPrompt, searchSystem, structureSystem } from './prompts.mjs';
import { clip, parseUpload, toRecipe } from './recipe.mjs';
import { fromVideo } from './video-job.mjs';
import { nutritionFor } from '../nutrition/service.mjs';
import { recipeKeys } from '../nutrition/dynamic.mjs';
import { linkRecipe } from '../nutrition/learned.mjs';

export { parseUpload, toRecipe };

/** Confidence below this goes to staff review instead of straight to the feed. */
export const REVIEW_BELOW = 0.6;

async function fromRequest(job, signal, usage, progress) {
  await progress('Finding rated recipes…');
  const research = await generate({ parts: [{ text: requestPrompt(job.input) }], system: searchSystem, tools: [{ google_search: {} }], signal, maxOutputTokens: 6000 });
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

/** Runs one job end to end and stores the result; returns the new job status. */
export async function runJob(job, signal) {
  const usage = { calls: [], bytes: 0 };
  const progress = message => pool.query("UPDATE recipes.ai_job SET message=$2 WHERE id=$1 AND status='working'", [job.id, message]).catch(() => {});
  try {
    const { recipe, photos } = job.kind === 'video' ? await fromVideo(job, signal, usage, progress) : await fromRequest(job, signal, usage, progress);
    await progress('Working out the nutrition…');
    const { nutrition, complete } = await nutritionFor(recipe, { usage, signal });
    if (nutrition) recipe.nutrition = nutrition;
    const review = recipe.source.confidence < REVIEW_BELOW;
    const saved = await save(job, recipe, photos, review, complete);
    const status = review ? 'review' : 'published';
    await pool.query(`UPDATE recipes.ai_job SET status=$2, recipe_id=$3, message=$4, usage=$5, finished_at=now() WHERE id=$1`,
      [job.id, status, saved.id, review ? 'Some quantities or steps were unclear, so staff will check it before it goes public.' : '', { ...usage, photos: saved.photos }]);
    logger.info({ event: 'ai_recipe_job_done', kind: job.kind, status, calls: usage.calls.length, photos: saved.photos });
    return status;
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'Something went wrong reading this. Try again later.';
    await pool.query(`UPDATE recipes.ai_job SET status='failed', message=$2, usage=$3, finished_at=now() WHERE id=$1`, [job.id, message.slice(0, 500), usage]);
    logger.warn({ event: 'ai_recipe_job_failed', kind: job.kind, status: error instanceof GeminiError ? error.status : 'internal', detail: error instanceof GeminiError ? undefined : String(error?.message ?? error).slice(0, 200) });
    return 'failed';
  }
}
