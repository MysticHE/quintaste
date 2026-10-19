import type { CatalogueVenue } from "../types/catalogue";

/** A place that is not a vegetarian kitchen; only its venue-labelled vegetarian/vegan dishes are published. */
export const isVegOptions = (venue: Pick<CatalogueVenue, "kitchen">) => venue.kitchen === "options";
/** The place label shown wherever a venue's diet appears: options places never read as Vegetarian or Vegan. */
export const venueKindLabel = (venue: Pick<CatalogueVenue, "kitchen" | "venueDiet">) => isVegOptions(venue) ? mixedKitchenLabel : venue.venueDiet;
export const mixedKitchenLabel = "Mixed Kitchen";
/** Shown wherever a Mixed Kitchen place lists its dishes. */
export const mixedKitchenSafety = "Also serves meat or seafood. Cooking tools may be shared.";
export const mixedKitchenSpoken = "Mixed Kitchen, not a vegetarian kitchen";
/** The icon on a place tile without a photo: a fork and knife for a Mixed Kitchen, a leaf for a vegetarian kitchen. */
export const placeTileIcon = (venue: Pick<CatalogueVenue, "kitchen">) => isVegOptions(venue) ? "restaurant-outline" as const : "leaf-outline" as const;
export const dishCount = (count: number) => count + (count === 1 ? " dish" : " dishes");
