import 'server-only';
import type { PoolClient } from 'pg';
import { createDecipheriv, hkdfSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { can } from './permissions';
import { choice, HttpError, text } from './http';

/**
 * Social photo checks (capability "identity") and Market cooking-class teachers (capability "sellers"). Since 1 Nov 2026 staff check
 * that the member's main photo is a real selfie of them. Checks sent before then also carry a live selfie copying a random pose:
 * AES-256-GCM ciphertext under a key derived from the provider-secret-key file (the derivation server/social/media.mjs used),
 * erased 30 days after the decision. Age is declared, never proven.
 */
const userId = (value: unknown) => { const id = text(value, 'member id', 64, 8); if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new HttpError(400, 'Check member id.'); return id; };
const digestOf = (value: unknown) => { const digest = text(value, 'photo', 64, 64); if (!/^[a-f0-9]{64}$/.test(digest)) throw new HttpError(400, 'Check photo.'); return digest; };
const checkStatuses = ['pending', 'approved', 'rejected'] as const;
const hostStatuses = ['pending', 'approved', 'rejected', 'suspended'] as const;
const reports = `(SELECT count(*)::int FROM ops.case_record c WHERE c.kind='report' AND c.status NOT IN ('resolved','dismissed') AND split_part(c.subject_id,'|',1)='community:user:'||u.id)`;
// Age comes from the account's birth date (server/community/birth-date.sql), the one Social reads.
const age = `date_part('year', age((now() AT TIME ZONE 'Asia/Singapore')::date, (SELECT bd.birth_date FROM community.birth_date bd WHERE bd.user_id=u.id)))::int`;

function selfieKey() {
  try {
    const hex = readFileSync(process.env.PROVIDER_SECRET_KEY_FILE || '/run/secrets/quintaste/provider-secret-key', 'utf8').trim();
    return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hkdfSync('sha256', Buffer.from(hex, 'hex'), Buffer.alloc(0), 'quintaste social selfie v1', 32)) : null;
  } catch { return null; }
}
function openSelfie(id: string, sealed: Buffer) {
  const key = selfieKey();
  if (!key) throw new HttpError(503, 'Selfie key unavailable.');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12));
    decipher.setAAD(Buffer.from('selfie:' + id)); decipher.setAuthTag(sealed.subarray(12, 28));
    return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
  } catch { throw new HttpError(500, 'The selfie could not be opened.'); }
  finally { key.fill(0); }
}

export async function photoChecks(member: Session, status: string) {
  authorize(member, 'identity');
  const filter = status ? choice(status, checkStatuses, 'status') : 'pending';
  return (await query(`SELECT u.id, coalesce(nullif(p.first_name,''), u.name) AS name, u.username, p.gender, ${age} AS age, p.area, v.pose, v.submitted_at, v.decided_at,
      v.reason, ${reports} AS reports
    FROM social.verification v JOIN public."user" u ON u.id=v.user_id LEFT JOIN social.profile p ON p.user_id=u.id
    WHERE v.status=$1 ORDER BY ${filter === 'pending' ? 'v.submitted_at' : 'v.decided_at DESC'} LIMIT 200`, [filter])).rows;
}
export async function photoCheck(member: Session, id: string) {
  authorize(member, 'identity');
  const memberId = userId(id);
  return transaction(async db => {
    const row = (await db.query(`SELECT u.id, coalesce(nullif(p.first_name,''), u.name) AS name, u.username, u."createdAt" AS account_created, p.gender, ${age} AS age, p.area,
        v.status, v.pose, v.reason, v.submitted_at, v.decided_at, v.selfie IS NOT NULL AS has_selfie, v.photo_digest, ${reports} AS reports, m.email AS decided_by
      FROM social.verification v JOIN public."user" u ON u.id=v.user_id LEFT JOIN social.profile p ON p.user_id=u.id LEFT JOIN staff.member m ON m.id=v.decided_by
      WHERE v.user_id=$1 AND v.status<>'none'`, [memberId])).rows[0];
    if (!row) throw new HttpError(404, 'Photo check not found.');
    const photos = (await db.query('SELECT id, position, digest FROM social.photo WHERE user_id=$1 ORDER BY position', [memberId])).rows;
    await audit(db, member.id, 'social.photo_check.viewed', memberId, 'Viewed a Social photo check');
    return { ...row, photos, mainChanged: !!row.photo_digest && photos[0]?.digest !== row.photo_digest };
  });
}
/** The selfie or one profile photo, for the check page only. */
export async function photoCheckImage(member: Session, id: string, which: string) {
  authorize(member, 'identity');
  const memberId = userId(id);
  if (which === 'selfie') {
    const row = (await query<{ selfie: Buffer | null }>('SELECT selfie FROM social.verification WHERE user_id=$1', [memberId])).rows[0];
    return row?.selfie ? openSelfie(memberId, row.selfie) : null;
  }
  const position = Number(which);
  if (!Number.isInteger(position) || position < 0 || position > 5) throw new HttpError(400, 'Check photo.');
  return (await query<{ image: Buffer }>('SELECT image FROM social.photo WHERE user_id=$1 AND position=$2', [memberId, position])).rows[0]?.image ?? null;
}
/**
 * Approve records the main photo staff looked at; if the member changed it meanwhile the approval is refused. Decline and
 * revoke need a reason the member sees. Every decision starts the 30-day selfie erasure clock.
 */
