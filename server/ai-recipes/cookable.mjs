import { pool } from '../config.mjs';
import { servedRecipes } from '../recipes/lookup.mjs';
import { matchFood, tableFood } from '../nutrition/estimate.mjs';
import { swapTargets } from '../swaps/plan.mjs';
import { missedTargets } from './targets.mjs';

/**
 * "Matching recipes" for My ingredients (docs/AI_FOOD_LIBRARY_PLAN.md §7): our recipes ranked by what the member has. No AI.
 * Each recipe line is linked to a food in the recipe table where it can be; a line counts as had when the member has that
 * food, or one a reviewed swap rule puts in its place, or (for a line the table does not know) an item of the same name.
 * Lines "to taste" and foods with no nutrients (water, pandan) never count as missing. Rebuilt at most every five minutes.
 */
const TTL = 5 * 60000, MOST_MISSING = 2, LIMIT = 30;
let cache = null, building = null;

const words = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** A recipe line as matching needs it: its food key, or its plain name when the table does not know it. */
function needOf(line) {
  if (line?.amount === null || typeof line?.name !== 'string') return null;
  const key = matchFood(line.name)?.key ?? null;
  if (key && tableFood(key)?.negligible) return null;
  return { key, name: line.name.split(/[,(]/)[0].trim(), text: words(line.name) };
}
async function entry(recipe, author) {
  // One need per food: a recipe that lists ginger twice (paste and garnish) still lacks only ginger.
  const needs = [...new Map((recipe.ingredients ?? []).map(needOf).filter(Boolean).map(need => [need.key ?? need.text, need])).values()];
  if (!needs.length || typeof recipe.name !== 'string') return null;
  // Fewer missed nutrient targets rank higher; a recipe without figures sits after those that meet every target.
  const missed = recipe.nutrition ? (await missedTargets(recipe, recipe.nutrition, null).catch(() => [])).length : 1;
  return { id: recipe.id, author, name: recipe.name, minutes: Number(recipe.minutes) || null, needs, missed };
}

async function build() {
  const all = await servedRecipes();
  return { at: Date.now(), recipes: (await Promise.all(all.map(({ recipe, author }) => entry(recipe, author)))).filter(Boolean) };
}
async function index() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  building ??= build().then(value => { cache = value; return value; }).finally(() => { building = null; });
  return cache ?? building;
}

/** What the member has, as food keys and plain names. `mine` marks their items (not their basics). */
function haveSet(items, pantry) {
  const keys = new Map(), names = [];
  for (const [list, mine] of [[items, true], [pantry, false]]) for (const name of list) {
    const key = matchFood(name)?.key;
    if (key && !keys.get(key)) keys.set(key, mine);
    names.push({ text: words(name), mine });
  }
  return { keys, names };
}
/** Whether the member has a recipe line, and whether one of their own items (not a basic) covers it. */
function covers(need, have) {
  if (need.key) {
    if (have.keys.has(need.key)) return { had: true, mine: have.keys.get(need.key) };
    const swap = swapTargets(need.key).find(key => have.keys.has(key));
    if (swap) return { had: true, mine: have.keys.get(swap) };
    return { had: false };
  }
  // A line the table does not know: an item with the same words ("pickled mustard greens" has "mustard greens").
  const hit = have.names.find(n => n.text && (` ${need.text} `.includes(` ${n.text} `) || ` ${n.text} `.includes(` ${need.text} `)));
  return hit ? { had: true, mine: hit.mine } : { had: false };
}

/**
 * Our recipes the member can cook, ready ones first: fewest missing (at most two), nutrient targets met, time, then not cooked
 * lately (`recent`, ids from the device). Only recipes that use at least one of the member's own items, never one whose author
 * and the viewer blocked each other.
 */
export async function cookable({ items, pantry, recent, viewer }) {
  const [{ recipes }, blocked] = await Promise.all([index(), viewer ? pool.query(
    'SELECT blocked_id AS id FROM community.block WHERE user_id=$1 UNION SELECT user_id FROM community.block WHERE blocked_id=$1', [viewer]) : { rows: [] }]);
  const hidden = new Set(blocked.rows.map(row => row.id)), lately = new Set(recent), have = haveSet(items, pantry);
  const found = [];
  for (const recipe of recipes) {
    if (recipe.author && hidden.has(recipe.author)) continue;
    const missing = [];
    let used = 0;
    for (const need of recipe.needs) {
      const cover = covers(need, have);
      if (!cover.had) missing.push(need.name);
      else if (cover.mine) used++;
      if (missing.length > MOST_MISSING) break;
    }
    if (missing.length <= MOST_MISSING && used > 0) found.push({ ...recipe, missing, lately: lately.has(recipe.id) });
  }
  found.sort((a, b) => a.missing.length - b.missing.length || a.missed - b.missed || (a.minutes ?? 999) - (b.minutes ?? 999)
    || Number(a.lately) - Number(b.lately) || a.name.localeCompare(b.name));
  return found.slice(0, LIMIT).map(r => ({ id: r.id, name: r.name, minutes: r.minutes, missing: r.missing }));
}
