import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, requireUser, throttle } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { profileColumns, profileIssue, readProfile, sizes, times } from './rules.mjs';

export const people = express.Router();
const empty = { firstName: '', area: '', diet: 'Vegan', practices: [], times: [], size: 4, about: '', interests: [], excluded: [], visible: false };
people.get('/me', async (_req, res) => {
  const me = res.locals.user;
  const row = (await pool.query(`SELECT ${profileColumns} FROM social.profile p WHERE p.user_id=$1`, [me.id])).rows[0];
  res.json({ id: me.id, accountName: me.name, profile: row ? { ...row, id: undefined } : empty });
});
people.put('/me', async (req, res) => {
  const me = res.locals.user.id, p = readProfile(req.body?.profile);
  await throttle('social-profile:' + me, 120, 3600);
  if (p.visible && profileIssue(p)) p.visible = false;
  await pool.query(`INSERT INTO social.profile(user_id,first_name,area,diet,practices,times,group_size,about,interests,excluded,visible)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(user_id) DO UPDATE SET first_name=$2,area=$3,diet=$4,practices=$5,times=$6,group_size=$7,about=$8,
    interests=$9,excluded=$10,visible=$11,updated_at=now()`, [me, p.firstName, p.area, p.diet, p.practices, p.times, p.size, p.about, p.interests, p.excluded, p.visible]);
  res.json({ profile: p });
});
/** Other members who opted in, are adults, are not restricted and are not blocked either way. */
const discoverable = `p.visible AND p.user_id <> $1 AND u."adultConfirmed" AND ${notRestricted('p.user_id')} AND ${notBlocked('p.user_id', '$1')}`;
people.get('/people', async (req, res) => {
  const me = res.locals.user.id, q = req.query, params = [me], where = [discoverable];
  const add = value => { params.push(value); return '$' + params.length; };
  if (q.diet === 'Vegan' || q.diet === 'Vegetarian') where.push(`p.diet = ${add(q.diet)}`);
  if (times.includes(q.time)) where.push(`${add(q.time)} = ANY(p.times)`);
  if (sizes.includes(Number(q.prefers))) where.push(`p.group_size = ${add(Number(q.prefers))}`);
  if (q.fivePungentFree === '1') where.push(`'No five pungent' = ANY(p.practices)`);
  if (typeof q.q === 'string' && q.q.trim()) {
    where.push(`(p.first_name || ' ' || p.area || ' ' || p.about || ' ' || array_to_string(p.interests, ' ')) ILIKE ${add('%' + q.q.trim().slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%')}`);
  }
  const rows = (await pool.query(`SELECT ${profileColumns} FROM social.profile p JOIN public."user" u ON u.id=p.user_id
    WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC LIMIT 60`, params)).rows;
  res.json({ items: rows });
});
people.get('/people/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireUser(req.params.id);
  // Visible profiles, or anyone you currently share an open group or invitation with, can be opened.
  const row = (await pool.query(`SELECT ${profileColumns} FROM social.profile p JOIN public."user" u ON u.id=p.user_id
    WHERE p.user_id=$2 AND ${notRestricted('p.user_id')} AND ${notBlocked('p.user_id', '$1')} AND (p.visible OR EXISTS (
      SELECT 1 FROM social.member a JOIN social.member b ON a.group_id=b.group_id WHERE a.user_id=$1 AND b.user_id=$2
        AND a.status IN ('invited','accepted') AND b.status IN ('invited','accepted')))`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This profile is unavailable.');
  const group = (await pool.query(`SELECT a.group_id AS id FROM social.member a JOIN social.member b ON a.group_id=b.group_id
    WHERE a.user_id=$1 AND b.user_id=$2 AND a.status IN ('invited','accepted') AND b.status IN ('invited','accepted') LIMIT 1`, [me, id])).rows[0];
  res.json({ ...row, groupId: group?.id ?? null });
});
