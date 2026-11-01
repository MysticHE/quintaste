import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, member as signedIn, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { blockedBetween, notBlocked, notRestricted } from '../community/router.mjs';
import { sgText } from '../social/rules.mjs';
import { notify } from '../community/push.mjs';

/**
 * Cooking classes by teachers staff approved, listed in Market > Events beside editorial events (tables stay in the social
 * schema). Guests can browse them like Market items; joining, questions and teaching need a signed-in member. Join Class
 * reserves a seat straight away; members pay the teacher directly: QuinTaste takes no payment.
 */
export const classes = express.Router();
/** Class chats (ch, joined to their class c) that member $1 takes part in; blocks and restrictions match chatFor. */
const classChatsFrom = `social.class_chat ch JOIN social.class c ON c.id=ch.class_id JOIN social.host h ON h.user_id=c.host_id
  JOIN public."user" u ON u.id=ch.member_id`;
const classChatsWhere = `(ch.member_id=$1 OR c.host_id=$1) AND ${notRestricted('c.host_id')} AND ${notBlocked('c.host_id', 'ch.member_id')}`;
const classUnreadSql = `EXISTS (SELECT 1 FROM social.class_message m WHERE m.chat_id=ch.id AND m.sender_id IS DISTINCT FROM $1
  AND m.created_at > CASE WHEN c.host_id=$1 THEN ch.host_read_at ELSE ch.member_read_at END)`;
/** The member's seat in the class: 'joined', 'left', 'removed', or null when they only asked. */
const seatSql = (classId, memberId) => `(SELECT s.status FROM social.class_seat s WHERE s.class_id=${classId} AND s.user_id=${memberId})`;
/** For the app-wide inbox count (server/community/inbox.mjs). */
export const unreadClassChatsSql = `(SELECT count(*)::int FROM ${classChatsFrom} WHERE ${classChatsWhere} AND ${classUnreadSql})`;
/** Every existing private class conversation, including enquiries before joining.
 * The participant predicate is independent of teacher approval. Never enumerate another teacher's students through this endpoint. */
