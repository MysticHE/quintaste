import express from 'express';
import { readFileSync } from 'node:fs';
import { CommunityError } from '../community/http.mjs';
import { catalogueVenues, publishedPlaceId, publishedPlaceIds } from '../catalogue-places.mjs';

const byId = new Map(catalogueVenues.map(venue => [venue.id, venue]));
const areaCodes = new Set(JSON.parse(readFileSync(new URL('../areas/planning-areas.json', import.meta.url), 'utf8')).map(area => area.code));
/** What Social shows about a catalogue place; tables and invitations only use published packaged places. */
export function placeView(id) {
  const venue = id ? byId.get(id) : null;
  if (!venue) return null;
  return { id: venue.id, name: venue.name, branch: venue.branch || '', address: venue.address || '', photo: venue.photo?.path ?? null, hours: venue.hours?.summary ?? '',
    point: venue.point ?? null };
}
export const venueText = place => [place.name, place.branch].filter(Boolean).join(' · ').slice(0, 160);
/** A published catalogue place, or a 400 telling the member to choose one. */
export async function requirePlace(raw) {
  const id = typeof raw === 'string' ? await publishedPlaceId(raw) : null, place = placeView(id);
  if (!place) throw new CommunityError(400, 'Choose a place from Explore.');
  return place;
}
/** The planning area the app worked out from the place's map point; only the code is stored. */
export const readAreaCode = value => typeof value === 'string' && areaCodes.has(value) ? value : null;

/** Places for spots and tables: search by name, branch or address (`q`), or look up up to 12 ids (`ids`). Published packaged places only. */
export const places = express.Router();
places.get('/places', async (req, res) => {
  const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').slice(0, 12) : null;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 60) : '';
  const candidates = ids ? ids.map(id => byId.get(id)).filter(Boolean)
    : q.length >= 2 ? catalogueVenues.filter(v => [v.name, v.branch, v.address, v.postalCode].join(' ').toLowerCase().includes(q)).slice(0, 40) : [];
  const published = await publishedPlaceIds(candidates.map(v => v.id));
  res.json({ items: candidates.filter((_v, index) => published[index]).slice(0, 12).map(v => placeView(v.id)) });
});
