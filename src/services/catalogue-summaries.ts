import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CatalogueVenue } from "../types/catalogue";
import { readCatalogueVenue, catalogueOfflineMs } from "../utils/catalogue-page";
import { utf8Bytes } from "../state/food-capacity";
import { ownedApiRequest } from "./owned-api";

const key = "quintaste:catalogue-public-summaries:v1";
const summaries = new Map<string, { venue: CatalogueVenue; savedAt: number }>();
let hydration: Promise<void> | undefined, writes = Promise.resolve();
export function rememberCatalogueVenues(venues: CatalogueVenue[]) {
  for (const venue of venues) { summaries.delete(venue.id); summaries.set(venue.id, { venue: { ...venue, distanceKm: undefined }, savedAt: Date.now() }); }
  while (summaries.size > 40 || utf8Bytes(JSON.stringify([...summaries.values()])) > 80_000) summaries.delete(summaries.keys().next().value!);
  const text = JSON.stringify([...summaries.values()]);
  if (utf8Bytes(text) <= 80_000) writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key, text)).catch(() => {});
}
export const recalledCatalogueVenueName = (id: string) => summaries.get(id)?.venue.name;
export async function cachedCatalogueVenue(id: string) {
  if (!hydration) hydration = (async () => {
    try {
      const text = await AsyncStorage.getItem(key);
      if (text && utf8Bytes(text) <= 80_000) {
        const rows: unknown = JSON.parse(text);
        if (Array.isArray(rows) && rows.length <= 40) for (const r of rows) {
          if (!r || typeof r !== "object") continue;
          const value = r as { venue?: unknown; savedAt?: number };
          if (typeof value.savedAt !== "number" || Date.now() - value.savedAt >= catalogueOfflineMs || value.savedAt > Date.now() + 30000) continue;
          const venue = readCatalogueVenue(value.venue);
          if (!summaries.has(venue.id) && summaries.size < 40) summaries.set(venue.id, { venue, savedAt: value.savedAt });
        }
      }
    } catch { /* A corrupt public cache is discarded; account data is separate. */ }
  })();
  await hydration;
  const item = summaries.get(id);
  return item && Date.now() - item.savedAt < catalogueOfflineMs ? item.venue : null;
}

export type CatalogueVenueState = { venue: CatalogueVenue | null; busy: boolean; error: string };
type Request = { controller: AbortController; listeners: Set<(state: CatalogueVenueState) => void> };
const requests = new Map<string, Request>(), failures = new Map<string, number>();

// Public summaries contain no account data or private distances. Browse, Saved and
// deep links share the same bounded cache; only an explicit place open needs a miss.
export function subscribeCatalogueVenue(id: string, offline: boolean, notify: (state: CatalogueVenueState) => void, force = false) {
  let disposed = false, attached: Request | undefined;
  const deliver = (state: CatalogueVenueState) => { if (!disposed) notify(state); };
  deliver({ venue: null, busy: true, error: "" });
  void cachedCatalogueVenue(id).then(saved => {
    if (disposed) return;
    if (saved) { deliver({ venue: saved, busy: false, error: "" }); return; }
    if (offline || !force && Date.now() - (failures.get(id) ?? 0) < 60_000) {
      deliver({ venue: null, busy: false, error: offline ? "Connect to load this place's details." : "Details are temporarily unavailable. Please try again shortly." }); return;
    }
    let request = requests.get(id);
    if (!request) {
      if (requests.size >= 40) { deliver({ venue: null, busy: false, error: "Please try again shortly." }); return; }
      request = { controller: new AbortController(), listeners: new Set() };
      requests.set(id, request);
      const current = request;
      void (async () => {
        const timeout = setTimeout(() => current.controller.abort(), 15000);
        let state: CatalogueVenueState;
        try {
          const response = await ownedApiRequest("/api/catalogue", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }), signal: current.controller.signal });
          if (!response.ok) throw new Error("Unavailable");
          const text = await response.text();
          if (utf8Bytes(text) > 40_000) throw new Error("Oversized summary");
          const venue = readCatalogueVenue(JSON.parse(text));
          if (venue.id !== id || current.controller.signal.aborted) throw new Error("Invalid summary");
          rememberCatalogueVenues([venue]); failures.delete(id);
          state = { venue, busy: false, error: "" };
        } catch {
          if (current.listeners.size) {
            failures.delete(id); failures.set(id, Date.now());
            while (failures.size > 40) failures.delete(failures.keys().next().value!);
          }
          state = { venue: null, busy: false, error: "This place's details are unavailable. Please try again shortly." };
        } finally { clearTimeout(timeout); if (requests.get(id) === current) requests.delete(id); }
        for (const listener of current.listeners) listener(state);
      })();
    }
    attached = request; request.listeners.add(deliver);
  });
  return () => {
    disposed = true; attached?.listeners.delete(deliver);
    const current = attached;
    queueMicrotask(() => {
      if (current && !current.listeners.size && requests.get(id) === current) { requests.delete(id); current.controller.abort(); }
    });
  };
}
