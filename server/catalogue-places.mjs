import fs from 'node:fs';
import path from 'node:path';
import { logger } from './config.mjs';
import { placeHidden, staffContent, staffPlace } from './staff-content.mjs';
import { validatePlace } from './editorial/validation.mjs';

/** Published catalogue venues (packaged baseline), shared by place reviews and place reports. */
export const catalogueVenues = JSON.parse(fs.readFileSync(path.resolve('server-assets/editorial-baseline.json'), 'utf8')).venues;
// The approved alias identifies the same named branch and unit; keep one rating per member across both URLs.
export const placeAliases = new Map([['research-150-green-bukit-batok', 'research-ur08-150-green']]);
const packaged = new Set(catalogueVenues.map(venue => venue.id));
const editorialFile = path.join(process.env.QT_EDITORIAL_ROOT || path.resolve('.local/editorial'), 'active.json');
let explorerPlaces = { marker: '', ids: new Set() };
/** Valid QT Explorer veg options places in the published snapshot (the same check the publisher and app use).
 * A missing, oversized or unreadable snapshot never blocks packaged places: it keeps the last good set. */
async function explorerPlaceIds() {
  try {
    const stat = await fs.promises.stat(editorialFile), marker = [stat.ino, stat.mtimeMs, stat.size].join(':');
    if (marker === explorerPlaces.marker) return explorerPlaces.ids;
    if (stat.size > 8 * 1024 * 1024) throw new Error('Editorial snapshot exceeds limit');
    const records = JSON.parse(await fs.promises.readFile(editorialFile, 'utf8')).records ?? {};
    const ids = new Set(Object.entries(records).flatMap(([key, entry]) => {
      if (!key.startsWith('place:') || entry?.data?.id !== key.slice(6)) return [];
      try { validatePlace(entry.data); return [entry.data.id]; } catch { return []; }
    }));
    explorerPlaces = { marker, ids };
  } catch (error) {
    if (error.code === 'ENOENT') explorerPlaces = { marker: '', ids: new Set() };
    else logger.warn({ event: 'editorial_places_unreadable' });
  }
  return explorerPlaces.ids;
}
/** Canonical ids of places members can see: packaged, staff-created or a QT Explorer veg options place, and not hidden by staff. */
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
