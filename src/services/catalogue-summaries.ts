import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CatalogueVenue } from "../types/catalogue";
import { readCatalogueVenue, catalogueFreshMs, catalogueOfflineMs } from "../utils/catalogue-page";
import { utf8Bytes } from "../state/food-capacity";
import { ownedApiRequest } from "./owned-api";

const key = "quintaste:catalogue-public-summaries:v1";
// `full` marks a place page response (with its sources); a search page saves the slimmer list summary.
type Saved = { venue: CatalogueVenue; savedAt: number; full?: boolean };
const summaries = new Map<string, Saved>();
let hydration: Promise<void> | undefined, writes = Promise.resolve();

/** Oldest entries go first once the cache passes 40 places or 80 KB. */
function trim() {
  while (summaries.size > 40 || utf8Bytes(JSON.stringify([...summaries.values()])) > 80_000) summaries.delete(summaries.keys().next().value!);
}
/** Saves the in-memory cache, after the stored one is loaded, so a first search never overwrites places saved earlier. */
function persist() {
  writes = writes.catch(() => {}).then(() => hydrate()).then(() => {
    const text = JSON.stringify([...summaries.values()]);
    return utf8Bytes(text) <= 80_000 ? AsyncStorage.setItem(key, text) : undefined;
  }).catch(() => {});
}
function hydrate() {
  if (!hydration) hydration = (async () => {
    try {
      const text = await AsyncStorage.getItem(key);
      if (!text || utf8Bytes(text) > 80_000) return;
      const rows: unknown = JSON.parse(text);
      if (!Array.isArray(rows) || rows.length > 40) return;
      const stored: [string, Saved][] = [];
      for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const value = r as { venue?: unknown; savedAt?: number; full?: unknown };
        if (typeof value.savedAt !== "number" || Date.now() - value.savedAt >= catalogueOfflineMs || value.savedAt > Date.now() + 30000) continue;
        const venue = readCatalogueVenue(value.venue);
        stored.push([venue.id, { venue, savedAt: value.savedAt, full: value.full === true }]);
      }
      // stored places are older than anything saved this session, so they go first and are trimmed first
      const current = [...summaries];
      summaries.clear();
      for (const [id, entry] of stored) if (!current.some(([seen]) => seen === id)) summaries.set(id, entry);
      for (const [id, entry] of current) summaries.set(id, entry);
      trim();
    } catch { /* A corrupt public cache is discarded; account data is separate. */ }
  })();
  return hydration;
}

/** Search pages save list summaries; a place page response is saved `full`. A list summary keeps a full copy's sources. */
export function rememberCatalogueVenues(venues: CatalogueVenue[], full = false) {
  for (const venue of venues) {
    const before = summaries.get(venue.id), research = venue.research ?? (before?.full ? before.venue.research : undefined);
    summaries.delete(venue.id);
    // the sources stay for display, but only a place page response counts as a fresh full copy
    summaries.set(venue.id, { venue: { ...venue, ...(research ? { research } : {}), distanceKm: undefined }, savedAt: Date.now(), full });
  }
  trim();
  persist();
}
function forget(id: string) {
  if (summaries.delete(id)) persist();
}
export const recalledCatalogueVenueName = (id: string) => summaries.get(id)?.venue.name;
export async function cachedCatalogueVenue(id: string) {
  return (await savedCatalogueVenue(id))?.venue ?? null;
}
async function savedCatalogueVenue(id: string) {
  await hydrate();
  const item = summaries.get(id);
  return item && Date.now() - item.savedAt < catalogueOfflineMs ? item : null;
}

/** Why a place could not be shown, as an Explore message key. */
export type CatalogueVenueError = "" | "connectToLoadPlace" | "detailsTryShortly" | "tryAgainShortly" | "placeNoLongerInExplore" | "placeDetailsTryShortly";
/** `gone`: the server says the place is no longer published (removed, closed or hidden). */
export type CatalogueVenueState = { venue: CatalogueVenue | null; busy: boolean; error: CatalogueVenueError; gone?: boolean };
type Request = { controller: AbortController; listeners: Set<(state: CatalogueVenueState) => void> };
const requests = new Map<string, Request>(), failures = new Map<string, number>();

// Public summaries contain no account data or private distances. Browse, Saved and deep links share the same bounded cache.
export function subscribeCatalogueVenue(id: string, offline: boolean, notify: (state: CatalogueVenueState) => void, force = false) {
  let disposed = false, attached: Request | undefined, listener: ((state: CatalogueVenueState) => void) | undefined;
  const deliver = (state: CatalogueVenueState) => { if (!disposed) notify(state); };
  deliver({ venue: null, busy: true, error: "" });
  void savedCatalogueVenue(id).then(saved => {
    if (disposed) return;
    // A saved copy shows at once. A full place copy within the 15-minute fresh window, or any copy offline, is enough;
    // otherwise it is refreshed while it shows, so a cover, hours or sources added since appear (20 Oct 2026: a new
    // cover stayed hidden for up to a day).
    if (saved) deliver({ venue: saved.venue, busy: false, error: "" });
    if (saved && (offline || saved.full && Date.now() - saved.savedAt < catalogueFreshMs)) return;
    if (offline || !force && Date.now() - (failures.get(id) ?? 0) < 60_000) {
      if (!saved) deliver({ venue: null, busy: false, error: offline ? "connectToLoadPlace" : "detailsTryShortly" });
      return;
    }
    let request = requests.get(id);
    if (!request) {
      if (requests.size >= 40) { if (!saved) deliver({ venue: null, busy: false, error: "tryAgainShortly" }); return; }
      request = { controller: new AbortController(), listeners: new Set() };
      requests.set(id, request);
      const current = request;
      void (async () => {
        const timeout = setTimeout(() => current.controller.abort(), 15000);
        let state: CatalogueVenueState;
        try {
          const response = await ownedApiRequest("/api/catalogue", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }), signal: current.controller.signal });
          if (response.status === 404) {
            forget(id); failures.delete(id);  // removed, closed or hidden: never show a saved copy of it again
            state = { venue: null, busy: false, error: "placeNoLongerInExplore", gone: true };
          } else {
            if (!response.ok) throw new Error("Unavailable");
            const text = await response.text();
            if (utf8Bytes(text) > 40_000) throw new Error("Oversized summary");
            const venue = readCatalogueVenue(JSON.parse(text));
            if (venue.id !== id || current.controller.signal.aborted) throw new Error("Invalid summary");
            rememberCatalogueVenues([venue], true); failures.delete(id);
            state = { venue, busy: false, error: "" };
          }
        } catch {
          if (current.listeners.size) {
            failures.delete(id); failures.set(id, Date.now());
            while (failures.size > 40) failures.delete(failures.keys().next().value!);
          }
          state = { venue: null, busy: false, error: "placeDetailsTryShortly" };
        } finally { clearTimeout(timeout); if (requests.get(id) === current) requests.delete(id); }
        for (const listener of current.listeners) listener(state);
      })();
    }
    // a failed refresh keeps the saved copy on screen; a place the server no longer publishes replaces it
    listener = saved ? state => deliver(state.venue || state.gone ? state : { venue: saved.venue, busy: false, error: "" }) : deliver;
    attached = request; request.listeners.add(listener);
  });
  return () => {
    disposed = true; if (listener) attached?.listeners.delete(listener);
    const current = attached;
    queueMicrotask(() => {
      if (current && !current.listeners.size && requests.get(id) === current) { requests.delete(id); current.controller.abort(); }
    });
  };
}
