import { isDiscoveryCuisine, isPriceLevel } from "../config/discovery-options";
import { defaultFilters, discoveryRadii } from "../config/discovery";
import type { DiscoverySettings } from "../types/food";

export function readDiscoverySettings(value: unknown): DiscoverySettings {
  const settings = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const filters = settings.filters && typeof settings.filters === "object"
    ? settings.filters as Record<string, unknown> : {};
  const home = filters.home === true, work = !home && filters.work === true;
  return {
    locationModeChosen: settings.locationModeChosen === true || home || work || filters.near === true,
    filters: { ...defaultFilters, home, work, near: !home && !work && filters.near === true,
      noAlliums: filters.noAlliums === true, savedOnly: filters.savedOnly === true,
      cuisine: isDiscoveryCuisine(filters.cuisine) ? filters.cuisine : "All",
      priceLevel: isPriceLevel(filters.priceLevel) ? filters.priceLevel : null,
      diet: filters.diet === "Vegan" || filters.diet === "Vegetarian" ? filters.diet : null,
      diets: Array.isArray(filters.diets) ? (["Vegetarian", "Vegan"] as const).filter(diet => (filters.diets as unknown[]).includes(diet)) : null,
      cuisines: Array.isArray(filters.cuisines) ? [...new Set(filters.cuisines.filter(isDiscoveryCuisine).filter(value => value !== "All"))] : null,
      priceLevels: Array.isArray(filters.priceLevels) ? [...new Set(filters.priceLevels.filter(isPriceLevel))].sort() : null },
    radius: typeof settings.radius === "number" && discoveryRadii.some(radius => radius === settings.radius) ? settings.radius : 5000,
  };
}
/** Setting or changing the default location makes Explore follow it again instead of an older area choice. */
export function followDefaultLocation(settings: DiscoverySettings): DiscoverySettings {
  return { ...settings, locationModeChosen: false, filters: { ...settings.filters, near: false, home: false, work: false } };
}