classes.get('/class-conversations', signedIn, async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT ch.id, c.id AS "classId", c.title, ${sgText('c.starts')} AS starts,
      ch.member_id AS "memberId", c.host_id=$1 AS hosting, ch.updated_at AS "updatedAt",
      CASE WHEN c.host_id=$1 THEN coalesce(nullif(p.first_name,''), u.name, 'Member') ELSE h.display_name END AS name,
      (SELECT body FROM social.class_message m WHERE m.chat_id=ch.id AND m.kind='text' ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last,
      ${classUnreadSql} AS unread, ${seatSql('c.id', 'ch.member_id')} AS seat
    FROM ${classChatsFrom} LEFT JOIN social.profile p ON p.user_id=ch.member_id WHERE ${classChatsWhere}
    ORDER BY ch.updated_at DESC, ch.id DESC LIMIT 200`, [me])).rows;
  res.json({ items: rows });
});
const takenSql = `(SELECT count(*)::int FROM social.class_seat s WHERE s.class_id=c.id AND s.status='joined')`;
/** A class a member may see: posted, not hidden, its teacher approved and unrestricted, and no block either way. */
export const listedSql = param => `c.status='posted' AND c.hidden_at IS NULL AND EXISTS (SELECT 1 FROM social.host h WHERE h.user_id=c.host_id AND h.status='approved')
  AND ${notRestricted('c.host_id')} AND ${notBlocked('c.host_id', param)}`;
export const classView = param => `c.id, c.title, c.makes, ${sgText('c.starts')} AS starts, ${sgText('c.ends')} AS ends, c.venue, c.area, c.seats, c.price_cents AS "priceCents",
  c.diets, c.status, ${takenSql} AS taken, c.host_id IS NOT DISTINCT FROM ${param} AS hosting,
  EXISTS (SELECT 1 FROM social.class_seat s WHERE s.class_id=c.id AND s.user_id=${param} AND s.status='joined') AS joined,
  (SELECT json_build_object('id', h.user_id, 'name', h.display_name, 'classes', (SELECT count(*)::int FROM social.class x WHERE x.host_id=h.user_id AND x.status='posted' AND x.starts < now()))
    FROM social.host h WHERE h.user_id=c.host_id) AS teacher`;
/** Posts a line into the chat between a class's teacher and one member, made on first use. Event bodies are keys the app words. */
export async function classLine(db, classId, memberId, { kind = 'event', body, sender = null }) {
  const chat = (await db.query(`INSERT INTO social.class_chat(class_id, member_id) VALUES($1,$2) ON CONFLICT(class_id, member_id) DO UPDATE SET updated_at=now() RETURNING id`,
    [classId, memberId])).rows[0].id;
  await db.query('INSERT INTO social.class_message(chat_id, sender_id, kind, body) VALUES($1,$2,$3,$4)', [chat, sender, kind, body]);
  return chat;
}

/** A teacher's classes the viewer can open, latest first (the posts on their Social profile). */
export async function classesBy(hostId, viewer) {
  return (await pool.query(`SELECT c.id, c.title, ${sgText('c.starts')} AS starts FROM social.class c WHERE c.host_id=$1 AND ${listedSql('$2::text')}
    ORDER BY c.starts DESC LIMIT 30`, [hostId, viewer])).rows;
}

classes.get('/classes', async (_req, res) => {
  const rows = (await pool.query(`SELECT ${classView('$1::text')} FROM social.class c WHERE ${listedSql('$1::text')} AND c.starts > now() ORDER BY c.starts LIMIT 100`,
    [res.locals.user?.id ?? null])).rows;
  res.json({ items: rows });
});
/** Joined members still see a class after it starts or is cancelled; the teacher always sees their own. */
classes.get('/classes/:id', async (req, res) => {
  const me = res.locals.user?.id ?? null, id = requireId(req.params.id, 'This class is unavailable.');
  const row = (await pool.query(`SELECT ${classView('$1::text')} FROM social.class c WHERE c.id=$2 AND (c.host_id=$1::text OR ((${listedSql('$1::text')} OR (c.status='cancelled'
      AND EXISTS (SELECT 1 FROM social.class_seat s WHERE s.class_id=c.id AND s.user_id=$1::text AND s.status='joined'))) AND ${notBlocked('c.host_id', '$1::text')}))`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This class is unavailable.');
  res.json(row);
});
classes.post('/classes/:id/join', signedIn, async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.');
  await throttle('social-class-join:' + me, 20, 86400);
  await transaction(async db => {
    const row = (await db.query(`SELECT c.host_id, c.seats, ${takenSql} AS taken FROM social.class c WHERE c.id=$2 AND ${listedSql('$1')} AND c.starts > now() FOR UPDATE OF c`, [me, id])).rows[0];
    if (!row) throw new CommunityError(404, 'This class is unavailable.');
    if (row.host_id === me) throw new CommunityError(409, 'This is your class.');
    const seat = (await db.query('SELECT status FROM social.class_seat WHERE class_id=$1 AND user_id=$2', [id, me])).rows[0];
    if (seat?.status === 'joined') return;
    if (seat?.status === 'removed') throw new CommunityError(409, 'The teacher removed you from this class.');
    if (row.taken >= row.seats) throw new CommunityError(409, 'This class is full.');
    await db.query(`INSERT INTO social.class_seat(class_id, user_id) VALUES($1,$2) ON CONFLICT(class_id, user_id) DO UPDATE SET status='joined', joined_at=now(), updated_at=now()`, [id, me]);
    await classLine(db, id, me, { body: 'joined' });
  }, 'social-class:' + id);
  logger.info({ event: 'social_class_joined' });
  res.json({ joined: true });
});
classes.post('/classes/:id/leave', signedIn, async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.');
  await transaction(async db => {
    const left = await db.query(`UPDATE social.class_seat s SET status='left', updated_at=now() FROM social.class c
      WHERE c.id=s.class_id AND s.class_id=$1 AND s.user_id=$2 AND s.status='joined' AND c.starts > now()`, [id, me]);
    if (!left.rowCount) throw new CommunityError(409, 'You are not in this class.');
    await classLine(db, id, me, { body: 'left' });
  }, 'social-class:' + id);
  res.json({ joined: false });
});

/** The chat about one class: a member with the teacher, or the teacher with `member`. */
async function chatFor(me, classId, memberParam) {
  const cls = (await pool.query(`SELECT c.host_id FROM social.class c WHERE c.id=$1 AND ${notRestricted('c.host_id')}`, [classId])).rows[0];
  if (!cls) throw new CommunityError(404, 'This class is unavailable.');
  const hosting = cls.host_id === me, member = hosting ? requireUser(memberParam) : me;
  if (member === cls.host_id) throw new CommunityError(400, 'This is your class.');
  if (await blockedBetween(cls.host_id, member)) throw new CommunityError(404, 'This chat is unavailable.');
  return { hosting, member, host: cls.host_id };
}
classes.get('/classes/:id/chat', signedIn, async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.'), { hosting, member } = await chatFor(me, id, req.query.member);
  const read = hosting ? 'host_read_at' : 'member_read_at';
  const chat = (await pool.query(`SELECT id, ${read} AS read_at, ${seatSql('$1', '$2')} AS seat FROM social.class_chat WHERE class_id=$1 AND member_id=$2`, [id, member])).rows[0];
  if (!chat) return res.json({ items: [], seat: null });
  const rows = (await pool.query(`SELECT m.id, m.kind, m.body, m.sender_id=$2 AS mine, m.created_at AS "createdAt" FROM social.class_message m WHERE m.chat_id=$1
    ORDER BY m.created_at DESC LIMIT 100`, [chat.id, me])).rows.reverse();
  // Polled while open: write the read time only when something newer arrived.
  if (rows.length && new Date(rows.at(-1).createdAt) > new Date(chat.read_at)) await pool.query(`UPDATE social.class_chat SET ${read}=now() WHERE id=$1`, [chat.id]);
  res.json({ items: rows, seat: chat.seat });
});
/** Members may ask before joining, but only about a class they can see; teachers reply to anyone who wrote or joined. */
classes.post('/classes/:id/chat', signedIn, async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This class is unavailable.'), body = text(req.body?.body, 1000, { min: 1, field: 'Message' });
  const { hosting, member, host } = await chatFor(me, id, req.body?.member);
  await throttle('social-class-chat:' + me, 30, 60, 'You are sending messages quickly. Wait a moment.');
  await transaction(async db => {
    if (hosting) {
      if (!(await db.query('SELECT 1 FROM social.class_chat WHERE class_id=$1 AND member_id=$2', [id, member])).rowCount) throw new CommunityError(404, 'This chat is unavailable.');
    } else if (!(await db.query(`SELECT 1 FROM social.class c WHERE c.id=$2 AND ${listedSql('$1')}`, [me, id])).rowCount
      && !(await db.query("SELECT 1 FROM social.class_seat WHERE class_id=$1 AND user_id=$2 AND status='joined'", [id, me])).rowCount) {
      throw new CommunityError(404, 'This class is unavailable.');
    }
    const chat = await classLine(db, id, member, { kind: 'text', body, sender: me });
    await db.query(`UPDATE social.class_chat SET ${hosting ? 'host_read_at' : 'member_read_at'}=now() WHERE id=$1`, [chat]);
  });
  // The teacher's alert opens this member's chat; the member's opens the class chat.
  notify(hosting ? member : host, 'messages', 'message', { from: me, url: '/market/class-chat/' + id + (hosting ? '' : '?member=' + encodeURIComponent(me)) });
  res.status(201).json({ ok: true });
});
/** Classes the member joined, upcoming first, with unread replies from the teacher. */
classes.get('/me/classes', signedIn, async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT ${classView('$1')}, (SELECT count(*)::int FROM social.class_chat ch JOIN social.class_message m ON m.chat_id=ch.id
      WHERE ch.class_id=c.id AND ch.member_id=$1 AND m.sender_id IS DISTINCT FROM $1 AND m.kind='text' AND m.created_at > ch.member_read_at) AS unread
    FROM social.class c JOIN social.class_seat s ON s.class_id=c.id AND s.user_id=$1 AND s.status='joined'
    WHERE c.starts > now() - interval '30 days' ORDER BY c.starts LIMIT 100`, [me])).rows;
  res.json({ items: rows });
});
