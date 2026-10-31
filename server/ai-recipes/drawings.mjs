import { createHash } from 'node:crypto';
import { pool, logger } from '../config.mjs';
import { previewJpeg, stepJpeg } from './frames.mjs';
import { method, reviewAll, stepsToDraw } from './photos.mjs';

/**
 * Step pictures for AI recipes, made by QT Gamer on the team's ChatGPT plan (owner, 31 Oct 2026; Gemini no longer draws).
 * Every step gets one clean 4:3 picture: QT Gamer recreates the step's chosen video frame without the video's captions,
 * stickers and logos, or draws the step from the method when no frame shows it. Raw frames are never published.
 * A saved recipe queues one row per step (`queueDrawings`), with its frame as the reference; the bridge
 * (ops/qt-team/recipe_drawing_bridge.py) claims and answers them through the signed routes in bot-router.mjs; the worker
 * (`settleDrawings`) checks a recipe's pictures against their own steps in batches as they arrive, attaches the ones that fit
 * and asks once more for the others, telling the redo what was wrong. The recipe is already published or in review meanwhile.
 */
const MAX_DRAWINGS = 20, MAX_TRIES = 2, ANSWER_MINUTES = 30, CHECK_BATCH = 4;
export const BRIDGE_ID = 'qt-gamer-drawings';
let failedAt = 0;

let tableSeen = false, tableCheckedAt = 0;
/** True once schema v5 (recipes.ai_drawing with its reference column) is applied; until then nothing is queued. */
async function tableReady() {
  if (tableSeen || Date.now() - tableCheckedAt < 60000) return tableSeen;
  tableCheckedAt = Date.now();
  tableSeen = (await pool.query(`SELECT 1 FROM information_schema.columns
    WHERE table_schema='recipes' AND table_name='ai_drawing' AND column_name='reference'`)).rowCount > 0;
  if (!tableSeen) logger.warn({ event: 'ai_recipes_drawings_schema_missing' });
  return tableSeen;
}

/** What every step picture must look like: one clean, professional photo at the app's mobile size (owner, 31 Oct 2026). */
const CLEAN = ' Landscape 4:3 framing with the food centred, natural kitchen light, sharp focus, a clean professional food photograph.'
  + ' No text of any kind: no captions, subtitles, stickers, watermarks, logos, labels, on-screen buttons or borders. No faces; hands only if the step needs them. No meat or seafood.';

/** What QT Gamer is asked for step `index` (0-based): recreate the step's video frame cleanly, or draw it from the method. */
export function drawingPrompt(recipe, index, note = '', fromFrame = false) {
  const step = recipe.steps[index], names = new Map(recipe.ingredients.map(i => [i.id, i.name]));
  const ingredients = (step.ingredientIds ?? []).map(id => names.get(id)).filter(Boolean).join(', ');
  const what = `step ${index + 1} of the home-cooked vegetarian recipe "${recipe.title}": ${step.instruction}` + (ingredients ? ` Ingredients in this step: ${ingredients}.` : '');
  const ask = fromFrame
    ? `Recreate the attached frame from the recipe video as a clean photo of ${what} Keep exactly what the frame shows: the same food at the same stage, the same amounts, cookware and setting.`
      + ' Remove everything the video added on top of the picture, and fill those areas naturally.'
    : `Photorealistic photo of ${what}
Whole method:
${method(recipe)}

Show exactly what is in the pan or on the board at this moment: what earlier steps put there plus this step,`
      + ' nothing the method adds later and nothing it cooks or serves separately. Right cookware, seen from above or at a slight angle.';
  return ask + CLEAN + (note ? ` Avoid this mistake from a previous attempt: ${note}` : '');
}

/** The check's extra rule for every step picture. */
const NO_TEXT = 'Also refuse a photo that shows any text, caption, subtitle, sticker, watermark, logo or face, and say which in the note.';

/** Queues a picture for each step of a just-saved recipe (at most MAX_DRAWINGS), with the step's chosen video frame when there is one. */
export async function queueDrawings(recipeId, recipe, photos) {
  if (!await tableReady().catch(() => false)) return 0;
  const chosen = stepsToDraw(recipe, recipe.steps.map((_, index) => index), MAX_DRAWINGS);
  const client = await pool.connect();
  try {
    // All of a recipe's pictures are queued together or not at all.
    await client.query('BEGIN');
    for (const index of chosen) {
      const frame = photos?.steps?.get(index) ?? null;
      await client.query('INSERT INTO recipes.ai_drawing (recipe_id, slot, prompt, reference) VALUES ($1, $2, $3, $4) ON CONFLICT (recipe_id, slot) DO NOTHING',
        [recipeId, 'step-' + index, drawingPrompt(recipe, index, '', Boolean(frame)), frame]);
    }
    await client.query('COMMIT');
    return chosen.length;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ event: 'ai_recipes_drawings_not_queued', detail: String(error?.message ?? error).slice(0, 160) });
    return 0;
  } finally { client.release(); }
}

