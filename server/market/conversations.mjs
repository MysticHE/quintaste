import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, member, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { notBlocked } from '../community/router.mjs';
import { sgText } from '../social/rules.mjs';
import { liveSeller, noContactDetails } from './rules.mjs';

/** One conversation per buyer and seller. Order updates arrive as system lines. */
export const conversations = express.Router();
conversations.use(['/conversations', '/unread'], member);

async function conversationFor(db, buyerId, sellerId) {
  return (await db.query(`INSERT INTO market.conversation(buyer_id, seller_id) VALUES($1,$2)
    ON CONFLICT(buyer_id, seller_id) DO UPDATE SET updated_at=now() RETURNING id`, [buyerId, sellerId])).rows[0].id;
}
/** Adds an order update to the buyer–seller conversation. */
export async function eventFor(db, buyerId, sellerId, orderId, body) {
  const id = await conversationFor(db, buyerId, sellerId);
  await db.query("INSERT INTO market.message(conversation_id, kind, order_id, body) VALUES($1,'event',$2,$3)", [id, orderId, body.slice(0, 1000)]);
  return id;
}
async function participant(db, id, me) {
  const row = (await db.query(`SELECT c.*, s.trading_name AS "sellerName", u.name AS "buyerName" FROM market.conversation c
    JOIN market.seller s ON s.user_id=c.seller_id JOIN public."user" u ON u.id=c.buyer_id WHERE c.id=$1`, [id])).rows[0];
  if (!row || (row.buyer_id !== me && row.seller_id !== me)) throw new CommunityError(404, 'This conversation is unavailable.');
  return row;
}
const unreadFor = `EXISTS (SELECT 1 FROM market.message m WHERE m.conversation_id=c.id AND (m.sender_id IS NULL OR m.sender_id<>$1)
  AND m.created_at > CASE WHEN c.buyer_id=$1 THEN c.buyer_read_at ELSE c.seller_read_at END)`;
conversations.get('/conversations', async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT c.id, c.seller_id AS "sellerId", c.updated_at AS "updatedAt", CASE WHEN c.buyer_id=$1 THEN 'buyer' ELSE 'seller' END AS role,
      CASE WHEN c.buyer_id=$1 THEN s.trading_name ELSE u.name END AS "otherName",
      (SELECT body FROM market.message m WHERE m.conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last, ${unreadFor} AS unread,
      (SELECT string_agg(i.name, ', ' ORDER BY i.name) FROM market.order_item i WHERE i.order_id=(SELECT o.id FROM market."order" o
        WHERE o.buyer_id=c.buyer_id AND o.seller_id=c.seller_id ORDER BY o.created_at DESC LIMIT 1)) AS context
    FROM market.conversation c JOIN market.seller s ON s.user_id=c.seller_id JOIN public."user" u ON u.id=c.buyer_id
    WHERE c.buyer_id=$1 OR c.seller_id=$1 ORDER BY c.updated_at DESC LIMIT 100`, [me])).rows;
  res.json({ items: rows });
});
/** Counts for member $1, shared with the app-wide inbox count (server/community/inbox.mjs). */
export const unreadMarketChatsSql = `(SELECT count(*)::int FROM market.conversation c WHERE (c.buyer_id=$1 OR c.seller_id=$1) AND ${unreadFor})`;
export const newOrdersSql = `(SELECT count(*)::int FROM market."order" o WHERE o.seller_id=$1 AND o.status='requested')`;
/** Kept for app builds released before /api/inbox. */
conversations.get('/unread', async (_req, res) => {
  const row = (await pool.query(`SELECT ${unreadMarketChatsSql} AS messages, ${newOrdersSql} AS orders`, [res.locals.user.id])).rows[0];
  res.json({ ...row, count: row.messages + row.orders });
});
/** A buyer opens (or reopens) their conversation with a live shop. */
conversations.post('/conversations', async (req, res) => {
  const me = res.locals.user.id, sellerId = requireUser(req.body?.sellerId);
  if (sellerId === me) throw new CommunityError(400, 'This is your own shop.');
  await throttle('market-conversation:' + me, 30, 3600);
  const id = await transaction(async db => {
    const shop = (await db.query(`SELECT 1 FROM market.seller s WHERE s.user_id=$1 AND ${liveSeller('s')} AND ${notBlocked('s.user_id', '$2')}`, [sellerId, me])).rowCount;
    if (!shop) throw new CommunityError(404, 'This shop is unavailable.');
    return conversationFor(db, me, sellerId);
  });
  res.status(201).json({ id });
});
conversations.get('/conversations/:id', async (req, res) => {
  const me = res.locals.user.id, c = await participant(pool, requireId(req.params.id), me), buyer = c.buyer_id === me;
  const other = buyer ? c.seller_id : c.buyer_id;
  const [messages, blocked, orders] = await Promise.all([
    pool.query(`SELECT id, sender_id AS "senderId", kind, order_id AS "orderId", body, created_at AS "createdAt" FROM
      (SELECT * FROM market.message WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 200) m ORDER BY created_at`, [c.id]),
    pool.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')}`, [other, me]),
    pool.query(`SELECT o.id, o.status, o.total_cents AS "totalCents", ${sgText('o.starts')} AS starts,
        (SELECT string_agg(i.name, ', ' ORDER BY i.name) FROM market.order_item i WHERE i.order_id=o.id) AS items
      FROM market."order" o WHERE o.buyer_id=$1 AND o.seller_id=$2 AND o.status IN ('requested','confirmed','ready') ORDER BY o.starts`, [c.buyer_id, c.seller_id]),
  ]);
  res.json({ id: c.id, role: buyer ? 'buyer' : 'seller', sellerId: c.seller_id, other: { id: other, name: buyer ? c.sellerName : c.buyerName },
    blocked: blocked.rowCount === 0, openOrders: orders.rows, messages: messages.rows.map(m => ({ ...m, mine: m.senderId === me })) });
});
conversations.post('/conversations/:id/messages', async (req, res) => {
  const me = res.locals.user.id, body = noContactDetails(text(req.body?.text, 1000, { min: 1, field: 'Message' }));
  await throttle('market-message:' + me, 30, 60, 'You are sending messages too quickly.');
  await transaction(async db => {
    const c = await participant(db, requireId(req.params.id), me), other = c.buyer_id === me ? c.seller_id : c.buyer_id;
    if ((await db.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')}`, [other, me])).rowCount === 0) throw new CommunityError(403, 'You can no longer message this person.');
    await db.query('INSERT INTO market.message(conversation_id, sender_id, body) VALUES($1,$2,$3)', [c.id, me, body]);
    await db.query(`UPDATE market.conversation SET updated_at=now(), buyer_read_at=CASE WHEN buyer_id=$2 THEN now() ELSE buyer_read_at END,
      seller_read_at=CASE WHEN seller_id=$2 THEN now() ELSE seller_read_at END WHERE id=$1`, [c.id, me]);
  });
  res.status(201).json({ sent: true });
});
conversations.post('/conversations/:id/read', async (req, res) => {
  const me = res.locals.user.id;
  await pool.query(`UPDATE market.conversation SET buyer_read_at=CASE WHEN buyer_id=$2 THEN now() ELSE buyer_read_at END,
    seller_read_at=CASE WHEN seller_id=$2 THEN now() ELSE seller_read_at END WHERE id=$1 AND (buyer_id=$2 OR seller_id=$2)`, [requireId(req.params.id), me]);
  res.json({ read: true });
});
