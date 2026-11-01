import { readFileSync } from 'node:fs';
import { logger, pool } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { CommunityError, communityRouter, errors, text, throttle } from './http.mjs';
import { nameSql } from '../social/access.mjs';

/**
 * Phone alerts through the Expo push service (docs.expo.dev/push-notifications/sending-notifications). The app registers
 * its Expo push token here after the member turns Phone alerts on; the server sends a short alert when something needs
 * them: a message, a friend request, a gift or a reaction to one, a dinner invite, a new order. Alerts never carry what
 * was written, only who and what kind, so nothing private shows on a locked screen. Each kind can be switched off
 * (`community.push_setting.off`), and the `push` service switch stops all sending. A phone's registration belongs to the
 * sign-in session that made it: signing out by any route or an expired session stops its alerts. Schema:
 * server/community/push.sql.
 */
export const pushKinds = ['messages', 'friends', 'gifts', 'dinners', 'orders'];
const SEND = 'https://exp.host/--/api/v2/push/send', RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts';
const TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/, DEVICES_PER_MEMBER = 10;
// The Expo access token, when "enhanced push security" is on for the project (a file, never in the code or the image).
let accessToken = '';
try { if (process.env.EXPO_ACCESS_TOKEN_FILE) accessToken = readFileSync(process.env.EXPO_ACCESS_TOKEN_FILE, 'utf8').trim(); }
catch (error) { logger.warn({ event: 'push_token_file_unreadable', message: error.message }); }

/** The words of each alert, in English and Simplified Chinese; {name} is who did it, {gift} the gift. */
const words = {
  message: { en: ['{name}', 'New message'], zh: ['{name}', '新消息'] },
  friendRequest: { en: ['Friend request', '{name} wants to be friends'], zh: ['好友请求', '{name} 想加你为好友'] },
  friendAccepted: { en: ['New friend', 'You and {name} are now friends'], zh: ['新朋友', '你和 {name} 成为了好友'] },
  gift: { en: ['A gift for you', '{name} sent you a {gift}'], zh: ['你收到一份礼物', '{name} 送你一份{gift}'] },
  giftLiked: { en: ['{name} liked your gift', 'Your {gift} ♥'], zh: ['{name} 喜欢你的礼物', '你送的{gift} ♥'] },
  giftThanks: { en: ['{name} says thanks', 'For your {gift}'], zh: ['{name} 向你道谢', '谢谢你送的{gift}'] },
  dinner: { en: ['Dinner invite', '{name} invited you to dinner'], zh: ['晚餐邀请', '{name} 邀请你吃饭'] },
  order: { en: ['New order', '{name} placed an order'], zh: ['新订单', '{name} 下了订单'] },
};
const giftNames = {
  en: { rose: 'Rose', lotus: 'Pink Lotus', bouquet: 'Rose Bouquet', mochi: 'Mochi Hug', 'golden-lotus': 'Golden Lotus' },
  zh: { rose: '玫瑰', lotus: '粉莲', bouquet: '玫瑰花束', mochi: '麻糬抱抱', 'golden-lotus': '金莲' },
};
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

/**
 * Sends alert `what` (a key of `words`) of kind `kind` (one of pushKinds) to member `to`, about member `from`, opening
 * `url` (an app path) when tapped. Call it after the change is committed; it never throws and never delays the reply.
 */
export function notify(to, kind, what, { from = null, gift = null, url = '/' } = {}) {
  if (!to || to === from) return;
  send(to, kind, what, from, gift, url).catch(error => logger.warn({ event: 'push_failed', kind, message: error.message }));
}
async function send(to, kind, what, from, gift, url) {
  if (!(await allowed('push'))) return;
  const devices = (await pool.query(`SELECT d.token, d.language, d.platform FROM community.push_device d
    JOIN public."session" s ON s.id=d.session_id AND s."expiresAt" > now()
    WHERE d.user_id=$1 AND NOT EXISTS (SELECT 1 FROM community.push_setting s WHERE s.user_id=d.user_id AND $2=ANY(s.off))`, [to, kind])).rows;
  if (!devices.length) return;
  const name = from ? (await pool.query(`SELECT ${nameSql('p', 'u')} AS name FROM public."user" u LEFT JOIN social.profile p ON p.user_id=u.id WHERE u.id=$1`, [from])).rows[0]?.name ?? '' : '';
  const messages = devices.map(d => {
    const language = d.language === 'zh' ? 'zh' : 'en', [title, body] = words[what][language];
    const values = { name: name || (language === 'zh' ? '有人' : 'Someone'), gift: gift ? giftNames[language][gift] ?? '' : '' };
    // iOS groups alerts of one kind together.
    return { to: d.token, title: fill(title, values), body: fill(body, values), data: { url }, sound: 'default', priority: 'high',
      channelId: 'alerts', ...(d.platform === 'ios' ? { threadId: kind } : {}) };
  });
  for (let i = 0; i < messages.length; i += 100) await post(messages.slice(i, i + 100));
}
async function post(batch) {
  const response = await fetch(SEND, { method: 'POST', signal: AbortSignal.timeout(10000), headers: {
    accept: 'application/json', 'content-type': 'application/json', ...(accessToken ? { authorization: 'Bearer ' + accessToken } : {}) }, body: JSON.stringify(batch) });
  if (!response.ok) throw new Error('Expo push answered ' + response.status);
  const tickets = /** @type {{ data?: { status: string, id?: string, details?: { error?: string } }[] }} */ (await response.json()).data ?? [];
  const gone = [];
  tickets.forEach((ticket, i) => {
    if (ticket.status === 'ok' && ticket.id) remember(ticket.id, batch[i].to);
    else if (ticket.details?.error === 'DeviceNotRegistered') gone.push(batch[i].to);
    else if (ticket.status === 'error') logger.warn({ event: 'push_ticket_error', error: ticket.details?.error ?? 'unknown' });
  });
  await forget(gone);
}
/** Tokens the phone no longer accepts (the app was removed or alerts turned off) are dropped. */
async function forget(tokens) {
  if (tokens.length) await pool.query('DELETE FROM community.push_device WHERE token = ANY($1::text[])', [tokens]);
}

