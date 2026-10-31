import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, text } from './http';

export type Kind = 'place' | 'menu' | 'recipe' | 'event';
export type StaffRow = { kind: Kind; id: string; origin: 'edit' | 'staff'; hidden: boolean; data: Record<string, unknown>; version: number; updated_at: string; editor: string | null };
export type Next = { origin: 'edit' | 'staff'; hidden: boolean; data: Record<string, unknown> } | null;

export function contentId(value: unknown, name = 'content id') {
  const id = text(value, name, 120, 3);
  if (!/^[a-z0-9][a-z0-9-]{2,119}$/.test(id)) throw new HttpError(400, `Check ${name}.`);
  return id;
}
export const expectedVersion = (value: unknown) => integer(value ?? 0, 'content version', 0, 1000000);
export const action = <T extends string>(value: unknown, values: readonly T[]) => choice(value, values, 'action');
const columns = 'i.kind,i.id,i.origin,i.hidden,i.data,i.version,i.updated_at,m.email AS editor';
export async function staffRows(kind: Kind) {
  return (await query<StaffRow>(`SELECT ${columns} FROM content.item i LEFT JOIN staff.member m ON m.id=i.updated_by WHERE i.kind=$1`, [kind])).rows;
}
export async function staffRow(kind: Kind, id: string) {
  return (await query<StaffRow>(`SELECT ${columns} FROM content.item i LEFT JOIN staff.member m ON m.id=i.updated_by WHERE i.kind=$1 AND i.id=$2`, [kind, id])).rows[0] ?? null;
}
/** The audit trail of one item, newest first. */
export const history = (kind: Kind, id: string) => historyOf(kind + ':' + id);
/** The audit trail of any audit target (such as `member-recipe:<uuid>`), newest first. */
export async function historyOf(target: string) {
  return (await query(`SELECT a.occurred_at,a.action,a.reason,m.email AS actor FROM staff.audit a LEFT JOIN staff.member m ON m.id=a.actor_id
    WHERE a.target=$1 ORDER BY a.id DESC LIMIT 20`, [target])).rows;
}
/** Whether packaged or bot data changed under a staff edit since staff saved it. */
export const newerBelow = (row: StaffRow | null, hash: string | undefined) => !!row && row.origin === 'edit' && typeof row.data.base === 'string' && !!hash && row.data.base !== hash;

/**
 * One versioned change to a staff item, audited with its reason. The change returns the next row, or null to delete it
 * (members then see the packaged or bot version again). A stale version is refused so two staff cannot overwrite each other.
 */
