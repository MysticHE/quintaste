import { pool } from '../config.mjs';
import { allowedAll } from '../operations.mjs';
import { communityRouter, errors } from './http.mjs';
import { standing } from '../social/access.mjs';
import { dinnersDueSql, friendRequestsSql, unreadFriendChatsSql } from '../social/friends.mjs';
import { marketAttentionSql, newOrdersSql, unreadMarketChatsSql } from '../market/conversations.mjs';
import { unreadClassChatsSql } from '../market/classes.mjs';
import { giftNewsSql, giftsWaitingSql } from '../collection/gifts.mjs';

/**
 * Everything waiting on the member, in the one request the tab bar polls: unread conversations (friends, Market, classes)
 * for the Messages icon, and new orders, friend requests and dinner invites where they live. Each part keeps its own service
 * switch and access rule, so a paused service or an account that cannot use Social simply counts zero. `photoCheck` names the
 * photo check waiting on the member (it did not pass, or they changed the checked photo), or is null; it is not in `total`: the app
 * shows it until the member has seen it, as a decision cannot be "read" on the server.
 */
export const inbox = communityRouter();
/** Everything waiting on member `me`; `total` is also the app-icon badge on phone alerts (push-send.mjs). */
export async function inboxCounts(me) {
  // The service switches and the member's Social standing are independent reads, so they run together.
  const [on, state] = await Promise.all([allowedAll(['social', 'market', 'market_sellers', 'games', 'collection', 'gifts']), standing(me)]);
  const { social, market, market_sellers: sellers } = on, giftsOn = on.games && on.collection && on.gifts;
  // Friends are for every member; dinners only for members who can use Dining (owner, 25 Oct 2026).
  const meet = social && state.canMeet;
  const parts = {
    friends: social ? unreadFriendChatsSql : null, requests: social ? friendRequestsSql : null, dinners: meet ? dinnersDueSql : null,
    // A seller's chat with an unanswered new order keeps counting after it is read, so the order is not lost (owner, 25 Oct 2026).
    market: market ? (sellers ? marketAttentionSql : unreadMarketChatsSql) : null, classes: market ? unreadClassChatsSql : null,
    // New orders are acted on in My shop, which the market_sellers switch also pauses.
    orders: market && sellers ? newOrdersSql : null,
    // Unopened gifts, shown on the Collection button (gifts live in Collection › Gifts).
    gifts: social && giftsOn ? giftsWaitingSql : null,
    // Likes and thank-yous on gifts you sent to people who aren't your friends (a friend's come as chat lines).
    giftNews: social && giftsOn ? giftNewsSql : null,
  };
  const live = Object.entries(parts).filter(([, sql]) => sql);
  const row = Object.fromEntries(Object.keys(parts).map(key => [key, 0]));
  if (live.length) Object.assign(row, (await pool.query(`SELECT ${live.map(([key, sql]) => sql + ' AS "' + key + '"').join(', ')}`, [me])).rows[0]);
  const messages = row.friends + row.market + row.classes;
  const photoCheck = social && state.step === 'verify' && ['rejected', 'paused'].includes(state.verification) ? state.verification + ':' + (state.decidedAt ?? '') : null;
  return { ...row, messages, photoCheck, total: messages + row.orders + row.requests + row.dinners + row.gifts + row.giftNews, dining: meet };
}
inbox.get('/', async (_req, res) => { res.json(await inboxCounts(res.locals.user.id)); });
inbox.use(errors);