/** The version the drawings belong to: the one staff are reviewing while there is one, otherwise the live recipe. */
async function current(db, recipeId) {
  const row = (await db.query('SELECT live, pending FROM recipes.recipe WHERE id=$1 FOR UPDATE', [recipeId])).rows[0];
  if (!row) return null;
  return row.pending ? { version: 'pending', column: 'pending', recipe: row.pending } : row.live ? { version: 'live', column: 'live', recipe: row.live } : null;
}

/** Attaches the accepted pictures (0-based step index -> JPEG); the latest step with a picture (the finished dish) is the cover. */
async function attach(recipeId, accepted) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const target = await current(client, recipeId);
    if (!target) { await client.query('ROLLBACK'); return 0; }
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    for (const [index, bytes] of accepted) {
      // A clean picture replaces a step's earlier one (a raw video frame on recipes made before 31 Oct 2026).
      await client.query(`INSERT INTO recipes.photo (recipe_id, version, slot, bytes, digest) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (recipe_id, version, slot) DO UPDATE SET bytes=EXCLUDED.bytes, digest=EXCLUDED.digest`, [recipeId, target.version, 'step-' + index, bytes, digest(bytes)]);
    }
    await client.query(`INSERT INTO recipes.photo (recipe_id, version, slot, bytes, digest)
      SELECT recipe_id, version, 'cover', bytes, digest FROM recipes.photo WHERE recipe_id=$1 AND version=$2 AND slot LIKE 'step-%'
      ORDER BY substring(slot from 6)::int DESC LIMIT 1
      ON CONFLICT (recipe_id, version, slot) DO UPDATE SET bytes=EXCLUDED.bytes, digest=EXCLUDED.digest`, [recipeId, target.version]);
    const steps = target.recipe.steps.map((step, index) => accepted.has(index) ? { ...step, image: 'illustration' } : step);
    await client.query(`UPDATE recipes.recipe SET ${target.column} = $2, updated_at = now() WHERE id=$1`, [recipeId, { ...target.recipe, steps }]);
    await client.query('COMMIT');
    return accepted.size;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

/** Checks one recipe's answered drawings against its steps; attaches what fits, queues one redraw of the rest. */
async function check(recipeId, rows) {
  const recipe = (await pool.query('SELECT coalesce(pending, live) AS r FROM recipes.recipe WHERE id=$1', [recipeId])).rows[0]?.r;
  if (!recipe) { await pool.query("UPDATE recipes.ai_drawing SET status='failed', error='recipe gone', image=NULL, reference=NULL WHERE recipe_id=$1 AND status='drawn'", [recipeId]); return; }
  const candidates = [];
  for (const row of rows) {
    const number = Number(row.slot.slice(5)) + 1;
    if (number > recipe.steps.length) continue;
    candidates.push({ id: row.id, label: `S${number}-A`, step: number, bytes: row.image, preview: await previewJpeg(row.image) });
  }
  const usage = { calls: [] }, chosen = new Map();
  const { misses } = await reviewAll(recipe, candidates, chosen, false, usage, NO_TEXT);
  const accepted = new Map([...chosen].map(([number, candidate]) => [number - 1, candidate.bytes]));
  const attached = accepted.size ? await attach(recipeId, accepted) : 0;
  const done = new Set([...chosen.values()].map(c => c.id));
  await pool.query("UPDATE recipes.ai_drawing SET status='done', image=NULL, reference=NULL WHERE id = ANY($1::uuid[])", [[...done]]);
  for (const miss of misses) {
    const row = rows.find(r => r.slot === 'step-' + (miss.number - 1));
    if (!row) continue;
    const note = (miss.note || 'it did not match the step').slice(0, 300);
    if (row.attempts >= MAX_TRIES) await pool.query("UPDATE recipes.ai_drawing SET status='failed', error=$2, image=NULL, reference=NULL WHERE id=$1", [row.id, note]);
    else await pool.query("UPDATE recipes.ai_drawing SET status='queued', note=$2, prompt=$3, image=NULL, claimed_at=NULL WHERE id=$1",
      [row.id, note, drawingPrompt(recipe, miss.number - 1, note, row.from_frame)]);
  }
  // A drawing for a step the recipe no longer has is dropped.
  const orphans = rows.filter(r => !candidates.some(c => c.id === r.id)).map(r => r.id);
  if (orphans.length) await pool.query("UPDATE recipes.ai_drawing SET status='failed', error='no such step', image=NULL, reference=NULL WHERE id = ANY($1::uuid[])", [orphans]);
  logger.info({ event: 'ai_recipe_drawings_checked', drawn: rows.length, attached, redraw: misses.length, calls: usage.calls.length });
}