export async function writeItem(member: Session, kind: Kind, id: string, expected: number, act: string, reason: string,
  change: (row: StaffRow | undefined) => Next, details: Record<string, unknown> = {}) {
  authorize(member, 'content');
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    if (kind === 'place' || kind === 'menu') await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ['place-workspace:' + id]);
    const row = (await db.query<StaffRow>('SELECT kind,id,origin,hidden,data,version FROM content.item WHERE kind=$1 AND id=$2 FOR UPDATE', [kind, id])).rows[0];
    if ((row?.version ?? 0) !== expected) throw new HttpError(409, 'This content changed since you opened it. Refresh before saving.');
    const next = change(row);
    if (next && Buffer.byteLength(JSON.stringify(next.data)) > 190000) throw new HttpError(413, 'This content is too large. Split it or remove some entries.');
    if (!next) {
      if (row) await db.query('DELETE FROM content.item WHERE kind=$1 AND id=$2', [kind, id]);
      // A deleted staff-created place takes its dishes with it.
      if (row?.origin === 'staff' && kind === 'place') await db.query("DELETE FROM content.item WHERE kind='menu' AND id=$1", [id]);
    }
    else if (row) await db.query('UPDATE content.item SET origin=$3,hidden=$4,data=$5,version=version+1,updated_by=$6,updated_at=now() WHERE kind=$1 AND id=$2',
      [kind, id, next.origin, next.hidden, JSON.stringify(next.data), member.id]);
    else if (!(await db.query('INSERT INTO content.item(kind,id,origin,hidden,data,updated_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
      [kind, id, next.origin, next.hidden, JSON.stringify(next.data), member.id])).rowCount) throw new HttpError(409, 'This content changed since you opened it. Refresh before saving.');
    await audit(db, member.id, `content.${kind}.${act}`, kind + ':' + id, reason, details);
    return { saved: true };
  });
}
/** Hide, restore or clear (back to the packaged/bot version) any edited item; staff-created items are deleted instead of cleared. */
export function visibility(member: Session, kind: Kind, id: string, expected: number, act: 'hide' | 'restore' | 'clear' | 'delete', reason: string) {
  return writeItem(member, kind, id, expected, act, reason, row => {
    if (kind === 'recipe' && row?.data._deletedAt) throw new HttpError(409, 'Restore this recipe before changing it.');
    if (act === 'clear' || act === 'delete') {
      if (!row) throw new HttpError(409, 'There is no staff change to clear.');
      if ((act === 'clear') !== (row.origin === 'edit')) throw new HttpError(409, act === 'clear' ? 'Delete a staff-created item instead.' : 'Only staff-created items can be deleted.');
      return null;
    }
    const data = row?.data ?? {};
    if (act === 'restore' && row?.origin !== 'staff' && !Object.keys(data).some(key => key !== 'base')) return null;
    return { origin: row?.origin ?? 'edit', hidden: act === 'hide', data };
  });
}
/** A new id for staff-created content: readable slug plus a random suffix. */
export function newId(name: string) {
  const slug = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
  return 'staff-' + slug + '-' + crypto.randomUUID().slice(0, 8);
}
export const staffState = (row: StaffRow | null) => row && { origin: row.origin, hidden: row.hidden, version: row.version, updatedAt: row.updated_at, editor: row.editor };

/** Place and menu share a lock and a transaction: neither write can survive a stale version or failed validation. */
export async function writePlaceWorkspace(member: Session, id: string, versions: { place: number; menu: number }, reason: string,
  change: (place: StaffRow | undefined, menu: StaffRow | undefined) => { place: Next; menu: Next }) {
  authorize(member, 'content');
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['place-workspace:' + id]);
    const rows = (await db.query<StaffRow>("SELECT kind,id,origin,hidden,data,version FROM content.item WHERE id=$1 AND kind IN ('place','menu') ORDER BY kind FOR UPDATE", [id])).rows;
    const place = rows.find(r => r.kind === 'place'), menu = rows.find(r => r.kind === 'menu');
    if ((place?.version ?? 0) !== versions.place || (menu?.version ?? 0) !== versions.menu) throw new HttpError(409, 'This place or menu changed. Refresh before saving.');
    const next = change(place, menu);
    for (const kind of ['place', 'menu'] as const) {
      const value = next[kind], row = kind === 'place' ? place : menu;
      if (value && Buffer.byteLength(JSON.stringify(value.data)) > 190000) throw new HttpError(413, 'This content is too large. Save fewer changes.');
      if (!value) { if (row) await db.query('DELETE FROM content.item WHERE kind=$1 AND id=$2', [kind, id]); }
      else if (row) await db.query('UPDATE content.item SET origin=$3,hidden=$4,data=$5,version=version+1,updated_by=$6,updated_at=now() WHERE kind=$1 AND id=$2', [kind,id,value.origin,value.hidden,JSON.stringify(value.data),member.id]);
      else await db.query('INSERT INTO content.item(kind,id,origin,hidden,data,updated_by) VALUES($1,$2,$3,$4,$5,$6)', [kind,id,value.origin,value.hidden,JSON.stringify(value.data),member.id]);
      if (row || value) await audit(db, member.id, `content.${kind}.save`, kind + ':' + id, reason, { workspace: true });
    }
    return { saved: true, id };
  });
}
