import { logger, pool } from './config.mjs';
import { operationsEnabled } from './operations.mjs';
import { emptyStaffContent, staffContentLoader, staffContentQuery } from './staff-content-core.mjs';

// Staff edits win over packaged and bot content until staff clear them. The Expo API routes in this process use the
// same loader (src/server/staff-content.ts), so Express and Expo always agree about what is hidden.
const load = staffContentLoader(async () => {
  const base=await pool.query(staffContentQuery);
  const patches=(await pool.query(`SELECT p.*,coalesce(c.version,0) AS current_version FROM ops.explore_patch p LEFT JOIN content.item c ON c.kind=p.kind AND c.id=p.id WHERE NOT p.disabled AND p.staff_version=coalesce(c.version,0)`)).rows;
  const rows=new Map(base.rows.map(r=>[r.kind+':'+r.id,r]));
  for(const p of patches) {
    const key=p.kind+':'+p.id,prior=rows.get(key),data={...prior?.data,...p.data};
    if(p.kind==='menu') {
      data.items={...prior?.data?.items};
      for(const [id,patch] of Object.entries(p.data.items??{})) data.items[id]={...data.items[id],...patch};
    }
    rows.set(key,{...(prior??{kind:p.kind,id:p.id,origin:'edit',hidden:false}),data,
      version:(prior?.version??0)+1000000,updated_at:new Date(p.updated_at).toISOString()});
  }
  return {rows:[...rows.values()]};
}, event => logger.warn({ event }));
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
/** Staff-created places as Explore lists them: a Mixed Kitchen one needs a labelled dish; a Veg Kitchen one may have none (owner, 21 Oct 2026). */
export const staffPlace = (staff, id) => {
  const item = staff.items.get('place:' + id), menu = staff.items.get('menu:' + id);
  if (item?.origin !== 'staff' || item.hidden) return null;
  return !item.data?.kitchen || (menu && !menu.hidden && menu.data.added?.length) ? item : null;
};
