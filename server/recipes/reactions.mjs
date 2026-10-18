import { pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, member, throttle } from '../community/http.mjs';
import { notRestricted } from '../community/router.mjs';
import { rowId } from './rules.mjs';

/**
 * Likes and shares on Cook recipes. Anyone can read the counts; liking and recording a share need a signed-in,
 * age-checked member, once each per recipe. Restricted accounts drop out of the counts.
 */
export const recipeReactions = communityRouter({ guests: true, bodyLimit: '1kb' });
const unavailable = () => new CommunityError(404, 'This recipe is unavailable.');
function recipeKey(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(value) || value.startsWith('private-')) throw unavailable();
  return value;
}
/** Member recipes must be live; bundled and QuinTaste recipes are identified by their published id. */
async function checkRecipe(id) {
  if (!id.startsWith('member-')) return;
  const found = await pool.query(`SELECT 1 FROM recipes.recipe WHERE id=$1 AND live IS NOT NULL AND hidden_at IS NULL`, [rowId(id)]);
  if (!found.rowCount) throw unavailable();
}
const counted = table => `(SELECT count(*)::int FROM recipes.${table} t WHERE t.recipe_key=k.id AND ${notRestricted('t.user_id')})`;
async function counts(ids, viewer) {
  const rows = (await pool.query(`SELECT k.id, ${counted('recipe_like')} AS likes, ${counted('recipe_share')} AS shares,
      EXISTS (SELECT 1 FROM recipes.recipe_like l WHERE l.recipe_key=k.id AND l.user_id=$2) AS liked,
      EXISTS (SELECT 1 FROM recipes.recipe_share s WHERE s.recipe_key=k.id AND s.user_id=$2) AS shared
    FROM unnest($1::text[]) AS k(id)`, [ids, viewer])).rows;
  return ids.map(id => rows.find(row => row.id === id));
}

// One request for every recipe on screen.
recipeReactions.get('/', async (req, res) => {
  const ids = typeof req.query.ids === 'string' ? [...new Set(req.query.ids.split(',').filter(Boolean))] : [];
  if (!ids.length || ids.length > 60) throw new CommunityError(400, 'Choose recipes.');
  res.json({ items: await counts(ids.map(recipeKey), res.locals.user?.id ?? null) });
});
async function react(req, res, table, adding) {
  const id = recipeKey(req.params.id), me = res.locals.user.id;
  await throttle(`recipe-${table}:${me}`, 300, 3600);
  if (adding) {
    await checkRecipe(id);
    await pool.query(`INSERT INTO recipes.${table}(recipe_key, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [id, me]);
  } else await pool.query(`DELETE FROM recipes.${table} WHERE recipe_key=$1 AND user_id=$2`, [id, me]);
  res.json((await counts([id], me))[0]);
}
recipeReactions.put('/:id/like', member, (req, res) => react(req, res, 'recipe_like', true));
recipeReactions.delete('/:id/like', member, (req, res) => react(req, res, 'recipe_like', false));
// Recorded after the share sheet opens; a member counts once per recipe however often they share it.
recipeReactions.post('/:id/share', member, (req, res) => react(req, res, 'recipe_share', true));
recipeReactions.use(errors);
