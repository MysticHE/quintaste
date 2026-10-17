import 'server-only';
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse,
  verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON,
  type AuthenticatorTransport } from '@simplewebauthn/server';
import { settings } from './config';
import { query, transaction } from './db';
import { cookieHeader, hash, HttpError, text, throttle, token } from './http';
import { sessionName, lockSession, type Session } from './session';
import { audit } from './audit';

type Credential = { id: string; public_key: Buffer; counter: string; transports: AuthenticatorTransport[] };
async function credentials(member: Session) {
  return (await query<Credential>('SELECT id,public_key,counter,transports FROM staff.credential WHERE member_id=$1', [member.id])).rows;
}
function enrollmentAllowed(member: Session, count: number) {
  if (count >= 5) throw new HttpError(400, 'At most five security keys can be registered.');
  if (count && (!member.verified_at || Date.now() - member.verified_at.getTime() > 300000)) {
    throw new HttpError(428, 'Verify an existing security key before adding another.');
  }
}
export async function options(member: Session, intent: 'register' | 'authenticate') {
  await throttle('webauthn:' + member.id, 20);
  const stored = await credentials(member);
  const config = settings();
  if (intent === 'register') enrollmentAllowed(member, stored.length);
  if (intent === 'authenticate' && !stored.length) throw new HttpError(400, 'Register your first security key.');
  const options = intent === 'register' ? await generateRegistrationOptions({
    rpName: 'QuinTaste staff', rpID: config.rpId, userName: member.email,
    userID: new TextEncoder().encode(member.id), attestationType: 'none',
    excludeCredentials: stored.map(c => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    preferredAuthenticatorType: 'securityKey',
  }) : await generateAuthenticationOptions({ rpID: config.rpId, userVerification: 'required',
    allowCredentials: stored.map(c => ({ id: c.id, transports: c.transports })) });
  await query(`INSERT INTO staff.challenge(session_hash,value,intent) VALUES($1,$2,$3)
    ON CONFLICT(session_hash) DO UPDATE SET value=$2,intent=$3,expires_at=now()+interval '5 minutes'`,
    [member.hash, options.challenge, intent]);
  return options;
}
async function consume(member: Session, intent: string) {
  await throttle('webauthn-verify:' + member.id, 15);
  const result = await query<{ value: string }>(`DELETE FROM staff.challenge WHERE session_hash=$1 AND intent=$2
    AND expires_at>now() RETURNING value`, [member.hash, intent]);
  if (!result.rows[0]) throw new HttpError(400, 'Security-key request expired. Try again.');
  return result.rows[0].value;
}
function credentialResponse(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Invalid security-key response.');
  const response = value as Record<string, unknown>;
  text(response.id, 'credential', 2048);
  return response;
}
export async function register(member: Session, value: unknown, label: unknown) {
  const name = text(label, 'security key name', 80);
  const response = credentialResponse(value) as unknown as RegistrationResponseJSON;
  const expectedChallenge = await consume(member, 'register');
  const verified = await verifyRegistrationResponse({ response, expectedChallenge,
    expectedOrigin: settings().origin, expectedRPID: settings().rpId, requireUserVerification: true });
  if (!verified.verified || !verified.registrationInfo) throw new HttpError(400, 'Security-key verification failed.');
  const credential = verified.registrationInfo.credential;
  await transaction(async db => {
    await db.query('SELECT id FROM staff.member WHERE id=$1 FOR UPDATE', [member.id]);
    const current = await lockSession(db, member);
    const count = await db.query<{ count: string }>('SELECT count(*) FROM staff.credential WHERE member_id=$1', [member.id]);
    enrollmentAllowed(current, Number(count.rows[0].count));
    await db.query('INSERT INTO staff.credential(id,member_id,public_key,counter,transports,name) VALUES($1,$2,$3,$4,$5,$6)',
      [credential.id, member.id, Buffer.from(credential.publicKey), credential.counter, credential.transports || [], name]);
    await audit(db, member.id, 'security_key.registered', member.id, 'Registered a security key', { name });
  });
  return { registered: true };
}
export async function authenticate(member: Session, value: unknown) {
  const response = credentialResponse(value) as unknown as AuthenticationResponseJSON;
  const expectedChallenge = await consume(member, 'authenticate');
  const valueToken = token();
  await transaction(async db => {
    await lockSession(db, member);
    const result = await db.query<Credential>('SELECT id,public_key,counter,transports FROM staff.credential WHERE id=$1 AND member_id=$2 FOR UPDATE', [response.id, member.id]);
    const stored = result.rows[0];
    if (!stored) throw new HttpError(403, 'This security key is not registered to your account.');
    const verified = await verifyAuthenticationResponse({ response, expectedChallenge,
      expectedOrigin: settings().origin, expectedRPID: settings().rpId, requireUserVerification: true,
      credential: { id: stored.id, publicKey: new Uint8Array(stored.public_key), counter: Number(stored.counter), transports: stored.transports } });
    if (!verified.verified) throw new HttpError(403, 'Security-key verification failed.');
    await db.query('UPDATE staff.credential SET counter=$1,last_used_at=now() WHERE id=$2', [verified.authenticationInfo.newCounter, stored.id]);
    const removed = await db.query('DELETE FROM staff.session WHERE hash=$1 AND expires_at>now() RETURNING member_id', [member.hash]);
    if (!removed.rowCount) throw new HttpError(401, 'Sign in again.');
    await db.query(`INSERT INTO staff.session(hash,member_id,expires_at,verified_at)
      VALUES($1,$2,now()+interval '8 hours',now())`, [hash(valueToken), member.id]);
    await audit(db, member.id, 'session.security_key_verified', member.id, 'Security key verified');
  });
  return cookieHeader(sessionName(), valueToken, 8 * 3600);
}
export async function removeKey(member: Session, idValue: unknown, reasonValue: unknown) {
  if (!member.verified_at || Date.now() - member.verified_at.getTime() > 300000) throw new HttpError(428, 'Verify your security key before removing a key.');
  const id = text(idValue, 'security key', 2048); const reason = text(reasonValue, 'removal reason', 1000, 10);
  await transaction(async db => {
    await db.query('SELECT id FROM staff.member WHERE id=$1 FOR UPDATE', [member.id]);
    const current = await lockSession(db, member);
    if (!current.verified_at || Date.now()-current.verified_at.getTime()>300000) throw new HttpError(428, 'Verify your security key before removing a key.');
    const count = await db.query<{ count:string }>('SELECT count(*) FROM staff.credential WHERE member_id=$1', [member.id]);
    if (Number(count.rows[0].count) < 2) throw new HttpError(409, 'Register a backup key before removing your last key.');
    const result = await db.query('DELETE FROM staff.credential WHERE member_id=$1 AND id=$2 RETURNING id', [member.id,id]);
    if (!result.rowCount) throw new HttpError(404, 'Security key not found.');
    await db.query('DELETE FROM staff.session WHERE member_id=$1 AND hash<>$2', [member.id,member.hash]);
    await audit(db, member.id, 'security_key.removed', member.id, reason);
  });
  return { removed:true };
}
