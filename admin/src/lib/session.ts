import 'server-only';
import { cookie, cookieHeader, hash, HttpError, token } from './http';
import { query, transaction } from './db';
import { settings } from './config';
import { can, type Role, type Capability } from './permissions';
import { audit } from './audit';
import type { PoolClient } from 'pg';

export type Session = { id: string; email: string; role: Role; hash: string };
/** Google sign-in is the only factor; an idle day or seven days in total ends the session, then sign-in repeats silently. */
const lifetimeDays = 7;
const live = `s.verified_at IS NOT NULL AND s.expires_at>now() AND s.touched_at>now()-interval '1 day'`;
export const sessionName = () => settings().origin.startsWith('https:') ? '__Host-qt-staff' : 'qt-staff';

export async function sessionFromToken(value: string): Promise<Session | null> {
  if (!value || value.length > 100) return null;
  const result = await query<Session>(`UPDATE staff.session s SET touched_at=now()
    FROM staff.member m WHERE s.member_id=m.id AND s.hash=$1 AND m.active AND ${live}
    RETURNING m.id,m.email,m.role,s.hash`, [hash(value)]);
  return result.rows[0] ?? null;
}
export async function session(request: Request): Promise<Session> {
  const found = await sessionFromToken(cookie(request, sessionName()));
  if (!found) throw new HttpError(401, 'Sign in again.');
  return found;
}
export function authorize(member: Session, capability: Capability) {
  if (!can(member.role, capability)) throw new HttpError(403, 'Your role cannot do this.');
}
export async function lockSession(db: PoolClient, member: Session) {
  const result = await db.query<Session>(`SELECT m.id,m.email,m.role,s.hash FROM staff.member m
    JOIN staff.session s ON s.member_id=m.id WHERE m.id=$1 AND s.hash=$2 AND m.active AND ${live}
    FOR SHARE OF m,s`, [member.id, member.hash]);
  if (!result.rows[0]) throw new HttpError(401, 'Sign in again.');
  return result.rows[0];
}
export async function lockPermission(db: PoolClient, member: Session, capability: Capability) {
  authorize(await lockSession(db, member), capability);
}
export async function createSession(db: PoolClient, memberId: string) {
  const value = token();
  await db.query(`INSERT INTO staff.session(hash,member_id,expires_at,verified_at)
    VALUES($1,$2,now()+make_interval(days => $3),now())`, [hash(value), memberId, lifetimeDays]);
  return cookieHeader(sessionName(), value, lifetimeDays * 86400);
}
export async function logout(request: Request) {
  const value = cookie(request, sessionName());
  if (value && value.length <= 100) await transaction(async db => {
    const removed = await db.query<{ member_id: string }>('DELETE FROM staff.session WHERE hash=$1 RETURNING member_id', [hash(value)]);
    const id = removed.rows[0]?.member_id;
    if (id) await audit(db, id, 'session.sign_out', id, 'Signed out');
  });
  return cookieHeader(sessionName(), '', 0);
}
