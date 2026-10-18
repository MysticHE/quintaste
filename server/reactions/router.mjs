import { pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, member, throttle } from '../community/http.mjs';
import { notRestricted } from '../community/router.mjs';
import { publishedPlaceIds } from '../catalogue-places.mjs';
import { rowId } from '../recipes/rules.mjs';

/**
 * Likes and shares on Cook recipes and Explore places: /api/reactions/recipe and /api/reactions/place.
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
/** Writes need an item members can see: a published place, or a live member recipe. */
async function writable(kind, raw) {
  const [id] = await targets(kind, [raw]);
  if (!id) throw unavailable(kind);
  if (kind === 'recipe' && id.startsWith('member-')) {
    const found = await pool.query(`SELECT 1 FROM recipes.recipe WHERE id=$1 AND live IS NOT NULL AND hidden_at IS NULL`, [rowId(id)]);
    if (!found.rowCount) throw unavailable(kind);
  }
  return id;
}
const counted = action => `(SELECT count(*)::int FROM community.reaction r WHERE r.kind=$1 AND r.target=k.id AND r.action='${action}' AND ${notRestricted('r.user_id')})`;
const mine = action => `EXISTS (SELECT 1 FROM community.reaction r WHERE r.kind=$1 AND r.target=k.id AND r.action='${action}' AND r.user_id=$3)`;
async function counts(kind, ids, viewer) {
  const rows = (await pool.query(`SELECT k.id, ${counted('like')} AS likes, ${counted('share')} AS shares, ${mine('like')} AS liked, ${mine('share')} AS shared
    FROM unnest($2::text[]) AS k(id)`, [kind, [...new Set(ids.filter(Boolean))], viewer])).rows;
  return new Map(rows.map(row => [row.id, row]));
}

// One request for every item on screen. Unknown or hidden items count zero rather than failing the whole page.
reactions.get('/:kind', async (req, res) => {
  const raw = typeof req.query.ids === 'string' ? [...new Set(req.query.ids.split(',').filter(Boolean))] : [];
  if (!raw.length || raw.length > 200) throw new CommunityError(400, 'Choose up to 200 items.');
  const kind = res.locals.kind, resolved = await targets(kind, raw), found = await counts(kind, resolved, res.locals.user?.id ?? null);
  res.json({ items: raw.map((id, i) => { const row = found.get(resolved[i]);
    return { id, likes: row?.likes ?? 0, shares: row?.shares ?? 0, liked: !!row?.liked, shared: !!row?.shared }; }) });
});
async function react(req, res, action, adding) {
  const kind = res.locals.kind, me = res.locals.user.id, id = await writable(kind, req.params.id);
  await throttle(`reaction-${action}:${me}`, 300, 3600);
  if (adding) await pool.query(`INSERT INTO community.reaction(kind, target, action, user_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [kind, id, action, me]);
  else await pool.query(`DELETE FROM community.reaction WHERE kind=$1 AND target=$2 AND action=$3 AND user_id=$4`, [kind, id, action, me]);
  const row = (await counts(kind, [id], me)).get(id);
  res.json({ id: req.params.id, likes: row.likes, shares: row.shares, liked: row.liked, shared: row.shared });
}
reactions.put('/:kind/:id/like', member, (req, res) => react(req, res, 'like', true));
reactions.delete('/:kind/:id/like', member, (req, res) => react(req, res, 'like', false));
// Recorded after the share sheet completes; a member counts once per item however often they share it.
reactions.post('/:kind/:id/share', member, (req, res) => react(req, res, 'share', true));
reactions.use(errors);
