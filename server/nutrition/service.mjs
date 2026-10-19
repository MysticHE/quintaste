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
 * corrected by staff or newly learned since it was last checked. The AI is only asked while the ai_recipes control is on.
 */
const NAMES_PER_RUN = 60, RECIPES_PER_RUN = 200, LOCK = 7302001;

const aiOn = async () => (await geminiConfig()).enabled && await allowed('ai_recipes');

/** Nutrition for one recipe, teaching the database the names it does not know yet. Never throws. */
export async function nutritionFor(recipe, { usage, signal = undefined }) {
  try {
    const keys = recipeKeys(recipe.ingredients);
    let learned = await learnedRows(keys);
    const names = namesToResolve(recipe.ingredients, learned);
    if (names.length && await aiOn()) {
      await resolveNames(names, { usage, signal, unitKeyOf: unitKey });
      learned = await learnedRows(keys);
    }
    return estimateRecipe(recipe, learned);
  } catch (error) {
    logger.warn({ event: 'nutrition_estimate_failed', detail: String(error?.message ?? error).slice(0, 160) });
    return null;
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

async function staffRetries(usage) {
  const rows = (await pool.query(`SELECT name_key, name, staff_note FROM nutrition.ingredient WHERE status='retry' ORDER BY updated_at LIMIT 20`)).rows;
  if (rows.length) await resolveNames(rows.map(r => ({ key: r.name_key, name: r.name, unit: '', amount: null, note: r.staff_note, known: false, staticUsda: null })),
    { usage, unitKeyOf: unitKey });
  return rows.length;
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
    // Recipes not yet checked at their live revision, or checked while names still waited for the AI.
    const unchecked = (await pool.query(`SELECT r.id, r.live, r.live_revision FROM recipes.recipe r LEFT JOIN nutrition.recipe_check c ON c.recipe_id = r.id
      WHERE r.live IS NOT NULL AND (c.recipe_id IS NULL OR c.revision <> r.live_revision OR (NOT c.complete AND $1))
      ORDER BY r.published_at DESC NULLS LAST LIMIT ${RECIPES_PER_RUN}`, [ai])).rows;
    const recipeNames = new Map();
    let learned = await learnedRows(unchecked.flatMap(row => recipeKeys(row.live.ingredients ?? [])));
    const asked = new Set(), wanted = [];
    for (const row of unchecked) {
      const names = namesToResolve(row.live.ingredients ?? [], learned);
      recipeNames.set(row.id, names.map(n => n.key));
      for (const name of names) if (!asked.has(name.key) && wanted.length < NAMES_PER_RUN) { asked.add(name.key); wanted.push(name); }
    }
    if (ai && wanted.length) {
      await resolveNames(wanted, { usage, unitKeyOf: unitKey });
      learned = await learnedRows(unchecked.flatMap(row => recipeKeys(row.live.ingredients ?? [])));
    }
    for (const row of unchecked) {
      const ingredients = row.live.ingredients ?? [];
      const complete = ai && recipeNames.get(row.id).every(key => asked.has(key)) || !recipeNames.get(row.id).length;
      if (await store(row, estimateRecipe({ servings: row.live.servings, ingredients }, learned), recipeKeys(ingredients), complete)) counts.changed++;
      counts.checked++;
    }
    // Recipes whose names were corrected or learned after they were last checked.
    const stale = (await pool.query(`SELECT DISTINCT r.id, r.live, r.live_revision FROM nutrition.recipe_check c
        JOIN nutrition.recipe_ingredient ri ON ri.recipe_id = c.recipe_id JOIN nutrition.ingredient i ON i.name_key = ri.name_key
        JOIN recipes.recipe r ON r.id = c.recipe_id AND r.live_revision = c.revision
      WHERE i.updated_at > c.checked_at LIMIT ${RECIPES_PER_RUN}`)).rows;
    if (stale.length) {
      learned = await learnedRows(stale.flatMap(row => recipeKeys(row.live.ingredients ?? [])));
      for (const row of stale) {
        const ingredients = row.live.ingredients ?? [];
        const complete = !namesToResolve(ingredients, learned).length;
        if (await store(row, estimateRecipe({ servings: row.live.servings, ingredients }, learned), recipeKeys(ingredients), complete)) counts.changed++;
        counts.recalculated++;
      }
    }
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
