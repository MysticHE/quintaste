import { pool, logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, requireUser, text, throttle, transaction } from './http.mjs';

/** Blocking is mutual for visibility: neither side sees or contacts the other. */
export async function blockedBetween(a, b, db = pool) {
  if (!a || !b) return false;
  const result = await db.query('SELECT 1 FROM community.block WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1) LIMIT 1', [a, b]);
  return result.rowCount > 0;
}
/** SQL fragment excluding people blocked in either direction from `viewer`; `column` is the other person's id column. */
export const notBlocked = (column, param) => `NOT EXISTS (SELECT 1 FROM community.block b WHERE (b.user_id=${param} AND b.blocked_id=${column}) OR (b.user_id=${column} AND b.blocked_id=${param}))`;
/** Accounts under an active admin restriction disappear from browsing. */
export const notRestricted = column => `NOT EXISTS (SELECT 1 FROM ops.restriction r WHERE r.user_id=${column} AND r.active)`;

/** Files a report in the admin case queue; three per reporter per 24 hours. Pass `db` to file it inside the caller's transaction. */
export async function fileReport(reporterId, { subject, title, description }, db = null) {
  const work = async client => {
    await client.query('SELECT pg_advisory_xact_lock(1902915, hashtext($1))', ['report:' + reporterId]);
    const recent = await client.query("SELECT count(*)::int AS count FROM ops.case_record WHERE subject_id LIKE $1 AND kind='report' AND created_at > now() - interval '24 hours'", ['%|by:' + reporterId]);
    if (recent.rows[0].count >= 3) throw new CommunityError(429, 'You can send three reports in 24 hours.');
    const row = await client.query("INSERT INTO ops.case_record(kind,title,description,subject_id) VALUES('report',$1,$2,$3) RETURNING id",
      [title, description, subject + '|by:' + reporterId]);
    logger.info({ event: 'community_report_created' });
    return row.rows[0].id;
  };
  return db ? work(db) : transaction(work);
}

export const community = communityRouter();
community.get('/blocks', async (_req, res) => {
  const rows = (await pool.query(`SELECT b.blocked_id AS id, coalesce(p.first_name, u.name) AS name, b.created_at AS "createdAt"
    FROM community.block b JOIN public."user" u ON u.id=b.blocked_id LEFT JOIN social.profile p ON p.user_id=b.blocked_id
    WHERE b.user_id=$1 ORDER BY b.created_at DESC`, [res.locals.user.id])).rows;
  res.json({ items: rows });
});
community.post('/blocks', async (req, res) => {
  const me = res.locals.user.id, target = requireUser(req.body?.userId);
  if (target === me) throw new CommunityError(400, 'You cannot block yourself.');
  await throttle('block:' + me, 30, 3600);
  await transaction(async db => {
    const exists = await db.query('SELECT 1 FROM public."user" WHERE id=$1', [target]);
    if (!exists.rowCount) throw new CommunityError(404, 'That person is unavailable.');
    await db.query('INSERT INTO community.block(user_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [me, target]);
    await leaveSharedGroups(db, me, target);
  });
  res.status(201).json({ blocked: true });
});
community.delete('/blocks/:id', async (req, res) => {
  await pool.query('DELETE FROM community.block WHERE user_id=$1 AND blocked_id=$2', [res.locals.user.id, requireUser(req.params.id)]);
  res.json({ blocked: false });
});
community.post('/reports', async (req, res) => {
  const me = res.locals.user.id, kind = req.body?.kind, target = requireUser(req.body?.targetId);
  const reason = text(req.body?.reason, 60), details = text(req.body?.details, 1000);
  if (!['person', 'listing'].includes(kind)) throw new CommunityError(400, 'Choose what you are reporting.');
  const reference = await fileReport(me, { subject: (kind === 'listing' ? 'market:listing:' : 'community:user:') + target,
    title: (kind === 'listing' ? 'Market listing report' : 'Member report') + (reason ? ' · ' + reason : ''),
    description: [reason && 'Reason: ' + reason, details || 'No details given.'].filter(Boolean).join('\n\n') });
  if (req.body?.block === true && kind === 'person' && target !== me) {
    await transaction(async db => {
      await db.query('INSERT INTO community.block(user_id,blocked_id) SELECT $1,$2 WHERE EXISTS (SELECT 1 FROM public."user" WHERE id=$2) ON CONFLICT DO NOTHING', [me, target]);
      await leaveSharedGroups(db, me, target);
    });
  }
  res.status(201).json({ reference });
});
/** Blocking someone leaves any open Social group you share with them. */
async function leaveSharedGroups(db, me, other) {
  const left = (await db.query(`UPDATE social.member m SET status='left', confirmed=false, updated_at=now() WHERE m.user_id=$1 AND m.status IN ('invited','accepted')
    AND EXISTS (SELECT 1 FROM social.member o WHERE o.group_id=m.group_id AND o.user_id=$2) RETURNING m.group_id`, [me, other])).rows;
  for (const row of left) {
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [row.group_id]);
    await db.query("INSERT INTO social.message(group_id,kind,body) VALUES($1,'event','A member left')", [row.group_id]);
  }
}
community.use(errors);
