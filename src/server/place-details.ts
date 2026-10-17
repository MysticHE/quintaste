import type { LivePlace } from "../types/discovery";
import { reserveGoogleRequest } from "./google-allowance";
import { placeIdValid, placesKey } from "./google-provider";
import { normalizePlace } from "./place-normalize";
import { developmentPhotoSnapshots } from "./google-photo";

const fields = "id,displayName,formattedAddress,addressComponents,location,businessStatus,currentOpeningHours,regularOpeningHours,photos,rating,userRatingCount,reviews,nationalPhoneNumber,websiteUri,attributions,priceLevel";
const pending = new Map<string, Promise<LivePlace | null>>();
async function requestDetails(id: string) {
  if (!placeIdValid(id)) throw new Error("Invalid place ID.");
  await reserveGoogleRequest("placeDetailsAtmosphere");
  const response = await fetch("https://places.googleapis.com/v1/places/" + id + "?languageCode=en&regionCode=SG", {
    headers: { "X-Goog-Api-Key": placesKey(), "X-Goog-FieldMask": fields }, signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Place details unavailable.");
  const place = normalizePlace(await response.json());
  return place ? (await developmentPhotoSnapshots([place]))[0] : null;
}
export function fetchPlaceDetails(id: string) {
  const current = pending.get(id); if (current) return current;
  const request = requestDetails(id).finally(() => pending.delete(id)); pending.set(id, request); return request;
}
