import { createHash } from 'node:crypto';
import { logger, pool } from './config.mjs';
import { operationsEnabled } from './operations.mjs';

// Express-side reader of content.item (src/server/staff-content.ts serves the Expo routes). Staff edits win over
// packaged and bot content until staff clear them. Re-read at most every 10 seconds; a failed read reuses the last
// copy for 5 minutes, then fails closed so hidden content never reappears.
const empty = { revision: '0'.repeat(64), items: new Map() };
let cached, pending;
export async function staffContent() {
  if (!operationsEnabled) return empty;
  const prior = cached;
  if (prior && Date.now() - prior.at < 10000) return prior.value;
  pending ??= pool.query(`SELECT kind,id,origin,hidden,data,version,to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
      FROM content.item ORDER BY kind,id`)
    .then(({ rows }) => {
      const revision = createHash('sha256').update(JSON.stringify(rows.map(r => [r.kind, r.id, r.version, r.hidden, r.updated_at]))).digest('hex');
      const value = { revision, items: new Map(rows.map(row => [row.kind + ':' + row.id, row])) };
      cached = { at: Date.now(), value }; return value;
    })
    .catch(error => {
      if (prior && Date.now() - prior.at < 300000) { logger.warn({ event: 'staff_content_stale' }); return prior.value; }
      throw error;
    })
    .finally(() => { pending = undefined; });
  return pending;
}
/** The record a member sees: null when staff hid it, the staff version when staff edited it, otherwise the original. */
export function staffRecord(staff, kind, id, data) {
  const item = staff.items.get(kind + ':' + id);
  if (!item) return data;
  if (item.hidden) return null;
  const { base: _base, ...record } = item.data;
  if (!Object.keys(record).length) return data;
  // A later bot withdrawal or cancellation still reaches members over an older staff edit.
  return { ...record, id, ...(data?.withdrawal ? { withdrawal: data.withdrawal } : {}), ...(kind === 'event' && data?.status === 'cancelled' ? { status: 'cancelled' } : {}) };
}
/** Whether a staff item changes any field (a hide-only row does not). */
export const staffEdited = item => Object.keys(item.data).some(key => key !== 'base');
/** Staff-created records of one kind that are not hidden. */
export const staffCreated = (staff, kind) => [...staff.items.values()].filter(item => item.kind === kind && item.origin === 'staff' && !item.hidden)
  .map(item => staffRecord(staff, kind, item.id, null));
export const placeHidden = (staff, id) => !!staff.items.get('place:' + id)?.hidden;
/** Staff-created places (they still need at least one dish before Explore lists them). */
export const staffPlace = (staff, id) => {
  const item = staff.items.get('place:' + id), menu = staff.items.get('menu:' + id);
  return item?.origin === 'staff' && !item.hidden && menu && !menu.hidden && menu.data.added?.length ? item : null;
};
