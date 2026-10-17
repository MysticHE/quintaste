import { readFileSync } from 'node:fs';
import { pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle } from '../community/http.mjs';

const known = new Set(JSON.parse(readFileSync(new URL('./planning-areas.json', import.meta.url), 'utf8')).map(area => area.code));
const layers = ['home', 'work'];
const readLayer = value => { if (!layers.includes(value)) throw new CommunityError(404, 'Choose Home or Work.'); return value; };
const readArea = value => { if (typeof value !== 'string' || !known.has(value)) throw new CommunityError(400, 'Choose a Singapore planning area.'); return value; };

async function mine(userId) {
  const rows = (await pool.query('SELECT layer, area_code, joined_at FROM community.area_participation WHERE user_id=$1', [userId])).rows;
  const entry = layer => { const row = rows.find(r => r.layer === layer); return row ? { area: row.area_code, joinedAt: row.joined_at } : null; };
  return { home: entry('home'), work: entry('work') };
}

/** Area participation: signed-in, age-checked members only. Only planning-area codes are stored. */
export const areas = communityRouter({ bodyLimit: '4kb' });
/** The latest weekly snapshot: bands for areas with at least 10 eligible accounts, per layer. */
areas.get('/', async (_req, res) => {
  const week = (await pool.query('SELECT week::text AS week, published_at FROM community.area_snapshot_week ORDER BY week DESC LIMIT 1')).rows[0];
  if (!week) return res.json({ week: null, publishedAt: null, home: [], work: [] });
  const rows = (await pool.query('SELECT layer, area_code, band FROM community.area_snapshot WHERE week=$1 ORDER BY area_code', [week.week])).rows;
  const of = layer => rows.filter(r => r.layer === layer).map(r => ({ area: r.area_code, band: r.band }));
  res.json({ week: week.week, publishedAt: week.published_at, home: of('home'), work: of('work') });
});
areas.get('/me', async (_req, res) => res.json(await mine(res.locals.user.id)));
/** Joins one layer only; the other layer is unchanged. */
areas.put('/me/:layer', async (req, res) => {
  const me = res.locals.user.id, layer = readLayer(req.params.layer), area = readArea(req.body?.area);
  if (req.body?.confirmed !== true) throw new CommunityError(400, 'Confirm before joining.');
  await throttle('areas:' + me, 30, 3600);
  await pool.query(`INSERT INTO community.area_participation(user_id, layer, area_code) VALUES($1,$2,$3)
    ON CONFLICT(user_id, layer) DO UPDATE SET area_code=$3, joined_at=CASE WHEN community.area_participation.area_code=$3 THEN community.area_participation.joined_at ELSE now() END`,
  [me, layer, area]);
  res.json(await mine(me));
});
/** Leaving takes effect from the next weekly snapshot. */
areas.delete('/me/:layer', async (req, res) => {
  const me = res.locals.user.id, layer = readLayer(req.params.layer);
  await throttle('areas:' + me, 30, 3600);
  await pool.query('DELETE FROM community.area_participation WHERE user_id=$1 AND layer=$2', [me, layer]);
  res.json(await mine(me));
});
areas.use(errors);
