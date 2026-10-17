import 'server-only';
import { cookie, cookieHeader, hash, HttpError, token } from './http';
import { query, transaction } from './db';
import { settings } from './config';
import { can, type Role, type Capability } from './permissions';
import { audit } from './audit';
import type { PoolClient } from 'pg';

export type Session = { id: string; email: string; role: Role; hash: string; verified_at: Date | null };
export const sessionName = () => settings().origin.startsWith('https:') ? '__Host-qt-staff' : 'qt-staff';
export async function session(request: Request, requireMfa = true): Promise<Session> {
  const value = cookie(request, sessionName());
  if (!value || value.length > 100) throw new HttpError(401, 'Sign in to the staff console.');
  const result = await query<Session>(`UPDATE staff.session s SET touched_at=now()
    FROM staff.member m WHERE s.member_id=m.id AND s.hash=$1 AND m.active
    AND s.expires_at>now() AND s.touched_at>now()-interval '30 minutes'
    RETURNING m.id,m.email,m.role,s.hash,s.verified_at`, [hash(value)]);
  const found = result.rows[0];
  if (!found) throw new HttpError(401, 'Your staff session has expired. Sign in again.');
  if (requireMfa && !found.verified_at) throw new HttpError(403, 'Verify your security key first.');
  return found;
}
export function authorize(member: Session, capability: Capability, fresh = false) {
  if (!member.verified_at || !can(member.role, capability)) throw new HttpError(403, 'Your staff role cannot perform this action.');
  if (fresh && Date.now() - member.verified_at.getTime() > 5 * 60000) {
    throw new HttpError(428, 'Verify your security key again before this change.');
  }
}
export async function lockSession(db: PoolClient, member: Session) {
  const result = await db.query<Session>(`SELECT m.id,m.email,m.role,s.hash,s.verified_at FROM staff.member m
    JOIN staff.session s ON s.member_id=m.id WHERE m.id=$1 AND s.hash=$2 AND m.active
    AND s.expires_at>now() AND s.touched_at>now()-interval '30 minutes' FOR SHARE OF m,s`, [member.id,member.hash]);
  if (!result.rows[0]) throw new HttpError(401, 'Your staff session has expired.');
  return result.rows[0];
}
export async function lockPermission(db: PoolClient, member: Session, capability: Capability, fresh = false) {
  authorize(await lockSession(db, member), capability, fresh);
}
export async function createSession(memberId: string) {
  const value = token();
  await query("INSERT INTO staff.session(hash,member_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')", [hash(value), memberId]);
  return cookieHeader(sessionName(), value, 600);
}
export async function logout(request: Request) {
  const member = await session(request, false);
  await transaction(async db => {
    await db.query('DELETE FROM staff.session WHERE hash=$1', [member.hash]);
    await audit(db, member.id, 'session.sign_out', member.id, 'Staff signed out');
  });
  return cookieHeader(sessionName(), '', 0);
}