export async function photoCheckAction(member: Session, input: Record<string, unknown>, reason: string) {
  const action = choice(input.action, ['approve', 'reject', 'revoke'] as const, 'photo check action');
  authorize(member, 'identity');
  const memberId = userId(input.id), note = text(input.note || '', 'reason for the member', 300, 0);
  if (action !== 'approve' && !note) throw new HttpError(400, 'Tell the member why.');
  return transaction(async db => {
    await lockPermission(db, member, 'identity');
    const row = (await db.query(`SELECT v.status, (SELECT digest FROM social.photo WHERE user_id=v.user_id AND position=0) AS main FROM social.verification v
      WHERE v.user_id=$1 FOR UPDATE`, [memberId])).rows[0];
    if (!row) throw new HttpError(404, 'Photo check not found.');
    if (action === 'revoke' ? row.status !== 'approved' : row.status !== 'pending') throw new HttpError(409, 'This check changed. Reload it.');
    if (action === 'approve') {
      const digest = digestOf(input.digest);
      if (digest !== row.main) throw new HttpError(409, 'The member changed their main photo. Reload and compare again.');
      await db.query(`UPDATE social.verification SET status='approved', photo_digest=$2, reason='', decided_by=$3, decided_at=now(), delete_after=now() + interval '30 days',
        updated_at=now() WHERE user_id=$1`, [memberId, digest, member.id]);
    } else {
      await db.query(`UPDATE social.verification SET status='rejected', reason=$2, decided_by=$3, decided_at=now(), delete_after=coalesce(delete_after, now() + interval '30 days'),
        updated_at=now() WHERE user_id=$1`, [memberId, note, member.id]);
    }
    await audit(db, member.id, 'social.photo_check.' + action, memberId, reason, { note });
    return { saved: true, status: action === 'approve' ? 'approved' : action === 'reject' ? 'declined' : 'revoked' };
  });
}

