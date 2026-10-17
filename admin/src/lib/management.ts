import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, text, uuid } from './http';
import { roles } from './permissions';

export async function accounts(member: Session, search: string) {
  authorize(member, 'accounts');
  const term = text(search, 'username search', 30, 2);
  await transaction(db => audit(db, member.id, 'account.search', 'customers', 'Searched customer usernames'));
  return (await query(`SELECT u.id,u.username,u.name,u."createdAt" AS created_at,coalesce(r.active,false) AS restricted
    FROM public."user" u LEFT JOIN ops.restriction r ON r.user_id=u.id
    WHERE u.username ILIKE $1 ESCAPE '\\' ORDER BY u.username LIMIT 50`, [term.replace(/[\\%_]/g, '\\$&') + '%'])).rows;
}
export async function accountAction(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'accounts', true);
  const id = text(input.id, 'account id', 128);
  const action = choice(input.action, ['suspend','restore','revoke_sessions'] as const, 'account action');
  return transaction(async db => {
    await lockPermission(db, member, 'accounts', true);
    const found = await db.query('SELECT id FROM public."user" WHERE id=$1', [id]);
    if (!found.rowCount) throw new HttpError(404, 'Account not found.');
    if (action !== 'revoke_sessions') await db.query(`INSERT INTO ops.restriction(user_id,reason,active) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET reason=$2,active=$3,updated_at=now()`, [id,reason,action === 'suspend']);
    if (action !== 'restore') await db.query('DELETE FROM public.session WHERE "userId"=$1', [id]);
    await audit(db, member.id, 'account.' + action, id, reason);
    return { saved: true };
  });
}
export async function changeControl(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'operations', true);
  const key = choice(input.key, ['registration','discovery','menus','avatars','ai','social','market','market_sellers','games','identity'] as const, 'feature');
  if (typeof input.enabled !== 'boolean') throw new HttpError(400, 'Choose enabled or disabled.');
  if (input.enabled && ['ai','games','identity'].includes(key)) throw new HttpError(409, 'This feature still requires production acceptance and cannot be enabled here.');
  const version = integer(input.version, 'control version', 1);
  const notice = text(input.notice || '', 'member notice', 300, input.enabled ? 0 : 10);
  return transaction(async db => {
    await lockPermission(db, member, 'operations', true);
    const result = await db.query('UPDATE ops.control SET enabled=$1,notice=$2,version=version+1,updated_at=now() WHERE key=$3 AND version=$4', [input.enabled,notice,key,version]);
    if (!result.rowCount) throw new HttpError(409, 'This setting changed. Refresh before saving.');
    await audit(db, member.id, 'control.changed', key, reason, { enabled: input.enabled, notice });
    return { saved: true };
  });
}
export async function staffList(member: Session) {
  authorize(member, 'staff');
  return (await query(`SELECT m.id,m.email,m.role,m.active,m.created_at,
    (SELECT count(*)::int FROM staff.credential c WHERE c.member_id=m.id) AS keys
    FROM staff.member m ORDER BY m.created_at LIMIT 100`)).rows;
}
export async function changeStaff(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'staff', true);
  const action = choice(input.action, ['invite','update','revoke_sessions'] as const, 'staff action');
  return transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(1902914311)');
    await lockPermission(db, member, 'staff', true);
    let id: string;
    if (action === 'invite') {
      const email = text(input.email, 'Google email', 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid Google account email.');
      const role = choice(input.role, roles, 'staff role');
      const result = await db.query('INSERT INTO staff.member(email,role) VALUES($1,$2) ON CONFLICT(email) DO NOTHING RETURNING id', [email,role]);
      if (!result.rowCount) throw new HttpError(409, 'This staff account already exists.');
      id = result.rows[0].id;
    } else {
      id = uuid(input.id, 'staff id');
      const target = (await db.query('SELECT id,role,active FROM staff.member WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!target) throw new HttpError(404, 'Staff account not found.');
      if (action === 'update') {
        const role = choice(input.role, roles, 'staff role');
        if (typeof input.active !== 'boolean') throw new HttpError(400, 'Select account status.');
        if (id === member.id && (!input.active || role !== 'owner')) throw new HttpError(409, 'You cannot remove your own owner access.');
        if (target.role === 'owner' && target.active && (!input.active || role !== 'owner')) {
          const owners = await db.query("SELECT id FROM staff.member WHERE role='owner' AND active AND id<>$1", [id]);
          if (!owners.rowCount) throw new HttpError(409, 'Keep at least one active owner.');
        }
        await db.query('UPDATE staff.member SET role=$1,active=$2 WHERE id=$3', [role,input.active,id]);
      }
      await db.query('DELETE FROM staff.session WHERE member_id=$1', [id]);
    }
    await audit(db, member.id, 'staff.' + action, id, reason);
    return { saved: true };
  });
}
