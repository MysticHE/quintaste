import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { randomInt } from 'node:crypto';
import { choice, HttpError, integer, text, uuid } from './http';
import { roles } from './permissions';
import { LANES, controlKey } from './chef-lanes';
import { plainNote } from './chef-names';
import { FEATURES } from './features';

export async function accounts(member: Session, search: string) {
  authorize(member, 'accounts');
  // A report may name the public handle (server/social/handles.mjs) rather than the sign-in username, so both are searched.
  const term = text(search, 'username search', 30, 2).replace(/^@/, '');
  await transaction(db => audit(db, member.id, 'account.search', 'customers', 'Searched customer usernames and handles'));
  return (await query(`SELECT u.id,u.username,u.name,h.handle,u."createdAt" AS created_at,coalesce(r.active,false) AS restricted,
      to_char(bd.birth_date,'YYYY-MM-DD') AS birth_date
    FROM public."user" u LEFT JOIN ops.restriction r ON r.user_id=u.id LEFT JOIN social.handle h ON h.user_id=u.id
    LEFT JOIN community.birth_date bd ON bd.user_id=u.id
    WHERE u.username ILIKE $1 ESCAPE '\\' OR h.handle ILIKE $1 ESCAPE '\\' ORDER BY u.username LIMIT 50`, [term.replace(/[\\%_]/g, '\\$&') + '%'])).rows;
}
/** "YYYY-MM-DD", a real date from 1920 (server/community/birth-date.mjs EARLIEST_BIRTH) and at least 18 years ago in Singapore. */
function adultBirthDate(value: unknown) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  const at = new Date(date + 'T00:00:00Z');
  if (!date || Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== date || date < '1920-01-01') throw new HttpError(400, 'Check birth date.');
  const today = new Date(Date.now() + 8 * 3600000), adult = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  if (at > adult) throw new HttpError(400, 'Members must be 18 or over.');
  return date;
}
export async function accountAction(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'accounts');
  const id = text(input.id, 'account id', 128);
  const action = choice(input.action, ['suspend','restore','revoke_sessions','reset_handle','set_birth_date'] as const, 'account action');
  const birthDate = action === 'set_birth_date' ? adultBirthDate(input.birthDate) : null;
  // A birth date decides who may use Dining, so a correction needs its own reason.
  if (birthDate) reason = text(input.reason, 'reason', 1000, 3);
  return transaction(async db => {
    await lockPermission(db, member, 'accounts');
    const found = await db.query('SELECT id FROM public."user" WHERE id=$1', [id]);
    if (!found.rowCount) throw new HttpError(404, 'Account not found.');
    if (birthDate) {
      // The account's birth date is the one Social reads; members set it once, so a wrong one is corrected here.
      await db.query(`INSERT INTO community.birth_date(user_id, birth_date) VALUES($1,$2)
        ON CONFLICT(user_id) DO UPDATE SET birth_date=$2, updated_at=now()`, [id, birthDate]);
      await audit(db, member.id, 'account.set_birth_date', id, reason);
      return { saved: true };
    }
    if (action === 'reset_handle') {
      // A neutral handle the member can change later in Basics; a clash with another member's handle just tries again.
      for (let tries = 0; tries < 8; tries++) {
        const handle = 'member' + randomInt(100000, 1000000);
        if ((await db.query('SELECT 1 FROM social.handle WHERE handle=$1', [handle])).rowCount) continue;
        const reset = await db.query('UPDATE social.handle SET handle=$2, updated_at=now() WHERE user_id=$1 RETURNING handle', [id, handle]);
        if (!reset.rowCount) throw new HttpError(404, 'This account has no handle.');
        await audit(db, member.id, 'account.reset_handle', id, reason, { handle });
        return { saved: true, handle };
      }
      throw new HttpError(503, 'No free handle was found. Try again.');
    }
    if (action !== 'revoke_sessions') await db.query(`INSERT INTO ops.restriction(user_id,reason,active) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET reason=$2,active=$3,updated_at=now()`, [id,reason,action === 'suspend']);
    if (action !== 'restore') await db.query('DELETE FROM public.session WHERE "userId"=$1', [id]);
    await audit(db, member.id, 'account.' + action, id, reason);
    return { saved: true };
  });
}
const chefControls = Object.keys(LANES).map(controlKey);
/** Every chef lane's switch, in lane order, with its chef and title (Kitchen › Chefs). */
export async function chefLanes(member: Session) {
  authorize(member, 'operations');
  const rows = new Map((await query<{ key: string }>('SELECT key,enabled,notice,version,updated_at FROM ops.control WHERE key = ANY($1)', [chefControls])).rows.map(r => [r.key, r]));
  return Object.entries(LANES).flatMap(([lane, l]) => { const row = rows.get(controlKey(lane)); return row ? [{ ...row, lane, chef: l.chef, title: l.title }] : []; });
}
export async function changeControl(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'operations');
  const key = choice(input.key, [...Object.keys(FEATURES), ...chefControls], 'feature');
  // A chef lane is Off, Watch or On (docs/ADMIN_CHEFS_PLAN.md §6): on while watching or acting, with the mode kept in the note.
  const mode = chefControls.includes(key) ? choice(input.mode, ['off', 'watch', 'on'] as const, 'mode') : null;
  const enabled = mode ? mode !== 'off' : input.enabled;
  if (typeof enabled !== 'boolean') throw new HttpError(400, 'Choose enabled or disabled.');
  const version = integer(input.version, 'control version', 1);
  const typed = plainNote(text(input.notice || '', 'staff note', 300, 0));
  return transaction(async db => {
    await lockPermission(db, member, 'operations');
    // The AI recipes daily limit is stored in this note (set on the AI recipes page); a toggle keeps it.
    const kept = key === 'ai_recipes' ? /daily=\d+/.exec((await db.query('SELECT notice FROM ops.control WHERE key=$1', [key])).rows[0]?.notice ?? '')?.[0] : undefined;
    const notice = [typed, kept, mode && mode !== 'off' ? 'mode=' + mode : ''].filter(Boolean).join(' ');
    if (notice.length > 300) throw new HttpError(400, 'Shorten the note.');
    const result = await db.query('UPDATE ops.control SET enabled=$1,notice=$2,version=version+1,updated_at=now() WHERE key=$3 AND version=$4', [enabled,notice,key,version]);
    if (!result.rowCount) {
      const exists = await db.query('SELECT 1 FROM ops.control WHERE key=$1', [key]);
      throw exists.rowCount ? new HttpError(409, 'This setting changed. Refresh before saving.') : new HttpError(404, 'This feature is not installed.');
    }
    await audit(db, member.id, 'control.changed', key, reason, { enabled, notice, ...(mode ? { mode } : {}) });
    return { saved: true };
  });
}
export async function staffList(member: Session) {
  authorize(member, 'staff');
  return (await query(`SELECT m.id,m.email,m.role,m.active,m.created_at
    FROM staff.member m ORDER BY m.created_at LIMIT 100`)).rows;
}
export async function changeStaff(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'staff');
  const action = choice(input.action, ['invite','update','revoke_sessions'] as const, 'staff action');
  return transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(1902914311)');
    await lockPermission(db, member, 'staff');
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
