import { pool } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { communityRouter, errors } from './http.mjs';
import { standing } from '../social/access.mjs';
import { dinnersDueSql, friendRequestsSql, unreadFriendChatsSql } from '../social/friends.mjs';
import { marketAttentionSql, newOrdersSql, unreadMarketChatsSql } from '../market/conversations.mjs';
import { unreadClassChatsSql } from '../market/classes.mjs';

/**
 * Everything waiting on the member, in the one request the tab bar polls: unread conversations (friends, Market, classes)
 * for the Messages icon, and new orders, friend requests and dinner invites where they live. Each part keeps its own service
 * switch and access rule, so a paused service or an account that cannot use Social simply counts zero.
 */
export const inbox = communityRouter();
inbox.get('/', async (_req, res) => {
  const me = res.locals.user.id;
  // The service switches and the member's Social standing are independent reads, so they run together.
  const [social, market, sellers, state] = await Promise.all([allowed('social'), allowed('market'), allowed('market_sellers'), standing(me)]);
  // Friends are for every member; dinners only for members who can use Dining (owner, 25 Oct 2026).
  const meet = social && state.canMeet;
  const parts = {
    friends: social ? unreadFriendChatsSql : null, requests: social ? friendRequestsSql : null, dinners: meet ? dinnersDueSql : null,
    // A seller's chat with an unanswered new order keeps counting after it is read, so the order is not lost (owner, 25 Oct 2026).
    market: market ? (sellers ? marketAttentionSql : unreadMarketChatsSql) : null, classes: market ? unreadClassChatsSql : null,
    // New orders are acted on in My shop, which the market_sellers switch also pauses.
    orders: market && sellers ? newOrdersSql : null,
  };
  const live = Object.entries(parts).filter(([, sql]) => sql);
  const row = Object.fromEntries(Object.keys(parts).map(key => [key, 0]));
  if (live.length) Object.assign(row, (await pool.query(`SELECT ${live.map(([key, sql]) => sql + ' AS ' + key).join(', ')}`, [me])).rows[0]);
  const messages = row.friends + row.market + row.classes;
  res.json({ ...row, messages, total: messages + row.orders + row.requests + row.dinners });
});
inbox.use(errors);
