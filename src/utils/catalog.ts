import type { Diet } from "../config/preferences";
import type { ExploreFilters, SavedKind } from "../types/food";
import { discoveryDiets } from "./discovery-filters";

/**
 * Counts the narrowing choices in Filters (diet, Allium-free, Saved only). Search around (Near Home/Work) is excluded:
 * Explore already shows it as the location pill, so counting it again misreads as a hidden filter.
 */
export function activeFilterCount(filters: ExploreFilters, preference: Diet) {
  return [filters.noAlliums, filters.savedOnly, discoveryDiets(filters, preference).length === 1].filter(Boolean).length;
}
export function itemPath(kind: SavedKind, id: string) {
  return kind === "recipe" ? "/cook/recipe/" + id : "/" + kind + "/" + id;
}
