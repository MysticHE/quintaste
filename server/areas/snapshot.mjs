import { logger } from '../config.mjs';
import { transaction } from '../community/http.mjs';
import { notRestricted } from '../community/router.mjs';

/** Smallest group ever disclosed; below it an area is "not enough yet", never zero. */
export const minimumGroup = 10;
const keepWeeks = 12;

/**
 * Publishes this Singapore week's snapshot once (Monday-based), counting each eligible account once per layer.
 * Home and Work are separate layers and are never added together. Safe to call repeatedly and from several instances.
 */
export async function publishWeeklySnapshot() {
  return transaction(async db => {
    const week = (await db.query(`SELECT date_trunc('week', now() AT TIME ZONE 'Asia/Singapore')::date::text AS week`)).rows[0].week;
    const inserted = await db.query('INSERT INTO community.area_snapshot_week(week) VALUES($1) ON CONFLICT DO NOTHING RETURNING week', [week]);
    // Diet bands are taken at the same weekly moment; a week published before their table existed gets them once.
    await publishDietBands(db, week, inserted.rowCount > 0);
    if (!inserted.rowCount) return false;
    await db.query(`INSERT INTO community.area_snapshot(week, layer, area_code, band)
      SELECT $1::date, layer, area_code, CASE WHEN n >= 100 THEN '100+' WHEN n >= 50 THEN '50+' WHEN n >= 20 THEN '20+' ELSE '10+' END
      FROM (SELECT p.layer, p.area_code, count(DISTINCT p.user_id) AS n FROM community.area_participation p
        JOIN public."user" u ON u.id = p.user_id
        WHERE u."adultConfirmed" AND ${notRestricted('p.user_id')}
        GROUP BY p.layer, p.area_code) counts
      WHERE n >= $2`, [week, minimumGroup]);
    await db.query(`DELETE FROM community.area_snapshot_week WHERE week < $1::date - make_interval(weeks => $2)`, [week, keepWeeks]);
    return true;
  }, 'area-snapshot');
}

/**
 * Vegan and Vegetarian bands per area and layer for the week (Social area cards), with the same minimum of ten. Runs only
 * when the week is new or has no diet bands yet, so the bands never move during a week. Skipped until the Social
 * redesign tables exist (server/social/tables.sql).
 */
async function publishDietBands(db, week, newWeek) {
  if (!(await db.query("SELECT to_regclass('community.area_diet_snapshot') IS NOT NULL AS ok")).rows[0].ok) return;
  if (!newWeek && (await db.query('SELECT 1 FROM community.area_diet_snapshot WHERE week=$1 LIMIT 1', [week])).rowCount) return;
  await db.query(`INSERT INTO community.area_diet_snapshot(week, layer, area_code, label, band)
    SELECT $1::date, layer, area_code, label, CASE WHEN n >= 100 THEN '100+' WHEN n >= 50 THEN '50+' WHEN n >= 20 THEN '20+' ELSE '10+' END
    FROM (SELECT a.layer, a.area_code, label, count(DISTINCT a.user_id) AS n FROM community.area_participation a JOIN public."user" u ON u.id=a.user_id
      JOIN social.profile p ON p.user_id=a.user_id, unnest(p.diets) label
      WHERE u."adultConfirmed" AND ${notRestricted('a.user_id')} AND label IN ('Vegan','Vegetarian') GROUP BY a.layer, a.area_code, label) counts
    WHERE n >= $2 ON CONFLICT DO NOTHING`, [week, minimumGroup]);
}
/** Checks every six hours so a new week is published soon after it starts; returns a stop function. */
export function startAreaSnapshots() {
  const run = () => publishWeeklySnapshot()
    .then(published => { if (published) logger.info({ event: 'area_snapshot_published' }); })
    .catch(error => logger.warn({ event: 'area_snapshot_failed', code: error?.code }));
  const first = setTimeout(run, 30000).unref(), timer = setInterval(run, 6 * 3600000).unref();
  return () => { clearTimeout(first); clearInterval(timer); };
}
