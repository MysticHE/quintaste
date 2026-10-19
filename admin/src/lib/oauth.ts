import 'server-only';
import * as oidc from 'openid-client';
import { settings, secret, googleConfigured } from './config';
import { cookie, cookieHeader, hash, HttpError, token, throttle } from './http';
import { query, transaction, logger } from './db';
import { audit } from './audit';
import { createSession } from './session';

let configuration: Promise<oidc.Configuration> | undefined;
function google() {
  if (!googleConfigured()) throw new HttpError(503, 'Staff sign-in is not configured.');
  configuration ??= oidc.discovery(new URL('https://accounts.google.com'), settings().googleId, secret('ADMIN_GOOGLE_CLIENT_SECRET'))
    .catch(error => { configuration = undefined; throw error; });
  return configuration;
}
const secure = () => settings().origin.startsWith('https:');
const oauthCookie = () => secure() ? '__Host-qt-oauth' : 'qt-oauth';
const nextCookie = () => secure() ? '__Host-qt-next' : 'qt-next';
/** The last staff email, passed to Google as login_hint so returning staff skip the account chooser. */
const hintCookie = () => secure() ? '__Host-qt-staff-hint' : 'qt-staff-hint';
const home = '/console/overview';
const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return ''; } };
const destination = (value: string | null) =>
  value && /^\/console\/[a-z-]{1,30}(\?[\w=&%.-]{0,200})?$/.test(value) ? value : home;

export type SignInError = 'unavailable' | 'denied' | 'expired' | 'busy' | 'stuck' | 'failed';
const codes: Record<number, SignInError> = { 503: 'unavailable', 403: 'denied', 400: 'expired', 429: 'busy' };
/** Sign-in failures land on the start page with a short code, never as raw JSON and never in a redirect loop. */
export async function signInStep(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    const code = error instanceof HttpError ? codes[error.status] ?? 'failed' : 'failed';
    if (code === 'failed') logger.error({ event: 'staff_sign_in_failed' });
    return new Response(null, { status: 302, headers: { Location: '/?error=' + code, 'Cache-Control': 'no-store' } });
  }
}
export async function beginLogin(request: Request) {
  // One browser looping (a session cookie that never sticks) must not lock every staff member out.
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'direct';
  await throttle('google-login:' + client, 12);
  await throttle('google-login-global', 120);
  const config = await google();
  const params = new URL(request.url).searchParams;
  const verifier = oidc.randomPKCECodeVerifier(); const state = 'staff_' + oidc.randomState(); const nonce = oidc.randomNonce();
  const browser = token();
  await query('INSERT INTO staff.oauth(hash,verifier,state,nonce) VALUES($1,$2,$3,$4)', [hash(browser), verifier, state, nonce]);
  const hint = decode(cookie(request, hintCookie()));
  const choose = params.has('choose') || !/^[^\s@]{1,64}@[^\s@]{1,190}$/.test(hint);
  const url = oidc.buildAuthorizationUrl(config, { redirect_uri: settings().origin + '/auth/callback',
    scope: 'openid email', state, nonce, code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256', ...(choose ? { prompt: 'select_account' } : { login_hint: hint }) });
  const headers = new Headers({ Location: url.href, 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookieHeader(oauthCookie(), browser, 600));
  headers.append('Set-Cookie', cookieHeader(nextCookie(), encodeURIComponent(destination(params.get('next'))), 600));
  return new Response(null, { status: 302, headers });
}
async function completeLogin(request: Request) {
  const browser = cookie(request, oauthCookie());
  if (!browser || browser.length > 100) throw new HttpError(400, 'Start sign-in again.');
  const pending = await query<{ verifier: string; nonce: string; state: string }>(
    'DELETE FROM staff.oauth WHERE hash=$1 AND expires_at>now() RETURNING verifier,nonce,state', [hash(browser)]);
  if (!pending.rows[0]) throw new HttpError(400, 'Sign-in expired.');
  const flow = pending.rows[0];
  const url = new URL('/auth/callback', settings().origin); url.search = new URL(request.url).search;
  const tokens = await oidc.authorizationCodeGrant(await google(), url, { pkceCodeVerifier: flow.verifier,
    expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true });
  const claims = tokens.claims();
  if (!claims || claims.email_verified !== true || typeof claims.email !== 'string' || !claims.sub) {
    throw new HttpError(403, 'A verified invited Google account is required.');
  }
  const email = claims.email.toLowerCase(); const subject = claims.sub;
  const sessionCookie = await transaction(async db => {
    const member = await db.query<{ id: string; subject: string | null }>('SELECT id,subject FROM staff.member WHERE email=$1 AND active FOR UPDATE', [email]);
    const row = member.rows[0];
    if (!row || (row.subject && row.subject !== subject)) throw new HttpError(403, 'This Google account has not been invited.');
    if (!row.subject) await db.query('UPDATE staff.member SET subject=$1 WHERE id=$2', [subject, row.id]);
    await audit(db, row.id, 'session.sign_in', row.id, 'Signed in with Google');
    return createSession(db, row.id);
  });
  const headers = new Headers({ Location: destination(decode(cookie(request, nextCookie()))), 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', sessionCookie);
  headers.append('Set-Cookie', cookieHeader(hintCookie(), encodeURIComponent(email), 400 * 86400));
  headers.append('Set-Cookie', cookieHeader(oauthCookie(), '', 0));
  headers.append('Set-Cookie', cookieHeader(nextCookie(), '', 0));
  return new Response(null, { status: 302, headers });
}
export async function completeGoogleCallback(request: Request) {
  const incoming = new URL(request.url), state = incoming.searchParams.get('state');
  if (!state || state.length > 512) throw new HttpError(400, 'Start sign-in again.');
  // Keep in-flight staff logins valid while routing customer callbacks to their own verifier.
  const staff = state.startsWith('staff_') || (await query('SELECT 1 FROM staff.oauth WHERE state=$1 AND expires_at>now()', [state])).rowCount;
  if (staff) return signInStep(async () => {
    if (incoming.searchParams.has('error')) throw new HttpError(403, 'Google sign-in was cancelled.');
    return completeLogin(request);
  });
  const origin = new URL(process.env.CUSTOMER_APP_URL || 'http://localhost:3000');
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new HttpError(503, 'Customer sign-in is unavailable.');
  const forward = new URL('/api/auth/callback/google', origin.origin);
  for (const name of ['code','state','error','error_description']) {
    const value=incoming.searchParams.get(name);
    if (value && value.length<=2048) forward.searchParams.set(name,value);
  }
  return new Response(null,{status:302,headers:{Location:forward.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
