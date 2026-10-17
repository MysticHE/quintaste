import fs from 'node:fs';
import path from 'node:path';

/** Published catalogue venues (packaged baseline), shared by place reviews and place reports. */
export const catalogueVenues = JSON.parse(fs.readFileSync(path.resolve('server-assets/editorial-baseline.json'), 'utf8')).venues;
// The approved alias identifies the same named branch and unit; keep one rating per member across both URLs.
export const placeAliases = new Map([['research-150-green-bukit-batok', 'research-ur08-150-green']]);
/** The canonical id of a published place, or null when the id is malformed or not published. */
export function publishedPlaceId(raw) {
  if (typeof raw !== 'string' || !/^[a-z0-9][a-z0-9-]{2,119}$/.test(raw)) return null;
  const id = placeAliases.get(raw) ?? raw;
  return catalogueVenues.some(venue => venue.id === id) ? id : null;
}
