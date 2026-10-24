import { logger } from '../config.mjs';

/**
 * Map points for editorial events, so Feeds > Events can offer "Near me" by real distance. Events carry an address but no
 * coordinates; each address is looked up once through OneMap, the free Singapore government service the address search
 * already uses (no Google). Points live in memory: a restart looks up the few dozen upcoming events again in the background,
 * and a request never waits for a lookup.
 *
 * Twin of the app's OneMap search (src/server/location-search.ts) and Singapore bounds (inSingapore in
 * src/utils/discovery-search.ts): the Node server cannot import those TypeScript modules, so keep the request and bounds aligned.
 */
const found = new Map(), queue = new Map();
/** An address OneMap does not know is tried again after 6 hours; a failed request (network, timeout, 5xx) after 5 minutes. */
const missRetry = 6 * 3600000, failureRetry = 5 * 60000;
let draining = false;
const inSingapore = (lat, lng) => lat >= 1.16 && lat <= 1.48 && lng >= 103.59 && lng <= 104.12;
const words = text => String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  .replace(/\b(ave)\b/g, 'avenue').replace(/\b(st)\b/g, 'street').replace(/\b(rd)\b/g, 'road').replace(/\b(dr)\b/g, 'drive').replace(/\b(cres)\b/g, 'crescent');
/**
 * What to search for: the six-digit postal code when the address has one, otherwise each street-like part of the address
 * (no unit, no country), tried in order.
 */
function searchFor(event) {
  const text = [event.address, event.location].filter(Boolean).join(', ');
  const postal = text.match(/\b(\d{6})\b/)?.[1];
  if (postal) return { key: postal, postal, streets: [] };
  const streets = String(event.address ?? '').split(',').map(part => part.trim().replace(/#\S+/g, '').replace(/^(no\.?|blk|block)\s+/i, '').trim())
    .filter(part => part && !/^singapore$/i.test(part) && /[a-z]/i.test(part) && /\d/.test(part)).slice(0, 3);
  return streets.length ? { key: streets.join('|').toLowerCase(), postal: null, streets } : null;
}
class RateLimited extends Error {}
/** @typedef {{ LATITUDE?: string, LONGITUDE?: string, POSTAL?: string, ADDRESS?: string }} OneMapResult */
/** @param {string} query @returns {Promise<OneMapResult[]>} */
async function oneMap(query) {
  const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
  url.search = new URLSearchParams({ searchVal: query, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1' }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (response.status === 429) { await response.body?.cancel(); throw new RateLimited(); }
  if (!response.ok) throw new Error('OneMap ' + response.status);
  const results = /** @type {{ results?: unknown }} */ (await response.json())?.results;
  return Array.isArray(results) ? results : [];
}
/**
 * A postal search must return that exact postal code. A street search (house number and street) only counts when OneMap's
 * address contains it, so a vague address is left unplaced rather than placed somewhere else.
 */
async function lookUp({ postal, streets }) {
  for (const query of postal ? [postal] : streets) {
    for (const item of await oneMap(query)) {
      const lat = Number(item?.LATITUDE), lng = Number(item?.LONGITUDE);
      if (!inSingapore(lat, lng)) continue;
      if (postal ? item?.POSTAL === postal : words(item?.ADDRESS).includes(words(query)))
        return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}
async function drain() {
  if (draining) return;
  draining = true;
  try {
    // OneMap limits request speed: one lookup a second, and a rate-limited one waits and goes to the back of the queue.
    let limited = 0;
    while (queue.size && limited < 5) {
      const [key, search] = queue.entries().next().value;
      queue.delete(key);
      let pause = 1000;
      try { const point = await lookUp(search); found.set(key, { point, retryAt: point ? Infinity : Date.now() + missRetry }); limited = 0; }
      catch (error) {
        if (error instanceof RateLimited) { queue.set(key, search); limited++; pause = 3000 * limited; }
        else { found.set(key, { point: null, retryAt: Date.now() + failureRetry }); logger.warn({ event: 'event_point_lookup_failed', reason: String(error?.message ?? error).slice(0, 80) }); }
      }
      await new Promise(resolve => setTimeout(resolve, pause));
    }
    // After five limits in a row, the rest wait for the next events request.
    if (limited >= 5) { queue.clear(); logger.warn({ event: 'event_point_lookup_paused' }); }
  } finally { draining = false; }
}
/** The event with `point` when its address has been placed; otherwise the event as is, with a lookup queued. */
export function withPoint(event) {
  const search = searchFor(event);
  if (!search) return event;
  const hit = found.get(search.key);
  if (hit?.point) return { ...event, point: hit.point };
  if ((!hit || Date.now() >= hit.retryAt) && !queue.has(search.key) && queue.size < 200) { queue.set(search.key, search); void drain(); }
  return event;
}
