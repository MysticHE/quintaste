import { pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, member, throttle } from '../community/http.mjs';
import { notRestricted } from '../community/router.mjs';
import { placeAliases, publishedPlaceIds } from '../catalogue-places.mjs';
import { rowId } from '../recipes/rules.mjs';
import { publishedRecipe } from '../editorial/router.mjs';

/**
 * Likes and shares on Cook recipes and Explore places (/api/reactions/recipe, /api/reactions/place), and how many
 * members finished cooking each recipe.
 * Anyone can read the counts; liking and recording a share need a signed-in, age-checked member, once each per item.
 * Restricted accounts drop out of the counts.
 */
export const reactions = communityRouter({ guests: true, bodyLimit: '1kb' });
const kinds = ['recipe', 'place'];
const unavailable = kind => new CommunityError(404, kind === 'place' ? 'This place is unavailable.' : 'This recipe is unavailable.');
reactions.param('kind', (_req, res, next, kind) => kinds.includes(kind) ? (res.locals.kind = kind, next()) : next(new CommunityError(404, 'Not found.')));

/** Recipe ids are kept as given (private drafts never leave the phone); place ids resolve to their published id. */
async function targets(kind, raw) {
  if (kind === 'place') return publishedPlaceIds(raw);
  return raw.map(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) && !id.startsWith('private-') ? id : null);
}
/** Liking or sharing needs an item members can see now: a published place, a live member recipe, or a published QuinTaste recipe. */
async function writable(kind, raw) {
  const [id] = await targets(kind, [raw]);
  if (!id) throw unavailable(kind);
  if (kind === 'recipe') {
    const live = id.startsWith('member-')
      ? (await pool.query(`SELECT 1 FROM recipes.recipe WHERE id=$1 AND live IS NOT NULL AND hidden_at IS NULL`, [rowId(id)])).rowCount > 0
      : await publishedRecipe(id);
    if (!live) throw unavailable(kind);
  }
  return id;
}
/** Removing a like works even after staff hide or unpublish the item, so nobody is stuck with a like they can't take back. */
function removable(kind, raw) {
  if (typeof raw !== 'string' || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(raw)) throw unavailable(kind);
  return kind === 'place' ? placeAliases.get(raw) ?? raw : raw;
}
const counted = action => `(SELECT count(*)::int FROM community.reaction r WHERE r.kind=$1 AND r.target=k.id AND r.action='${action}' AND ${notRestricted('r.user_id')})`;
const mine = action => `EXISTS (SELECT 1 FROM community.reaction r WHERE r.kind=$1 AND r.target=k.id AND r.action='${action}' AND r.user_id=$3)`;
async function counts(kind, ids, viewer) {
  const rows = (await pool.query(`SELECT k.id, ${counted('like')} AS likes, ${counted('share')} AS shares, ${counted('cooked')} AS cooks,
      ${mine('like')} AS liked, ${mine('share')} AS shared, ${mine('cooked')} AS cooked
    FROM unnest($2::text[]) AS k(id)`, [kind, [...new Set(ids.filter(Boolean))], viewer])).rows;
  return new Map(rows.map(row => [row.id, row]));
}

// One request for every item on screen. Unknown or hidden items count zero rather than failing the whole page.
reactions.get('/:kind', async (req, res) => {
  const raw = typeof req.query.ids === 'string' ? [...new Set(req.query.ids.split(',').filter(Boolean))] : [];
  if (!raw.length || raw.length > 200) throw new CommunityError(400, 'Choose up to 200 items.');
  const kind = res.locals.kind, resolved = await targets(kind, raw), found = await counts(kind, resolved, res.locals.user?.id ?? null);
  res.json({ items: raw.map((id, i) => { const row = found.get(resolved[i]);
    return { id, likes: row?.likes ?? 0, shares: row?.shares ?? 0, cooks: row?.cooks ?? 0, liked: !!row?.liked, shared: !!row?.shared, cooked: !!row?.cooked }; }) });
});
async function react(req, res, action, adding) {
  const kind = res.locals.kind, me = res.locals.user.id, id = adding ? await writable(kind, req.params.id) : removable(kind, req.params.id);
  await throttle(`reaction-${action}:${me}`, 300, 3600);
  if (adding) await pool.query(`INSERT INTO community.reaction(kind, target, action, user_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [kind, id, action, me]);
  else await pool.query(`DELETE FROM community.reaction WHERE kind=$1 AND target=$2 AND action=$3 AND user_id=$4`, [kind, id, action, me]);
  const row = (await counts(kind, [id], me)).get(id);
  res.json({ id: req.params.id, likes: row?.likes ?? 0, shares: row?.shares ?? 0, cooks: row?.cooks ?? 0, liked: !!row?.liked, shared: !!row?.shared, cooked: !!row?.cooked });
}
reactions.put('/:kind/:id/like', member, (req, res) => react(req, res, 'like', true));
reactions.delete('/:kind/:id/like', member, (req, res) => react(req, res, 'like', false));
// The app records a share once the share sheet reports it (on Android: once the sheet opens, as Android doesn't report
// a cancelled share). A member counts once per item however often they share it.
reactions.post('/:kind/:id/share', member, (req, res) => react(req, res, 'share', true));
// Sent when a member finishes Cook mode for a recipe (and once for recipes they finished before signing in).
// A member counts once per recipe however often they cook it; places have no "cooked".
reactions.post('/:kind/:id/cooked', member, (req, res) => {
  if (res.locals.kind !== 'recipe') throw new CommunityError(404, 'Not found.');
  return react(req, res, 'cooked', true);
});
reactions.use(errors);
