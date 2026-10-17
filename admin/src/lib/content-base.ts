import 'server-only';
import { HttpError } from './http';

// Packaged and bot content before staff changes, read from the app's internal port (never routed by Traefik).
export type Price = { amount: number | null; currency: 'SGD' | 'unknown'; type: 'displayed' | 'from'; maxAmount?: number };
export type MenuItem = { id: string; name: string; category?: string; price: Price; qualifier: string };
export type Menu = { id: string; name: string; branch: string; address: string; postalCode: string; aliases: string[];
  sections: { id: string; title?: string; sourceUrl: string; sourceLabel: string; checkedAt: string; items: MenuItem[] }[] };
export type Hours = { summary: string; schedule: string[]; notes: string; sourceUrl: string; checkedAt: string; timezone: 'Asia/Singapore' };
export type Photo = { path: string; width: number; height: number; author: string; sourceUrl: string; license: string; licenseUrl: string | null;
  capturedAt: string | null; checkedAt: string; changes: string; provider?: 'Google Maps' };
export type Place = { id: string; name: string; branch: string; address: string; postalCode: string; aliases: string[];
  point: { latitude: number; longitude: number } | null; venueDiet: 'Vegetarian' | 'Vegan'; alliumFreeClaim: boolean; photo?: Photo; hours?: Hours;
  itemCount: number; research?: { sourceUrls: string[] } };
export type Recipe = Record<string, unknown> & { id: string; name: string; revision: number; provenance?: Record<string, unknown> };
export type Event = Record<string, unknown> & { id: string; title: string; startsAt: string; status: string };
export type Packaged<T> = { source?: 'bundled' | 'bot'; hash: string; data: T };

const cache = new Map<string, { at: number; value: unknown }>();
const origin = () => process.env.CONTENT_BASE_URL || (process.env.NODE_ENV === 'production' ? 'http://app:3001' : 'http://localhost:3301');
/** One packaged-content read, cached for 15 seconds; null when the app has no packaged record. */
async function read<T>(query: string): Promise<T | null> {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < 15000) return hit.value as T;
  const response = await fetch(origin() + '/api/staff-base?' + query, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (response?.status === 404) return null;
  if (!response?.ok) throw new HttpError(503, 'Published content is unavailable. Check the app service and try again.');
  const value = await response.json() as T;
  cache.set(query, { at: Date.now(), value });
  while (cache.size > 60) cache.delete(cache.keys().next().value!);
  return value;
}
export const packagedPlaces = async () => (await read<{ items: Packaged<Place>[] }>('kind=places'))?.items ?? [];
export const packagedMenu = (id: string) => read<Packaged<Menu>>('kind=menu&id=' + encodeURIComponent(id));
export const packagedRecipes = async () => (await read<{ items: Packaged<Recipe>[] }>('kind=recipes'))?.items ?? [];
export const packagedEvents = async () => (await read<{ items: Packaged<Event>[] }>('kind=events'))?.items ?? [];
