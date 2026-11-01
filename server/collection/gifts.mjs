import { logger, pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { accountAccess } from '../account-access.mjs';
import { friendsSql, nameSql, reachableSql, seeableSql } from '../social/access.mjs';
import { postLine } from '../social/friends.mjs';
import { notify } from '../community/push.mjs';
import { GIFTS, WEEKLY_GIFT } from './catalog.mjs';
import { accountTag, confirmPurchase, productOf, storesReady } from './stores.mjs';

/**
 * Gifts (docs/COLLECTION_PLAN.md §5): a member with a Social profile sends one to anyone whose profile they can see (owner,
 * 1 Nov 2026: friends or not). A gift has no cash value and never gives credits. Every member gets one free Rose a Singapore
 * week (Monday to Sunday); the master account sends every gift free. Other gifts are bought in the App Store or Google Play
 * build and sent once the store confirms the purchase (./stores.mjs). Limits: 5 a day to the same person, S$30 a day of paid gifts. The receiver can Like a gift; the sender sees it.
 */
export const gifts = communityRouter();
const PER_PERSON_DAY = 5, PAID_CENTS_DAY = 3000;
const sgToday = "date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'";
const sgWeek = "date_trunc('week', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'";
const weeklyUsedSql = `EXISTS (SELECT 1 FROM community.gift WHERE sender_id=$1 AND store='weekly' AND created_at >= ${sgWeek})`;
const noteSql = "CASE WHEN g.note_hidden THEN '' ELSE g.note END";
// Gifts from someone either of you blocked, or who was restricted, drop out of view (a deleted sender's gifts stay, unnamed).
const fromVisible = `(g.sender_id IS NULL OR ${reachableSql('g.sender_id', '$1')})`;
// A like or thank-you the sender has not looked at yet (in Collection › Gifts › Sent).
const newsSql = "(g.liked_at > coalesce(g.seen_at, '-infinity') OR g.thanked_at > coalesce(g.seen_at, '-infinity'))";
const catalog = Object.entries(GIFTS).map(([id, g]) => ({ id, tier: g.tier, priceCents: g.priceCents, burst: g.burst }));
/** Whether member `me` sends free (master) and this week's free gift while it is unused. */
async function sending(me) {
  const [access, used] = await Promise.all([accountAccess(me), pool.query(`SELECT ${weeklyUsedSql} AS used`, [me]).then(r => r.rows[0].used)]);
  const free = access.role === 'master';
  return { sending: free ? 'free' : 'store', weekly: free || used ? null : WEEKLY_GIFT, stores: storesReady };
}

/** What the gift picker needs, without the lists: the gifts, how you send and this week's free gift. */
gifts.get('/catalog', async (_req, res) => {
  res.json({ catalog, ...(await sending(res.locals.user.id)) });
});

/** The gifts, gifts received and sent (newest first), whether you can send free, and whether this week's free Rose is left. */
gifts.get('/', async (_req, res) => {
  const me = res.locals.user.id;
  const [mode, received, sent, off] = await Promise.all([
    sending(me),
    pool.query(`SELECT g.id, g.gift, ${noteSql} AS note, g.created_at AS at, g.opened_at IS NOT NULL AS opened, g.liked_at IS NOT NULL AS liked,
        g.thanked_at IS NOT NULL AS thanked, g.sender_id AS "fromId", ${nameSql('p', 'u')} AS "fromName" FROM community.gift g LEFT JOIN public."user" u ON u.id=g.sender_id
        LEFT JOIN social.profile p ON p.user_id=g.sender_id WHERE g.receiver_id=$1 AND g.status='sent' AND ${fromVisible}
        ORDER BY g.created_at DESC LIMIT 200`, [me]).then(r => r.rows),
    pool.query(`SELECT g.id, g.gift, ${noteSql} AS note, g.created_at AS at, g.opened_at IS NOT NULL AS opened, g.liked_at IS NOT NULL AS liked,
        g.thanked_at IS NOT NULL AS thanked, ${newsSql} AND NOT ${friendsSql('g.sender_id', 'g.receiver_id')} AS news, g.receiver_id AS "toId", ${nameSql('p', 'u')} AS "toName" FROM community.gift g JOIN public."user" u ON u.id=g.receiver_id
        LEFT JOIN social.profile p ON p.user_id=g.receiver_id WHERE g.sender_id=$1 AND g.status='sent' AND ${reachableSql('g.receiver_id', '$1')}
        ORDER BY g.created_at DESC LIMIT 200`, [me]).then(r => r.rows),
    pool.query('SELECT gifts_off FROM social.profile WHERE user_id=$1', [me]).then(r => r.rows[0]?.gifts_off ?? false),
  ]);
  res.json({ catalog, ...mode, received, sent, receiving: !off });
});

/**
 * The checks before a gift goes: a Social profile of your own; the receiver visible to you, receiving gifts and either a
 * friend (the gift arrives as a card in your chat) or someone with a Social profile (their gifts wait in Collection ›
 * Gifts); 5 a day to one person; S$30 a day of paid gifts. Returns how it is paid ('free', 'weekly' or 'store').
 * `limits: false` skips the daily limits, for a purchase the store already took payment for (they were checked by
 * POST /check before paying); who may receive it is always checked.
 */
async function checkSend(db, me, to, id, { limits = true } = {}) {
  const mine = await db.query('SELECT 1 FROM social.profile WHERE user_id=$1', [me]);
  if (!mine.rowCount) throw new CommunityError(409, 'Set up your Social profile first.', 'SOCIAL_SETUP');
  const them = (await db.query(`SELECT coalesce(p.gifts_off, false) AS gifts_off, p.user_id IS NOT NULL AS profile, ${friendsSql('$1::text', '$2::text')} AS friend
    FROM public."user" u LEFT JOIN social.profile p ON p.user_id=u.id WHERE u.id=$2 AND ${seeableSql('u.id', '$1')}`, [me, to])).rows[0];
  if (!them || !(them.friend || them.profile)) throw new CommunityError(404, 'This person is unavailable.');
  if (them.gifts_off) throw new CommunityError(409, 'They aren\'t receiving gifts.', 'GIFTS_OFF');
  const today = (await db.query(`SELECT count(*) FILTER (WHERE receiver_id=$2)::int AS person, coalesce(sum(price_cents), 0)::int AS cents, ${weeklyUsedSql} AS weekly
    FROM community.gift WHERE sender_id=$1 AND status='sent' AND created_at >= ${sgToday}`, [me, to])).rows[0];
  if (limits && today.person >= PER_PERSON_DAY) throw new CommunityError(429, 'That\'s enough gifts to them for today.', 'GIFT_LIMIT');
  const free = (await accountAccess(me, db)).role === 'master';
  const pay = free ? 'free' : id === WEEKLY_GIFT && !today.weekly ? 'weekly' : 'store';
  if (limits && pay === 'store' && today.cents + GIFTS[id].priceCents > PAID_CENTS_DAY) throw new CommunityError(429, 'You\'ve reached today\'s gift spending limit.', 'GIFT_LIMIT');
  return { pay, friend: them.friend };
}
/** The receiver and gift of a send or check. */
function readSend(req) {
  const b = req.body ?? {}, to = requireUser(b.to), id = typeof b.gift === 'string' && Object.hasOwn(GIFTS, b.gift) ? b.gift : null;
  if (!id) throw new CommunityError(400, 'Choose a gift.');
  return { b, to, id };
}

/**
 * Whether a gift could go now, before paying for it in the store (the same checks as sending), with the store product and
 * the member's account tag, which the purchase carries so its receipt only works for this member.
 */
gifts.post('/check', async (req, res) => {
  const me = res.locals.user.id, { to, id } = readSend(req);
  if (to === me) throw new CommunityError(400, 'Choose someone else.');
  const { pay } = await checkSend(pool, me, to, id);
  res.json({ pay, product: productOf(id), account: accountTag(me) });
});

/**
 * Send a gift. A paid one carries the store's receipt (`store` 'apple' or 'google', `receipt` with Apple's transactionId or
 * Google's purchaseToken), which the store confirms first; each purchase sends one gift, and sending the same receipt
 * again returns that gift. Friends also get a gift line in your chat; anyone else finds it in Collection › Gifts.
 */
gifts.post('/', async (req, res) => {
  const me = res.locals.user.id, { b, to, id } = readSend(req);
  if (to === me) throw new CommunityError(400, 'Choose someone else.');
  const note = text(b.note, 100, { field: 'Note' }), gift = GIFTS[id], store = b.store === 'apple' || b.store === 'google' ? b.store : null;
  await throttle('gift-send:' + me, 30, 3600);
  // The store is asked before the transaction, so no database lock waits on the network.
  const transactionId = store ? await confirmPurchase(store, id, b.receipt, me) : null;
  const sent = await transaction(async db => {
    if (transactionId) {
      const used = (await db.query('SELECT id, sender_id, receiver_id, gift FROM community.gift WHERE store_transaction=$1', [transactionId])).rows[0];
      if (used) {
        if (used.sender_id === me && used.receiver_id === to && used.gift === id) return { id: used.id, again: true };
        throw new CommunityError(409, 'This purchase was already used.', 'GIFT_PURCHASE');
      }
    }
    const { pay, friend } = await checkSend(db, me, to, id, { limits: !transactionId });
    if (pay === 'store' && !transactionId) throw new CommunityError(402, 'Buy this gift in the app first.', 'GIFT_STORE');
    // A confirmed purchase is always kept as the paid gift it is, so its receipt can't be used again.
    const row = (await db.query(`INSERT INTO community.gift(sender_id, receiver_id, gift, note, store, store_transaction, price_cents) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [me, to, id, note, transactionId ? store : pay, transactionId, transactionId ? gift.priceCents : 0])).rows[0];
    if (friend) await postLine(db, me, to, { kind: 'gift', body: id, giftId: row.id, sender: me });
    return { id: row.id, friend };
  }, 'gift-send:' + me);
  if (!sent.again) {
    logger.info({ event: 'gift_sent', gift: id, store: store ?? 'free' });
    notify(to, 'gifts', 'gift', { from: me, gift: id, url: sent.friend ? '/social/chat/' + me : '/social/collection' });
  }
  res.status(201).json({ id: sent.id });
});

/** The receiver opened a gift (the opening plays once). */
gifts.post('/:id/open', async (req, res) => {
  const id = requireId(req.params.id, 'This gift is unavailable.');
  await pool.query("UPDATE community.gift SET opened_at=now() WHERE id=$1 AND receiver_id=$2 AND status='sent' AND opened_at IS NULL", [id, res.locals.user.id]);
  res.json({ ok: true });
});

/**
 * The receiver's reaction to a gift (a like, a thank-you). Either also counts as opening it. The first like and the
 * thank-you reach the sender: a line in your chat when you are friends, else the count on their Collection button.
 */
async function react(me, id, set, line) {
  const gift = await transaction(async db => {
    // `announced` lists the reactions already passed on, so each reaches the sender once, however often it is liked and unliked.
    const row = (await db.query(`WITH old AS (SELECT announced FROM community.gift WHERE id=$1 AND receiver_id=$2 AND status='sent' FOR UPDATE)
      UPDATE community.gift g SET ${set}, opened_at=coalesce(g.opened_at, now()),
        announced=CASE WHEN $3::text IS NULL OR $3=ANY(g.announced) THEN g.announced ELSE g.announced || $3::text END
      FROM old WHERE g.id=$1 RETURNING g.sender_id, g.gift, ${friendsSql('g.sender_id', 'g.receiver_id')} AS friend,
        $3::text IS NOT NULL AND NOT ($3=ANY(old.announced)) AS first`, [id, me, line || null])).rows[0];
    if (!row) throw new CommunityError(404, 'This gift is unavailable.');
    row.first = row.first && !!row.sender_id;
    if (row.first && row.friend) await postLine(db, me, row.sender_id, { body: line + ':' + row.gift, giftId: id, sender: me });
    return row;
  }, 'gift-react:' + me);
  if (gift.first) notify(gift.sender_id, 'gifts', line === 'giftliked' ? 'giftLiked' : 'giftThanks',
    { from: me, gift: gift.gift, url: gift.friend ? '/social/chat/' + me : '/social/collection' });
}

/** The receiver likes a gift, or takes the like back. */
gifts.put('/:id/like', async (req, res) => {
  const id = requireId(req.params.id, 'This gift is unavailable.'), on = req.body?.on;
  if (typeof on !== 'boolean') throw new CommunityError(400, 'Choose like or not.');
  await react(res.locals.user.id, id, on ? 'liked_at=coalesce(g.liked_at, now())' : 'liked_at=NULL', on && 'giftliked');
  res.json({ liked: on });
});

/** The receiver says thank you, once. */
gifts.put('/:id/thanks', async (req, res) => {
  const id = requireId(req.params.id, 'This gift is unavailable.');
  await throttle('gift-thanks:' + res.locals.user.id, 60, 3600);
  await react(res.locals.user.id, id, 'thanked_at=coalesce(g.thanked_at, now())', 'giftthanks');
  res.json({ thanked: true });
});

/** The sender looked at their sent gifts: the likes and thank-yous there stop counting as new. */
gifts.post('/sent/seen', async (_req, res) => {
  await pool.query(`UPDATE community.gift g SET seen_at=now() WHERE g.sender_id=$1 AND ${newsSql}`, [res.locals.user.id]);
  res.json({ ok: true });
});

/** Receive gifts or not. Needs a Social profile, where the setting is kept. */
gifts.put('/receiving', async (req, res) => {
  const on = req.body?.on;
  if (typeof on !== 'boolean') throw new CommunityError(400, 'Choose on or off.');
  const updated = await pool.query('UPDATE social.profile SET gifts_off=$2 WHERE user_id=$1', [res.locals.user.id, !on]);
  if (!updated.rowCount) throw new CommunityError(409, 'Set up your Social profile first.', 'SOCIAL_SETUP');
  res.json({ receiving: on });
});

/**
 * Unopened gifts waiting for member $1 outside chats, for the inbox count. A friend's gift is a chat line, already counted
 * as an unread chat, so it is left out here.
 */
export const giftsWaitingSql = `(SELECT count(*)::int FROM community.gift g WHERE g.receiver_id=$1 AND g.status='sent' AND g.opened_at IS NULL
  AND ${fromVisible} AND NOT EXISTS (SELECT 1 FROM social.thread_message m WHERE m.gift_id=g.id))`;
/** Gifts $1 sent with a like or thank-you not yet seen, for the Collection button. Friends' reactions are chat lines instead. */
export const giftNewsSql = `(SELECT count(*)::int FROM community.gift g WHERE g.sender_id=$1 AND g.status='sent' AND ${newsSql}
  AND ${reachableSql('g.receiver_id', '$1')} AND NOT ${friendsSql('g.sender_id', 'g.receiver_id')})`;

gifts.use(errors);
