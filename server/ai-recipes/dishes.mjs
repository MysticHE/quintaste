import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tableFood } from '../nutrition/estimate.mjs';

/**
 * Dish cards and the replacement guide for Snap a dish (docs/AI_FOOD_LIBRARY_PLAN.md §4, §6). Code, not the AI, decides the usual
 * parts of a dish (its card) and which plant food replaces each animal or five-pungent part (the guide, in order of preference).
 * Both files are drafted by QuinTaste and wait for staff or cook review; Snap a dish stays on the master account until then.
 */
const root = path.resolve('server-assets/nutrition');
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
export const cards = existsSync(path.join(root, 'dish-cards.json')) ? read('dish-cards.json').cards : [];
const guide = read('replacements.json').parts.map(part => ({ ...part, patterns: part.match.map(pattern => new RegExp(pattern, 'i')) }));

/** One spelling of a dish name for matching: lower case, letters and digits, no "vegetarian"/"vegan"/"meat-free" in front. */
export const dishKey = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/^(vegetarian|vegan|meat free|meatless|plant based)\s+/, '').trim();
const names = card => [card.name.en, card.name.zh, ...(card.aliases ?? [])].map(dishKey).filter(Boolean);
const index = cards.map(card => ({ card, keys: names(card) }));

/**
 * The dish card for a name the AI or the member gave: its name or an alias only. A near spelling can be another dish ("fish soup"
 * and "fishball soup"), so without an exact match the recipe follows what the photo shows instead.
 */
export function findCard(name) {
  const key = dishKey(name);
  return key ? index.find(entry => entry.keys.includes(key))?.card ?? null : null;
}
export const cardById = id => cards.find(card => card.id === id) ?? null;

/** The guide's part for an ingredient name: the one whose pattern matches the longest span ("minced pork" is minced meat, not pork). */
export function guidePart(name) {
  let best = null, length = 0;
  for (const part of guide) for (const pattern of part.patterns) {
    const hit = pattern.exec(String(name ?? ''));
    if (hit && hit[0].length > length) { best = part; length = hit[0].length; }
  }
  // A plant version ("vegetarian chicken", "vegan cheese", "mushroom oyster sauce", 素鸡) is not the animal food it is named after;
  // the five pungent stay pungent whatever they are called.
  return best && best.diet !== 'pungent' && PLANT_VERSION.test(String(name ?? '')) ? null : best;
}
const PLANT_VERSION = /\b(vegetarian|vegan|plant[- ]based|meat[- ]?free|meatless|mock|faux|imitation|veggie|konjac)\b|\bmushroom (oyster|stir[- ]fry) sauce\b|[素斋]/i;
/** Whether a guide part must go for the diet chosen: meat and seafood always; egg, dairy and honey for Vegan; the five pungent for Vegetarian. */
const replaced = (part, diet) => part.diet === 'meat' || part.diet === 'seafood' || (part.diet === 'animal' && diet !== 'vegetarian') || (part.diet === 'pungent' && diet !== 'vegan');

/**
 * What the recipe keeps and what it replaces, from the dish's parts (a card's, or the parts the AI saw when there is no card):
 * each replaced part gets the guide's first option not already used for another part, so chicken and prawns do not both become tofu.
 * `diet`: 'vegan', 'vegetarian' (no five pungent, QuinTaste's meaning) or 'both'.
 */
export function replacementPlan(parts, diet) {
  const keep = [], replace = [], used = new Set();
  for (const item of parts) {
    const part = guidePart(item.name);
    if (!part || !replaced(part, diet)) { keep.push(item); continue; }
    // An option suits the part's role in this dish (scrambled egg is firm tofu; egg that binds is flour and water), then not yet used.
    const suits = part.options.filter(o => !o.roles || !item.role || o.roles.includes(item.role));
    const pool = suits.length ? suits : part.options;
    const option = pool.find(o => !used.has(o.to ?? o.name.en)) ?? pool[0];
    used.add(option.to ?? option.name.en);
    replace.push({ from: item.name, grams: item.grams ?? null, role: item.role ?? null, part: part.key,
      to: { key: option.to, name: option.name, technique: option.technique, known: !!option.to && !!tableFood(option.to) },
      others: part.options.filter(o => o !== option).map(o => o.name.en) });
  }
  return { keep, replace };
}
