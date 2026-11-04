import { CORRECTION_REWARD } from '../collection/catalog.mjs';

/** The entitlement's original due date fixes its qualifying Singapore day, even if a case is reopened later. */
export async function correctionProgress(db,userId) {
  return (await db.query(`SELECT count(*) FILTER(WHERE state IN ('pending','paid') AND
      ((due_at - make_interval(hours=>${CORRECTION_REWARD.hours})) AT TIME ZONE 'Asia/Singapore')::date=(now() AT TIME ZONE 'Asia/Singapore')::date)::int AS used,
    count(*) FILTER(WHERE state='pending')::int AS waiting,count(*) FILTER(WHERE state='held')::int AS held
    FROM ops.explore_reward r WHERE user_id=$1 AND EXISTS(SELECT 1 FROM ops.explore_work w WHERE w.id=r.work_id AND w.kind='report')`,[userId])).rows[0];
}
