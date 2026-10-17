import { logger, pool } from './config.mjs';
import { operationsEnabled } from './operations.mjs';
import { emptyStaffContent, staffContentLoader, staffContentQuery } from './staff-content-core.mjs';

// Staff edits win over packaged and bot content until staff clear them. The Expo API routes in this process use the
// same loader (src/server/staff-content.ts), so Express and Expo always agree about what is hidden.
const load = staffContentLoader(() => pool.query(staffContentQuery), event => logger.warn({ event }));
export const staffContent = () => operationsEnabled ? load() : Promise.resolve(emptyStaffContent);
globalThis.quintasteStaffContent = staffContent;
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