/**
 * One worker pass. A claimed drawing gets ANSWER_MINUTES before it is offered again (or fails after MAX_TRIES); a queued one
 * fails after a day, or after an hour while no bridge has asked for work. Then one recipe's answered pictures are checked, as
 * soon as CHECK_BATCH are waiting or none is still out, so pictures appear while the rest are made. A check that cannot run
 * (Gemini unavailable) is tried again a minute later, for up to two hours.
 */
export async function settleDrawings() {
  if (!await tableReady()) return;
  await pool.query(`UPDATE recipes.ai_drawing SET status = CASE WHEN attempts >= $1 THEN 'failed' ELSE 'queued' END,
      error = CASE WHEN attempts >= $1 THEN 'no answer' ELSE error END, claimed_at = NULL
    WHERE status='claimed' AND claimed_at < now() - make_interval(mins => $2)`, [MAX_TRIES, ANSWER_MINUTES]);
  await pool.query(`UPDATE recipes.ai_drawing SET status='failed', error='not drawn in time', image=NULL, reference=NULL
    WHERE (status='queued' AND (created_at < now() - interval '1 day' OR (created_at < now() - interval '1 hour'
        AND NOT EXISTS (SELECT 1 FROM recipes.ai_bot_bridge WHERE id=$1 AND seen_at > now() - interval '1 hour'))))
      OR (status='drawn' AND answered_at < now() - interval '2 hours')`, [BRIDGE_ID]);
  if (Date.now() - failedAt < 60000) return;
  const recipeId = (await pool.query(`SELECT d.recipe_id FROM recipes.ai_drawing d WHERE d.status='drawn' GROUP BY d.recipe_id
    HAVING count(*) >= $1 OR NOT EXISTS (SELECT 1 FROM recipes.ai_drawing o WHERE o.recipe_id=d.recipe_id AND o.status IN ('queued','claimed'))
    ORDER BY min(d.answered_at) LIMIT 1`, [CHECK_BATCH])).rows[0]?.recipe_id;
  if (!recipeId) return;
  const rows = (await pool.query("SELECT id, slot, image, attempts, reference IS NOT NULL AS from_frame FROM recipes.ai_drawing WHERE recipe_id=$1 AND status='drawn'", [recipeId])).rows;
  try { await check(recipeId, rows); }
  catch (error) {
    failedAt = Date.now();
    logger.warn({ event: 'ai_recipe_drawings_check_failed', detail: String(error?.message ?? error).slice(0, 160) });
  }
}

/** The bridge's claim: the oldest queued picture with its video frame (base64 JPEG) when it has one, or null. */
export async function claimDrawing() {
  await pool.query(`INSERT INTO recipes.ai_bot_bridge (id, seen_at) VALUES ($1, now()) ON CONFLICT (id) DO UPDATE SET seen_at = now()`, [BRIDGE_ID]);
  const row = (await pool.query(`UPDATE recipes.ai_drawing SET status='claimed', claimed_at=now(), attempts=attempts+1
    WHERE id = (SELECT id FROM recipes.ai_drawing WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id, prompt, reference`)).rows[0];
  return row ? { id: row.id, prompt: row.prompt, reference: row.reference ? row.reference.toString('base64') : null } : null;
}

/**
 * The bridge's answer for a claimed drawing: JPEG/PNG/WebP bytes, or a failure. Returns false when it was not waiting.
 * @param {string} id
 * @param {{ image?: Buffer, error?: string }} answer
 */
export async function answerDrawing(id, { image, error }) {
  if (error) {
    const row = (await pool.query(`UPDATE recipes.ai_drawing SET status = CASE WHEN attempts >= $3 THEN 'failed' ELSE 'queued' END, error=$2, claimed_at=NULL,
        reference = CASE WHEN attempts >= $3 THEN NULL ELSE reference END
      WHERE id=$1 AND status='claimed' RETURNING id`, [id, String(error).slice(0, 300), MAX_TRIES])).rows[0];
    return Boolean(row);
  }
  const bytes = await stepJpeg(image).catch(() => null);
  if (!bytes) return answerDrawing(id, { error: 'not a readable picture' });
  const row = (await pool.query("UPDATE recipes.ai_drawing SET status='drawn', image=$2, error='', answered_at=now() WHERE id=$1 AND status='claimed' RETURNING id", [id, bytes])).rows[0];
  return Boolean(row);
}
