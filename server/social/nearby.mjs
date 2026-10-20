import express from 'express';
import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import { pool } from '../config.mjs';
import { CommunityError, requireId, requireUser, throttle } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { minimumGroup } from '../areas/snapshot.mjs';
import { kakiSql } from './group-core.mjs';

export const nearby = express.Router();
const nameOf = `coalesce(nullif(p.first_name,''), u.name, 'Member')`;
const face = column => `EXISTS (SELECT 1 FROM social.face f WHERE f.user_id=${column})`;

/**
 * A picture the member chose to show (normally their own avatar). The app shrinks it first: production requests are
 * capped at 16 KB at the edge (deploy/compose.yml), so the data URI is at most 15,000 characters. Stored as 160-pixel WebP.
 */
nearby.put('/me/face', async (req, res) => {
  const me = res.locals.user.id, uri = req.body?.image;
  await throttle('social-face:' + me, 20, 3600);
  if (typeof uri !== 'string' || uri.length > 15000 || !/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) throw new CommunityError(400, 'Choose a picture to show.');
  const input = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
  let image;
  try { image = await sharp(input, { limitInputPixels: 1000000, animated: false }).rotate().resize(160, 160, { fit: 'cover' }).webp({ quality: 78 }).toBuffer(); }
  catch { throw new CommunityError(400, 'That picture could not be read.'); }
  finally { input.fill(0); }
  if (image.length > 60000) throw new CommunityError(400, 'That picture is too detailed. Choose another.');
  await pool.query(`INSERT INTO social.face(user_id,image) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET image=$2, updated_at=now()`, [me, image]);
  res.json({ hasFace: true });
});
nearby.delete('/me/face', async (_req, res) => {
  await pool.query('DELETE FROM social.face WHERE user_id=$1', [res.locals.user.id]);
  res.json({ hasFace: false });
});
/** Faces follow profile access: yourself, visible members, people you share a group with, and people seated at an open table. */
nearby.get('/faces/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireUser(req.params.id);
  const row = (await pool.query(`SELECT f.image FROM social.face f LEFT JOIN social.profile p ON p.user_id=f.user_id WHERE f.user_id=$2 AND (f.user_id=$1 OR (
      ${notRestricted('f.user_id')} AND ${notBlocked('f.user_id', '$1')} AND (coalesce(p.visible, false)
      OR EXISTS (SELECT 1 FROM social.member a JOIN social.member b ON a.group_id=b.group_id WHERE a.user_id=$1 AND b.user_id=$2 AND a.status IN ('invited','accepted','left') AND b.status IN ('invited','accepted','left'))
      OR EXISTS (SELECT 1 FROM social.member b JOIN social."group" g ON g.id=b.group_id WHERE b.user_id=$2 AND b.status='accepted' AND g.listed AND g.starts > now()
        AND (g.same_gender='' OR g.same_gender=(SELECT gender FROM social.profile WHERE user_id=$1))))))`, [me, id])).rows[0];
  if (!row) return res.status(404).end();
  res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' }).send(row.image);
});
/** People you have shared a meal with (both said you went), to bring along as a kaki. */
nearby.get('/kakis', async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT DISTINCT ON (u.id) u.id, ${nameOf} AS "firstName", ${face('u.id')} AS "hasFace" FROM social.member a
    JOIN social.member b ON a.group_id=b.group_id AND b.user_id<>a.user_id JOIN public."user" u ON u.id=b.user_id LEFT JOIN social.profile p ON p.user_id=u.id
    WHERE a.user_id=$1 AND ${kakiSql} AND u."adultConfirmed" AND ${notRestricted('u.id')} AND ${notBlocked('u.id', '$1')}
    ORDER BY u.id LIMIT 30`, [me])).rows;
  res.json({ items: rows });
});
/** Lines tablemates wrote about you; up to three can be shown on your profile. */
nearby.get('/me/kaki-says', async (_req, res) => {
  const rows = (await pool.query(`SELECT k.id, k.body, k.shown, ${nameOf} AS "byName" FROM social.kaki_say k JOIN public."user" u ON u.id=k.by_id
    LEFT JOIN social.profile p ON p.user_id=k.by_id WHERE k.about_id=$1 AND ${notBlocked('k.by_id', '$1')} ORDER BY k.created_at DESC LIMIT 50`, [res.locals.user.id])).rows;
  res.json({ items: rows });
});
nearby.put('/me/kaki-says/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id), shown = req.body?.shown === true;
  if (shown && Number((await pool.query('SELECT count(*) FROM social.kaki_say WHERE about_id=$1 AND shown AND id<>$2', [me, id])).rows[0].count) >= 3) {
    throw new CommunityError(409, 'Show up to three. Hide one first.');
  }
  const updated = await pool.query('UPDATE social.kaki_say SET shown=$3 WHERE id=$1 AND about_id=$2', [id, me, shown]);
  if (!updated.rowCount) throw new CommunityError(404, 'This line is unavailable.');
  res.json({ shown });
});
nearby.delete('/me/kaki-says/:id', async (req, res) => {
  await pool.query('DELETE FROM social.kaki_say WHERE id=$1 AND about_id=$2', [requireId(req.params.id), res.locals.user.id]);
  res.json({ deleted: true });
});
/**
 * Your Home and Work areas: the weekly band, the usual spots members there chose (a spot shows once three members chose
 * it; a count only from ten) and how many open tables are coming up there. Only planning-area codes are involved.
 */
nearby.get('/nearby', async (_req, res) => {
  const me = res.locals.user.id;
  const mine = (await pool.query('SELECT layer, area_code FROM community.area_participation WHERE user_id=$1 ORDER BY layer', [me])).rows;
  const week = (await pool.query('SELECT max(week) AS week FROM community.area_snapshot_week')).rows[0]?.week ?? null;
  const areas = [];
  for (const { layer, area_code: area } of mine) {
    const band = week ? (await pool.query('SELECT band FROM community.area_snapshot WHERE week=$1 AND layer=$2 AND area_code=$3', [week, layer, area])).rows[0]?.band ?? null : null;
    const spots = (await pool.query(`SELECT spot AS id, count(*)::int AS n FROM social.profile p JOIN public."user" u ON u.id=p.user_id
      JOIN community.area_participation a ON a.user_id=p.user_id AND a.layer=$1 AND a.area_code=$2, unnest(p.spots) spot
      WHERE p.visible AND NOT 'spots' = ANY(p.hidden) AND u."adultConfirmed" AND ${notRestricted('p.user_id')}
      GROUP BY spot HAVING count(*) >= 3 ORDER BY count(*) DESC, spot LIMIT 3`, [layer, area])).rows;
    const tables = (await pool.query(`SELECT count(*)::int AS n FROM social."group" g WHERE g.listed AND g.area_code=$1 AND g.starts > now()
      AND g.starts < now() + interval '8 days' AND ${notRestricted('g.created_by')} AND ${notBlocked('g.created_by', '$2')}`, [area, me])).rows[0].n;
    const diets = week ? await dietBands(week, layer, area) : [];
    areas.push({ layer, area, band, tables, diets, spots: spots.map(s => ({ id: s.id, band: s.n >= minimumGroup ? '10+' : null })) });
  }
  res.json({ areas });
});
/** This week's Vegan/Vegetarian bands for an area (published with the weekly snapshot); none before that table exists. */
async function dietBands(week, layer, area) {
  try {
    return (await pool.query('SELECT label, band FROM community.area_diet_snapshot WHERE week=$1 AND layer=$2 AND area_code=$3 ORDER BY label', [week, layer, area])).rows;
  } catch { return []; }
}
/** People you both said you would eat with again, most recent meal first. */
nearby.get('/repeat', async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT u.id, ${nameOf} AS "firstName", ${face('u.id')} AS "hasFace", max(g.starts) AS last
    FROM social.member a JOIN social.member b ON a.group_id=b.group_id AND b.user_id = ANY(a.eat_again) AND $1 = ANY(b.eat_again)
    JOIN social."group" g ON g.id=a.group_id JOIN public."user" u ON u.id=b.user_id LEFT JOIN social.profile p ON p.user_id=u.id
    WHERE a.user_id=$1 AND ${notRestricted('u.id')} AND ${notBlocked('u.id', '$1')} GROUP BY u.id, p.first_name, u.name ORDER BY last DESC LIMIT 5`, [me])).rows;
  res.json({ items: rows.map(({ last: _last, ...row }) => row) });
});
