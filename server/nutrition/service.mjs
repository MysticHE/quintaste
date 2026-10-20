import { pool, logger } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { geminiConfig } from '../ai-recipes/gemini.mjs';
import { estimateRecipe, namesToResolve, recipeKeys, unitKey } from './dynamic.mjs';
import { learnedRows, linkRecipe } from './learned.mjs';
import { resolveNames } from './resolve.mjs';

/**
 * Recipe nutrition backed by the learned ingredient database. `nutritionFor` serves one recipe (the AI recipe worker);
 * `refreshNutrition` runs every hour: it checks live recipes not yet checked at their current revision (member recipes
 * included), teaches the database their unknown names in one batch, and recalculates every recipe whose names were
 * corrected by staff or newly learned since it was last checked. The AI is only asked while the ai_recipes control is on;
 * an AI failure never stops the figures that can be worked out without it, and the recipe is checked again later.
 */
const NAMES_PER_RUN = 60, RECIPES_PER_RUN = 200, STALE_PER_RUN = 1000, LOCK = 7302001;

const aiOn = async () => (await geminiConfig()).enabled && await allowed('ai_recipes');

/** Asks the AI about names; false when it failed (logged), so callers keep what is known and try again later. */
async function learn(names, usage, signal = undefined) {
  try {
    await resolveNames(names, { usage, signal, unitKeyOf: unitKey });
    return true;
  } catch (error) {
    logger.warn({ event: 'nutrition_learn_failed', names: names.length, detail: String(error?.message ?? error).slice(0, 160) });
    return false;
  }
}

/**
 * Nutrition for one recipe, teaching the database the names it does not know yet. `complete` is false when names were
 * left for later (AI off or failed), so the hourly refresh checks the recipe again. Never throws.
 */
export async function nutritionFor(recipe, { usage, signal = undefined }) {
  try {
    const keys = recipeKeys(recipe.ingredients);
    let learned = await learnedRows(keys);
    const names = namesToResolve(recipe.ingredients, learned);
    let complete = !names.length;
    if (names.length && await aiOn() && await learn(names, usage, signal)) {
      complete = true;
      learned = await learnedRows(keys);
    }
    return { nutrition: estimateRecipe(recipe, learned), complete };
  } catch (error) {
    logger.warn({ event: 'nutrition_estimate_failed', detail: String(error?.message ?? error).slice(0, 160) });
    return { nutrition: null, complete: false };
  }
}

/** Writes the estimate into the live recipe (a figure from the source page is never replaced) and links its names. */
async function store(row, nutrition, keys, complete) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(`UPDATE recipes.recipe SET live = CASE WHEN $2::jsonb IS NULL THEN live - 'nutrition' ELSE jsonb_set(live, '{nutrition}', $2::jsonb) END
      WHERE id=$1 AND live_revision=$3 AND coalesce(live->'nutrition'->>'basis', 'estimate') = 'estimate'
        AND (live->'nutrition') IS DISTINCT FROM $2::jsonb`, [row.id, nutrition ? JSON.stringify(nutrition) : null, row.live_revision]);
    await linkRecipe(client, row.id, row.live_revision, keys, complete);
    await client.query('COMMIT');
    return updated.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

/** Names staff asked the AI to look at again. */
async function staffRetries(usage) {
  const rows = (await pool.query(`SELECT name_key, name, staff_note FROM nutrition.ingredient WHERE status='retry' ORDER BY updated_at LIMIT 20`)).rows;
  if (rows.length) await learn(rows.map(r => ({ key: r.name_key, name: r.name, unit: '', amount: null, note: r.staff_note, known: false, staticUsda: null })), usage);
  return rows.length;
}

