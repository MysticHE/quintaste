import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { friendsSql, highSql, lowSql, nameSql, pairOf, reachableSql, seeableSql, verifiedSql } from './access.mjs';
import { photoUrl } from './profile.mjs';
import { separate } from './separate.mjs';

export const friends = express.Router();
const thumbSql = column => `(SELECT json_build_object('id', ph.id, 'digest', ph.digest) FROM social.photo ph WHERE ph.user_id=${column} AND ph.position=0)`;
const thumbOf = photo => photo ? photoUrl(photo, 'thumb') : null;
const handleSql = column => `(SELECT h.handle FROM social.handle h WHERE h.user_id=${column})`;
/** The chat between two friends, made on first use. */
export async function threadFor(db, a, b) {
  const [x, y] = pairOf(a, b);
  return (await db.query(`INSERT INTO social.thread(a_id, b_id) VALUES($1,$2) ON CONFLICT(a_id, b_id) DO UPDATE SET updated_at=social.thread.updated_at RETURNING id`, [x, y])).rows[0].id;
}
/** Posts a line into the pair's chat. Event bodies are keys the app words in the reader's language. */
export async function postLine(db, from, to, { kind = 'event', body, dinnerId = null, sender = null }) {
  const thread = await threadFor(db, from, to);
  await db.query('INSERT INTO social.thread_message(thread_id, sender_id, kind, body, dinner_id) VALUES($1,$2,$3,$4,$5)', [thread, sender, kind, body, dinnerId]);
  await db.query('UPDATE social.thread SET updated_at=now() WHERE id=$1', [thread]);
  return thread;
}
/** Requests older than 14 days lapse. */
const expireRequests = (db, me) => db.query(`UPDATE social.friend_request SET status='expired', decided_at=now() WHERE status='pending'
  AND created_at < now() - interval '14 days' AND (from_id=$1 OR to_id=$1)`, [me]);
