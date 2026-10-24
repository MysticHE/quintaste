import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, member as signedIn, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { readDiets, readFuture, sgText } from '../social/rules.mjs';
import { classLine, classView } from './classes.mjs';
import { featureGate } from '../operations.mjs';

/** Teaching: apply from Market > Events > My Cooking Classes, staff approve in the admin console, then post classes that appear in Events. */
export const teaching = express.Router();
// Teaching is selling: it follows the market_sellers switch and needs a signed-in member. Only these paths, so Market browsing
// stays open to guests.
teaching.use('/teaching', featureGate('market_sellers'), signedIn);
const hostColumns = `status, display_name AS "displayName", area, experience, teaches, reason, applied_at AS "appliedAt", decided_at AS "decidedAt"`;
function readClass(body) {
  body ??= {};
  // A class starts in the future, within six months, and ends after it starts.
  const starts = readFuture(body.starts, 'Start time'), ends = readFuture(body.ends, 'End time');
  if (starts.getTime() - Date.now() > 183 * 86400000) throw new CommunityError(400, 'Choose a date within the next six months.');
  if (ends <= starts || ends.getTime() - starts.getTime() > 12 * 3600000) throw new CommunityError(400, 'A class ends after it starts and lasts up to 12 hours.');
  const seats = Number(body.seats), price = Number(body.priceCents);
  if (!Number.isInteger(seats) || seats < 1 || seats > 30) throw new CommunityError(400, 'Choose 1 to 30 seats.');
  if (!Number.isInteger(price) || price < 0 || price > 100000) throw new CommunityError(400, 'Enter a price up to $1,000.');
  return { title: text(body.title, 80, { min: 1, field: 'Title' }), makes: text(body.makes, 600, { min: 1, field: 'What people make' }), starts, ends,
    venue: text(body.venue, 160, { min: 1, field: 'Where' }), area: text(body.area, 60, { field: 'Area' }), seats, price, diets: readDiets(body.diets) };
}
async function requireHost(db, me) {
  const host = (await db.query("SELECT status FROM social.host WHERE user_id=$1", [me])).rows[0];
  if (host?.status !== 'approved') throw new CommunityError(403, 'You can post classes once QuinTaste approves you to teach.', 'SOCIAL_NOT_TEACHER');
}
const taken = (db, id) => db.query("SELECT user_id FROM social.class_seat WHERE class_id=$1 AND status='joined'", [id]).then(result => result.rows.map(row => row.user_id));