/** Live recipes not yet checked at their revision, or checked while names still waited for the AI. */
async function checkUnchecked(ai, usage, counts) {
  const unchecked = (await pool.query(`SELECT r.id, r.live, r.live_revision FROM recipes.recipe r LEFT JOIN nutrition.recipe_check c ON c.recipe_id = r.id
    WHERE r.live IS NOT NULL AND (c.recipe_id IS NULL OR c.revision <> r.live_revision OR (NOT c.complete AND $1))
    ORDER BY r.published_at DESC NULLS LAST LIMIT ${RECIPES_PER_RUN}`, [ai])).rows;
  if (!unchecked.length) return;
  const allKeys = unchecked.flatMap(row => recipeKeys(row.live.ingredients ?? []));
  let learned = await learnedRows(allKeys);
  const recipeNames = new Map(), asked = new Set(), wanted = [];
  for (const row of unchecked) {
    const names = namesToResolve(row.live.ingredients ?? [], learned);
    recipeNames.set(row.id, names.map(n => n.key));
    for (const name of names) if (!asked.has(name.key) && wanted.length < NAMES_PER_RUN) { asked.add(name.key); wanted.push(name); }
  }
  const learnedOk = ai && wanted.length ? await learn(wanted, usage) : false;
  if (learnedOk) learned = await learnedRows(allKeys);
  for (const row of unchecked) {
    const ingredients = row.live.ingredients ?? [], waiting = recipeNames.get(row.id);
    const complete = !waiting.length || (learnedOk && waiting.every(key => asked.has(key)));
    if (await store(row, estimateRecipe({ servings: row.live.servings, ingredients }, learned), recipeKeys(ingredients), complete)) counts.changed++;
    counts.checked++;
  }
}

/** Recipes using names corrected or learned after they were last checked, found from the recently changed names. */
async function recalculateStale(counts) {
  const ids = (await pool.query(`SELECT DISTINCT ri.recipe_id FROM nutrition.ingredient i
      JOIN nutrition.recipe_ingredient ri ON ri.name_key = i.name_key
      JOIN nutrition.recipe_check c ON c.recipe_id = ri.recipe_id
    WHERE i.updated_at > now() - interval '30 days' AND i.updated_at > c.checked_at LIMIT ${STALE_PER_RUN}`)).rows.map(row => row.recipe_id);
  if (!ids.length) return;
  const stale = (await pool.query(`SELECT r.id, r.live, r.live_revision FROM recipes.recipe r JOIN nutrition.recipe_check c ON c.recipe_id = r.id AND c.revision = r.live_revision
    WHERE r.id = ANY($1::uuid[]) AND r.live IS NOT NULL`, [ids])).rows;
  const learned = await learnedRows(stale.flatMap(row => recipeKeys(row.live.ingredients ?? [])));
  for (const row of stale) {
    const ingredients = row.live.ingredients ?? [];
    const complete = !namesToResolve(ingredients, learned).length;
    if (await store(row, estimateRecipe({ servings: row.live.servings, ingredients }, learned), recipeKeys(ingredients), complete)) counts.changed++;
    counts.recalculated++;
  }
}

/** One refresh run. Returns counts for the log. */
export async function refreshNutrition() {
  const lock = await pool.connect();
  let held = false;
  const usage = { calls: [] }, counts = { retried: 0, checked: 0, recalculated: 0, changed: 0 };
  try {
    held = (await lock.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK])).rows[0].ok;
    if (!held) return counts;
    const ai = await aiOn();
    if (ai) counts.retried = await staffRetries(usage);
    await checkUnchecked(ai, usage, counts);
    await recalculateStale(counts);
    return counts;
  } finally {
    if (held) await lock.query('SELECT pg_advisory_unlock($1)', [LOCK]).catch(() => {});
    lock.release();
    if (counts.checked || counts.recalculated || counts.retried) logger.info({ event: 'nutrition_refresh', ...counts, calls: usage.calls.length });
  }
}

/** Starts the hourly refresh (first run two minutes after start). Returns a stop function. */
export function startNutritionRefresh() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await refreshNutrition(); } catch (error) {
      logger.warn({ event: 'nutrition_refresh_failed', detail: String(error?.message ?? error).slice(0, 200) });
    } finally { running = false; }
  };
  const first = setTimeout(() => { void run(); }, 120000).unref();
  const timer = setInterval(() => { void run(); }, 3600000).unref();
  return () => { clearTimeout(first); clearInterval(timer); };
}
