import type { LivePlace } from "../types/discovery";
const cache = new Map<string, LivePlace>();
export function rememberPlaces(places: LivePlace[]) {
  for (const place of places) {
    cache.delete(place.placeId); cache.set(place.placeId, place);
    setTimeout(() => { if (cache.get(place.placeId)?.fetchedAt === place.fetchedAt) cache.delete(place.placeId); }, 5 * 60 * 1000);
  }
  while (cache.size > 60) cache.delete(cache.keys().next().value!);
}
export function recalledPlace(id: string, now: number) {
  const place = cache.get(id);
  if (place && now >= place.fetchedAt && now - place.fetchedAt < 5 * 60 * 1000) return place;
}
export const savedGoogleId = (id: string) => /^google-[A-Za-z0-9_-]{10,200}$/.test(id) ? id.slice(7) : null;

export function liveOpening(place: LivePlace, now: number) {
  if (now < place.fetchedAt || now - place.fetchedAt >= 5 * 60 * 1000) return "unknown";
  const boundary = place.opening === "open" ? place.nextClose : place.opening === "closed" ? place.nextOpen : undefined;
  return boundary && now >= Date.parse(boundary) ? "unknown" : place.opening;
}

