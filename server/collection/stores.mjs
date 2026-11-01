import { createHash, createHmac, createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { logger, pool } from '../config.mjs';
import { CommunityError } from '../community/http.mjs';

/**
 * Paid gifts' store checks (docs/COLLECTION_PLAN.md §5). A gift bought in the app is sent only after the store confirms the
 * purchase here: the App Store Server API (developer.apple.com/documentation/appstoreserverapi) for Apple, the Google Play
 * Developer API (purchases.products) for Google. Each purchase sends one gift (community.gift.store_transaction is unique).
 * Refunds are checked every six hours and the refunded gift disappears for both people.
 *
 * Credentials live outside the code and the image, in runtime.env and files under the app's state folder:
 * APPLE_IAP_KEY_FILE (the .p8 in-app purchase key), APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID; GOOGLE_PLAY_KEY_FILE (a service
 * account JSON with access to the Play Console). Without them, that store's gifts are refused as not available yet.
 */
export const APP_ID = process.env.APP_BUNDLE_ID || 'com.mystiche.quintaste';
/**
 * Member `userId`'s account tag, a UUID made from the account id with the server's secret: purchases carry it (Apple's
 * appAccountToken, Google's obfuscated account id), so a receipt only sends a gift for the member who bought it.
 */
export function accountTag(userId) {
  const h = createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '').update('gift-account:' + userId).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
/** The store product id of gift `id`: "golden-lotus" is "quintaste.gift.golden_lotus" in both stores. */
export const productOf = id => 'quintaste.gift.' + id.replaceAll('-', '_');
const read = name => { try { return process.env[name] ? readFileSync(process.env[name], 'utf8') : ''; } catch (error) { logger.warn({ event: 'store_key_unreadable', name, message: error.message }); return ''; } };
const apple = { key: read('APPLE_IAP_KEY_FILE'), keyId: process.env.APPLE_IAP_KEY_ID ?? '', issuer: process.env.APPLE_IAP_ISSUER_ID ?? '' };
const google = (() => { const text = read('GOOGLE_PLAY_KEY_FILE'); try { return text ? JSON.parse(text) : null; } catch { logger.warn({ event: 'store_key_invalid', name: 'GOOGLE_PLAY_KEY_FILE' }); return null; } })();
/** Which stores can check purchases on this server. */
export const storesReady = { apple: !!(apple.key && apple.keyId && apple.issuer), google: !!(google?.client_email && google?.private_key) };

const b64url = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const decodeJws = jws => JSON.parse(Buffer.from(String(jws).split('.')[1] ?? '', 'base64url').toString('utf8'));
function jwt(header, claims, key, algorithm) {
  const body = b64url(header) + '.' + b64url(claims);
  const signature = algorithm === 'ES256' ? sign('sha256', Buffer.from(body), { key: createPrivateKey(key), dsaEncoding: 'ieee-p1363' })
    : sign('sha256', Buffer.from(body), createPrivateKey(key));
  return body + '.' + signature.toString('base64url');
}
const unavailable = () => new CommunityError(503, 'Paid gifts aren\'t available yet.', 'GIFT_STORE');
const notConfirmed = () => new CommunityError(402, 'The store hasn\'t confirmed this purchase.', 'GIFT_PURCHASE');

// Apple: a short-lived token signed with the in-app purchase key, then the transaction from production, else the sandbox
// (TestFlight and review purchases).
function appleToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt({ alg: 'ES256', kid: apple.keyId, typ: 'JWT' }, { iss: apple.issuer, iat: now, exp: now + 1800, aud: 'appstoreconnect-v1', bid: APP_ID }, apple.key, 'ES256');
}
async function appleTransaction(id) {
  const headers = { authorization: 'Bearer ' + appleToken() };
  for (const host of ['api.storekit.itunes.apple.com', 'api.storekit-sandbox.itunes.apple.com']) {
    const response = await fetch(`https://${host}/inApps/v1/transactions/${encodeURIComponent(id)}`, { headers, signal: AbortSignal.timeout(10000) });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error('App Store answered ' + response.status);
    const { signedTransactionInfo } = /** @type {{ signedTransactionInfo: string }} */ (await response.json());
    return decodeJws(signedTransactionInfo);
  }
  return null;
}

