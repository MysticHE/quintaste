import { connect, constants } from 'node:http2';
import { logger, pool } from '../config.mjs';
import { forgetGoogleToken, googleAccessToken, jwt, readKeyFile, readServiceAccount } from '../service-tokens.mjs';

/**
 * Delivery of phone alerts straight to Google (Firebase Cloud Messaging, Android) and Apple (APNs, iPhone), both free, with
 * no relay in between. Keys are files outside the image, named in runtime.env:
 * - FCM_SERVICE_ACCOUNT_FILE: the Firebase project's service account key (JSON).
 * - APNS_KEY_FILE (the .p8 push key), APNS_KEY_ID, APNS_TEAM_ID; APP_BUNDLE_ID is the app (default com.mystiche.quintaste).
 * The payloads follow what expo-notifications reads in the app: Android gets a data-only message that the app shows itself
 * on the alert's channel; on both, `body` carries the data (`url`, the screen a tap opens). An alert with the same `tag`
 * replaces the earlier one on the phone (the same chat, the same order).
 */
const firebase = readServiceAccount('FCM_SERVICE_ACCOUNT_FILE');
const apple = { key: readKeyFile('APNS_KEY_FILE'), keyId: process.env.APNS_KEY_ID ?? '', team: process.env.APNS_TEAM_ID ?? '',
  topic: process.env.APP_BUNDLE_ID || 'com.mystiche.quintaste' };
/** Which platforms this server can send to. */
export const pushReady = { android: !!(firebase?.project_id && firebase?.client_email && firebase?.private_key), ios: !!(apple.key && apple.keyId && apple.team) };
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

/** Phone tokens: Firebase registration tokens and APNs device tokens (hex, kept in lower case). */
export const tokenPattern = { android: /^[A-Za-z0-9_:-]{100,400}$/, ios: /^[0-9a-f]{64,200}$/ };
/** The stored form of a phone token: APNs tokens are hex and compared in lower case; Firebase tokens are kept as given. */
export const storedToken = token => /^[0-9a-f]+$/i.test(token) ? token.toLowerCase() : token;

const warned = new Set();
const missing = platform => { if (!warned.has(platform)) { warned.add(platform); logger.warn({ event: 'push_keys_missing', platform }); } };

/**
 * Sends `alert` ({ kind, title, body, url, tag, badge }; a null badge leaves the app icon as it is) to each of `devices`
 * ({ token, platform, sandbox }). Tokens the phone no longer accepts (app removed, alerts turned off, another Firebase
 * project) are dropped. Returns the tokens that failed for a passing reason (network, Google or Apple busy), to try again.
 */
export async function deliver(devices, alert) {
  const gone = [], failed = [];
  await Promise.all(devices.map(async device => {
    try {
      const outcome = device.platform === 'ios' ? await toApple(device, alert) : await toGoogle(device, alert);
      if (outcome === 'gone') gone.push(device.token);
    } catch (error) {
      failed.push(device.token);
      logger.warn({ event: 'push_failed', platform: device.platform, message: error.message });
    }
  }));
  if (gone.length) await pool.query('DELETE FROM community.push_device WHERE token = ANY($1::text[])', [gone]);
  return failed;
}

