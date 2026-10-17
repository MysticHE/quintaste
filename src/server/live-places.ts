import { reserveGoogleRequest } from "./google-allowance";
import type { DiscoverySearch, LivePlace } from "../types/discovery";
import { distanceKm, searchKey } from "../utils/discovery-search";
import { liveSearchRequest } from "./live-search-request";
import { normalizePlace } from "./place-normalize";
import { developmentPhotoSnapshots } from "./google-photo";
import { object, placesKey } from "./google-provider";

const fields = ["id", "displayName", "formattedAddress", "addressComponents", "location", "currentOpeningHours", "businessStatus", "attributions", "photos", "rating", "userRatingCount", "priceLevel"];
export const LIVE_FIELDS = fields.map(field => "places." + field).join(",");
export function normalizeLivePlaces(value: unknown): LivePlace[] {
  if (!object(value) || (value.places !== undefined && (!Array.isArray(value.places) || value.places.length > 20))) throw new Error("Invalid search response.");
  return (value.places as unknown[] ?? []).map(item => normalizePlace(item)).filter((place): place is LivePlace => !!place);
}
async function requestLivePlaces(search: DiscoverySearch) {
  const center = search.center ?? search.origin;
  const { nearby, body } = liveSearchRequest(search);
  const key = placesKey();
  await reserveGoogleRequest(nearby ? "nearbySearchEnterprise" : "textSearchEnterprise");
  const response = await fetch("https://places.googleapis.com/v1/places:" + (nearby ? "searchNearby" : "searchText"), {
    method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": LIVE_FIELDS + (nearby ? "" : ",nextPageToken") },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Places search failed.");
  const value: unknown = await response.json();
  if (!object(value) || (value.nextPageToken !== undefined && typeof value.nextPageToken !== "string")) throw new Error("Invalid search response.");
  let places = normalizeLivePlaces(value);
  if (center && !search.bounds) places = places.filter(place => distanceKm(center, place) <= search.radius / 1000).sort((a, b) => distanceKm(center, a) - distanceKm(center, b));
  if (search.priceLevel) places = places.filter(place => place.priceLevel === search.priceLevel);
  return { places: await developmentPhotoSnapshots(places), capped: nearby ? (Array.isArray(value.places) && value.places.length === 20) : !!value.nextPageToken };
}
const inFlight = new Map<string, Promise<{ places: LivePlace[]; capped: boolean }>>();
export function fetchLivePlaces(search: DiscoverySearch) {
  const key = searchKey(search), pending = inFlight.get(key);
  if (pending) return pending;
  const result = requestLivePlaces(search).finally(() => { inFlight.delete(key); });
  inFlight.set(key, result); return result;
}
