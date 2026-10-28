import { isDiscoveryCuisine, isPriceLevel } from "../config/discovery-options";
import { defaultFilters, discoveryRadii } from "../config/discovery";
import type { DiscoverySettings } from "../types/food";
import type { PlaceLabel } from "../types/discovery";
import { placeLabelsOf } from "./discovery-filters";

export function readDiscoverySettings(value: unknown): DiscoverySettings {
  const settings = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const filters = settings.filters && typeof settings.filters === "object"
    ? settings.filters as Record<string, unknown> : {};
  const home = filters.home === true, work = !home && filters.work === true;
  return {
    locationModeChosen: settings.locationModeChosen === true || home || work || filters.near === true,
    filters: { ...defaultFilters, home, work, near: !home && !work && filters.near === true,
      labels: readPlaceLabels(filters), savedOnly: filters.savedOnly === true, openNow: filters.openNow === true,
      sort: filters.sort === "rated" || filters.sort === "liked" || filters.sort === "updated" ? filters.sort : null,
      cuisine: isDiscoveryCuisine(filters.cuisine) ? filters.cuisine : "All",
      priceLevel: isPriceLevel(filters.priceLevel) ? filters.priceLevel : null,
      cuisines: Array.isArray(filters.cuisines) ? [...new Set(filters.cuisines.filter(isDiscoveryCuisine).filter(value => value !== "All"))] : null,
      priceLevels: Array.isArray(filters.priceLevels) ? [...new Set(filters.priceLevels.filter(isPriceLevel))].sort() : null },
    radius: typeof settings.radius === "number" && discoveryRadii.some(radius => radius === settings.radius) ? settings.radius : 5000,
  };
}
/** Setting or changing the default location makes Explore follow it again instead of an older area choice. */
export function followDefaultLocation(settings: DiscoverySettings): DiscoverySettings {
  return { ...settings, locationModeChosen: false, filters: { ...settings.filters, near: false, home: false, work: false } };
}
/**
 * Saved diet labels. Before 20 Oct 2026 "Vegetarian" meant lacto-ovo (every place in the app) and the separate
 * No five pungent switch is today's Vegetarian, so old choices map to Vegan (if chosen alone) plus Vegetarian (if the switch was on).
 */
function readPlaceLabels(filters: Record<string, unknown>): PlaceLabel[] | null {
  if (Array.isArray(filters.labels)) return placeLabelsOf(filters.labels);
  const diets = Array.isArray(filters.diets) ? placeLabelsOf(filters.diets) : null;
  const vegan = diets ? diets.length === 1 && diets[0] === "Vegan" : filters.diet === "Vegan";
  const chosen = diets !== null || filters.diet === "Vegan" || filters.diet === "Vegetarian" || filters.noAlliums === true;
  if (!chosen) return null;
  return placeLabelsOf([...(vegan ? ["Vegan"] : []), ...(filters.noAlliums === true ? ["Vegetarian"] : [])]);
}
