import { createHash } from 'node:crypto';

// Shared by the Express routers (server/staff-content.mjs) and the Expo API routes (src/server/staff-content.ts).
// In production both run in one Node process and share a single loader through globalThis.quintasteStaffContent.

/** @typedef {{ kind: 'place' | 'menu' | 'recipe' | 'event', id: string, origin: 'edit' | 'staff', hidden: boolean, data: Record<string, any>, version: number, updated_at: string }} StaffItem */
/** @typedef {{ revision: string, catalogueRevision: string, items: ReadonlyMap<string, StaffItem> }} StaffContent */

export const staffContentQuery = `SELECT kind,id,origin,hidden,data,version,to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
  FROM content.item ORDER BY kind,id`;
const digest = rows => createHash('sha256').update(JSON.stringify(rows.map(r => [r.kind, r.id, r.version, r.hidden, r.updated_at]))).digest('hex');
/** @type {StaffContent} */
export const emptyStaffContent = { revision: '0'.repeat(64), catalogueRevision: '0'.repeat(64), items: new Map() };

/**
 * A loader that re-reads staff content at most every 10 seconds and shares one query between concurrent callers.
 * A failed read reuses the last copy for 5 minutes, then fails closed so hidden content never reappears.
 * @param {() => Promise<{ rows: StaffItem[] }>} read
 * @param {(event: string) => void} warn
 * @returns {() => Promise<StaffContent>}
 */
export function staffContentLoader(read, warn) {
  /** @type {{ at: number, value: StaffContent } | undefined} */
  let cached;
  /** @type {Promise<StaffContent> | undefined} */
  let pending;
  return async function staffContent() {
    const prior = cached;
    if (prior && Date.now() - prior.at < 10000) return prior.value;
    pending ??= read().then(({ rows }) => {
      // Place and menu rows alone decide Explore paging, so recipe or event edits never reset members' catalogue pages.
      const value = { revision: digest(rows), catalogueRevision: digest(rows.filter(r => r.kind === 'place' || r.kind === 'menu')),
        items: new Map(rows.map(row => [row.kind + ':' + row.id, row])) };
      cached = { at: Date.now(), value }; return value;
    }).catch(error => {
      if (prior && Date.now() - prior.at < 300000) { warn('staff_content_stale'); return prior.value; }
      throw error;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}