// Google: a service-account access token (kept until shortly before it expires), then the purchase by its token.
let googleAccess = { token: '', until: 0 };
async function googleToken() {
  if (googleAccess.until > Date.now()) return googleAccess.token;
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt({ alg: 'RS256', typ: 'JWT' }, { iss: google.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, google.private_key, 'RS256');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!response.ok) throw new Error('Google sign-in answered ' + response.status);
  const { access_token: token, expires_in: seconds } = /** @type {{ access_token: string, expires_in: number }} */ (await response.json());
  googleAccess = { token, until: Date.now() + (seconds - 300) * 1000 };
  return token;
}
const playApi = path => `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${APP_ID}/purchases/${path}`;
/** @returns {Promise<any>} The Play Developer API's answer, or null when it doesn't know the purchase. */
async function playGet(path) {
  const response = await fetch(playApi(path), { headers: { authorization: 'Bearer ' + await googleToken() }, signal: AbortSignal.timeout(10000) });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error('Google Play answered ' + response.status);
  return response.json();
}

/**
 * Confirms a store purchase of gift `gift` by member `userId`: Apple by its transaction id, Google by its purchase token.
 * Returns the id kept on the gift (Apple's transaction id, Google's order id), or throws 402 when the store doesn't confirm
 * an unrefunded purchase of that gift for this app, made by this member.
 */
export async function confirmPurchase(store, gift, receipt, userId) {
  const product = productOf(gift), tag = accountTag(userId);
  if (store === 'apple') {
    if (!storesReady.apple) throw unavailable();
    const id = typeof receipt?.transactionId === 'string' && /^\d{1,30}$/.test(receipt.transactionId) ? receipt.transactionId : null;
    if (!id) throw notConfirmed();
    const t = await appleTransaction(id);
    if (!t || t.bundleId !== APP_ID || t.productId !== product || t.type !== 'Consumable' || t.revocationDate || t.appAccountToken !== tag) throw notConfirmed();
    return String(t.transactionId);
  }
  if (store === 'google') {
    if (!storesReady.google) throw unavailable();
    const token = typeof receipt?.purchaseToken === 'string' && /^[\w.:-]{20,1000}$/.test(receipt.purchaseToken) ? receipt.purchaseToken : null;
    if (!token) throw notConfirmed();
    const p = await playGet(`products/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}`);
    // purchaseState 0 = purchased (1 cancelled, 2 pending).
    if (!p || p.purchaseState !== 0 || p.obfuscatedExternalAccountId !== tag) throw notConfirmed();
    // Licence-test purchases can come without an order id; their token stands in (hashed, as tokens are long).
    return p.orderId ? String(p.orderId) : 'token:' + createHash('sha256').update(token).digest('hex');
  }
  throw new CommunityError(400, 'Choose a store.');
}

/** Marks refunded store gifts: Google's voided purchases of the last 30 days, and Apple's revoked transactions (gifts up to 60 days old). */
async function checkRefunds() {
  let refunded = 0;
  if (storesReady.google) {
    const since = Date.now() - 30 * 86400000;
    let page = '';
    do {
      const list = await playGet(`voidedpurchases?startTime=${since}&maxResults=1000${page ? '&token=' + encodeURIComponent(page) : ''}`);
      const orders = (list?.voidedPurchases ?? []).map(v => v.orderId).filter(Boolean);
      if (orders.length) refunded += (await pool.query(`UPDATE community.gift SET status='refunded' WHERE store='google' AND status='sent' AND store_transaction = ANY($1::text[])`, [orders])).rowCount ?? 0;
      page = list?.tokenPagination?.nextPageToken ?? '';
    } while (page);
  }
  if (storesReady.apple) {
    const rows = (await pool.query(`SELECT id, store_transaction FROM community.gift WHERE store='apple' AND status='sent' AND created_at > now() - interval '60 days'
      ORDER BY created_at DESC LIMIT 500`)).rows;
    for (const row of rows) {
      const t = await appleTransaction(row.store_transaction);
      if (t?.revocationDate) refunded += (await pool.query(`UPDATE community.gift SET status='refunded' WHERE id=$1 AND status='sent'`, [row.id])).rowCount ?? 0;
    }
  }
  if (refunded) logger.info({ event: 'gifts_refunded', count: refunded });
}
if (storesReady.apple || storesReady.google) {
  setInterval(() => checkRefunds().catch(error => logger.warn({ event: 'gift_refund_check_failed', message: error.message })), 6 * 3600000).unref();
}
