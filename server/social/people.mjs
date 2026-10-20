import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, requireUser, throttle } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { publishedPlaceIds } from '../catalogue-places.mjs';
import { placeView } from './places.mjs';
import { liveSql } from './group-core.mjs';
import { languages, religions, hobbies, hereFor } from './options.mjs';
import { legacyDiet, newerColumns, profileColumns, profileIssue, readDiets, readProfile, shareable, sizes, storedPractices, times } from './rules.mjs';

export const people = express.Router();
/** Fields added on 20 Oct 2026; older apps never send them. */
const newer = ['hereFor', 'gender', 'birthYear', 'religion', 'ethnicity', 'why', 'hobbies', 'languages', 'education', 'work', 'grewUp', 'height', 'drinking', 'smoking',
  'family', 'pets', 'spots', 'prompts', 'opening', 'hidden'];
const empty = { firstName: '', area: '', diets: ['Plant-Based'], diet: 'Vegetarian', practices: [], times: [], size: 4, about: '', interests: [], excluded: [], visible: false,
  hereFor: 'makan', gender: '', birthYear: null, religion: '', ethnicity: '', why: [], hobbies: [], languages: [], education: '', work: '', grewUp: '', height: null,
  drinking: '', smoking: '', family: '', pets: [], spots: [], prompts: [], opening: '', hidden: ['gender', 'ethnicity'], pausedUntil: null, hasFace: false, tables: 0, noShows: 0 };
people.get('/me', async (_req, res) => {
  const me = res.locals.user;
  const row = (await pool.query(`SELECT ${profileColumns} FROM social.profile p WHERE p.user_id=$1`, [me.id])).rows[0];
  res.json({ id: me.id, accountName: me.name, profile: row ? { ...row, id: undefined } : empty });
});
people.put('/me', async (req, res) => {
  // `legacy` (an older app sent only diet) needs nothing more for profiles: its practices carry Vegetarian.
  const { legacy: _legacy, ...p } = readProfile(req.body?.profile), me = res.locals.user.id;
  await throttle('social-profile:' + me, 120, 3600);
  // Spots are places Social can show and plan at: published packaged catalogue places.
  p.spots = (await publishedPlaceIds(p.spots)).filter(id => id && placeView(id));
  // Apps from before 20 Oct 2026 send none of the newer fields; the stored values stay instead of being reset.
  const stored = (await pool.query(`SELECT ${newerColumns} FROM social.profile p WHERE p.user_id=$1`, [me])).rows[0], body = req.body?.profile ?? {};
  if (stored) for (const key of newer) if (!(key in body)) p[key] = stored[key];
  const paused = (await pool.query('SELECT paused_until FROM social.profile WHERE user_id=$1 AND paused_until > now()', [me])).rows[0];
  if (p.visible && (profileIssue(p) || paused)) p.visible = false;
  p.diet = legacyDiet(p.diets);
  await pool.query(`INSERT INTO social.profile(user_id,first_name,area,diet,practices,times,group_size,about,interests,excluded,visible,diets,here_for,gender,birth_year,religion,
      ethnicity,why,hobbies,languages,education,work,grew_up,height,drinking,smoking,family,pets,spots,prompts,opening,hidden)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
    ON CONFLICT(user_id) DO UPDATE SET first_name=$2,area=$3,diet=$4,practices=$5,times=$6,group_size=$7,about=$8,interests=$9,excluded=$10,visible=$11,diets=$12,
      here_for=$13,gender=$14,birth_year=$15,religion=$16,ethnicity=$17,why=$18,hobbies=$19,languages=$20,education=$21,work=$22,grew_up=$23,height=$24,drinking=$25,
      smoking=$26,family=$27,pets=$28,spots=$29,prompts=$30,opening=$31,hidden=$32,updated_at=now()`,
  [me, p.firstName, p.area, p.diet, storedPractices(p.practices, p.diets), p.times, p.size, p.about, p.interests, p.excluded, p.visible, p.diets, p.hereFor, p.gender,
    p.birthYear, p.religion, p.ethnicity, p.why, p.hobbies, p.languages, p.education, p.work, p.grewUp, p.height, p.drinking, p.smoking, p.family, p.pets, p.spots,
    JSON.stringify(p.prompts), p.opening, p.hidden]);
  res.json({ profile: p, paused: !!paused });
});
/** Other members who opted in, are adults, are not restricted and are not blocked either way. */
/** Recipes each member finished in Cook mode (community.reaction 'cooked'); zero when that table is not installed. */
async function cookedCounts(ids) {
  if (!ids.length) return new Map();
  try {
    const rows = (await pool.query(`SELECT user_id, count(*)::int AS n FROM community.reaction WHERE user_id = ANY($1) AND kind='recipe' AND action='cooked' GROUP BY user_id`, [ids])).rows;
    return new Map(rows.map(row => [row.user_id, row.n]));
  } catch { return new Map(); }
}
const discoverable = `p.visible AND p.user_id <> $1 AND u."adultConfirmed" AND ${notRestricted('p.user_id')} AND ${notBlocked('p.user_id', '$1')}`;
const csv = value => typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 12) : [];
/**
 * People who keep every chosen label (`diets=Vegan,Vegetarian`; none = everyone). For one release older apps send
 * `diet=Vegan` and `fivePungentFree=1`; their old `diet=Vegetarian` (eggs and dairy) now matches everyone.
 */
