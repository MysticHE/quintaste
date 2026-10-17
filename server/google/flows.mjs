import { createHash, randomBytes, randomInt, randomUUID, createCipheriv, createDecipheriv, hkdfSync } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { pool, authOrigins } from '../config.mjs';

export class GoogleError extends Error {
  constructor(status,message) { super(message); this.status=status; }
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const validId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const ticketKey = () => Buffer.from(hkdfSync('sha256',process.env.BETTER_AUTH_SECRET,'quintaste','google-handoff-v1',32));
export function sealTicket(value,id) {
  const nonce=randomBytes(12), cipher=createCipheriv('aes-256-gcm',ticketKey(),nonce);
  cipher.setAAD(Buffer.from(id));
  return Buffer.concat([nonce,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64');
}
export function openTicket(value,id) {
  const b=Buffer.from(value,'base64'), decipher=createDecipheriv('aes-256-gcm',ticketKey(),b.subarray(0,12));
  decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(b.subarray(-16));
  return Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]).toString('utf8');
}
/** Same allowlist as safeReturn in src/utils/navigation.ts; keep both in sync. */
const safeReturnPath = /^\/(?:account|avatar|profile|recovery-codes|saved|social(?:\/profile)?|game|market(?:\/my-shop|\/my-listings|\/(?:listing|shop)\/[A-Za-z0-9_-]+)?|cook(?:\/recipe\/[a-z0-9-]+)?|dish\/[a-z0-9-]+|place\/[a-z0-9-]+(?:\?review=1)?|cases|private-places)?$/;
export function nativeReturnURL(value) {
  if (value == null) return null; // Older clients keep the explicit confirmation flow.
  const allowed = ['quintaste://auth-return', ...authOrigins.filter(v => /^exps?:/.test(v)).map(v => v + '/--/auth-return')];
  if (typeof value !== 'string' || !allowed.includes(value)) throw new GoogleError(400,'Invalid app return address.');
  return value;
}
export async function beginFlow(platform,returnTo,returnURL) {
  if (!['web','native'].includes(platform)) throw new GoogleError(400,'Choose a valid sign-in platform.');
  const destination=typeof returnTo==='string' && safeReturnPath.test(returnTo)?returnTo:'/account';
  await pool.query('DELETE FROM customer_oauth.flow WHERE expires_at<=now()');
  const id=randomUUID(), launch=token(), proof=token(), code=String(randomInt(100000,1000000));
  const nativeURL = platform === 'native' ? nativeReturnURL(returnURL) : null;
  await pool.query(`INSERT INTO customer_oauth.flow(id,launch_hash,proof_hash,platform,display_code,return_to,return_url)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,digest(launch),digest(proof),platform,code,destination,nativeURL]);
  return {id,launch,proof,code};
}
export async function launchFlow(launch,browser) {
  if (!validToken(launch)) throw new GoogleError(400,'Start Google sign-in from the app.');
  const r=await pool.query(`UPDATE customer_oauth.flow SET phase='opened',browser_hash=$2
    WHERE launch_hash=$1 AND phase='created' AND expires_at>now() RETURNING *`,[digest(launch),digest(browser)]);
  if (!r.rows[0]) throw new GoogleError(410,'This sign-in link expired. Start again in the app.');
  return r.rows[0];
}
export async function browserFlow(id,browser) {
  if (!validId(id) || !validToken(browser)) throw new GoogleError(400,'Start Google sign-in again.');
  const r=await pool.query(`SELECT * FROM customer_oauth.flow WHERE id=$1 AND browser_hash=$2
    AND expires_at>now() AND phase='opened'`,[id,digest(browser)]);
  if (!r.rows[0]) throw new GoogleError(410,'This sign-in expired. Start again in the app.');
  return r.rows[0];
}
export async function takeFlow(id,proof,callback) {
  if (!validId(id) || !validToken(proof)) throw new GoogleError(400,'Start Google sign-in again.');
  const r=await pool.query(`DELETE FROM customer_oauth.flow WHERE id=$1 AND proof_hash=$2
    AND phase='ready' AND expires_at>now() AND (return_url IS NULL OR callback_hash=$3)
    RETURNING ticket,user_id,return_to`,[id,digest(proof),validToken(callback)?digest(callback):null]);
  if (r.rows[0]) return {token:openTicket(r.rows[0].ticket,id),returnTo:r.rows[0].return_to};
  const pending=await pool.query('SELECT 1 FROM customer_oauth.flow WHERE id=$1 AND proof_hash=$2 AND expires_at>now()', [id,digest(proof)]);
  if (!pending.rowCount) throw new GoogleError(410,'This sign-in expired or was already completed. Start again.');
  return {pending:true};
}
export async function cancelFlow(id,proof) {
  if (!validId(id) || !validToken(proof)) throw new GoogleError(400,'Invalid sign-in request.');
  await pool.query('DELETE FROM customer_oauth.flow WHERE id=$1 AND proof_hash=$2',[id,digest(proof)]);
}
