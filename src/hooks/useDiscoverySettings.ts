import { useCallback, useMemo } from "react";
import { defaultFilters } from "../config/discovery";
import type { ExploreFilters, FoodDocument } from "../types/food";
import { followDefaultLocation } from "../utils/discovery-settings";

export type FilterChange = Partial<ExploreFilters> | ((current: ExploreFilters) => ExploreFilters);
type UpdateDocument = (change: (document: FoodDocument) => FoodDocument) => Promise<boolean>;

export function useDiscoverySettings(doc: FoodDocument, update: UpdateDocument) {
  const { labels, near, home, work, savedOnly } = doc.discoverySettings.filters;
  // The owned catalogue has no confirmed cuisine/price bands. Do not let legacy
  // selections invisibly exclude every place after those controls are removed.
  const filters = useMemo(() => ({ ...defaultFilters, labels, near, home, work, savedOnly,
    cuisine: "All", cuisines: [], priceLevel: null, priceLevels: [] }), [labels, near, home, work, savedOnly]);
  const setFilters = useCallback((change: FilterChange) => update(current => {
    const previous = current.discoverySettings.filters;
    const changed = typeof change === "function" ? change(previous) : { ...previous, ...change };
    const next: ExploreFilters = { ...changed, cuisine: "All", cuisines: [], priceLevel: null, priceLevels: [] };
    const locationChanged = ["near", "home", "work"].some(key => next[key as keyof ExploreFilters] !== previous[key as keyof ExploreFilters])
      || typeof change !== "function" && ["near", "home", "work"].some(key => key in change);
    return { ...current, discoverySettings: { ...current.discoverySettings, filters: next,
      locationModeChosen: current.discoverySettings.locationModeChosen === true || locationChanged } };
  }), [update]);
  const setRadius = useCallback((radius: number) => update(current => ({
    ...current, discoverySettings: { ...current.discoverySettings, radius },
  })), [update]);
  /** Forget the area choice so Explore follows the default location again. */
  const followDefault = useCallback(() => update(current => ({ ...current, discoverySettings: followDefaultLocation(current.discoverySettings) })), [update]);
  return { filters, setFilters, followDefault, radius: doc.discoverySettings.radius, setRadius };
}
