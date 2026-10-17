export type PilotCluster = "outram-chinatown" | "rochor-bugis" | "woodlands";
export type PilotSourceKind = "merchant" | "merchant-menu" | "merchant-ordering" | "merchant-social" | "directory" | "delivery-platform" | "unverified";
export type PilotSource = {
  id: string; url: string; title: string; publisher: string; kind: PilotSourceKind;
  checkedAt: string; publishedAt: string | null; notes: string;
};
export type PilotClaim = {
  kind: "vegetarian" | "vegan" | "no-onion-garlic" | "no-alcohol";
  scope: "brand" | "branch"; sourceId: string; note: string;
  wholeVenue?: boolean;
};
export type PilotVenue = {
  id: string; name: string; branch: string; clusterId: PilotCluster; areaId: string;
  address: string; postalCode: string; googlePlaceId: string | null;
  sourceIds: string[]; claims: PilotClaim[]; gaps: string[];
  sourceCheck: "source-checked" | "needs-information";
};
export type PilotMenu = {
  id: string; venueId: string; sourceId: string;
  scope: "branch-dine-in" | "branch-ordering" | "branch-delivery" | "brand-menu";
  effectiveDate: string | null; notes: string;
  coverage?: "source-covered" | "partial" | "brand-only" | "historical";
  notice?: string;
  charges: { gst: "included" | "excluded" | "unknown"; servicePercent: number | null; gstPercent: number | null; sourceId: string | null };
};
export type PilotDish = {
  id: string; venueId: string; menuId: string; name: string;
  category?: string;
  qualifier?: string;
  price: { amount: number | null; currency: "SGD" | "unknown"; type: "displayed" | "from" };
  sourceIds: string[]; suitability: "unconfirmed"; ingredientsComplete: false; note: string;
};
export type PilotCandidate = {
  id: string; name: string; clusterId: PilotCluster; sourceIds: string[]; reason: string;
};
export type PilotCatalogue = {
  version: 1; mode: "local-research"; checkedAt: string;
  rights: { content: "facts-and-links-only"; artworkCopied: false; photosCopied: false; merchantConsent: "not-requested" };
  sources: PilotSource[]; venues: PilotVenue[]; menus: PilotMenu[]; dishes: PilotDish[]; candidates: PilotCandidate[];
};
export type PilotReviewStatus = "source-reviewed" | "needs-information" | "withdrawn";
export type PilotReviewEvent = { status: PilotReviewStatus; reason: string; at: number; fingerprint: string };
export type PilotReview = {
  venueId: string; fingerprint: string; status: PilotReviewStatus; reason: string;
  at: number; revision: number; reviewer: "Local reviewer"; history: PilotReviewEvent[];
};
export type PilotVenueState = {
  venueId: string; fingerprint: string; revision: number; review: PilotReview | null;
};
export type PilotCatalogueResponse = { catalogue: PilotCatalogue; states: PilotVenueState[]; generatedAt: number };
