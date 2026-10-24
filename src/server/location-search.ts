import type { LocationSearchResult, LocationSuggestion } from "../types/location-search";
import { inSingapore } from "../utils/discovery-search";
import { matchingAreas } from "../utils/location-search";
import { object } from "./google-provider";

type SearchState = { started: number; requests: number;
  recent: Map<string, { expiresAt: number; result: LocationSearchResult }>;
  inFlight: Map<string, Promise<LocationSearchResult>> };
const runtime = globalThis as typeof globalThis & { quintasteLocationSearch?: SearchState };
const state = runtime.quintasteLocationSearch ??= { started: 0, requests: 0, recent: new Map(), inFlight: new Map() };
export function allowLocationSearch() {
  if (Date.now() - state.started >= 60000) { state.started = Date.now(); state.requests = 0; }
  return state.requests++ < 90;
}
function label(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}
function readable(value: string) {
  return value.toLowerCase().replace(/\b\p{L}/gu, char => char.toUpperCase())
    .replace(/\b(mrt|hdb|cc|nsc|nus|ntu)\b/gi, word => word.toUpperCase());
}
export function normalizeLocations(value: unknown, query: string): LocationSuggestion[] {
  if (!object(value) || !Array.isArray(value.results) || value.results.length > 100) throw new Error("Invalid address response.");
  const seen = new Set<string>();
  return value.results.flatMap((item): LocationSuggestion[] => {
    if (!object(item) || typeof item.LATITUDE !== "string" || typeof item.LONGITUDE !== "string") return [];
    const point = { latitude: Number(item.LATITUDE), longitude: Number(item.LONGITUDE) };
    const postal = label(item.POSTAL, 6), building = label(item.BUILDING, 100);
    if (!inSingapore(point) || (/^\d{6}$/.test(query) && postal !== query)) return [];
    const address = readable(label(item.ADDRESS, 300));
    const name = readable(building && !["NIL", "NA"].includes(building.toUpperCase()) ? building
      : label(item.SEARCHVAL, 100) || address.slice(0, 100));
    if (!name || !address) return [];
    const id = "onemap-" + point.latitude + "-" + point.longitude;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ kind: "address", id, name, address, ...point, ...(/^\d{6}$/.test(postal) ? { postalCode: postal } : {}) }];
  }).slice(0, 8);
}
async function requestLocations(query: string): Promise<LocationSearchResult> {
  const local = matchingAreas(query);
  // Twin: server/editorial/event-points.mjs places events with the same OneMap search; keep the two aligned.
  const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  url.search = new URLSearchParams({ searchVal: query, returnGeom: "Y", getAddrDetails: "Y", pageNum: "1" }).toString();
  try {
    const signal = AbortSignal.timeout(8000);
    let response = await fetch(url, { signal });
    if (response.status === 429) {
      await response.body?.cancel();
      await new Promise(resolve => setTimeout(resolve, 600));
      response = await fetch(url, { signal });
    }
    if (!response.ok) throw new Error("Address search unavailable (" + response.status + ").");
    const remote = normalizeLocations(await response.json(), query);
    return { suggestions: [...local, ...remote].slice(0, 8) };
  } catch (error) {
    if (!local.length) throw error;
    return { suggestions: local, warning: "Address suggestions are unavailable. You can choose a matching area or retry." };
  }
}

const { recent, inFlight } = state;
export function searchLocations(query: string): Promise<LocationSearchResult> {
  const cached = recent.get(query);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.result);
  recent.delete(query);
  const pending = inFlight.get(query);
  if (pending) return pending;
  const request = requestLocations(query).then(result => {
    if (!result.warning) {
      if (recent.size >= 64) recent.delete(recent.keys().next().value!);
      recent.set(query, { expiresAt: Date.now() + 300000, result });
    }
    return result;
  }).finally(() => { inFlight.delete(query); });
  inFlight.set(query, request);
  return request;
}
