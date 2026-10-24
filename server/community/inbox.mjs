import { pool } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { communityRouter, errors } from './http.mjs';
import { standing } from '../social/access.mjs';
import { dinnersDueSql, friendRequestsSql, unreadFriendChatsSql } from '../social/friends.mjs';
import { newOrdersSql, unreadMarketChatsSql } from '../market/conversations.mjs';
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
  const meet = social && state.canMeet;
  const parts = {
    friends: meet ? unreadFriendChatsSql : null, requests: meet ? friendRequestsSql : null, dinners: meet ? dinnersDueSql : null,
    market: market ? unreadMarketChatsSql : null, classes: market ? unreadClassChatsSql : null,
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
