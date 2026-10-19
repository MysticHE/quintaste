import type { CatalogueVenue } from "../types/catalogue";

/** A place that is not a vegetarian kitchen; only its venue-labelled vegetarian/vegan dishes are published. */
export const isVegOptions = (venue: Pick<CatalogueVenue, "kitchen">) => venue.kitchen === "options";
/** The place label shown wherever a venue's diet appears: options places never read as Vegetarian or Vegan. */
export const venueKindLabel = (venue: Pick<CatalogueVenue, "kitchen" | "venueDiet">) => isVegOptions(venue) ? mixedKitchenLabel : venue.venueDiet;
export const mixedKitchenLabel = "Mixed Kitchen";
export const mixedKitchenSpoken = "Mixed Kitchen, not a vegetarian kitchen";
export const dishCount = (count: number) => count + (count === 1 ? " dish" : " dishes");
