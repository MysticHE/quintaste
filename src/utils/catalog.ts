import type { Diet } from "../config/preferences";
import type { ExploreFilters, SavedKind } from "../types/food";
import { discoveryDiets } from "./discovery-filters";

/** Counts only the choices Filters still offers; cuisine, price, confirmed and open-now are neutralized for the owned catalogue. */
export function activeFilterCount(filters: ExploreFilters, preference: Diet) {
  return [filters.noAlliums, filters.savedOnly, filters.home, filters.work, discoveryDiets(filters, preference).length === 1].filter(Boolean).length;
}
export function itemPath(kind: SavedKind, id: string) {
  return kind === "recipe" ? "/cook/recipe/" + id : "/" + kind + "/" + id;
}
