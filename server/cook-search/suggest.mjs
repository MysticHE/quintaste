import { pool, logger } from '../config.mjs';
import { notRestricted } from '../community/router.mjs';
import { categories } from '../recipes/rules.mjs';
import { editorialRecipes } from '../editorial/router.mjs';
import { normaliseTerm, similarity, trigrams } from './terms.mjs';

/**
 * What Cook's search box can suggest: every recipe members can see (member and AI recipes in recipes.recipe, bot and
 * staff recipes from the editorial store), names staff linked to an existing recipe, categories, and the most used
 * ingredients. Bundled recipes are matched on the device. Rebuilt at most every five minutes.
 */
const TTL = 5 * 60000, INGREDIENTS = 60, MIN_SIMILARITY = 0.3, LIMIT = 8;
let cache = null, building = null;

/** The phrase, its words and the trigrams of each, so a typo in one word ("larksa") still finds "Vegan Laksa". */
const keyed = key => { const words = key.split(' '); return { key, words, grams: trigrams(key), wordGrams: words.map(word => trigrams(word)) }; };
/** One suggestion: shown as `text`, found by `match` (a linked name shows the recipe's title but is found by that name). */
const entry = (kind, text, extra = {}, match = text) => {
  const key = normaliseTerm(match);
  return key ? { kind, text, ...keyed(key), ...extra } : null;
};
/** "roasted peanuts, crushed" → "roasted peanuts": the part of an ingredient line people search for. */
const ingredientName = name => String(name).split(/[,(]/)[0].replace(/\b(fresh|dried|chopped|sliced|minced|diced|crushed|ground|optional)\b/gi, ' ').trim();

async function build() {
  const [members, editorial, linked] = await Promise.all([
    pool.query(`SELECT 'member-' || mr.id AS id, mr.author_id, mr.live->>'title' AS title, (mr.live->>'minutes')::int AS minutes,
        coalesce((SELECT array_agg(i->>'name') FROM jsonb_array_elements(mr.live->'ingredients') i), '{}') AS ingredients
      FROM recipes.recipe mr WHERE mr.live IS NOT NULL AND mr.hidden_at IS NULL AND ${notRestricted('mr.author_id')}`),
    editorialRecipes().catch(error => { logger.warn({ event: 'cook_suggest_editorial_failed', detail: String(error?.message ?? error).slice(0, 120) }); return []; }),
    pool.query("SELECT term, recipe_id FROM recipes.demand WHERE status='linked' AND recipe_id IS NOT NULL").catch(() => ({ rows: [] })),
  ]);
  const recipes = [
    ...members.rows.map(r => ({ id: r.id, author: r.author_id, name: r.title, minutes: r.minutes, ingredients: r.ingredients })),
    ...editorial.map(r => ({ id: r.id, author: null, name: r.name, minutes: r.minutes, ingredients: (r.ingredients ?? []).map(i => i.name) })),
  ].filter(r => typeof r.name === 'string' && r.name);
  const byId = new Map(recipes.map(r => [r.id, r]));
  const counts = new Map();
  for (const recipe of recipes) for (const name of new Set(recipe.ingredients.map(ingredientName).map(n => n.toLowerCase()).filter(n => n.length >= 3))) counts.set(name, (counts.get(name) ?? 0) + 1);
  const entries = [
    ...recipes.map(r => entry('recipe', r.name, { recipeId: r.id, minutes: r.minutes, author: r.author, weight: 1 })),
    ...linked.rows.map(row => { const r = byId.get(row.recipe_id); return r && entry('recipe', r.name, { recipeId: r.id, minutes: r.minutes, author: r.author, weight: 0.9 }, row.term); }),
    ...categories.map(c => entry('category', c, { weight: 0.8 })),
    ...[...counts].sort((a, b) => b[1] - a[1]).slice(0, INGREDIENTS).map(([name]) => entry('term', name, { weight: 0.7 })),
  ].filter(Boolean);
  const haystacks = recipes.map(r => ({ author: r.author, text: normaliseTerm([r.name, ...r.ingredients].join(' ').slice(0, 2000)) || r.name.toLowerCase() }));
  return { at: Date.now(), entries, haystacks };
}
async function index() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  building ??= build().then(value => { cache = value; return value; }).finally(() => { building = null; });
  return cache ?? building;
}
/**
 * Accounts the viewer blocked or was blocked by, kept a minute per viewer (suggestions arrive several times a second while
 * typing). A block made in that minute can still show a title here; opening the recipe is refused by the recipe route.
 */
const BLOCK_TTL = 60000, BLOCK_VIEWERS = 2000, blocks = new Map();
async function blockedBy(viewer) {
  const kept = blocks.get(viewer);
  if (kept && Date.now() - kept.at < BLOCK_TTL) return kept.ids;
  const rows = (await pool.query('SELECT blocked_id AS id FROM community.block WHERE user_id=$1 UNION SELECT user_id FROM community.block WHERE blocked_id=$1', [viewer])).rows;
  const ids = new Set(rows.map(row => row.id));
  blocks.delete(viewer);
  if (blocks.size >= BLOCK_VIEWERS) blocks.delete(blocks.keys().next().value);
  blocks.set(viewer, { at: Date.now(), ids });
  return ids;
}
function score(e, q, qGrams) {
  if (e.key.startsWith(q)) return 3;
  if (e.words.some(word => word.startsWith(q))) return 2.5;
  if (e.key.includes(q)) return 2;
  const sim = Math.max(similarity(qGrams, e.grams), ...e.wordGrams.map(grams => similarity(qGrams, grams)));
  return sim >= MIN_SIMILARITY ? 1 + sim : 0;
}

/** Up to eight suggestions for what has been typed; recipes first, never a recipe whose author and viewer blocked each other. */
export async function suggest(text, viewer) {
  const q = normaliseTerm(text) || String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (q.length < 2) return [];
  const { entries } = await index(), qGrams = trigrams(q), seen = new Set();
  const matched = entries.map(e => ({ e, s: score(e, q, qGrams) * e.weight })).filter(x => x.s > 0);
  // Only member recipes have authors; the block list is read only when one of them matched.
  const blocked = viewer && matched.some(x => x.e.author) ? await blockedBy(viewer) : null;
  return matched.filter(x => !(blocked && x.e.author && blocked.has(x.e.author)))
    .sort((a, b) => b.s - a.s || a.e.text.localeCompare(b.e.text))
    .filter(({ e }) => { const id = e.recipeId ?? e.kind + ':' + e.key; if (seen.has(id)) return false; seen.add(id); return true; })
    .slice(0, LIMIT)
    .map(({ e }) => e.kind === 'recipe' ? { kind: 'recipe', text: e.text, recipeId: e.recipeId, minutes: e.minutes ?? null } : { kind: e.kind, text: e.text });
}
/** How many server-side recipes a search finds, the same substring match Cook's lists use. */
export async function serverMatches(term) {
  const { haystacks } = await index();
  return haystacks.filter(h => h.text.includes(term)).length;
}
export const forgetSuggestions = () => { cache = null; };
