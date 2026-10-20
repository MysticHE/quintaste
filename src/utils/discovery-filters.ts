import type { ExploreFilters } from "../types/food";
import type { PlaceLabel } from "../types/discovery";
import type { DietLabel } from "../config/diet-labels";

export type LocationMode = "singapore" | "selected" | "home" | "work";
export function locationMode(filters: ExploreFilters): LocationMode {
  return filters.home ? "home" : filters.work ? "work" : filters.near ? "selected" : "singapore";
}
export function withLocationMode(filters: ExploreFilters, mode: LocationMode): ExploreFilters {
  return { ...filters, near: mode === "selected", home: mode === "home", work: mode === "work" };
}
export const placeLabelChoices = ["Vegan", "Vegetarian"] as const satisfies readonly PlaceLabel[];
/** Keeps the labels a place can prove, in display order; Plant-Based asks nothing of a place. */
export const placeLabelsOf = (labels: readonly unknown[]): PlaceLabel[] => placeLabelChoices.filter(label => labels.includes(label));
/** Labels every place must prove; empty means any. Until chosen in Filters, follows the Vegan/Vegetarian the person keeps. */
export function discoveryLabels(filters: ExploreFilters, preference: readonly DietLabel[]): PlaceLabel[] {
  return filters.labels ?? placeLabelsOf(preference);
}
export const selectedCuisines = (filters: ExploreFilters) => filters.cuisines ?? (filters.cuisine === "All" ? [] : [filters.cuisine]);
export const selectedPrices = (filters: ExploreFilters) => filters.priceLevels ?? (filters.priceLevel ? [filters.priceLevel] : []);
export const toggleFilter = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
