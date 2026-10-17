import type { SearchBounds } from "../types/discovery";

export const singaporeBounds: SearchBounds = {
  low: { latitude: 1.16, longitude: 103.59 }, high: { latitude: 1.48, longitude: 104.12 },
};
export function googlePlaceUrl(placeId: string, name: string) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) throw new Error("This listing cannot be opened.");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name) + "&query_place_id=" + encodeURIComponent(placeId);
}