export async function teachers(member: Session, status: string) {
  authorize(member, 'sellers');
  const filter = status ? choice(status, hostStatuses, 'status') : 'pending';
  return (await query(`SELECT h.user_id AS id, h.display_name, h.area, h.status, h.applied_at, h.decided_at, u.username, ${reports} AS reports,
      (SELECT count(*)::int FROM social.class c WHERE c.host_id=h.user_id AND c.status='posted') AS classes
    FROM social.host h JOIN public."user" u ON u.id=h.user_id WHERE h.status=$1 ORDER BY ${filter === 'pending' ? 'h.applied_at' : 'h.decided_at DESC NULLS LAST'} LIMIT 200`, [filter])).rows;
}
export async function teacher(member: Session, id: string) {
  authorize(member, 'sellers');
  const memberId = userId(id);
  const row = (await query(`SELECT h.*, u.username, u.name AS account_name, u."createdAt" AS account_created, ${reports} AS reports, m.email AS decided_email
    FROM social.host h JOIN public."user" u ON u.id=h.user_id LEFT JOIN staff.member m ON m.id=h.decided_by WHERE h.user_id=$1`, [memberId])).rows[0];
  if (!row) throw new HttpError(404, 'Teacher not found.');
  const classes = (await query(`SELECT c.id, c.title, c.starts, c.status, c.seats, c.hidden_at, c.hidden_reason,
      (SELECT count(*)::int FROM social.class_seat s WHERE s.class_id=c.id AND s.status='joined') AS taken
    FROM social.class c WHERE c.host_id=$1 ORDER BY c.starts DESC LIMIT 100`, [memberId])).rows;
  return { teacher: row, classes };
}
/** Tells everyone who joined an upcoming class that it is cancelled, in their chat with the teacher. */
async function cancelUpcoming(db: PoolClient, hostId: string, classId?: string) {
  const cancelled = (await db.query(`UPDATE social.class SET status='cancelled', updated_at=now() WHERE host_id=$1 AND status='posted' AND starts > now()
    ${classId ? 'AND id=$2' : ''} RETURNING id`, classId ? [hostId, classId] : [hostId])).rows;
  for (const { id } of cancelled) {
    const members = (await db.query("SELECT user_id FROM social.class_seat WHERE class_id=$1 AND status='joined'", [id])).rows;
    for (const { user_id } of members) {
      const chat = (await db.query(`INSERT INTO social.class_chat(class_id, member_id) VALUES($1,$2) ON CONFLICT(class_id, member_id) DO UPDATE SET updated_at=now() RETURNING id`, [id, user_id])).rows[0];
      await db.query("INSERT INTO social.class_message(chat_id, kind, body) VALUES($1,'event','cancelled')", [chat.id]);
    }
  }
  return cancelled.length;
}
/** Approve, decline, suspend (cancels upcoming classes and tells who joined) or reinstate a teacher; hide (cancels it if upcoming) or restore one class. */
export async function teacherAction(member: Session, input: Record<string, unknown>, reason: string) {
  const action = choice(input.action, ['approve', 'reject', 'suspend', 'reinstate', 'hide_class', 'restore_class'] as const, 'teacher action');
  authorize(member, 'sellers');
  const hostId = userId(input.id), note = text(input.note || '', 'reason for the teacher', 300, 0);
  if (['reject', 'suspend', 'hide_class'].includes(action) && !note) throw new HttpError(400, 'Give a reason.');
  return transaction(async db => {
    await lockPermission(db, member, 'sellers');
    const host = (await db.query('SELECT status FROM social.host WHERE user_id=$1 FOR UPDATE', [hostId])).rows[0];
    if (!host) throw new HttpError(404, 'Teacher not found.');
    let cancelled = 0;
    if (action === 'hide_class' || action === 'restore_class') {
      const classId = text(input.classId, 'class', 36, 36);
      const result = await db.query(`UPDATE social.class SET hidden_at=${action === 'hide_class' ? 'now()' : 'NULL'}, hidden_reason=$3, updated_at=now() WHERE id=$1 AND host_id=$2`,
        [classId, hostId, action === 'hide_class' ? note : null]);
      if (!result.rowCount) throw new HttpError(404, 'Class not found.');
      // A hidden class no longer takes place: an upcoming one is cancelled and everyone who joined is told, so they still see it as
      // cancelled. Restoring only un-hides it; a cancelled class stays cancelled.
      if (action === 'hide_class') cancelled = await cancelUpcoming(db, hostId, classId);
    } else {
      const allowed = { approve: ['pending', 'rejected'], reject: ['pending'], suspend: ['approved'], reinstate: ['suspended'] }[action];
      if (!allowed.includes(host.status)) throw new HttpError(409, 'This teacher changed. Reload.');
      const next = { approve: 'approved', reject: 'rejected', suspend: 'suspended', reinstate: 'approved' }[action];
      await db.query('UPDATE social.host SET status=$2, reason=$3, decided_by=$4, decided_at=now(), updated_at=now() WHERE user_id=$1', [hostId, next, note, member.id]);
      if (action === 'suspend') cancelled = await cancelUpcoming(db, hostId);
    }
    await audit(db, member.id, 'social.teacher.' + action, hostId, reason, { note, classId: input.classId, cancelled });
    return { saved: true, note: cancelled ? `${cancelled} upcoming class(es) cancelled; members who joined were told.` : undefined };
  });
}
/** Waiting photo checks and teacher applications, for the sidebar, each only for roles that can act on it. Null before the Social schema is installed. */
export async function socialWaiting(member: Session) {
  const checks = can(member.role, 'identity'), hosts = can(member.role, 'sellers');
  if (!checks && !hosts) return null;
  try {
    const row = (await query<{ checks: number; teachers: number }>(`SELECT (SELECT count(*)::int FROM social.verification WHERE status='pending') AS checks,
      (SELECT count(*)::int FROM social.host WHERE status='pending') AS teachers`)).rows[0];
    return row ? { checks: checks ? row.checks : null, teachers: hosts ? row.teachers : null } : null;
  } catch (error) { if ((error as { code?: string })?.code === '42P01') return null; throw error; }
}
