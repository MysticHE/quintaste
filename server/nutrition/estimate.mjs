import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Per-serving nutrition estimate from ingredient lines, the server-side twin of scripts/recipe-nutrition.ts: the same
 * reviewed key table and USDA SR Legacy subset (server-assets/nutrition), the same rules. Figures only when every
 * measured line is matched and weighed; "to taste" lines are skipped; water, pandan, tea leaves and curry leaves
 * count as matched with no nutrients; a nutrient is left out when more than 10% of the nutritive weight comes from
 * rows that lack it. Raw inputs per serving; cooking losses are not modelled.
 */
const root = path.resolve('server-assets/nutrition');
const table = JSON.parse(readFileSync(path.join(root, 'ingredient-table.json'), 'utf8'));
const per100 = JSON.parse(readFileSync(path.join(root, 'usda-subset.json'), 'utf8')).foods;
export const nutrients = ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium'];
const foods = Object.entries(table.foods).map(([key, food]) => ({ key, food, patterns: food.match.map(pattern => new RegExp(pattern, 'i')) }));
const countUnits = new Set(['each', 'whole', 'piece', 'pieces', 'egg', 'eggs', 'leaves', 'leaf', 'cloves', 'clove', 'slices', 'slice', 'cubes', 'cube', 'sprig', 'sprigs', 'inch', 'handful', 'handfuls', 'pods', 'pod', 'sticks', 'stick']);
export const MIN_COVERAGE = 0.9, MAX_MISSING_SHARE = 0.1, MAX_GRAMS = 3000;
/** Millilitres in one of a volume unit (tbsp 15, tsp 5, cup 240), or undefined. */
export const volumeMl = unit => table.units[unitOf(unit)];
export { countUnits };

export function unitOf(unit) {
  const u = String(unit ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (['inch piece', 'inch pieces', 'inches'].includes(u)) return 'inch';
  if (['', 'whole', 'piece', 'pieces'].includes(u)) return 'each';
  return u;
}
/** The food whose alias matches the longest span of the line's name, or undefined. */
export function matchFood(name) {
  let best;
  for (const entry of foods) for (const pattern of entry.patterns) {
    const hit = pattern.exec(String(name ?? ''));
    if (hit && (!best || hit[0].length > best.length)) best = { ...entry, length: hit[0].length };
  }
  return best;
}
export function gramsFor(line, food) {
  const unit = unitOf(line.unit), amount = Number(line.amount);
  if (!(amount > 0)) return undefined;
  if (['g', 'gram', 'grams'].includes(unit)) return amount;
  if (unit === 'kg') return amount * 1000;
  const ml = table.units[unit];
  if (ml !== undefined) return amount * ml * (food.gPerMl ?? 1);
  if (countUnits.has(unit)) {
    let per = food.per?.[unit];
    if (per === undefined && ['each', 'egg', 'eggs'].includes(unit)) per = food.each;
    if (per === undefined && !food.per) per = food.each;
    return per === undefined ? undefined : amount * per;
  }
  return undefined;
}
/** Lines the table cannot match or weigh, for the resolver and for honest "Unavailable" messages. */
export function unresolvedLines(ingredients) {
  const out = [];
  for (const line of ingredients) {
    if (line.amount === null || line.amount === undefined) continue;
    const hit = matchFood(line.name);
    if (!hit) { out.push({ line, reason: 'unmatched' }); continue; }
    if (hit.food.negligible) continue;
    if (gramsFor(line, hit.food) === undefined) out.push({ line, reason: 'unweighed' });
  }
  return out;
}
/**
 * Per-serving figures from weighed lines, shared by this estimate and the learned one (dynamic.mjs). `entries` are
 * { grams, per100 }, where per100 null means weighed but not matched. Needs 90% of the weight matched; a nutrient is
 * left out when more than 10% of the weight lacks it. Returns the Recipe.nutrition object or null.
 */
export function nutritionFrom(entries, servings) {
  const totals = {}, missing = {};
  let nutritive = 0, matched = 0;
  for (const { grams, per100: row } of entries) {
    nutritive += grams;
    if (!row) continue;
    matched += grams;
    for (const n of nutrients) {
      if (typeof row[n] === 'number') totals[n] = (totals[n] ?? 0) + (row[n] * grams) / 100;
      else missing[n] = (missing[n] ?? 0) + grams;
    }
  }
  if (!nutritive || matched / nutritive < MIN_COVERAGE || !(totals.kcal > 0)) return null;
  const omitted = new Set(nutrients.filter(n => (missing[n] ?? 0) / nutritive > MAX_MISSING_SHARE));
  if (omitted.has('kcal')) return null;
  const perServing = { kcal: Math.round(totals.kcal / servings) };
  for (const n of nutrients) if (n !== 'kcal' && !omitted.has(n) && totals[n] !== undefined) perServing[n] = Math.round((totals[n] / servings) * 10) / 10;
  if (!(perServing.kcal > 0 && perServing.kcal <= 3000)) return null;
  return { basis: 'estimate', coverage: Math.round((matched / nutritive) * 100) / 100, checkedAt: new Date().toISOString().slice(0, 10), perServing };
}
/** Nutrition object for Recipe.nutrition, or null when the lines cannot be weighed reliably. */
export function estimateNutrition({ servings, ingredients }) {
  if (!(Number.isInteger(servings) && servings > 0)) return null;
  const entries = [];
  for (const line of ingredients ?? []) {
    if (line.amount === null || line.amount === undefined) continue;
    const hit = matchFood(line.name);
    if (!hit) return null;
    if (hit.food.negligible) continue;
    const grams = gramsFor(line, hit.food);
    if (grams === undefined || grams > MAX_GRAMS) return null;
    const row = hit.food.usda ? per100[hit.food.usda] : undefined;
    if (!row) return null;
    entries.push({ grams, per100: row });
  }
  return nutritionFrom(entries, servings);
}
export const nutritionTableKeys = () => Object.entries(table.foods).filter(([, food]) => !food.negligible).map(([key, food]) => ({ key, name: food.name }));
