import { readFile } from "node:fs/promises";

export const ID_FIELDS = "places.id,nextPageToken";
export type SearchPage = { places?: { id: string }[]; nextPageToken?: string };
export async function placesKey(root: string) {
  const raw = await readFile(root + "/.env.local", "utf8");
  const key = raw.match(/^GOOGLE_PLACES_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!key || !/^AIza[A-Za-z0-9_-]{30,60}$/.test(key)) throw new Error("Missing valid private Places configuration.");
  return key;
}
export async function searchIds(key: string, query: string, pageToken?: string, bounds?: import("../src/types/discovery").SearchBounds): Promise<SearchPage> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": ID_FIELDS },
    body: JSON.stringify({ textQuery: query, languageCode: "en", regionCode: "SG", pageSize: 20,
      locationRestriction: { rectangle: bounds ?? { low: { latitude: 1.16, longitude: 103.59 }, high: { latitude: 1.48, longitude: 104.12 } } },
      ...(pageToken ? { pageToken } : {}) }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Places lookup returned HTTP " + response.status + ". Collection stopped.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Places returned an invalid ID page.");
  const page = body as { places?: unknown; nextPageToken?: unknown };
  if (page.places !== undefined && (!Array.isArray(page.places) || page.places.length > 20 || page.places.some(place =>
    !place || typeof place !== "object" || typeof place.id !== "string" || !/^[A-Za-z0-9_-]{10,200}$/.test(place.id)))) {
    throw new Error("Places returned an invalid ID page.");
  }
  if (page.nextPageToken !== undefined && (typeof page.nextPageToken !== "string" || !page.nextPageToken.length || page.nextPageToken.length > 4096)) {
    throw new Error("Invalid pagination response.");
  }
  return { ...(Array.isArray(page.places) ? { places: page.places.map(place => ({ id: place.id as string })) } : {}),
    ...(typeof page.nextPageToken === "string" ? { nextPageToken: page.nextPageToken } : {}) };
}
