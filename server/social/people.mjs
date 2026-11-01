import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, requireUser } from '../community/http.mjs';
import { hobbies, languages } from './options.mjs';
import { readDiets } from './rules.mjs';
import { ageFrom, meetAgeSql, friendsSql, pausedUntilSql, reachableSql, requireBrowse, seeableSql, standing, verifiedSql } from './access.mjs';
import { emptyProfile, hideable, meetColumns, photoUrl } from './profile.mjs';
import { birthSql } from '../community/birth-date.mjs';
import { notRestricted } from '../community/router.mjs';
import { allowed } from '../operations.mjs';
import { wornBy } from '../collection/worn.mjs';
import { recipesBy } from '../recipes/router.mjs';
import { itemsBy } from '../market/shop.mjs';
import { classesBy } from '../market/classes.mjs';
import { pointOf, points } from './area-points.mjs';
import { currentDinnerSql, pairSql } from './dinner-pair.mjs';

export const people = express.Router();
const areaNames = Object.keys(points), areaLats = areaNames.map(name => points[name][0]), areaLngs = areaNames.map(name => points[name][1]);
/** SQL: kilometres (one decimal) from `origin` to the centre of the area in `column`, the same great-circle sum as `areaKm`; NULL for an unknown area. */
function kmSql(column, origin, add) {
  if (!origin) return 'NULL::float8';
  const lat = add(origin[0]), lng = add(origin[1]);
  return `(SELECT round((12742 * asin(sqrt(power(sin(radians(pt.lat - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(pt.lat)) * power(sin(radians(pt.lng - ${lng}) / 2), 2))))::numeric, 1)::float8
    FROM unnest(${add(areaNames)}::text[], ${add(areaLats)}::float8[], ${add(areaLngs)}::float8[]) AS pt(name, lat, lng) WHERE lower(pt.name)=lower(trim(${column})))`;
}
/** Straight-line kilometres between two planning areas' centres, or null when either area is unknown. */
export function areaKm(a, b) {
  const p = pointOf(a), q = pointOf(b);
  if (!p || !q) return null;
  const rad = Math.PI / 180, dLat = (q[0] - p[0]) * rad, dLng = (q[1] - p[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * rad) * Math.cos(q[0] * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)) * 10) / 10;
}
/** What another member may see: hidden fields removed, birth date reduced to age, the hidden list kept private. */
export function shareable(row, photos) {
  const { birthDate, hidden = [], visible: _visible, excluded: _excluded, ...rest } = row, out = { ...rest, age: ageFrom(birthDate), photos };
  for (const key of hideable) if (hidden.includes(key)) out[key] = Array.isArray(rest[key]) ? [] : typeof rest[key] === 'number' ? null : '';
  return out;
}
/** Photo links for members, main photo first. */
export async function photosOf(ids, db = pool) {
  const map = new Map(ids.map(id => [id, []]));
  if (!ids.length) return map;
  const rows = (await db.query('SELECT id, user_id, position, digest FROM social.photo WHERE user_id = ANY($1) ORDER BY user_id, position', [ids])).rows;
  for (const row of rows) map.get(row.user_id)?.push({ url: photoUrl(row), thumb: photoUrl(row, 'thumb') });
  return map;
}
const csv = (value, choices) => typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(item => choices.includes(item)).slice(0, 12) : [];
const ageBands = { '21-29': [21, 29], '30s': [30, 39], '40-45': [40, 45] };

/**
 * People to meet: public, verified members of the opposite gender aged 21 to 45, who are not friends, have no open request with
 * the viewer, did not decline one in the last 30 days and are not blocked either way. Nearest areas first.
 */
people.get('/people', async (req, res) => {
  const me = res.locals.user.id, q = req.query, params = [me];
  const state = requireBrowse(await standing(me));
  const add = value => { params.push(value); return '$' + params.length; };
  const where = [`p.user_id<>$1 AND p.visible AND p.gender=${add(state.gender === 'woman' ? 'man' : 'woman')}`, verifiedSql('p.user_id'), meetAgeSql('p.user_id'),
    reachableSql('p.user_id', '$1'), `NOT ${friendsSql('p.user_id', '$1')}`,
    `NOT EXISTS (SELECT 1 FROM social.friend_request r WHERE ((r.from_id=$1 AND r.to_id=p.user_id) OR (r.from_id=p.user_id AND r.to_id=$1))
      AND (r.status='pending' OR (r.status='declined' AND r.decided_at > now() - interval '30 days')))`];
  const wanted = readDiets(typeof q.diets === 'string' ? q.diets.split(',') : []).filter(label => label !== 'Plant-Based');
  if (wanted.length) where.push(`p.diets @> ${add(wanted)}::text[]`);
  const spoken = csv(q.languages, languages);
  if (spoken.length) where.push(`NOT 'languages' = ANY(p.hidden) AND p.languages && ${add(spoken)}::text[]`);
  const liked = csv(q.hobbies, hobbies);
  if (liked.length) where.push(`NOT 'hobbies' = ANY(p.hidden) AND p.hobbies && ${add(liked)}::text[]`);
  const bands = csv(q.ages, Object.keys(ageBands));
  if (bands.length) where.push(`(${bands.map(band => `date_part('year', age((now() AT TIME ZONE 'Asia/Singapore')::date, ${birthSql('p.user_id')})) BETWEEN ${ageBands[band][0]} AND ${ageBands[band][1]}`).join(' OR ')})`);
  if (typeof q.q === 'string' && q.q.trim()) {
    where.push(`(p.first_name || ' ' || p.area || ' ' || p.about || ' ' || p.opening || ' ' || CASE WHEN 'hobbies' = ANY(p.hidden) THEN '' ELSE array_to_string(p.hobbies, ' ') END)
      ILIKE ${add('%' + q.q.trim().slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%')}`);
  }
  // Distance is worked out in SQL so the limit applies after the distance filter and nearest-first order, however many people match.
  const within = Number(q.km), km = kmSql('p.area', pointOf(state.area), add);
  const rows = (await pool.query(`SELECT * FROM (SELECT p.user_id AS id, ${meetColumns}, p.updated_at, ${km} AS km FROM social.profile p WHERE ${where.join(' AND ')}) x
    ${within > 0 ? `WHERE x.km <= ${add(within)}` : ''} ORDER BY x.km NULLS LAST, x.updated_at DESC LIMIT 60`, params)).rows;
  const photos = await photosOf(rows.map(row => row.id));
  res.json({ items: rows.map(({ km: distance, updated_at: _updated, ...row }) => ({ ...shareable(row, photos.get(row.id)), km: distance })), canAppear: state.canMeet });
});