/** Firebase: one request per phone. */
async function toGoogle({ token }, { kind, title, body, url, tag, badge }) {
  if (!pushReady.android) { missing('android'); return 'skipped'; }
  const access = await googleAccessToken(firebase, FCM_SCOPE);
  const message = { token, android: { priority: 'HIGH', ttl: '86400s' },
    data: { title, message: body, body: JSON.stringify({ url }), channelId: kind, threadIdentifier: kind, tag, ...(Number.isInteger(badge) ? { badge: String(badge) } : {}) } };
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${firebase.project_id}/messages:send`, { method: 'POST',
    signal: AbortSignal.timeout(10000), headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json' }, body: JSON.stringify({ message }) });
  if (response.ok) return 'sent';
  const error = /** @type {{ error?: { message?: string, details?: { errorCode?: string }[] } }} */ (await response.json().catch(() => ({}))).error;
  const code = error?.details?.find(d => d.errorCode)?.errorCode ?? '';
  if (code === 'UNREGISTERED' || code === 'SENDER_ID_MISMATCH' || (code === 'INVALID_ARGUMENT' && /registration token/i.test(error?.message ?? ''))) return 'gone';
  if (response.status === 401) forgetGoogleToken(firebase, FCM_SCOPE);
  throw new Error(`Firebase answered ${response.status} ${code}`);
}

// Apple: a provider token signed with the push key, renewed every 40 minutes (Apple accepts one for up to an hour and
// refuses a new one more often than every 20), sent over one HTTP/2 connection per host.
let provider = { token: '', until: 0 };
function providerToken() {
  if (provider.until > Date.now()) return provider.token;
  const token = jwt({ alg: 'ES256', kid: apple.keyId }, { iss: apple.team, iat: Math.floor(Date.now() / 1000) }, apple.key, 'ES256');
  provider = { token, until: Date.now() + 40 * 60000 };
  return token;
}
const hosts = { production: 'api.push.apple.com', sandbox: 'api.sandbox.push.apple.com' };
const sessions = new Map();
function session(host) {
  const open = sessions.get(host);
  if (open && !open.closed && !open.destroyed) return open;
  const created = connect('https://' + host);
  const drop = () => { if (sessions.get(host) === created) sessions.delete(host); };
  created.on('error', error => { drop(); logger.warn({ event: 'push_apns_connection', message: error.message }); });
  // Apple closes idle or old connections with GOAWAY; new requests go on a fresh one.
  created.on('goaway', drop);
  created.on('close', drop);
  created.unref();
  sessions.set(host, created);
  return created;
}
/** One APNs request; a connection that was closing is replaced and the request tried once more. */
async function apns(host, token, payload, headers) {
  for (let attempt = 0; ; attempt++) {
    try { return await apnsOnce(session(host), token, payload, headers); }
    catch (error) {
      if (attempt || !/GOAWAY|INVALID_SESSION|SESSION_CLOSED|closed/i.test(String(error?.code ?? '') + ' ' + error?.message)) throw error;
      sessions.get(host)?.close();
      sessions.delete(host);
    }
  }
}
function apnsOnce(link, token, payload, headers) {
  return new Promise((resolve, reject) => {
    const request = link.request({ ':method': 'POST', ':path': '/3/device/' + token, authorization: 'bearer ' + providerToken(), ...headers });
    let code = 0, text = '';
    request.setTimeout(10000, () => request.close(constants.NGHTTP2_CANCEL));
    request.setEncoding('utf8');
    request.on('response', received => { code = Number(received[':status']); });
    request.on('data', chunk => { text += chunk; });
    request.on('end', () => { let reason = ''; try { reason = text ? JSON.parse(text).reason ?? '' : ''; } catch { /* No reason given. */ } resolve({ status: code, reason }); });
    request.on('close', () => { if (!code) reject(new Error('APNs gave no answer')); });
    request.on('error', reject);
    request.end(JSON.stringify(payload));
  });
}
const goneReasons = ['Unregistered', 'DeviceTokenNotForTopic'];
/**
 * Development builds use Apple's sandbox, TestFlight and the App Store production. A token sent to the wrong one answers
 * BadDeviceToken: the other is tried once and, when it works, remembered for that phone.
 */
async function toApple({ token, sandbox }, { kind, title, body, url, tag, badge }) {
  if (!pushReady.ios) { missing('ios'); return 'skipped'; }
  const payload = { aps: { alert: { title, body }, sound: 'default', ...(Number.isInteger(badge) ? { badge } : {}), 'thread-id': kind }, body: { url } };
  const headers = { 'apns-topic': apple.topic, 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-collapse-id': tag,
    'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400) };
  let { status, reason } = await apns(sandbox ? hosts.sandbox : hosts.production, token, payload, headers);
  if (reason === 'BadDeviceToken') {
    ({ status, reason } = await apns(sandbox ? hosts.production : hosts.sandbox, token, payload, headers));
    if (status === 200) await pool.query('UPDATE community.push_device SET sandbox=$2 WHERE token=$1', [token, !sandbox]);
  }
  if (status === 200) return 'sent';
  if (status === 410 || goneReasons.includes(reason) || reason === 'BadDeviceToken') return 'gone';
  if (reason === 'ExpiredProviderToken' || reason === 'InvalidProviderToken') provider = { token: '', until: 0 };
  throw new Error(`APNs answered ${status} ${reason}`);
}
