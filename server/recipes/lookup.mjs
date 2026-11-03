import { logger, pool } from '../config.mjs';
import { editorialRecipes } from '../editorial/router.mjs';
import { notRestricted } from '../community/router.mjs';
import { staffContent, staffRecord } from '../staff-content.mjs';
import { importTs } from '../ts-import.mjs';

/**
 * A recipe as members see it, from any source the app serves: bot or staff (editorial), bundled with staff edits applied, or a
 * member's (incl. AI recipes), with its revision. Null when it is unavailable (not live, hidden, withdrawn, or its author
 * restricted). Used by game levels and swaps. A private recipe (Snap a dish) carries `privateTo`, its author's id: callers that
 * serve other people must check it.
 */
export async function loadRecipe(id) {
  // A bot record can share a bundled id; the app shows the bot's version then (/api/editorial/staff-recipes leaves it out).
  const editorial = (await editorialRecipes()).find(r => r.id === id);
  if (editorial) return { ...editorial, revision: editorial.revision ?? 1 };
  const { bundledRecipes } = await importTs('src/data/recipes.ts');
  const packaged = bundledRecipes(true).find(r => r.id === id);
  if (packaged) {
    const shown = shownBundled(packaged, await staffContent());
    return shown ? { ...shown, revision: shown.revision ?? 1 } : null;
  }
  // Members' recipes keep their name as `title` (server/recipes/rules.mjs); only live, shown recipes of unrestricted authors count.
  const row = /^member-[0-9a-f-]{36}$/.test(id) ? (await pool.query(`SELECT mr.live, mr.live_revision, mr.private, mr.author_id FROM recipes.recipe mr
    WHERE mr.id::text = $1 AND mr.live IS NOT NULL AND mr.hidden_at IS NULL AND ${notRestricted('mr.author_id')}`, [id.slice(7)])).rows[0] : null;
  return row ? { ...row.live, name: row.live.title, id, revision: row.live_revision ?? 1, ...(row.private ? { privateTo: row.author_id } : {}) } : null;
}

/** A packaged recipe as members see it: staff edits and hides win over the packaged version, as on the device (applyStaffRecipes). */
function shownBundled(packaged, staff) {
  const shown = staffRecord(staff, 'recipe', packaged.id, packaged);
  return shown && !shown.withdrawal ? shown : null;
}

/**
 * Every recipe the app serves to all members, with its author (null for QuinTaste's): live public member and AI recipes of
 * unrestricted authors, bot and staff recipes, and packaged recipes with staff edits (a bot record with the same id wins). Private
 * recipes are left out. Used by My ingredients' "Matching recipes".
 */
export async function servedRecipes() {
  const [members, editorial, staff, { bundledRecipes }] = await Promise.all([
    pool.query(`SELECT 'member-' || mr.id AS id, mr.author_id, mr.live FROM recipes.recipe mr
      WHERE mr.live IS NOT NULL AND mr.hidden_at IS NULL AND NOT mr.private AND ${notRestricted('mr.author_id')}`),
    // Without the editorial store the list still serves the other recipes.
    editorialRecipes().catch(error => { logger.warn({ event: 'served_recipes_editorial_failed', detail: String(error?.message ?? error).slice(0, 120) }); return []; }),
    staffContent(), importTs('src/data/recipes.ts')]);
  const editorialIds = new Set(editorial.map(r => r.id));
  return [
    ...members.rows.map(row => ({ recipe: { ...row.live, name: row.live.title, id: row.id }, author: row.author_id })),
    ...editorial.map(recipe => ({ recipe, author: null })),
    ...bundledRecipes(true).filter(r => !editorialIds.has(r.id)).map(r => shownBundled(r, staff)).filter(Boolean).map(recipe => ({ recipe, author: null })),
  ];
}