async function befriend(db, me, other, requestId) {
  const [a, b] = pairOf(me, other);
  await db.query("UPDATE social.friend_request SET status='accepted', decided_at=now() WHERE id=$1", [requestId]);
  await db.query(`INSERT INTO social.friend(a_id, b_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [a, b]);
  await postLine(db, me, other, { body: 'friends', sender: me });
}

/** The Friends tab: friends with their chat (latest line and unread count), then requests received and sent. */
friends.get('/friends', async (_req, res) => {
  const me = res.locals.user.id;
  await expireRequests(pool, me);
  const rows = (await pool.query(`WITH mine AS (SELECT CASE WHEN a_id=$1 THEN b_id ELSE a_id END AS id, since FROM social.friend WHERE a_id=$1 OR b_id=$1)
    SELECT u.id, ${nameSql('p', 'u')} AS "firstName", ${handleSql('u.id')} AS handle, coalesce(p.area, '') AS area, p.gender, mine.since, ${thumbSql('u.id')} AS photo, ${verifiedSql('u.id')} AS verified,
      t.id AS "threadId", coalesce(t.updated_at, mine.since) AS "updatedAt",
      (SELECT json_build_object('kind', m.kind, 'body', m.body, 'mine', m.sender_id=$1, 'at', m.created_at) FROM social.thread_message m WHERE m.thread_id=t.id
        ORDER BY m.created_at DESC LIMIT 1) AS last,
      (SELECT count(*)::int FROM social.thread_message m WHERE m.thread_id=t.id AND (m.sender_id IS NULL OR m.sender_id<>$1)
        AND m.created_at > CASE WHEN t.a_id=$1 THEN t.a_read_at ELSE t.b_read_at END) AS unread
    FROM mine JOIN public."user" u ON u.id=mine.id LEFT JOIN social.profile p ON p.user_id=u.id
      LEFT JOIN social.thread t ON t.a_id=${lowSql('$1', 'u.id')} AND t.b_id=${highSql('$1', 'u.id')}
    WHERE ${reachableSql('u.id', '$1')} ORDER BY "updatedAt" DESC LIMIT 300`, [me])).rows;
  const requests = (await pool.query(`SELECT r.id, r.note, r.created_at AS "createdAt", r.from_id=$1 AS mine, u.id AS "userId", ${nameSql('p', 'u')} AS "firstName",
      ${handleSql('u.id')} AS handle, coalesce(p.area, '') AS area, ${verifiedSql('u.id')} AS verified,
      ${thumbSql('u.id')} AS photo
    FROM social.friend_request r JOIN public."user" u ON u.id=CASE WHEN r.from_id=$1 THEN r.to_id ELSE r.from_id END LEFT JOIN social.profile p ON p.user_id=u.id
    WHERE r.status='pending' AND (r.from_id=$1 OR r.to_id=$1) AND ${reachableSql('u.id', '$1')} ORDER BY r.created_at DESC LIMIT 100`, [me])).rows;
  const mine = (await pool.query('SELECT gender FROM social.profile WHERE user_id=$1', [me])).rows[0]?.gender ?? '';
  res.json({ friends: rows.map(({ photo, gender, ...row }) => ({ ...row, photo: thumbOf(photo), opposite: !!gender && !!mine && gender !== mine })),
    received: requests.filter(r => !r.mine).map(({ photo, mine: _m, ...r }) => ({ ...r, photo: thumbOf(photo) })),
    sent: requests.filter(r => r.mine).map(({ photo, mine: _m, ...r }) => ({ ...r, photo: thumbOf(photo) })) });
});

/** Counts for member $1, shared by the tab badges below and the app-wide inbox count (server/community/inbox.mjs). */
export const friendRequestsSql = `(SELECT count(*)::int FROM social.friend_request r WHERE r.to_id=$1 AND r.status='pending' AND r.created_at > now() - interval '14 days'
  AND ${reachableSql('r.from_id', '$1')})`;
/** Friend chats with a message $1 has not read (conversations, not messages, to match the Messages count). */
export const unreadFriendChatsSql = `(SELECT count(DISTINCT t.id)::int FROM social.thread t JOIN social.thread_message m ON m.thread_id=t.id WHERE (t.a_id=$1 OR t.b_id=$1)
  AND m.sender_id IS DISTINCT FROM $1 AND m.created_at > CASE WHEN t.a_id=$1 THEN t.a_read_at ELSE t.b_read_at END AND ${friendsSql('t.a_id', 't.b_id')}
  AND ${reachableSql('CASE WHEN t.a_id=$1 THEN t.b_id ELSE t.a_id END', '$1')})`;
/** Invitations waiting on $1, and recent dinners $1 has not reported on yet. */
export const dinnersDueSql = `(SELECT count(*)::int FROM social.dinner d WHERE (d.status='invited' AND d.waiting_on=$1 AND d.expires_at > now() AND d.starts > now())
  OR (d.status='accepted' AND (d.host_id=$1 OR d.guest_id=$1) AND d.starts < now() AND d.starts > now() - interval '30 days'
    AND NOT EXISTS (SELECT 1 FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id=$1)))`;
/** Tab badges: friend requests waiting, friend chats with unread lines, and dinners that need the member (an answer, or how it went). */
friends.get('/badges', async (_req, res) => {
  const row = (await pool.query(`SELECT ${friendRequestsSql} AS requests, ${unreadFriendChatsSql} AS messages, ${dinnersDueSql} AS dinners`, [res.locals.user.id])).rows[0];
  res.json(row);
});
/**
 * A friend request with an optional hello, to any member the sender can see (any age or gender, no photo check; owner,
 * 25 Oct 2026); ten a day; after a decline the same person cannot be asked again for 30 days. If they already asked the
 * sender, this accepts their request instead.
 */
friends.post('/friends/requests', async (req, res) => {
  const me = res.locals.user.id, to = requireUser(req.body?.userId), note = text(req.body?.note, 200, { field: 'Your hello' });
  if (to === me) throw new CommunityError(400, 'You cannot add yourself.');
  await throttle('social-friend-request:' + me, 10, 86400, 'You can send 10 friend requests a day. Try again tomorrow.');
  const result = await transaction(async db => {
    await expireRequests(db, me);
    const target = (await db.query(`SELECT ${friendsSql('u.id', '$1')} AS friend FROM public."user" u WHERE u.id=$2 AND ${seeableSql('u.id', '$1')}`, [me, to])).rows[0];
    if (!target) throw new CommunityError(404, 'This person is unavailable.');
    if (target.friend) throw new CommunityError(409, 'You are already friends.');
    const reverse = (await db.query("SELECT id FROM social.friend_request WHERE from_id=$1 AND to_id=$2 AND status='pending' FOR UPDATE", [to, me])).rows[0];
    if (reverse) { await befriend(db, me, to, reverse.id); return { friends: true }; }
    const declined = await db.query(`SELECT 1 FROM social.friend_request WHERE from_id=$1 AND to_id=$2 AND status='declined' AND decided_at > now() - interval '30 days'`, [me, to]);
    if (declined.rowCount) throw new CommunityError(409, 'You can send another request later.');
    const open = await db.query("SELECT 1 FROM social.friend_request WHERE from_id=$1 AND to_id=$2 AND status='pending'", [me, to]);
    if (open.rowCount) throw new CommunityError(409, 'Your request is waiting for them.');
    const id = (await db.query('INSERT INTO social.friend_request(from_id, to_id, note) VALUES($1,$2,$3) RETURNING id', [me, to, note])).rows[0].id;
    return { id };
  }, 'social-pair:' + pairOf(me, to).join(':'));
  logger.info({ event: result.friends ? 'social_friend_accepted' : 'social_friend_requested' });
  res.status(201).json(result);
});
async function answer(req, res, accept) {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This request is unavailable.');
  const from = (await pool.query("SELECT from_id FROM social.friend_request WHERE id=$1 AND to_id=$2", [id, me])).rows[0]?.from_id;
  if (!from) throw new CommunityError(404, 'This request is unavailable.');
  await transaction(async db => {
    await expireRequests(db, me);
    const request = (await db.query(`SELECT r.from_id FROM social.friend_request r
      WHERE r.id=$1 AND r.to_id=$2 AND r.status='pending' AND ${reachableSql('r.from_id', '$2')} FOR UPDATE OF r`, [id, me])).rows[0];
    if (!request) throw new CommunityError(404, 'This request is unavailable.');
    if (!accept) return db.query("UPDATE social.friend_request SET status='declined', decided_at=now() WHERE id=$1", [id]);
    await befriend(db, me, request.from_id, id);
  }, 'social-pair:' + pairOf(me, from).join(':'));
  res.json({ ok: true });
}
friends.post('/friends/requests/:id/accept', (req, res) => answer(req, res, true));
friends.post('/friends/requests/:id/decline', (req, res) => answer(req, res, false));
friends.delete('/friends/requests/:id', async (req, res) => {
  const result = await pool.query("UPDATE social.friend_request SET status='cancelled', decided_at=now() WHERE id=$1 AND from_id=$2 AND status='pending'",
    [requireId(req.params.id, 'This request is unavailable.'), res.locals.user.id]);
  if (!result.rowCount) throw new CommunityError(404, 'This request is unavailable.');
  res.json({ ok: true });
});
/** Unfriending also cancels pending and upcoming dinners between the two; the chat closes until they are friends again. */
friends.delete('/friends/:id', async (req, res) => {
  const me = res.locals.user.id, other = requireUser(req.params.id);
  await transaction(async db => {
    const [a, b] = pairOf(me, other);
    if (!(await db.query('SELECT 1 FROM social.friend WHERE a_id=$1 AND b_id=$2', [a, b])).rowCount) throw new CommunityError(404, 'You are not friends.');
    await separate(db, me, other);
  }, 'social-pair:' + pairOf(me, other).join(':'));
  res.json({ ok: true });
});

/** Friends chat at any age; a block, restriction or unfriending closes the chat. */
const readOk = async (me, other) => {
  const row = (await pool.query(`SELECT ${friendsSql('$1::text', '$2::text')} AS friend, ${reachableSql('$2::text', '$1')} AS reachable`, [me, other])).rows[0];
  if (!row.friend || !row.reachable) throw new CommunityError(404, 'This chat is unavailable.');
};
/** The chat with one friend: the latest 50 lines (or 50 before `before`); opening it marks it read. */
friends.get('/chats/:id', async (req, res) => {
  const me = res.locals.user.id, other = requireUser(req.params.id);
  await readOk(me, other);
  const before = typeof req.query.before === 'string' && !Number.isNaN(Date.parse(req.query.before)) ? new Date(req.query.before) : null;
  const thread = (await pool.query(`SELECT id, a_id, CASE WHEN a_id=$1 THEN a_read_at ELSE b_read_at END AS read_at FROM social.thread
    WHERE a_id=${lowSql('$1::text', '$2::text')} AND b_id=${highSql('$1::text', '$2::text')}`, [me, other])).rows[0];
  if (!thread) return res.json({ items: [], more: false });
  const rows = (await pool.query(`SELECT m.id, m.kind, m.body, m.dinner_id AS "dinnerId", m.sender_id=$2 AS mine, m.created_at AS "createdAt" FROM social.thread_message m
    WHERE m.thread_id=$1 ${before ? 'AND m.created_at < $3' : ''} ORDER BY m.created_at DESC LIMIT 51`, before ? [thread.id, me, before] : [thread.id, me])).rows;
  // The app polls an open chat every few seconds; the read time is written only when there is something newer to mark read.
  if (!before && rows.length && new Date(rows[0].createdAt) > new Date(thread.read_at)) {
    await pool.query(`UPDATE social.thread SET ${thread.a_id === me ? 'a_read_at' : 'b_read_at'}=now() WHERE id=$1`, [thread.id]);
  }
  res.json({ items: rows.slice(0, 50).reverse(), more: rows.length > 50 });
});
friends.post('/chats/:id', async (req, res) => {
  const me = res.locals.user.id, other = requireUser(req.params.id), body = text(req.body?.body, 1000, { min: 1, field: 'Message' });
  await readOk(me, other);
  await throttle('social-chat:' + me, 30, 60, 'You are sending messages quickly. Wait a moment.');
  const id = await transaction(async db => {
    const thread = await threadFor(db, me, other);
    const row = (await db.query("INSERT INTO social.thread_message(thread_id, sender_id, kind, body) VALUES($1,$2,'text',$3) RETURNING id, created_at", [thread, me, body])).rows[0];
    await db.query(`UPDATE social.thread SET updated_at=now(), ${me < other ? 'a_read_at' : 'b_read_at'}=now() WHERE id=$1`, [thread]);
    return row;
  });
  res.status(201).json({ id: id.id, createdAt: id.created_at });
});
friends.post('/chats/:id/read', async (req, res) => {
  const me = res.locals.user.id, other = requireUser(req.params.id);
  const [a, b] = pairOf(me, other);
  await pool.query(`UPDATE social.thread SET ${me === a ? 'a_read_at' : 'b_read_at'}=now() WHERE a_id=$1 AND b_id=$2`, [a, b]);
  res.json({ ok: true });
});
