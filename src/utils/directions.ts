/** Google Maps directions to an address or "lat,lng", pinned to a Google place when its id is known. */
export const directionsUrl = (destination: string, placeId?: string | null) =>
  "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination) + (placeId ? "&destination_place_id=" + encodeURIComponent(placeId) : "");