teaching.get('/teaching', async (_req, res) => {
  const me = res.locals.user.id;
  const host = (await pool.query(`SELECT ${hostColumns} FROM social.host WHERE user_id=$1`, [me])).rows[0] ?? null;
  const rows = host ? (await pool.query(`SELECT ${classView('$1')}, c.hidden_at IS NOT NULL AS hidden, (SELECT count(*)::int FROM social.class_chat ch JOIN social.class_message m
      ON m.chat_id=ch.id WHERE ch.class_id=c.id AND m.sender_id IS DISTINCT FROM $1 AND m.kind='text' AND m.created_at > ch.host_read_at) AS unread
    FROM social.class c WHERE c.host_id=$1 AND (c.status<>'cancelled' OR c.starts > now() - interval '30 days') ORDER BY c.starts DESC LIMIT 100`, [me])).rows : [];
  res.json({ host, classes: rows });
});
/** Apply To Teach. A declined teacher may apply again; three tries a week. */
teaching.post('/teaching/apply', async (req, res) => {
  const me = res.locals.user.id, b = req.body ?? {};
  const application = [text(b.displayName, 60, { min: 1, field: 'Name' }), text(b.area, 60, { field: 'Area' }), text(b.experience, 600, { min: 20, field: 'Your experience' }),
    text(b.teaches, 300, { min: 5, field: 'What you teach' })];
  if (b.consent !== true) throw new CommunityError(400, 'Confirm the details are accurate and that you will take payment directly from members.');
  await throttle('social-teach-apply:' + me, 3, 7 * 86400, 'You can apply three times a week.');
  await transaction(async db => {
    const host = (await db.query('SELECT status FROM social.host WHERE user_id=$1 FOR UPDATE', [me])).rows[0];
    if (host && host.status !== 'rejected') throw new CommunityError(409, host.status === 'pending' ? 'Your application is being checked.' : host.status === 'approved' ? 'You can already teach.' : 'You cannot apply right now.');
    await db.query(`INSERT INTO social.host(user_id, display_name, area, experience, teaches) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(user_id) DO UPDATE SET status='pending', display_name=$2, area=$3, experience=$4, teaches=$5, reason='', applied_at=now(), decided_by=NULL, decided_at=NULL,
        updated_at=now()`, [me, ...application]);
  });
  logger.info({ event: 'social_teacher_applied' });
  res.status(201).json({ host: (await pool.query(`SELECT ${hostColumns} FROM social.host WHERE user_id=$1`, [me])).rows[0] });
});
/** A new class, saved as a draft or posted straight away. */
teaching.post('/teaching/classes', async (req, res) => {
  const me = res.locals.user.id, c = readClass(req.body?.class), post = req.body?.post === true;
  await throttle('social-class-edit:' + me, 60, 3600);
  const id = await transaction(async db => {
    await requireHost(db, me);
    if (Number((await db.query("SELECT count(*) FROM social.class WHERE host_id=$1 AND status<>'cancelled' AND starts > now()", [me])).rows[0].count) >= 20) {
      throw new CommunityError(409, 'You can have 20 upcoming classes. Cancel one first.');
    }
    return (await db.query(`INSERT INTO social.class(host_id, title, makes, starts, ends, venue, area, seats, price_cents, diets, status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [me, c.title, c.makes, c.starts, c.ends, c.venue, c.area, c.seats, c.price, c.diets, post ? 'posted' : 'draft'])).rows[0].id;
  });
  res.status(201).json({ id });
});
/** Edits keep seats already taken; a new time or place is told to everyone who joined. */
teaching.put('/teaching/classes/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.'), c = readClass(req.body?.class), post = req.body?.post === true;
  await throttle('social-class-edit:' + me, 60, 3600);
  await transaction(async db => {
    await requireHost(db, me);
    const old = (await db.query(`SELECT status, ${sgText('starts')} AS starts, ${sgText('ends')} AS ends, venue FROM social.class WHERE id=$1 AND host_id=$2 FOR UPDATE`, [id, me])).rows[0];
    if (!old || old.status === 'cancelled') throw new CommunityError(404, 'This class is unavailable.');
    const joined = await taken(db, id);
    if (c.seats < joined.length) throw new CommunityError(409, `${joined.length} people have joined. Keep at least ${joined.length} seats.`);
    await db.query(`UPDATE social.class SET title=$3, makes=$4, starts=$5, ends=$6, venue=$7, area=$8, seats=$9, price_cents=$10, diets=$11,
      status=CASE WHEN $12 THEN 'posted' ELSE status END, updated_at=now() WHERE id=$1 AND host_id=$2`,
    [id, me, c.title, c.makes, c.starts, c.ends, c.venue, c.area, c.seats, c.price, c.diets, post]);
    const moved = (await db.query(`SELECT ${sgText('starts')} AS starts, ${sgText('ends')} AS ends, venue FROM social.class WHERE id=$1`, [id])).rows[0];
    if (moved.starts !== old.starts || moved.ends !== old.ends || moved.venue !== old.venue) for (const member of joined) await classLine(db, id, member, { body: 'changed' });
  }, 'social-class:' + id);
  res.json({ ok: true });
});
/** Cancelling tells everyone who joined; their seats stay on record so they still see the class. */
teaching.post('/teaching/classes/:id/cancel', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.');
  await transaction(async db => {
    const result = await db.query("UPDATE social.class SET status='cancelled', updated_at=now() WHERE id=$1 AND host_id=$2 AND status<>'cancelled' AND starts > now()", [id, me]);
    if (!result.rowCount) throw new CommunityError(409, 'This class can no longer be cancelled.');
    for (const member of await taken(db, id)) await classLine(db, id, member, { body: 'cancelled' });
  }, 'social-class:' + id);
  res.json({ ok: true });
});
/** Drafts that were never posted can be deleted outright. */
teaching.delete('/teaching/classes/:id', async (req, res) => {
  const result = await pool.query("DELETE FROM social.class WHERE id=$1 AND host_id=$2 AND status='draft'", [requireId(req.params.id, 'This class is unavailable.'), res.locals.user.id]);
  if (!result.rowCount) throw new CommunityError(409, 'Only drafts can be deleted. Cancel a posted class instead.');
  res.json({ ok: true });
});
/** Who joined, and everyone who asked a question, for the teacher. */
teaching.get('/teaching/classes/:id/people', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.');
  if (!(await pool.query('SELECT 1 FROM social.class WHERE id=$1 AND host_id=$2', [id, me])).rowCount) throw new CommunityError(404, 'This class is unavailable.');
  const rows = (await pool.query(`SELECT u.id, coalesce(nullif(p.first_name,''), u.name, 'Member') AS name, s.status AS seat, s.joined_at AS "joinedAt",
      ch.updated_at AS "lastMessage", (SELECT count(*)::int FROM social.class_message m WHERE m.chat_id=ch.id AND m.sender_id=u.id AND m.created_at > ch.host_read_at) AS unread
    FROM (SELECT user_id AS id FROM social.class_seat WHERE class_id=$1 UNION SELECT member_id FROM social.class_chat WHERE class_id=$1) ids
      JOIN public."user" u ON u.id=ids.id LEFT JOIN social.profile p ON p.user_id=u.id
      LEFT JOIN social.class_seat s ON s.class_id=$1 AND s.user_id=u.id LEFT JOIN social.class_chat ch ON ch.class_id=$1 AND ch.member_id=u.id
    ORDER BY s.status='joined' DESC NULLS LAST, coalesce(ch.updated_at, s.joined_at) DESC LIMIT 200`, [id])).rows;
  res.json({ items: rows });
});
teaching.delete('/teaching/classes/:id/seats/:user', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.'), member = requireUser(req.params.user);
  await transaction(async db => {
    const result = await db.query(`UPDATE social.class_seat s SET status='removed', updated_at=now() FROM social.class c
      WHERE c.id=s.class_id AND c.host_id=$3 AND s.class_id=$1 AND s.user_id=$2 AND s.status='joined'`, [id, member, me]);
    if (!result.rowCount) throw new CommunityError(404, 'This person is not in your class.');
    await classLine(db, id, member, { body: 'removed' });
  }, 'social-class:' + id);
  res.json({ ok: true });
});
