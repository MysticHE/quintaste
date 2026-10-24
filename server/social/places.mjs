import express from 'express';
import { CommunityError } from '../community/http.mjs';
import { catalogueVenues, publishedPlaceId, publishedPlaceIds } from '../catalogue-places.mjs';

const byId = new Map(catalogueVenues.map(venue => [venue.id, venue]));
/** What Social shows about a catalogue place; dinner invites and favourite places only use published packaged places. */
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

/** `near=lat,lng` inside Singapore, or null. The app sends only a map point, never a member's address. */
function readNear(value) {
  const [latitude, longitude] = typeof value === 'string' ? value.split(',').map(Number) : [];
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude > 1.15 && latitude < 1.48 && longitude > 103.59 && longitude < 104.1 ? { latitude, longitude } : null;
}
/** Straight-line distance in km, close enough for ordering places across Singapore. */
function kmBetween(a, b) {
  const x = (b.longitude - a.longitude) * Math.cos((a.latitude + b.latitude) * Math.PI / 360), y = b.latitude - a.latitude;
  return Math.sqrt(x * x + y * y) * 111.32;
}

/** Places for spots and tables: search by name, branch, address or postal code (`q`), list the nearest to `near`, or look up up to 12
 *  ids (`ids`). With `near`, results come nearest first. Published packaged places only. */
export const places = express.Router();
places.get('/places', async (req, res) => {
  const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').slice(0, 12) : null;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 60) : '';
  const near = ids ? null : readNear(req.query.near);
  const matched = ids ? ids.map(id => byId.get(id)).filter(Boolean)
    : q.length >= 2 ? catalogueVenues.filter(v => [v.name, v.branch, v.address, v.postalCode].join(' ').toLowerCase().includes(q))
    : near ? catalogueVenues.filter(v => v.point) : [];
  const candidates = (near ? matched.map(v => ({ v, km: v.point ? kmBetween(near, v.point) : Infinity })).sort((a, b) => a.km - b.km).map(item => item.v) : matched).slice(0, 40);
  const published = await publishedPlaceIds(candidates.map(v => v.id));
  res.json({ items: candidates.filter((_v, index) => published[index]).slice(0, 12).map(v => placeView(v.id)) });
});
