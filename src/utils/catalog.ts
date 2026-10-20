import type { DietLabel } from "../config/diet-labels";
import type { ExploreFilters, SavedKind } from "../types/food";
import { discoveryLabels } from "./discovery-filters";

/**
 * Counts the narrowing choices in Filters (each diet label, Saved only). Search around (Near Home/Work) is excluded:
 * Explore already shows it as the location pill, so counting it again misreads as a hidden filter.
 */
export function activeFilterCount(filters: ExploreFilters, preference: readonly DietLabel[]) {
  return discoveryLabels(filters, preference).length + Number(filters.savedOnly);
}
export function itemPath(kind: SavedKind, id: string) {
  return kind === "recipe" ? "/cook/recipe/" + id : "/" + kind + "/" + id;
}
