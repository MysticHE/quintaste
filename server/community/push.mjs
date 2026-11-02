import { createHash } from 'node:crypto';
import { logger, pool } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { CommunityError, communityRouter, errors, text, throttle } from './http.mjs';
import { nameSql } from '../social/access.mjs';
import { notBlocked, notRestricted } from './router.mjs';
import { inboxCounts } from './inbox.mjs';
import { deliver, pushReady, storedToken, tokenPattern } from './push-send.mjs';
import { alertText, alertWords, pushKinds } from './push-words.mjs';

export { pushKinds };

/**
 * Phone alerts, sent straight to Google and Apple (push-send.mjs). The app registers its phone token here after the member
 * turns Phone alerts on. Something that needs a member (a message, an order step, a dinner reply, a class change, a staff
 * decision) queues one alert in community.push_outbox, in the same transaction as the change when there is one, so an alert
 * is never lost to a restart and never sent for a change that was rolled back; the admin console queues its alerts there
 * too. The worker below sends them within seconds, retries passing failures, and sends repeats (several messages from one
 * person) once. Alerts say who and what kind (push-words.mjs), never what was written. Each kind can be switched off
 * (`community.push_setting.off`) and has its own Android channel; the `push` service switch stops all sending. A phone's
 * registration belongs to the sign-in session that made it: signing out by any route or an expired session stops its
 * alerts. Schema: server/community/push.sql.
 */
// A claimed batch is sent eight alerts at a time; its ten-minute claim outlasts the slowest batch (each alert waits at most
// about 40 s on Google or Apple), so another pass never sends it twice.
const DEVICES_PER_MEMBER = 10, BATCH = 24, AT_ONCE = 8, TRIES = 5;
// An alert that could not go out within six hours is no longer useful ("running late").
const STALE = "interval '6 hours'";

/**
 * Queues alert `what` (a key of push-words.mjs) for member `to` about member `from`, opening `url` (an app path) when tapped.
 * `once`, when given, is a key sent at most once (a like: liking again after unliking stays quiet). `db` is the transaction
 * making the change, or the pool after it. It never throws: a failed queue is logged, inside a savepoint so the caller's
 * transaction carries on.
 */
export async function queueAlert(db, to, what, { from = null, detail = '', url = '/', once = null } = {}) {
  if (!to || to === from || !alertWords[what]) return;
  const inTransaction = db !== pool;
  try {
    if (inTransaction) await db.query('SAVEPOINT push_alert');
    // One statement, so the once-key and the alert are kept together or not at all.
    await db.query(`WITH first AS (INSERT INTO community.push_once(key) SELECT $7::text WHERE $7::text IS NOT NULL ON CONFLICT DO NOTHING RETURNING 1)
      INSERT INTO community.push_outbox(user_id, kind, what, actor_id, detail, url)
      SELECT $1,$2,$3,$4,$5,$6 WHERE $7::text IS NULL OR EXISTS (SELECT 1 FROM first)`,
    [to, alertWords[what].kind, what, from, String(detail ?? '').slice(0, 120), url, once ? String(once).slice(0, 300) : null]);
    if (inTransaction) await db.query('RELEASE SAVEPOINT push_alert');
  } catch (error) {
    if (inTransaction) await db.query('ROLLBACK TO SAVEPOINT push_alert').catch(() => {});
    logger.warn({ event: 'push_queue_failed', what, message: error.message });
  }
}
/** queueAlert after a change is committed; it never delays the reply. */
export function notify(to, what, options = {}) {
  void queueAlert(pool, to, what, options).then(kick);
}