function peopleDiets(q) {
  const chosen = typeof q.diets === 'string' ? q.diets.split(',') : Array.isArray(q.diets) ? q.diets : [...(q.diet === 'Vegan' ? ['Vegan'] : []), ...(q.fivePungentFree === '1' ? ['Vegetarian'] : [])];
  return readDiets(chosen).filter(label => label !== 'Plant-Based');
}
const ageBands = { '20s': [18, 29], '30s': [30, 39], '40s': [40, 49], '50+': [50, 120] };
/** Filters on a profile field match only members who show that field. */
function profileFilters(q, add) {
  const where = [], shown = field => `NOT '${field}' = ANY(p.hidden)`;
  if (hereFor.includes(q.hereFor)) where.push(`p.here_for = ${add(q.hereFor)}`);
  const faiths = csv(q.religions).filter(item => religions.includes(item));
  if (faiths.length) where.push(`${shown('religion')} AND p.religion = ANY(${add(faiths)}::text[])`);
  const spoken = csv(q.languages).filter(item => languages.includes(item));
  if (spoken.length) where.push(`${shown('languages')} AND p.languages && ${add(spoken)}::text[]`);
  const liked = csv(q.hobbies).filter(item => hobbies.includes(item));
  if (liked.length) where.push(`${shown('hobbies')} AND p.hobbies && ${add(liked)}::text[]`);
  const bands = csv(q.ages).filter(band => ageBands[band]);
  if (bands.length) {
    const year = new Date().getFullYear();
    where.push(`${shown('age')} AND (${bands.map(band => `(${year} - p.birth_year) BETWEEN ${ageBands[band][0]} AND ${ageBands[band][1]}`).join(' OR ')})`);
  }
  if (q.sameArea === '1') where.push(`EXISTS (SELECT 1 FROM community.area_participation a JOIN community.area_participation b ON a.layer=b.layer AND a.area_code=b.area_code
    WHERE a.user_id=p.user_id AND b.user_id=$1)`);
  return where;
}
people.get('/people', async (req, res) => {
  const me = res.locals.user.id, q = req.query, params = [me], where = [discoverable];
  const add = value => { params.push(value); return '$' + params.length; };
  const wanted = peopleDiets(q);
  if (wanted.length) where.push(`p.diets @> ${add(wanted)}::text[]`);
  if (times.includes(q.time)) where.push(`${add(q.time)} = ANY(p.times)`);
  if (sizes.includes(Number(q.prefers))) where.push(`p.group_size = ${add(Number(q.prefers))}`);
  where.push(...profileFilters(q, add));
  if (typeof q.q === 'string' && q.q.trim()) {
    where.push(`(p.first_name || ' ' || p.area || ' ' || p.about || ' ' || array_to_string(p.interests, ' ') || ' ' || CASE WHEN 'hobbies' = ANY(p.hidden) THEN '' ELSE array_to_string(p.hobbies, ' ') END) ILIKE ${add('%' + q.q.trim().slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%')}`);
  }
  const rows = (await pool.query(`SELECT ${profileColumns} FROM social.profile p JOIN public."user" u ON u.id=p.user_id
    WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC LIMIT 60`, params)).rows;
  const cooked = await cookedCounts(rows.map(row => row.id));
  res.json({ items: rows.map(row => ({ ...shareable(row), cooked: cooked.get(row.id) ?? 0 })) });
});
people.get('/people/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireUser(req.params.id);
  // Visible profiles, or anyone you currently share an open group, invitation or table with, can be opened.
  const row = (await pool.query(`SELECT ${profileColumns} FROM social.profile p JOIN public."user" u ON u.id=p.user_id
    WHERE p.user_id=$2 AND ${notRestricted('p.user_id')} AND ${notBlocked('p.user_id', '$1')} AND (p.visible OR EXISTS (
      SELECT 1 FROM social.member a JOIN social.member b ON a.group_id=b.group_id WHERE a.user_id=$1 AND b.user_id=$2
        AND ${liveSql('a')} AND ${liveSql('b')}) OR EXISTS (
      SELECT 1 FROM social.member b JOIN social."group" g ON g.id=b.group_id WHERE b.user_id=$2 AND b.status='accepted' AND g.listed AND g.starts > now()
        AND (g.same_gender='' OR g.same_gender=(SELECT gender FROM social.profile WHERE user_id=$1))))`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This profile is unavailable.');
  const group = (await pool.query(`SELECT a.group_id AS id FROM social.member a JOIN social.member b ON a.group_id=b.group_id
    WHERE a.user_id=$1 AND b.user_id=$2 AND ${liveSql('a')} AND ${liveSql('b')} LIMIT 1`, [me, id])).rows[0];
  const says = (await pool.query(`SELECT k.body, coalesce(nullif(bp.first_name,''), bu.name, 'Member') AS "byName" FROM social.kaki_say k
    JOIN public."user" bu ON bu.id=k.by_id LEFT JOIN social.profile bp ON bp.user_id=k.by_id
    WHERE k.about_id=$1 AND k.shown AND ${notBlocked('k.by_id', '$2')} ORDER BY k.created_at DESC LIMIT 3`, [id, me])).rows;
  const cooked = (await cookedCounts([id])).get(id) ?? 0;
  res.json({ ...shareable(row), cooked, groupId: group?.id ?? null, kakiSays: says });
});
