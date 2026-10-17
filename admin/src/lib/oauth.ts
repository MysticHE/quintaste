import 'server-only';
import * as oidc from 'openid-client';
import { settings, secret, googleConfigured } from './config';
import { cookie, cookieHeader, hash, HttpError, token, throttle } from './http';
import { query, transaction } from './db';
import { audit } from './audit';
import { createSession } from './session';

let configuration: Promise<oidc.Configuration> | undefined;
function google() {
  if (!googleConfigured()) throw new HttpError(503, 'Staff sign-in is awaiting Google configuration.');
  configuration ??= oidc.discovery(new URL('https://accounts.google.com'), settings().googleId, secret('ADMIN_GOOGLE_CLIENT_SECRET'))
    .catch(error => { configuration = undefined; throw error; });
  return configuration;
}
const oauthCookie = () => settings().origin.startsWith('https:') ? '__Host-qt-oauth' : 'qt-oauth';
export async function beginLogin() {
  await throttle('google-login-global', 60);
  const config = await google();
  const verifier = oidc.randomPKCECodeVerifier(); const state = 'staff_' + oidc.randomState(); const nonce = oidc.randomNonce();
  const browser = token();
  await query('INSERT INTO staff.oauth(hash,verifier,state,nonce) VALUES($1,$2,$3,$4)', [hash(browser), verifier, state, nonce]);
  const url = oidc.buildAuthorizationUrl(config, { redirect_uri: settings().origin + '/auth/callback',
    scope: 'openid email', state, nonce, code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256', prompt: 'select_account' });
  return new Response(null, { status: 302, headers: { Location: url.href, 'Set-Cookie': cookieHeader(oauthCookie(), browser, 600), 'Cache-Control': 'no-store' } });
}
export async function completeLogin(request: Request) {
  const browser = cookie(request, oauthCookie());
  if (!browser || browser.length > 100) throw new HttpError(400, 'Start staff sign-in again.');
  const pending = await query<{ verifier: string; nonce: string; state: string }>(
    'DELETE FROM staff.oauth WHERE hash=$1 AND expires_at>now() RETURNING verifier,nonce,state', [hash(browser)]);
  if (!pending.rows[0]) throw new HttpError(400, 'Sign-in expired. Start again.');
  const flow = pending.rows[0];
  const url = new URL('/auth/callback', settings().origin); url.search = new URL(request.url).search;
  const tokens = await oidc.authorizationCodeGrant(await google(), url, { pkceCodeVerifier: flow.verifier,
    expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true });
  const claims = tokens.claims();
  if (!claims || claims.email_verified !== true || typeof claims.email !== 'string' || !claims.sub) {
    throw new HttpError(403, 'A verified invited Google account is required.');
  }
  const email = claims.email.toLowerCase(); const subject = claims.sub;
  const memberId = await transaction(async db => {
    const member = await db.query<{ id: string; subject: string | null }>('SELECT id,subject FROM staff.member WHERE email=$1 AND active FOR UPDATE', [email]);
    const row = member.rows[0];
    if (!row || (row.subject && row.subject !== subject)) throw new HttpError(403, 'This Google account has not been invited.');
    if (!row.subject) await db.query('UPDATE staff.member SET subject=$1 WHERE id=$2', [subject, row.id]);
    await audit(db, row.id, 'session.google_verified', row.id, 'Google sign-in completed; security key still required');
    return row.id;
  });
  const headers = new Headers({ Location: '/verify', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', await createSession(memberId));
  headers.append('Set-Cookie', cookieHeader(oauthCookie(), '', 0));
  return new Response(null, { status: 302, headers });
}
export async function completeGoogleCallback(request: Request) {
  const incoming = new URL(request.url), state = incoming.searchParams.get('state');
  if (!state || state.length > 512) throw new HttpError(400, 'Start Google sign-in again.');
  // Keep in-flight staff logins valid while routing customer callbacks to their own verifier.
  const staff = state.startsWith('staff_') || (await query('SELECT 1 FROM staff.oauth WHERE state=$1 AND expires_at>now()', [state])).rowCount;
  if (staff) return completeLogin(request);
  const origin = new URL(process.env.CUSTOMER_APP_URL || 'http://localhost:3000');
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new HttpError(503, 'Customer sign-in is unavailable.');
  const destination = new URL('/api/auth/callback/google', origin.origin);
  for (const name of ['code','state','error','error_description']) {
    const value=incoming.searchParams.get(name);
    if (value && value.length<=2048) destination.searchParams.set(name,value);
  }
  return new Response(null,{status:302,headers:{Location:destination.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
