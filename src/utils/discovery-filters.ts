import type { ExploreFilters } from "../types/food";
import type { Diet } from "../config/preferences";

export type LocationMode = "singapore" | "selected" | "home" | "work";
export function locationMode(filters: ExploreFilters): LocationMode {
  return filters.home ? "home" : filters.work ? "work" : filters.near ? "selected" : "singapore";
}
export function withLocationMode(filters: ExploreFilters, mode: LocationMode): ExploreFilters {
  return { ...filters, near: mode === "selected", home: mode === "home", work: mode === "work" };
}
export function discoveryDiet(filters: ExploreFilters, preference: Diet) {
  if (filters.diets) return filters.diets.length === 1 && filters.diets[0] === "Vegan" ? "Vegan" : "Vegetarian";
  return filters.diet ?? (preference === "Vegan" ? "Vegan" : "Vegetarian");
}
/** Selected venue diets; empty means any diet, which is also the default unless the saved preference is Vegan. */
export function discoveryDiets(filters: ExploreFilters, preference: Diet): ("Vegetarian" | "Vegan")[] {
  return filters.diets ?? (discoveryDiet(filters, preference) === "Vegan" ? ["Vegan"] : []);
}
export const selectedCuisines = (filters: ExploreFilters) => filters.cuisines ?? (filters.cuisine === "All" ? [] : [filters.cuisine]);
export const selectedPrices = (filters: ExploreFilters) => filters.priceLevels ?? (filters.priceLevel ? [filters.priceLevel] : []);
export const toggleFilter = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
