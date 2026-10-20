import type { CatalogueVenue } from "../types/catalogue";
import type { PlaceLabel } from "../types/discovery";

/** A place that is not a vegetarian kitchen; only its venue-labelled vegetarian/vegan dishes are published. */
export const isVegOptions = (venue: Pick<CatalogueVenue, "kitchen">) => venue.kitchen === "options";
/** How a place's menu reads: decided by the venue's kitchen, never by dish labels (staff can tag a dish of a fully vegetarian place).
 * "unknown" while the venue is unavailable, when nothing about the kitchen may be claimed. */
export const menuKind = (venue: Pick<CatalogueVenue, "kitchen"> | null | undefined) => !venue ? "unknown" as const : isVegOptions(venue) ? "mixed" as const : "vegetarian" as const;
/**
 * The diet labels a place proves (owner, 20 Oct 2026: only proven labels). Vegan when the venue declares vegan;
 * Vegetarian (no five pungent) when the venue states it. Never Plant-Based, as a place never proves both are false.
 * A Mixed Kitchen never shows a diet label: it is not a vegetarian kitchen.
 */
export const placeLabels = (venue: Pick<CatalogueVenue, "kitchen" | "venueDiet" | "alliumFreeClaim">): PlaceLabel[] => isVegOptions(venue) ? []
  : [...(venue.venueDiet === "Vegan" ? ["Vegan" as const] : []), ...(venue.alliumFreeClaim ? ["Vegetarian" as const] : [])];
export const mixedKitchenLabel = "Mixed Kitchen";
/** Shown wherever a Mixed Kitchen place lists its dishes. */
export const mixedKitchenSafety = "Also serves meat or seafood. Cooking tools may be shared.";
export const mixedKitchenSpoken = "Mixed Kitchen, not a vegetarian kitchen";
/** The icon on a place tile without a photo: a fork and knife for a Mixed Kitchen, a leaf for a vegetarian kitchen. */
export const placeTileIcon = (venue: Pick<CatalogueVenue, "kitchen">) => isVegOptions(venue) ? "restaurant-outline" as const : "leaf-outline" as const;
export const dishCount = (count: number) => count + (count === 1 ? " dish" : " dishes");
