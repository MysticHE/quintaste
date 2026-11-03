import { readFileSync } from 'node:fs';
import path from 'node:path';
import { microNutrients } from './nutrients.mjs';

/**
 * Per-serving nutrition estimate from ingredient lines, the server-side twin of scripts/recipe-nutrition.ts: the same
 * reviewed key table and the food library's figures for each key (server-assets/nutrition/library-figures.json, generated
 * by scripts/library/export_tables.py), the same rules. Figures only when every
 * measured line is matched and weighed; "to taste" lines are skipped; water, pandan, tea leaves and curry leaves
 * count as matched with no nutrients; a nutrient is left out when more than 10% of the nutritive weight comes from
 * rows that lack it. Raw inputs per serving; cooking losses are not modelled.
 */
const root = path.resolve('server-assets/nutrition');
const table = JSON.parse(readFileSync(path.join(root, 'ingredient-table.json'), 'utf8'));
const figures = JSON.parse(readFileSync(path.join(root, 'library-figures.json'), 'utf8')).foods;
export const nutrients = ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium'];
/** Per-100 g figures of a reviewed table key from the food library, or null for keys without one (negligible foods). */
export const tablePer100 = key => figures[key]?.per100 ?? null;
/**
 * The USDA SR Legacy id whose household portions weigh a table key: the library record the key's figures come from when that is
 * a USDA SR food, none when the figures come from another dataset (a USDA stand-in's portions would weigh a different food),
 * the table's own `usda` only for keys without a library record.
 */
export function tablePortionsId(key, food) {
  const record = figures[key]?.record;
  if (!record) return food.usda ?? null;
  return record.startsWith('usda-sr:') ? record.slice('usda-sr:'.length) : null;
}
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
/** The food whose alias matches the longest span of the line's name (`text` is that span), or undefined. */
export function matchFood(name) {
  let best;
  for (const entry of foods) for (const pattern of entry.patterns) {
    const hit = pattern.exec(String(name ?? ''));
    if (hit && (!best || hit[0].length > best.length)) best = { ...entry, length: hit[0].length, text: hit[0] };
  }
  return best;
}
/** The reviewed table's keys, and a key as a cook names it (its first alias: 'firm tofu', not the library's 'Tofu, firm'). */
export const tableKeys = () => Object.keys(table.foods);
export const cookName = key => String(table.foods[key]?.match?.[0] ?? key).replace(/[\^$\()?|]/g, '').replace(/_/g, ' ');
/** A reviewed table key's entry (name, gPerMl, each, per, negligible), or null. */
export const tableFood = key => table.foods[key] ?? null;
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
 * left out when more than 10% of the weight lacks it; vitamins and minerals follow the same rule. Returns the Recipe.nutrition
 * object or null.
 */
export function nutritionFrom(entries, servings) {
  const totals = {}, missing = {};
  let nutritive = 0, matched = 0;
  for (const { grams, per100: row } of entries) {
    nutritive += grams;
    if (!row) continue;
    matched += grams;
    for (const n of [...nutrients, ...microNutrients]) {
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
  const micro = {};
  for (const n of microNutrients) if (totals[n] !== undefined && (missing[n] ?? 0) / nutritive <= MAX_MISSING_SHARE) micro[n] = Math.round((totals[n] / servings) * 100) / 100;
  return { basis: 'estimate', coverage: Math.round((matched / nutritive) * 100) / 100, checkedAt: new Date().toISOString().slice(0, 10), perServing,
    ...(Object.keys(micro).length ? { micro } : {}) };
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
    const row = tablePer100(hit.key);
    if (!row) return null;
    entries.push({ grams, per100: row });
  }
  return nutritionFrom(entries, servings);
}
export const nutritionTableKeys = () => Object.entries(table.foods).filter(([, food]) => !food.negligible).map(([key, food]) => ({ key, name: food.name }));
