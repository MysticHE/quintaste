import { isDiscoveryCuisine, isPriceLevel } from "../config/discovery-options";
import type { SearchPoint } from "../types/location-search";
import type { DiscoverySearch, PlaceLabel, SearchOrigin } from "../types/discovery";
import { inSingapore, validSearchArea } from "../utils/discovery-search";
import { placeLabelsOf } from "../utils/discovery-filters";
import { object } from "./google-provider";
import { validatedSearch } from "./places-search";

export function discoveryInput(value: unknown): DiscoverySearch | undefined {
  if (!object(value) || !validSearchArea(value.area) || typeof value.query !== "string" || value.query.length > 100
    || /[\u0000-\u001f]/.test(value.query) || typeof value.vegan !== "boolean"
    || (value.alliumFree !== undefined && typeof value.alliumFree !== "boolean")
    || (value.includeOptions !== undefined && typeof value.includeOptions !== "boolean")
    || (value.kitchen !== undefined && value.kitchen !== "mixed") || !validatedSearch(value)) return;
  if (value.cuisine !== undefined && !isDiscoveryCuisine(value.cuisine)
    || value.priceLevel !== undefined && value.priceLevel !== null && !isPriceLevel(value.priceLevel)) return;
  const cuisine = isDiscoveryCuisine(value.cuisine) ? value.cuisine : "All";
  const priceLevel = isPriceLevel(value.priceLevel) ? value.priceLevel : undefined;
  if (!validLabels(value.labels) || !validLabels(value.diets)) return;
  if (value.cuisines !== undefined && (!Array.isArray(value.cuisines) || value.cuisines.length > 10 || value.cuisines.some(v => !isDiscoveryCuisine(v) || v === "All"))) return;
  if (value.priceLevels !== undefined && (!Array.isArray(value.priceLevels) || value.priceLevels.length > 4 || value.priceLevels.some(v => !isPriceLevel(v)))) return;
  const labels = searchLabels(value);
  const cuisines = value.cuisines === undefined ? undefined : [...new Set(value.cuisines as string[])].sort();
  const priceLevels = value.priceLevels === undefined ? undefined : [...new Set(value.priceLevels as (1 | 2 | 3 | 4)[])].sort();
  let origin: SearchOrigin | undefined;
  if (value.origin !== undefined) {
    const point = value.origin;
    if (!object(point) || typeof point.latitude !== "number" || typeof point.longitude !== "number"
      || !inSingapore({ latitude: point.latitude, longitude: point.longitude }) || typeof point.capturedAt !== "number"
      || !Number.isFinite(point.capturedAt) || Date.now() - point.capturedAt > 30 * 60 * 1000 || point.capturedAt > Date.now() + 60000) return;
    origin = { latitude: point.latitude, longitude: point.longitude, capturedAt: point.capturedAt,
      accuracy: typeof point.accuracy === "number" && Number.isFinite(point.accuracy) && point.accuracy >= 0 ? point.accuracy : null };
  }
  let center: SearchPoint | undefined;
  if (value.center !== undefined) {
    if (origin || !object(value.center) || typeof value.center.latitude !== "number" || typeof value.center.longitude !== "number"
      || !inSingapore({ latitude: value.center.latitude, longitude: value.center.longitude })) return;
    center = { latitude: value.center.latitude, longitude: value.center.longitude };
  }
  const radius = value.radius === undefined ? 5000 : value.radius;
  if (typeof radius !== "number" || ![1000, 3000, 5000, 10000].includes(radius)) return;
  return { area: value.area.trim(), query: value.query.trim(), vegan: labels.includes("Vegan"), labels, alliumFree: labels.includes("Vegetarian"), cuisine, cuisines, priceLevel, priceLevels, origin, center, radius, bounds: validatedSearch(value)?.bounds,
    ...(value.includeOptions === true ? { includeOptions: true } : {}), ...(value.kitchen === "mixed" ? { kitchen: "mixed" as const } : {}) };
}
const validLabels = (value: unknown) => value === undefined
  || Array.isArray(value) && value.length <= 2 && value.every(label => label === "Vegan" || label === "Vegetarian");
/**
 * The labels every place must prove. Clients from before 20 Oct 2026 (remove after one release) send no labels: their
 * Vegan choice (`diets` exactly Vegan, else `vegan`) is Vegan, and their No five pungent switch (`alliumFree`) is Vegetarian.
 */
function searchLabels(value: Record<string, unknown>): PlaceLabel[] {
  if (Array.isArray(value.labels)) return placeLabelsOf(value.labels);
  const diets = Array.isArray(value.diets) ? placeLabelsOf(value.diets) : null;
  const vegan = diets ? diets.length === 1 && diets[0] === "Vegan" : value.vegan === true;
  return placeLabelsOf([...(vegan ? ["Vegan"] : []), ...(value.alliumFree === true ? ["Vegetarian"] : [])]);
}