// Receipts: Expo reports a delivery problem (such as a removed app) only in the receipt, about 15 minutes later. Ticket ids
// wait here in memory (a restart loses a few, which only delays dropping a dead token to its next alert).
const pending = new Map();
function remember(id, token) { if (pending.size < 20000) pending.set(id, { token, at: Date.now() }); }
async function checkReceipts() {
  const due = [...pending].filter(([, p]) => Date.now() - p.at > 15 * 60000).slice(0, 1000);
  if (!due.length) return;
  due.forEach(([id]) => pending.delete(id));
  const response = await fetch(RECEIPTS, { method: 'POST', signal: AbortSignal.timeout(10000), headers: {
    accept: 'application/json', 'content-type': 'application/json', ...(accessToken ? { authorization: 'Bearer ' + accessToken } : {}) },
    body: JSON.stringify({ ids: due.map(([id]) => id) }) });
  if (!response.ok) return;
  const receipts = /** @type {{ data?: Record<string, { details?: { error?: string } }> }} */ (await response.json()).data ?? {}, tokens = new Map(due.map(([id, p]) => [id, p.token]));
  await forget(Object.entries(receipts).filter(([, r]) => r.details?.error === 'DeviceNotRegistered').map(([id]) => tokens.get(id)).filter(Boolean));
}
setInterval(() => checkReceipts().catch(error => logger.warn({ event: 'push_receipts_failed', message: error.message })), 5 * 60000).unref();

export const push = communityRouter();
/**
 * The phone's push token, for the signed-in member and this sign-in session. Another member registering the same token
 * (someone else signing in on that phone) adds their own row; it never moves the first member's.
 */
push.put('/device', async (req, res) => {
  const me = res.locals.user.id, b = req.body ?? {}, token = text(b.token, 220, { min: 1, field: 'Token' });
  if (!TOKEN.test(token)) throw new CommunityError(400, 'Check the push token.');
  const platform = b.platform === 'ios' || b.platform === 'android' ? b.platform : null;
  if (!platform) throw new CommunityError(400, 'Check the platform.');
  const language = b.language === 'zh' ? 'zh' : 'en';
  await throttle('push-device:' + me, 30, 3600);
  await pool.query(`INSERT INTO community.push_device(token, user_id, session_id, platform, language) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(token, user_id) DO UPDATE SET session_id=EXCLUDED.session_id, platform=EXCLUDED.platform, language=EXCLUDED.language, updated_at=now()`,
    [token, me, res.locals.user.session, platform, language]);
  // A member keeps the ten most recently used phones.
  await pool.query(`DELETE FROM community.push_device WHERE user_id=$1 AND token NOT IN
    (SELECT token FROM community.push_device WHERE user_id=$1 ORDER BY updated_at DESC LIMIT ${DEVICES_PER_MEMBER})`, [me]);
  res.json({ ok: true });
});
/** This phone stops getting alerts for the member (Phone alerts off, or signing out). */
push.delete('/device', async (req, res) => {
  const token = text(req.body?.token, 220, { min: 1, field: 'Token' });
  await pool.query('DELETE FROM community.push_device WHERE token=$1 AND user_id=$2', [token, res.locals.user.id]);
  res.json({ ok: true });
});
/** Which kinds of alert the member turned off. */
push.get('/settings', async (_req, res) => {
  const off = (await pool.query('SELECT off FROM community.push_setting WHERE user_id=$1', [res.locals.user.id])).rows[0]?.off ?? [];
  res.json({ kinds: pushKinds, off });
});
push.put('/settings', async (req, res) => {
  const off = req.body?.off;
  if (!Array.isArray(off) || off.some(kind => !pushKinds.includes(kind))) throw new CommunityError(400, 'Check the alert choices.');
  const unique = [...new Set(off)];
  await pool.query(`INSERT INTO community.push_setting(user_id, off) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET off=EXCLUDED.off, updated_at=now()`,
    [res.locals.user.id, unique]);
  res.json({ off: unique });
});
push.use(errors);
