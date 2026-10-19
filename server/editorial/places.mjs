import { validatePlace } from './validation.mjs';

const snapshots = new WeakMap();
/** The valid QT Explorer places (record kind "place") of one editorial snapshot, by id: the publisher's own validator decides, so the
 * app, the member routes and the publisher always agree. A malformed or future-schema record is skipped, never shown or thrown.
 * `records` is a snapshot's `records` object; one pass is kept for as long as that object is the current snapshot. */
export function validPlaces(records) {
  if (!records || typeof records !== 'object') return new Map();
  let places = snapshots.get(records);
  if (!places) {
    places = new Map();
    for (const [key, entry] of Object.entries(records)) {
      const data = key.startsWith('place:') ? entry?.data : undefined;
      if (!data || typeof data !== 'object' || data.id !== key.slice(6)) continue;
      try { validatePlace(data); places.set(data.id, data); } catch { /* Skipped. */ }
    }
    snapshots.set(records, places);
  }
  return places;
}