/**
 * Lifestyle details are for Dining (owner, 26 Oct 2026): a profile carries them only for its owner, or for a member who can use
 * Dining looking at a photo-checked member of the opposite gender aged 21 to 45, so both can weigh them before a dinner invite.
 */
const noLifestyle = { work: '', education: '', grewUp: '', languages: [], why: [], height: null, drinking: '', smoking: '', pets: [], religion: '', ethnicity: '' };
/**
 * One profile, with how the viewer stands with them: friends, a request either way, and whether a dinner invite is possible.
 * A member who never filled in a Social profile still has a page (their account name and handle), so Add friend can open it.
 */
people.get('/people/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireUser(req.params.id);
  const row = (await pool.query(`SELECT u.id, u.name AS "accountName", p.user_id IS NOT NULL AS "hasProfile", ${meetColumns}, ${friendsSql('u.id', '$1')} AS friend,
      ${verifiedSql('u.id')} AS verified, (SELECT h.handle FROM social.handle h WHERE h.user_id=u.id) AS handle,
      ${meetAgeSql('u.id')} AS adult, ${pausedUntilSql('u.id')} > now() AS "theyPaused",
      (SELECT d.id FROM social.dinner d WHERE ${currentDinnerSql('d')} AND ${pairSql('d', '$1', 'u.id')} ORDER BY d.starts LIMIT 1) AS "dinnerId",
      (SELECT json_build_object('id', r.id, 'mine', r.from_id=$1, 'note', r.note) FROM social.friend_request r WHERE r.status='pending'
        AND ((r.from_id=$1 AND r.to_id=u.id) OR (r.from_id=u.id AND r.to_id=$1)) LIMIT 1) AS request
    FROM public."user" u LEFT JOIN social.profile p ON p.user_id=u.id WHERE u.id=$2 AND ${seeableSql('u.id', '$1')}`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This profile is unavailable.');
  const [state, photos, posts, worn] = await Promise.all([standing(me), photosOf([id]), req.query.posts === '1' ? postsOf(id, me) : null, wornBy(id)]);
  const { friend, verified, adult, request, theyPaused, dinnerId, accountName, hasProfile, ...stored } = row;
  // Without a Social profile every field is empty but the name, which comes from the account.
  const profile = hasProfile ? stored : { ...emptyProfile, ...Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== null)), firstName: accountName || 'Member' };
  const opposite = !!state.gender && !!profile.gender && state.gender !== profile.gender;
  // The same rules the server applies when an invite is sent (dinners.mjs requirePair), plus one dinner at a time per pair:
  // `dinnerId` is the invite waiting or the confirmed dinner not yet over (dinner-pair.mjs), which the profile and chat open
  // instead of Invite. `openInvite` mirrors it for app builds from before 1 Nov 2026, which only know that field and would
  // otherwise say the friend can't take invites.
  const dining = id === me || (state.canMeet && opposite && verified && adult), shared = shareable(profile, photos.get(id));
  res.json({ ...(dining ? shared : { ...shared, ...noLifestyle }), km: areaKm(state.area, profile.area), verified, friend, request, openInvite: !!dinnerId, dinnerId,
    canInvite: friend && opposite && verified && adult && !theyPaused && !dinnerId && state.canMeet && !state.pausedUntil, worn, ...(posts ? { posts } : {}) });
});

/**
 * With `?posts=1` (their profile page) the person also carries their posts, as their own Social profile shows them: live
 * recipes, items on sale and classes, each only while its service is on and its own rules let the viewer open it, plus their
 * friend count (never the friends). Called only after the seeable check above passed.
 */
async function postsOf(id, me) {
  const [recipesOn, marketOn, friends] = await Promise.all([allowed('recipes'), allowed('market'),
    pool.query(`SELECT count(*)::int AS n FROM social.friend f WHERE (f.a_id=$1 OR f.b_id=$1) AND ${notRestricted('CASE WHEN f.a_id=$1 THEN f.b_id ELSE f.a_id END')}`, [id])]);
  const [recipes, items, classes] = await Promise.all([recipesOn ? recipesBy(id, me) : [], marketOn ? itemsBy(id, me) : [], marketOn ? classesBy(id, me) : []]);
  return { friends: friends.rows[0].n, recipes, items, classes };
}
