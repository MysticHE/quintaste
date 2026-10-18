/** Google Maps search link for a place, preferring its exact Google listing when known. */
export function placeMapUrl(venue: { name: string; address: string; googlePlaceId?: string | null }) {
  const place = venue.googlePlaceId ? "&query_place_id=" + encodeURIComponent(venue.googlePlaceId) : "";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(venue.name + ", " + venue.address) + place;
}
/** Plain text for sharing a place: name, address and a map link. */
export const placeShareMessage = (venue: { name: string; address: string; googlePlaceId?: string | null }) => [venue.name, venue.address, placeMapUrl(venue)].join("\n");
