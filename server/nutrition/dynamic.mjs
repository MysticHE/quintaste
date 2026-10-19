import { countUnits, gramsFor, matchFood, MAX_GRAMS, MAX_MISSING_SHARE, MIN_COVERAGE, unitOf, volumeMl } from './estimate.mjs';
import { usdaFood } from './reference.mjs';
import { nameKey } from './learned.mjs';

/**
 * Per-serving nutrition for member and AI recipes: the reviewed table first, then the learned ingredient database.
 * Same rules as estimate.mjs: "to taste" lines are skipped, figures need 90% of the weighed ingredients matched, a
 * nutrient is left out when more than 10% of the weight lacks it. A line whose food is unknown still counts by weight
 * when its unit is a weight or volume, so a teaspoon of an unknown spice no longer blocks the whole recipe.
 */
const NUTRIENTS = ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium'];
const USABLE = new Set(['auto', 'approved']);
const UNKNOWN_RETRY_MS = 30 * 86400000;

/** Count units as stored in the learned table: "Cloves" -> "clove", "" or "pieces" -> "each". */
export function unitKey(unit) {
  const u = unitOf(unit);
  if (u === 'each' || u === 'leaves') return u === 'leaves' ? 'leaf' : 'each';
  if (u.endsWith('ies')) return u.slice(0, -3) + 'y';
  return u.endsWith('s') && !u.endsWith('ss') ? u.slice(0, -1) : u;
}
const isWeight = unit => ['g', 'gram', 'grams', 'kg'].includes(unitOf(unit));
const weightGrams = line => unitOf(line.unit) === 'kg' ? line.amount * 1000 : line.amount;

/** Grams per ml from USDA's weighed spoon and cup portions, when the food has them. */
function portionDensity(food) {
  for (const [label, grams] of food?.portions ?? []) {
    const ml = /^tbsp\b/.test(label) ? 14.79 : /^tsp\b/.test(label) ? 4.93 : /^cup\b/.test(label) ? 236.6 : /^fl oz\b/.test(label) ? 29.57 : 0;
    if (ml) return grams / ml;
  }
  return null;
}

/** Grams for a line from a learned row (USDA portions as a fallback), or undefined. */
function learnedGrams(line, row, food) {
  if (isWeight(line.unit)) return weightGrams(line);
  const ml = volumeMl(line.unit);
  if (ml !== undefined) { const density = row.g_per_ml ?? portionDensity(food); return density ? line.amount * ml * density : undefined; }
  const unit = unitKey(line.unit), units = row.units ?? {};
  const per = units[unit] ?? (unit === 'each' || countUnits.has(unitOf(line.unit)) ? units.each : undefined);
  return typeof per === 'number' && per > 0 ? line.amount * per : undefined;
}

/**
 * How one measured line resolves: { key, grams, per100 } when matched, { key, negligible } for water and the like,
 * { key, grams, unmatched } when only its weight is known, or { key, unresolved } when neither is.
 */
export function resolveLine(line, learned) {
  const key = nameKey(line.name), hit = matchFood(line.name), row = key ? learned.get(key) : undefined;
  const usable = row && USABLE.has(row.status) ? row : null;
  if (hit?.food.negligible || usable?.negligible) return { key, negligible: true };
  const staticFood = hit?.food.usda ? usdaFood(hit.food.usda) : null;
  const learnedFood = usable?.usda ? usdaFood(usable.usda) : null;
  const per100 = staticFood?.per100 ?? (usable?.food_id ? usable.per100 : learnedFood?.per100) ?? null;
  let grams = hit ? gramsFor(line, hit.food) : undefined;
  if (grams === undefined && usable) grams = learnedGrams(line, usable, staticFood ?? learnedFood);
  if (per100 && grams !== undefined) return { key, grams, per100, static: !!staticFood };
  if (grams === undefined && (isWeight(line.unit) || volumeMl(line.unit) !== undefined)) grams = isWeight(line.unit) ? weightGrams(line) : line.amount * volumeMl(line.unit);
  return grams === undefined ? { key, unresolved: true } : { key, grams, unmatched: true };
}

/** Names worth asking the AI about: not matched and weighed, never asked (or due again), and not rejected by staff. */
export function namesToResolve(ingredients, learned, now = Date.now()) {
  const out = new Map();
  for (const line of ingredients) {
    if (line.amount === null || line.amount === undefined) continue;
    const result = resolveLine(line, learned);
    if (!result.key || (!result.unresolved && !result.unmatched)) continue;
    const row = learned.get(result.key);
    const due = !row || row.status === 'retry' || (row.status === 'unknown' && now - new Date(row.updated_at).getTime() > UNKNOWN_RETRY_MS)
      || (USABLE.has(row.status) && result.unresolved);
    // A name the reviewed table already knows only needs a weight for this unit; its food stays the table's.
    const staticUsda = matchFood(line.name)?.food.usda ?? null;
    if (due && !out.has(result.key)) out.set(result.key, { key: result.key, name: String(line.name).slice(0, 120), unit: line.unit, amount: line.amount,
      note: row?.staff_note ?? '', known: (!!row && USABLE.has(row.status)) || !!staticUsda, staticUsda });
  }
  return [...out.values()];
}

/** The nutrition object for Recipe.nutrition, or null when too little of the recipe can be weighed and matched. */
export function estimateRecipe({ servings, ingredients }, learned) {
  if (!(Number.isInteger(servings) && servings > 0)) return null;
  const totals = {}, missing = {};
  let nutritive = 0, matched = 0;
  for (const line of ingredients ?? []) {
    if (line.amount === null || line.amount === undefined || !(Number(line.amount) > 0)) continue;
    const result = resolveLine(line, learned);
    if (result.negligible) continue;
    if (result.unresolved || !(result.grams > 0) || result.grams > MAX_GRAMS) return null;
    nutritive += result.grams;
    if (result.unmatched) continue;
    matched += result.grams;
    for (const n of NUTRIENTS) {
      const value = result.per100[n];
      if (typeof value === 'number') totals[n] = (totals[n] ?? 0) + (value * result.grams) / 100;
      else missing[n] = (missing[n] ?? 0) + result.grams;
    }
  }
  if (!nutritive || matched / nutritive < MIN_COVERAGE || !(totals.kcal > 0)) return null;
  const omitted = new Set(NUTRIENTS.filter(n => (missing[n] ?? 0) / nutritive > MAX_MISSING_SHARE));
  if (omitted.has('kcal')) return null;
  const perServing = { kcal: Math.round(totals.kcal / servings) };
  for (const n of NUTRIENTS) if (n !== 'kcal' && !omitted.has(n) && totals[n] !== undefined) perServing[n] = Math.round((totals[n] / servings) * 10) / 10;
  if (!(perServing.kcal > 0 && perServing.kcal <= 3000)) return null;
  return { basis: 'estimate', coverage: Math.round((matched / nutritive) * 100) / 100, checkedAt: new Date().toISOString().slice(0, 10), perServing };
}

/** Every key a recipe's lines map to, for linking the recipe to the names it uses. */
export const recipeKeys = ingredients => [...new Set(ingredients.map(line => nameKey(line.name)).filter(Boolean))];
