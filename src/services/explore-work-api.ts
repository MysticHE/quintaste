import { communityRequest } from "./community-api";

/** A place Explore does not list yet, as the member chose it (address from the OneMap list). */
export type PlaceSuggestionInput = { name: string; address: string; unit: string; postalCode: string; point: { latitude: number; longitude: number };
  kitchen: "veg" | "mixed"; dishes: string; sourceUrl: string; worksHere: boolean; coverConsent: boolean; photos: string[]; submissionKey: string };
export type ListedMatch = { id: string; name: string; branch: string; address: string };

/** The code an owner posts on the place's own page; the same code each time for this member and place. */
export const claimCode = (placeId: string, signal: AbortSignal) =>
  communityRequest<{ code: string; place: { id: string; name: string; branch: string } }>("/api/explore-work/claims/code?placeId=" + encodeURIComponent(placeId), { signal });
export const sendClaim = (body: { placeId: string; role: "owner" | "manager" | "staff"; pageUrl: string; submissionKey: string }) =>
  communityRequest<{ reference: string; id: string }>("/api/explore-work/claims", { method: "POST", body });
export const suggestPlace = (body: PlaceSuggestionInput) =>
  communityRequest<{ reference: string; id: string }>("/api/community/reports", { method: "POST", body: { kind: "new-place", ...body } });
/** Live places that are already this listing (same postal code and unit, or same name). */
export const listedMatches = (place: { name: string; unit: string; postalCode: string }, signal: AbortSignal) =>
  communityRequest<{ items: ListedMatch[] }>("/api/explore-work/places/match?" + new URLSearchParams(place).toString(), { signal });
