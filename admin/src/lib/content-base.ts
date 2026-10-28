import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { query } from './db';
import { HttpError } from './http';

// Packaged and bot content before staff changes, read from the app's internal port (never routed by Traefik).
export type Price = { amount: number | null; currency: 'SGD' | 'unknown'; type: 'displayed' | 'from'; maxAmount?: number };
export type MenuItem = { id: string; name: string; category?: string; price: Price; qualifier: string; diet?: 'V' | 'VG'; photo?: Photo | null; availability?: string; hidden?: boolean };
export type Menu = { id: string; name: string; branch: string; address: string; postalCode: string; aliases: string[];
  sections: { id: string; title?: string; sourceUrl: string; sourceLabel: string; checkedAt: string; items: MenuItem[] }[] };
export type Hours = { summary: string; schedule: string[]; notes: string; sourceUrl: string; checkedAt: string; timezone: 'Asia/Singapore' };
export type Photo = { path: string; width: number; height: number; author: string; sourceUrl: string; license: string; licenseUrl: string | null;
  capturedAt: string | null; checkedAt: string; changes: string; provider?: 'Google Maps' };
export type Place = { id: string; name: string; branch: string; address: string; postalCode: string; aliases: string[];
  point: { latitude: number; longitude: number } | null; venueDiet: 'Vegetarian' | 'Vegan'; alliumFreeClaim: boolean; photo?: Photo; hours?: Hours;
  kitchen?: 'options'; menuTotal?: number; itemCount: number; research?: { sourceUrls: string[]; checkedAt?: string };
  /** QT Explorer Veg Kitchen places: the venue's own words that it serves no meat or seafood. */
  dietProof?: { sourceUrl: string; quote: string; checkedAt: string } };
export type Recipe = Record<string, unknown> & { id: string; name: string; revision: number; provenance?: Record<string, unknown> };
export type Event = Record<string, unknown> & { id: string; title: string; startsAt: string; status: string };
export type Packaged<T> = { source?: 'bundled' | 'bot'; hash: string; data: T };

const cache = new Map<string, { at: number; value: unknown }>();
let access: { token: string; until: number } | undefined;
/** A token for the app's internal content port, stored only as its hash and valid for two minutes. */
async function accessToken() {
  if (access && access.until > Date.now() + 30000) return access.token;
  const token = randomBytes(32).toString('base64url'), hash = createHash('sha256').update(token).digest('hex');
  await query(`WITH expired AS (DELETE FROM content.access WHERE expires_at < now())
    INSERT INTO content.access(hash, expires_at) VALUES($1, now() + interval '2 minutes')`, [hash]);
  access = { token, until: Date.now() + 120000 };
  return token;
}
const origin = () => process.env.CONTENT_BASE_URL || (process.env.NODE_ENV === 'production' ? 'http://app:3001' : 'http://localhost:3301');
/** One packaged-content read, cached for 15 seconds; null when the app has no packaged record for a single item. */
async function read<T>(path: string, list = false): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < 15000) return hit.value as T;
  const response = await fetch(origin() + '/api/staff-base?' + path, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
    headers: { 'x-quintaste-content-token': await accessToken() } }).catch(() => null);
  // A list read that 404s means the app lacks the staff endpoint (an older image), not an empty catalogue.
  if (response?.status === 404 && !list) return null;
  if (!response?.ok) throw new HttpError(503, 'Published content is unavailable. Check the app service and try again.');
  const value = await response.json() as T;
  cache.set(path, { at: Date.now(), value });
  while (cache.size > 60) cache.delete(cache.keys().next().value!);
  return value;
}
/** Places members can see in Explore now, by kitchen (the app runs its own all-Singapore search); null on an older app image. */
export const livePlaceCounts = () => read<{ veg: number; mixed: number }>('kind=counts');
export const packagedPlaces = async () => (await read<{ items: Packaged<Place>[] }>('kind=places', true))?.items ?? [];
/** Ids of venues QT Explorer found permanently closed (withdrawn from Explore); an older app image sends none. */
export const closedPlaces = async () => new Set((await read<{ closed?: string[] }>('kind=places', true))?.closed ?? []);
export const packagedMenu = (id: string) => read<Packaged<Menu>>('kind=menu&id=' + encodeURIComponent(id));
export const packagedRecipes = async () => (await read<{ items: Packaged<Recipe>[] }>('kind=recipes', true))?.items ?? [];
export const packagedEvents = async () => (await read<{ items: Packaged<Event>[] }>('kind=events', true))?.items ?? [];
