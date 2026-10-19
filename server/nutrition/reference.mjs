import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The complete USDA SR Legacy reference (server-assets/nutrition/usda-reference.json, built by
 * scripts/nutrition/build_usda_reference.py): per-100 g figures and USDA's weighed household portions for 7,793 foods.
 * Loaded on first use. `searchUsda` gives the AI resolver a short list of candidates for an ingredient name.
 */
const NUTRIENTS = ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium'];
// Preparation and size words that do not change which food it is.
const IGNORED = new Set(['fresh', 'freshly', 'chopped', 'finely', 'roughly', 'sliced', 'thinly', 'minced', 'diced', 'grated', 'crushed', 'peeled',
  'large', 'small', 'medium', 'big', 'whole', 'cut', 'into', 'pieces', 'piece', 'and', 'or', 'of', 'the', 'a', 'for', 'to', 'taste', 'optional',
  'about', 'some', 'extra', 'plus', 'more', 'cubed', 'halved', 'quartered', 'shredded', 'trimmed', 'washed', 'cleaned', 'soaked', 'deseeded',
  'seeded', 'drained', 'rinsed', 'packed', 'heaped', 'level', 'room', 'temperature', 'cold', 'warm', 'hot', 'good', 'quality', 'organic', 'homemade', 'store', 'bought']);
const AVOID = /^(Baby Foods|Fast Foods|Restaurant Foods|Meals, Entrees, and Side Dishes|American Indian\/Alaska Native Foods)$/;

let data = null, index = null;
function load() {
  if (!data) data = JSON.parse(readFileSync(path.resolve('server-assets/nutrition/usda-reference.json'), 'utf8')).foods;
  return data;
}
const stem = word => word.length > 4 && word.endsWith('es') ? word.slice(0, -2) : word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
export const words = text => String(text ?? '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/)
  .filter(word => word.length > 1 && !IGNORED.has(word)).map(stem);

/** One USDA food: name, category, per-100 g figures (null where USDA has none) and portions [label, grams]. */
export function usdaFood(id) {
  const row = load()[String(id)];
  if (!row) return null;
  return { id: String(id), name: row[0], category: row[1], per100: Object.fromEntries(NUTRIENTS.map((n, i) => [n, row[2 + i]])), portions: row[9] };
}

// Singapore and British names to USDA wording; the AI can also suggest search terms when nothing fits.
/** @type {Array<[RegExp, string]>} */
const SYNONYMS = [[/lemongrass/, 'lemon grass'], [/\bchill?(i|ies|is|e|es)\b/, 'peppers hot chili'], [/\b(stock|broth)\b/, 'soup stock broth'],
  [/(white|caster|granulated) sugar/, 'sugars granulated'], [/\b(capsicum|bell pepper)/, 'peppers sweet'], [/\b(aubergine|brinjal)/, 'eggplant'],
  [/(coriander leaves|cilantro)/, 'coriander leaves'], [/(spring onion|scallion)/, 'onions spring or scallions'], [/bean ?curd/, 'tofu'],
  [/\bcourgette/, 'squash zucchini'], [/(plain|all purpose) flour/, 'wheat flour white all-purpose'], [/\bcornflour|cornstarch|corn starch/, 'cornstarch'],
  [/\bgula melaka|palm sugar/, 'sugars brown'], [/\bkangkung|water spinach/, 'swamp cabbage'], [/\bmung bean sprouts?|bean sprouts?/, 'mung beans sprouted'],
  [/\bsweet potato/, 'sweet potato'], [/\bchickpea/, 'chickpeas garbanzo'], [/\bpeanut oil/, 'oil peanut'], [/\b(cooking|vegetable) oil/, 'oil vegetable soybean']];
const expand = name => [name, ...SYNONYMS.filter(([pattern]) => pattern.test(String(name).toLowerCase())).map(([, words]) => words)];

function buildIndex() {
  index = Object.entries(load()).map(([id, row]) => ({ id, all: new Set(words(row[0])), head: new Set(words(row[0].split(',')[0])),
    avoid: AVOID.test(row[1]), length: row[0].length, raw: /\braw\b/i.test(row[0]) }));
}
function scoreAll(query) {
  const scored = new Map();
  for (const food of index) {
    let matched = 0, head = 0;
    for (const word of query) if (food.all.has(word)) { matched++; if (food.head.has(word)) head++; }
    if (!matched) continue;
    scored.set(food.id, matched * 4 + head * 2 + (food.raw ? 0.5 : 0) - (food.avoid ? 6 : 0) - food.length / 200);
  }
  return scored;
}

/** Up to `limit` USDA foods for an ingredient name (and its known synonyms), most shared words first, raw forms ahead. */
export function searchUsda(name, limit = 10) {
  if (!index) buildIndex();
  const best = new Map();
  for (const text of expand(name)) {
    const query = [...new Set(words(text))];
    if (!query.length) continue;
    for (const [id, score] of scoreAll(query)) if (score > (best.get(id) ?? -Infinity)) best.set(id, score);
  }
  return [...best].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => usdaFood(id));
}
