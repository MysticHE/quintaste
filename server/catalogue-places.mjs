import fs from 'node:fs';
import path from 'node:path';
import { logger } from './config.mjs';
import { placeHidden, staffContent, staffPlace } from './staff-content.mjs';
import { readSnapshot } from './editorial/store.mjs';
import { validPlaces } from './editorial/places.mjs';

/** Published catalogue venues (packaged baseline), shared by place reviews and place reports. */
export const catalogueVenues = JSON.parse(fs.readFileSync(path.resolve('server-assets/editorial-baseline.json'), 'utf8')).venues;
// The approved alias identifies the same named branch and unit; keep one rating per member across both URLs.
export const placeAliases = new Map([['research-150-green-bukit-batok', 'research-ur08-150-green']]);
const packaged = new Set(catalogueVenues.map(venue => venue.id));
const editorialRoot = process.env.QT_EDITORIAL_ROOT || path.resolve('.local/editorial');
let explorerPlaces = { snapshot: null, ids: new Set() };
/** Valid QT Explorer places (veg options and fully vegetarian) in the published snapshot: the publisher's snapshot reader and place validator,
 * so the routes and the app agree. A missing, oversized or unreadable snapshot never blocks packaged places: it keeps the last good set. */
async function explorerPlaceIds() {
  try {
    const snapshot = await readSnapshot(editorialRoot);
    if (snapshot !== explorerPlaces.snapshot) explorerPlaces = { snapshot, ids: new Set(validPlaces(snapshot.records).keys()) };
  } catch {
    logger.warn({ event: 'editorial_places_unreadable' });
  }
  return explorerPlaces.ids;
}
/** Canonical ids of places members can see: packaged, staff-created or a QT Explorer place, and not hidden by staff. */
export async function publishedPlaceIds(raw) {
  const [staff, explorer] = await Promise.all([staffContent(), explorerPlaceIds()]);
  return raw.map(value => {
    if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{2,119}$/.test(value)) return null;
    const id = placeAliases.get(value) ?? value;
    return !placeHidden(staff, id) && (packaged.has(id) || staffPlace(staff, id) || explorer.has(id)) ? id : null;
  });
}
/** The canonical id of a published place, or null when the id is malformed, unpublished or hidden. */
export const publishedPlaceId = async raw => (await publishedPlaceIds([raw]))[0];
/**
 * Every place Explore has listed, for duplicate checks: packaged, QT Explorer and staff-created places, each with the name and
 * address members see (staff edits applied) and whether it is live, hidden by staff, found permanently closed or removed by the
 * owner (an editorial removal, kept by name and postal code). None of those is relisted under another id.
 * @returns {Promise<Array<{ id: string, name: string, branch: string, address: string, postalCode: string, state: 'live' | 'hidden' | 'closed' | 'removed' }>>}
 */
export async function listedPlaces() {
  const [staff, snapshot] = await Promise.all([staffContent(), readSnapshot(editorialRoot).catch(() => ({ records: {} }))]);
  const records = snapshot?.records ?? {};
  const closed = id => !!records['venue:' + id]?.data?.closed;
  const row = (data, id) => {
    const item = staff.items.get('place:' + id), edited = item && !item.hidden ? { ...data, ...item.data } : data;
    return { id, name: String(edited.name ?? ''), branch: String(edited.branch ?? ''), address: String(edited.address ?? ''), postalCode: String(edited.postalCode ?? ''),
      state: item?.hidden ? 'hidden' : closed(id) ? 'closed' : 'live' };
  };
  const rows = [...catalogueVenues.map(venue => row(venue, venue.id)), ...[...validPlaces(records).values()].filter(p => !packaged.has(p.id)).map(p => row(p, p.id))];
  for (const item of staff.items.values()) if (item.kind === 'place' && item.origin === 'staff') rows.push({ ...row(item.data, item.id), state: item.hidden ? 'hidden' : 'live' });
  // The removal keeps the name and its identity "place:<name>|<postal code>" (moderationKey in editorial/store.mjs).
  for (const r of Object.values(snapshot?.removals ?? {})) if (r?.kind === 'place' && typeof r.identity === 'string')
    rows.push({ id: r.id, name: String(r.name ?? ''), branch: '', address: '', postalCode: r.identity.split('|').pop() ?? '', state: 'removed' });
  return rows;
}
