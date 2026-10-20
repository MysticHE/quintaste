import type { ExploreFilters } from "../types/food";

export const defaultFilters: ExploreFilters = {
  confirmed: false, savedOnly: false, openNow: false,
  near: false, home: false, work: false, labels: null, cuisine: "All", maxPrice: null, priceLevel: null,
  cuisines: null, priceLevels: null,
};
export const discoveryRadii = [1000, 3000, 5000, 10000] as const;
