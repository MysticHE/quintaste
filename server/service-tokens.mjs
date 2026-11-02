import { Buffer } from 'node:buffer';
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { logger } from './config.mjs';

/**
 * Keys and signed tokens for Apple and Google services: paid gift checks (server/collection/stores.mjs) and phone alerts
 * (server/community/push-send.mjs). Keys are files outside the image, named by environment variables.
 */

/** The text of the key file named by environment variable `name`, or '' when unset or unreadable (logged). */
export function readKeyFile(name) {
  try { return process.env[name] ? readFileSync(process.env[name], 'utf8') : ''; }
  catch (error) { logger.warn({ event: 'key_file_unreadable', name, message: error.message }); return ''; }
}
/** A Google service account key (JSON) from environment variable `name`, or null. */
export function readServiceAccount(name) {
  const text = readKeyFile(name);
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { logger.warn({ event: 'key_file_invalid', name }); return null; }
}

const b64url = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

/** A JWT signed with `key` (PEM): ES256 for Apple keys, RS256 for Google service accounts. */
export function jwt(header, claims, key, algorithm) {
  const body = b64url(header) + '.' + b64url(claims);
  const signature = algorithm === 'ES256' ? sign('sha256', Buffer.from(body), { key: createPrivateKey(key), dsaEncoding: 'ieee-p1363' })
    : sign('sha256', Buffer.from(body), createPrivateKey(key));
  return body + '.' + signature.toString('base64url');
}

const access = new Map();
/**
 * A Google access token for service `account` (its JSON key) and `scope`, kept until five minutes before it expires. Callers
 * that ask while one is being fetched share that request.
 */
export function googleAccessToken(account, scope) {
  const key = account.client_email + ' ' + scope, kept = access.get(key);
  // `until` is 0 while the token is being fetched.
  if (kept && (!kept.until || kept.until > Date.now())) return kept.token;
  const fetching = fetchGoogleToken(account, scope), entry = { token: fetching.then(value => value.token), until: 0 };
  access.set(key, entry);
  fetching.then(value => { entry.until = value.until; }, () => { if (access.get(key) === entry) access.delete(key); });
  return entry.token;
}
/** Forgets the access token for `account` and `scope`, after Google refused it. */
export function forgetGoogleToken(account, scope) { access.delete(account.client_email + ' ' + scope); }

async function fetchGoogleToken(account, scope) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt({ alg: 'RS256', typ: 'JWT' }, { iss: account.client_email, scope, aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600 }, account.private_key, 'RS256');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!response.ok) throw new Error('Google sign-in answered ' + response.status);
  const { access_token: token, expires_in: seconds } = /** @type {{ access_token: string, expires_in: number }} */ (await response.json());
  return { token, until: Date.now() + (seconds - 300) * 1000 };
}
