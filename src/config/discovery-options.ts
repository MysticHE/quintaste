import type { PriceLevel } from "../types/discovery";

export const discoveryCuisines = ["All", "Chinese", "Indian", "Malay", "Japanese", "Korean", "Thai", "Western", "Peranakan", "Middle Eastern"] as const;
export const discoveryPrices = [
  { value: 1, label: "Budget", google: "PRICE_LEVEL_INEXPENSIVE" },
  { value: 2, label: "Moderate", google: "PRICE_LEVEL_MODERATE" },
  { value: 3, label: "Premium", google: "PRICE_LEVEL_EXPENSIVE" },
  { value: 4, label: "Luxury", google: "PRICE_LEVEL_VERY_EXPENSIVE" },
] as const;
export function isDiscoveryCuisine(value: unknown): value is string {
  return typeof value === "string" && discoveryCuisines.some(cuisine => cuisine === value);
}
export function isPriceLevel(value: unknown): value is PriceLevel {
  return typeof value === "number" && discoveryPrices.some(price => price.value === value);
}
