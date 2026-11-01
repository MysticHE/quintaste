import { logger, pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { accountAccess } from '../account-access.mjs';
import { friendsSql, nameSql, reachableSql, seeableSql } from '../social/access.mjs';
import { postLine } from '../social/friends.mjs';
import { GIFTS, WEEKLY_GIFT } from './catalog.mjs';

/**
 * Gifts (docs/COLLECTION_PLAN.md §5): a member with a Social profile sends one to anyone whose profile they can see (owner,
 * 1 Nov 2026: friends or not). A gift has no cash value and never gives credits. Every member gets one free Rose a Singapore
 * week (Monday to Sunday); the master account sends every gift free. Other gifts are paid through the App Store or Google
 * Play, which needs the store build and the store's purchase check (not built yet), so until then they are refused with
 * GIFT_STORE. Limits: 5 a day to the same person, S$30 a day of paid gifts. The receiver can Like a gift; the sender sees it.
 */
export const gifts = communityRouter();
const PER_PERSON_DAY = 5, PAID_CENTS_DAY = 3000;
const sgToday = "date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'";
const sgWeek = "date_trunc('week', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'";
const weeklyUsedSql = `EXISTS (SELECT 1 FROM community.gift WHERE sender_id=$1 AND store='weekly' AND created_at >= ${sgWeek})`;
const noteSql = "CASE WHEN g.note_hidden THEN '' ELSE g.note END";
// Gifts from someone either of you blocked, or who was restricted, drop out of view (a deleted sender's gifts stay, unnamed).
const fromVisible = `(g.sender_id IS NULL OR ${reachableSql('g.sender_id', '$1')})`;
const catalog = Object.entries(GIFTS).map(([id, g]) => ({ id, tier: g.tier, priceCents: g.priceCents, burst: g.burst }));
/** Whether member `me` sends free (master) and this week's free gift while it is unused. */
async function sending(me) {
  const [access, used] = await Promise.all([accountAccess(me), pool.query(`SELECT ${weeklyUsedSql} AS used`, [me]).then(r => r.rows[0].used)]);
  const free = access.role === 'master';
  return { sending: free ? 'free' : 'store', weekly: free || used ? null : WEEKLY_GIFT };
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
        g.sender_id AS "fromId", ${nameSql('p', 'u')} AS "fromName" FROM community.gift g LEFT JOIN public."user" u ON u.id=g.sender_id
        LEFT JOIN social.profile p ON p.user_id=g.sender_id WHERE g.receiver_id=$1 AND g.status='sent' AND ${fromVisible}
        ORDER BY g.created_at DESC LIMIT 200`, [me]).then(r => r.rows),
    pool.query(`SELECT g.id, g.gift, ${noteSql} AS note, g.created_at AS at, g.opened_at IS NOT NULL AS opened, g.liked_at IS NOT NULL AS liked,
        g.receiver_id AS "toId", ${nameSql('p', 'u')} AS "toName" FROM community.gift g JOIN public."user" u ON u.id=g.receiver_id
        LEFT JOIN social.profile p ON p.user_id=g.receiver_id WHERE g.sender_id=$1 AND g.status='sent' AND ${reachableSql('g.receiver_id', '$1')}
        ORDER BY g.created_at DESC LIMIT 200`, [me]).then(r => r.rows),
    pool.query('SELECT gifts_off FROM social.profile WHERE user_id=$1', [me]).then(r => r.rows[0]?.gifts_off ?? false),
  ]);
  res.json({ catalog, ...mode, received, sent, receiving: !off });
});

/** Send a gift. Friends also get a gift line in your chat; anyone else finds it in Collection › Gifts. */
gifts.post('/', async (req, res) => {
  const me = res.locals.user.id, b = req.body ?? {}, to = requireUser(b.to), id = typeof b.gift === 'string' && Object.hasOwn(GIFTS, b.gift) ? b.gift : null;
  if (!id) throw new CommunityError(400, 'Choose a gift.');
  if (to === me) throw new CommunityError(400, 'Choose someone else.');
  const note = text(b.note, 100, { field: 'Note' }), gift = GIFTS[id];
  await throttle('gift-send:' + me, 30, 3600);
  const sent = await transaction(async db => {
    const mine = await db.query('SELECT 1 FROM social.profile WHERE user_id=$1', [me]);
    if (!mine.rowCount) throw new CommunityError(409, 'Set up your Social profile first.', 'SOCIAL_SETUP');
    // Anyone with a Social profile (where Gifts lives) whose profile you can see (public, a friend, or an open friend
    // request), never someone either of you blocked.
    const them = (await db.query(`SELECT p.gifts_off, ${friendsSql('$1::text', '$2::text')} AS friend
      FROM public."user" u JOIN social.profile p ON p.user_id=u.id WHERE u.id=$2 AND ${seeableSql('u.id', '$1')}`, [me, to])).rows[0];
    if (!them) throw new CommunityError(404, 'This person is unavailable.');
    if (them.gifts_off) throw new CommunityError(409, 'They aren\'t receiving gifts.', 'GIFTS_OFF');
    const today = (await db.query(`SELECT count(*) FILTER (WHERE receiver_id=$2)::int AS person, coalesce(sum(price_cents), 0)::int AS cents, ${weeklyUsedSql} AS weekly
      FROM community.gift WHERE sender_id=$1 AND status='sent' AND created_at >= ${sgToday}`, [me, to])).rows[0];
    if (today.person >= PER_PERSON_DAY) throw new CommunityError(429, 'That\'s enough gifts to them for today.', 'GIFT_LIMIT');
    const free = (await accountAccess(me, db)).role === 'master', weekly = !free && id === WEEKLY_GIFT && !today.weekly;
    if (!free && !weekly) {
      if (today.cents + gift.priceCents > PAID_CENTS_DAY) throw new CommunityError(429, 'You\'ve reached today\'s gift spending limit.', 'GIFT_LIMIT');
      // Paid gifts need the store build's purchase check (App Store Server API / Google Play Developer API).
      throw new CommunityError(402, 'Gifts can be bought in the App Store or Google Play version of the app.', 'GIFT_STORE');
    }
    const row = (await db.query('INSERT INTO community.gift(sender_id, receiver_id, gift, note, store) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [me, to, id, note, weekly ? 'weekly' : 'free'])).rows[0];
    if (them.friend) await postLine(db, me, to, { kind: 'gift', body: id, giftId: row.id, sender: me });
    return row.id;
  }, 'gift-send:' + me);
  logger.info({ event: 'gift_sent', gift: id });
  res.status(201).json({ id: sent });
});

/** The receiver opened a gift (the opening plays once). */
gifts.post('/:id/open', async (req, res) => {
  const id = requireId(req.params.id, 'This gift is unavailable.');
  await pool.query("UPDATE community.gift SET opened_at=now() WHERE id=$1 AND receiver_id=$2 AND status='sent' AND opened_at IS NULL", [id, res.locals.user.id]);
  res.json({ ok: true });
});

/** The receiver likes a gift, or takes the like back; the sender sees it. Liking also counts as opening it. */
gifts.put('/:id/like', async (req, res) => {
  const id = requireId(req.params.id, 'This gift is unavailable.'), on = req.body?.on;
  if (typeof on !== 'boolean') throw new CommunityError(400, 'Choose like or not.');
  const updated = await pool.query(`UPDATE community.gift SET liked_at=CASE WHEN $3 THEN coalesce(liked_at, now()) END, opened_at=coalesce(opened_at, now())
    WHERE id=$1 AND receiver_id=$2 AND status='sent'`, [id, res.locals.user.id, on]);
  if (!updated.rowCount) throw new CommunityError(404, 'This gift is unavailable.');
  res.json({ liked: on });
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

gifts.use(errors);
