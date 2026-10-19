import fs from 'node:fs';
import path from 'node:path';
import { placeHidden, staffContent, staffPlace } from './staff-content.mjs';
import { readSnapshot } from './editorial/store.mjs';

/** Published catalogue venues (packaged baseline), shared by place reviews and place reports. */
export const catalogueVenues = JSON.parse(fs.readFileSync(path.resolve('server-assets/editorial-baseline.json'), 'utf8')).venues;
// The approved alias identifies the same named branch and unit; keep one rating per member across both URLs.
export const placeAliases = new Map([['research-150-green-bukit-batok', 'research-ur08-150-green']]);
const packaged = new Set(catalogueVenues.map(venue => venue.id));
const editorialRoot = process.env.QT_EDITORIAL_ROOT || path.resolve('.local/editorial');
/** Canonical ids of places members can see: packaged, staff-created or a QT Explorer veg options place, and not hidden by staff. */
export async function publishedPlaceIds(raw) {
  const [staff, snapshot] = await Promise.all([staffContent(), readSnapshot(editorialRoot)]);
  return raw.map(value => {
    if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{2,119}$/.test(value)) return null;
    const id = placeAliases.get(value) ?? value;
    return !placeHidden(staff, id) && (packaged.has(id) || staffPlace(staff, id) || !!snapshot.records['place:' + id]) ? id : null;
  });
}
/** The canonical id of a published place, or null when the id is malformed, unpublished or hidden. */
export const publishedPlaceId = async raw => (await publishedPlaceIds([raw]))[0];
