import { countUnits, gramsFor, matchFood, MAX_GRAMS, nutritionFrom, unitOf, volumeMl } from './estimate.mjs';
import { usdaFood } from './reference.mjs';
import { nameKey } from './learned.mjs';

/**
 * Per-serving nutrition for member and AI recipes: the reviewed table first, then the learned ingredient database,
 * with the same rules as estimate.mjs (nutritionFrom). A line whose food is unknown still counts by weight when its
 * unit is a weight or volume, so a teaspoon of an unknown spice no longer blocks the whole recipe.
 */
const USABLE = new Set(['auto', 'approved']);
const UNKNOWN_RETRY_MS = 30 * 86400000;

/** Count units as stored in the learned table: "Cloves" -> "clove", "" or "pieces" -> "each". */
export function unitKey(unit) {
  const u = unitOf(unit);
  if (u === 'each' || u === 'leaves') return u === 'leaves' ? 'leaf' : 'each';
  if (u.endsWith('ies')) return u.slice(0, -3) + 'y';
  return u.endsWith('s') && !u.endsWith('ss') ? u.slice(0, -1) : u;
}

/** Grams per ml from USDA's weighed spoon and cup portions, when the food has them. */
function portionDensity(food) {
  for (const [label, grams] of food?.portions ?? []) {
    const ml = /^tbsp\b/.test(label) ? 14.79 : /^tsp\b/.test(label) ? 4.93 : /^cup\b/.test(label) ? 236.6 : /^fl oz\b/.test(label) ? 29.57 : 0;
    if (ml) return grams / ml;
  }
  return null;
}

/**
 * Grams for a line from a learned row: weights as given, volumes with the row's density (or USDA's spoon portions),
 * count units only with a weight learned for that exact unit, so "3 cloves" never becomes three whole bulbs.
 * Returns { grams }, { grams, densityGuess } when a volume had to be read at 1 g per ml, or undefined.
 */
function learnedGrams(line, row, food) {
  if (volumeMl(line.unit) !== undefined) {
    const density = row.g_per_ml ?? portionDensity(food);
    return density ? { grams: gramsFor(line, { gPerMl: density }) } : { grams: gramsFor(line, { gPerMl: 1 }), densityGuess: true };
  }
  const weight = gramsFor(line, {});
  if (weight !== undefined) return { grams: weight };
  const per = (row.units ?? {})[unitKey(line.unit)];
  return typeof per === 'number' && per > 0 ? { grams: line.amount * per } : undefined;
}

/**
 * How one measured line resolves: { key, grams, per100 } when matched (densityGuess when its volume was read at
 * 1 g per ml), { key, negligible } for water and the like, { key, grams, unmatched } when only its weight is known,
 * or { key, unresolved } when neither is.
 * @returns {{ key: string | null, negligible?: boolean, unresolved?: boolean, unmatched?: boolean, densityGuess?: boolean, grams?: number,
 *   per100?: Record<string, number | null>, static?: boolean }}
 */
export function resolveLine(line, learned) {
  const key = nameKey(line.name), hit = matchFood(line.name), row = key ? learned.get(key) : undefined;
  const usable = row && USABLE.has(row.status) ? row : null;
  if (hit?.food.negligible || usable?.negligible) return { key, negligible: true };
  const staticFood = hit?.food.usda ? usdaFood(hit.food.usda) : null;
  const learnedFood = usable?.usda ? usdaFood(usable.usda) : null;
  const per100 = staticFood?.per100 ?? (usable?.food_id ? usable.per100 : learnedFood?.per100) ?? null;
  // The table weighs count units only when it lists that unit (or the line counts whole items): "4 leaves" of a food
  // matched as lime must not become four limes.
  const unit = unitOf(line.unit);
  const tableWeighs = hit && (!countUnits.has(unit) || ['each', 'egg', 'eggs'].includes(unit) || hit.food.per?.[unit] !== undefined);
  const fromTable = tableWeighs ? gramsFor(line, hit.food) : undefined;
  const weighed = fromTable !== undefined ? { grams: fromTable } : usable ? learnedGrams(line, usable, staticFood ?? learnedFood) : undefined;
  if (per100 && weighed) return { key, grams: weighed.grams, per100, static: !!staticFood, ...(weighed.densityGuess ? { densityGuess: true } : {}) };
  // Food unknown: weights and volumes (at 1 g per ml) still count toward the total, so coverage stays honest.
  const grams = weighed?.grams ?? gramsFor(line, {});
  return grams === undefined ? { key, unresolved: true } : { key, grams, unmatched: true };
}

/** Names worth asking the AI about: not matched and weighed, never asked (or due again), and not rejected by staff. */
export function namesToResolve(ingredients, learned, now = Date.now()) {
  const out = new Map();
  for (const line of ingredients) {
    if (line.amount === null || line.amount === undefined) continue;
    const result = resolveLine(line, learned);
    if (!result.key || (!result.unresolved && !result.unmatched && !result.densityGuess)) continue;
    const row = learned.get(result.key);
    // A usable row is asked again only for what it lacks: a weight for this unit, or a density for spoon measures.
    const due = !row || row.status === 'retry' || (row.status === 'unknown' && now - new Date(row.updated_at).getTime() > UNKNOWN_RETRY_MS)
      || (USABLE.has(row.status) && (result.unresolved || result.densityGuess));
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
  const entries = [];
  for (const line of ingredients ?? []) {
    if (line.amount === null || line.amount === undefined || !(Number(line.amount) > 0)) continue;
    const result = resolveLine(line, learned);
    if (result.negligible) continue;
    if (result.unresolved || !(result.grams > 0) || result.grams > MAX_GRAMS) return null;
    entries.push({ grams: result.grams, per100: result.unmatched ? null : result.per100 });
  }
  return nutritionFrom(entries, servings);
}

/** Every key a recipe's lines map to, for linking the recipe to the names it uses. */
export const recipeKeys = ingredients => [...new Set(ingredients.map(line => nameKey(line.name)).filter(Boolean))];