let running = false, again = false;
/** Sends what is due now; runs every two seconds and after each alert queued here. */
function kick() {
  if (running) { again = true; return; }
  running = true;
  (async () => { do { again = false; await drain(); } while (again); })()
    .catch(error => logger.warn({ event: 'push_worker_failed', message: error.message }))
    .finally(() => { running = false; });
}
let clearedAt = 0;
async function drain() {
  if (Date.now() - clearedAt > 60000) {
    clearedAt = Date.now();
    await pool.query(`DELETE FROM community.push_outbox WHERE created_at < now() - ${STALE}`);
    await pool.query("DELETE FROM community.push_once WHERE created_at < now() - interval '90 days'");
  }
  // A server without push keys (a preview) leaves alerts to the one that has them.
  if (!pushReady.android && !pushReady.ios) return;
  for (;;) {
    if (!(await allowed('push'))) { await pool.query('DELETE FROM community.push_outbox WHERE send_after <= now()'); return; }
    const rows = (await pool.query(`UPDATE community.push_outbox SET claimed_until = now() + interval '10 minutes' WHERE id IN (
        SELECT id FROM community.push_outbox WHERE send_after <= now() AND (claimed_until IS NULL OR claimed_until < now())
        ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED) RETURNING *`)).rows;
    if (!rows.length) return;
    // Repeats (the same alert, same person, same screen) go out once, as the newest.
    const groups = new Map();
    for (const row of rows.sort((a, b) => Number(a.id) - Number(b.id))) groups.set([row.user_id, row.what, row.actor_id, row.detail, row.url].join('\n'), row);
    const repeats = rows.filter(row => ![...groups.values()].includes(row)).map(row => row.id);
    if (repeats.length) await pool.query('DELETE FROM community.push_outbox WHERE id = ANY($1::bigint[])', [repeats]);
    const queue = [...groups.values()], badges = new Map();
    await Promise.all(Array.from({ length: Math.min(AT_ONCE, queue.length) }, async () => {
      for (let row = queue.shift(); row; row = queue.shift()) await sendRow(row, badges);
    }));
    if (rows.length < BATCH) return;
  }
}
async function sendRow(row, badges) {
  let failed = [];
  try { failed = await send(row, badges); }
  catch (error) { failed = null; logger.warn({ event: 'push_failed', what: row.what, message: error.message }); }
  if (failed && !failed.length) return void await pool.query('DELETE FROM community.push_outbox WHERE id=$1', [row.id]);
  if (row.attempts + 1 >= TRIES) {
    logger.warn({ event: 'push_gave_up', what: row.what });
    return void await pool.query('DELETE FROM community.push_outbox WHERE id=$1', [row.id]);
  }
  // Only the phones that failed are tried again: 30 s, 2, 8, 32 minutes.
  await pool.query(`UPDATE community.push_outbox SET attempts = attempts + 1, claimed_until = NULL, tokens = coalesce($2, tokens),
    send_after = now() + make_interval(secs => 30 * power(4, attempts)) WHERE id=$1`, [row.id, failed]);
}
// Alerts that change the inbox count carry the app-icon badge; others leave it as it is.
const inboxKinds = new Set(['messages', 'friends', 'gifts', 'dinners', 'orders']);
/** The member's inbox total, worked out once per batch. */
function badgeFor(userId, badges) {
  if (!badges.has(userId)) badges.set(userId, inboxCounts(userId).then(counts => counts.total, () => null));
  return badges.get(userId);
}
/** Returns the phones that failed for a passing reason, or [] once every phone was reached. */
async function send(row, badges) {
  // The words decide the switch and the Android channel; a key this server doesn't know is dropped.
  const words = alertWords[row.what];
  if (!words) return [];
  const kind = words.kind;
  // Nothing from someone either of them blocked, or from an account staff restricted. Safety notices and staff decisions
  // are queued without an actor, so they always arrive.
  if (row.actor_id && !(await pool.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')} AND ${notRestricted('$1')}`, [row.actor_id, row.user_id])).rowCount) return [];
  const devices = (await pool.query(`SELECT d.token, d.language, d.platform, d.sandbox FROM community.push_device d
    JOIN public."session" s ON s.id=d.session_id AND s."expiresAt" > now()
    WHERE d.user_id=$1 AND d.token NOT LIKE 'Expo%' AND ($3::text[] IS NULL OR d.token = ANY($3))
      AND NOT EXISTS (SELECT 1 FROM community.push_setting p WHERE p.user_id=d.user_id AND $2=ANY(p.off))`, [row.user_id, kind, row.tokens])).rows;
  if (!devices.length) return [];
  const [name, badge] = await Promise.all([
    row.actor_id ? pool.query(`SELECT ${nameSql('p', 'u')} AS name FROM public."user" u LEFT JOIN social.profile p ON p.user_id=u.id WHERE u.id=$1`, [row.actor_id])
      .then(result => result.rows[0]?.name ?? '') : '',
    inboxKinds.has(kind) ? badgeFor(row.user_id, badges) : null,
  ]);
  // A newer alert about the same screen replaces this one on the phone.
  const tag = createHash('sha256').update(kind + '\n' + row.url).digest('base64url').slice(0, 32);
  const failed = [];
  for (const language of ['en', 'zh']) {
    const group = devices.filter(d => (d.language === 'zh' ? 'zh' : 'en') === language);
    if (!group.length) continue;
    const [title, body] = alertText(row.what, language, name, row.detail);
    failed.push(...await deliver(group, { kind, title, body, url: row.url, tag, badge }));
  }
  return failed;
}
setInterval(kick, 2000).unref();

export const push = communityRouter();
/**
 * The phone's push token, for the signed-in member and this sign-in session. Another member registering the same token
 * (someone else signing in on that phone) adds their own row; it never moves the first member's.
 */
push.put('/device', async (req, res) => {
  const me = res.locals.user.id, b = req.body ?? {}, token = storedToken(text(b.token, 400, { min: 1, field: 'Token' }));
  // Builds before 2 Nov 2026 sent an Expo push token, which this server no longer uses.
  if (token.startsWith('Expo')) throw new CommunityError(410, 'Update QuinTaste to turn on phone alerts.', 'APP_UPDATE');
  const platform = b.platform === 'ios' || b.platform === 'android' ? b.platform : null;
  if (!platform) throw new CommunityError(400, 'Check the platform.');
  if (!tokenPattern[platform].test(token)) throw new CommunityError(400, 'Check the push token.');
  const sandbox = platform === 'ios' && b.sandbox === true;
  const language = b.language === 'zh' ? 'zh' : 'en';
  await throttle('push-device:' + me, 30, 3600);
  await pool.query(`INSERT INTO community.push_device(token, user_id, session_id, platform, language, sandbox) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(token, user_id) DO UPDATE SET session_id=EXCLUDED.session_id, platform=EXCLUDED.platform, language=EXCLUDED.language,
      sandbox=EXCLUDED.sandbox, updated_at=now()`, [token, me, res.locals.user.session, platform, language, sandbox]);
  // A member keeps the ten most recently used phones.
  await pool.query(`DELETE FROM community.push_device WHERE user_id=$1 AND token NOT IN
    (SELECT token FROM community.push_device WHERE user_id=$1 ORDER BY updated_at DESC LIMIT ${DEVICES_PER_MEMBER})`, [me]);
  res.json({ ok: true });
});
/** This phone stops getting alerts for the member (Phone alerts off, or signing out). */
push.delete('/device', async (req, res) => {
  const token = storedToken(text(req.body?.token, 400, { min: 1, field: 'Token' }));
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
