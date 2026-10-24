import { pool, logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, requireUser, text, throttle, transaction } from './http.mjs';
import { publishedPlaceId } from '../catalogue-places.mjs';
import { publishedRecipeId } from '../recipes/published.mjs';
import { separate } from '../social/separate.mjs';

/** Blocking is mutual for visibility: neither side sees or contacts the other. */
export async function blockedBetween(a, b, db = pool) {
  if (!a || !b) return false;
  const result = await db.query('SELECT 1 FROM community.block WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1) LIMIT 1', [a, b]);
  return result.rowCount > 0;
}
/** SQL fragment excluding people blocked in either direction from `viewer`; `column` is the other person's id column.
 * Helper aliases are unusual (blk_, rst_) so they never shadow a caller's table alias. */
export const notBlocked = (column, param) => `NOT EXISTS (SELECT 1 FROM community.block blk_ WHERE (blk_.user_id=${param} AND blk_.blocked_id=${column}) OR (blk_.user_id=${column} AND blk_.blocked_id=${param}))`;
/** Accounts under an active admin restriction disappear from browsing. */
export const notRestricted = column => `NOT EXISTS (SELECT 1 FROM ops.restriction rst_ WHERE rst_.user_id=${column} AND rst_.active)`;

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
    await separate(db, me, target);
  });
  res.status(201).json({ blocked: true });
});
community.delete('/blocks/:id', async (req, res) => {
  await pool.query('DELETE FROM community.block WHERE user_id=$1 AND blocked_id=$2', [res.locals.user.id, requireUser(req.params.id)]);
  res.json({ blocked: false });
});
community.post('/reports', async (req, res) => {
  const me = res.locals.user.id, kind = req.body?.kind;
  if (!['person', 'listing', 'place', 'recipe', 'level', 'cafe'].includes(kind)) throw new CommunityError(400, 'Choose what you are reporting.');
  // Place reports (wrong hours, menu, location, closure or diet) go to the same staff case queue as other reports; so do reports on a
  // public Rush Hour level made from a member's recipe (RECIPE_LEVELS_PLAN §10).
  const target = kind === 'place' ? await publishedPlaceId(req.body?.targetId) : kind === 'recipe' ? await publishedRecipeId(req.body?.targetId)
    : kind === 'level' ? await publicLevel(req.body?.targetId) : kind === 'cafe' ? await openCafe(req.body?.targetId) : requireUser(req.body?.targetId);
  if (!target) throw new CommunityError(404, kind === 'recipe' ? 'That recipe is unavailable.' : kind === 'level' ? 'That level is unavailable.' : kind === 'cafe' ? 'That café is closed.' : 'That place is unavailable.');
  const reason = text(req.body?.reason, 60), details = text(req.body?.details, 1000);
  const subject = { listing: 'market:listing:', person: 'community:user:', place: 'place:catalogue:', recipe: 'recipe:member:', level: 'game:level:', cafe: 'game:cafe:' }[kind] + target;
  const reference = await fileReport(me, { subject,
    title: { listing: 'Market listing report', person: 'Member report', place: 'Place update', recipe: 'Member recipe report', level: 'Game level report', cafe: 'Game café report' }[kind] + (reason ? ' · ' + reason : ''),
    description: [reason && 'Reason: ' + reason, details || 'No details given.'].filter(Boolean).join('\n\n') });
  if (req.body?.block === true && kind === 'person' && target !== me) {
    await transaction(async db => {
      await db.query('INSERT INTO community.block(user_id,blocked_id) SELECT $1,$2 WHERE EXISTS (SELECT 1 FROM public."user" WHERE id=$2) ON CONFLICT DO NOTHING', [me, target]);
      await separate(db, me, target);
    });
  }
  res.status(201).json({ reference });
});
/** A live public Rush Hour level by its pack hash, or null. */
async function publicLevel(hash) {
  if (typeof hash !== 'string' || !/^p[a-z0-9]{1,14}$/.test(hash)) return null;
  return (await pool.query(`SELECT hash FROM game.recipe_level WHERE hash = $1 AND status = 'ready' AND owner_id IS NULL`, [hash])).rows[0]?.hash ?? null;
}
/** An open member café by its public id (the only id the app has), as its host's account id for the staff case, or null. */
async function openCafe(publicId) {
  if (typeof publicId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicId)) return null;
  return (await pool.query(`SELECT user_id FROM game.cafe WHERE public_id = $1::uuid AND open AND hidden_at IS NULL`, [publicId])).rows[0]?.user_id ?? null;
}
community.use(errors);
