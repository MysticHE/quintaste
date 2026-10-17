import { discoveryPrices } from "../config/discovery-options";
import type { DiscoverySearch } from "../types/discovery";
import { singaporeBounds } from "../utils/place-directory";

export function liveSearchRequest(search: DiscoverySearch) {
  const center = search.center ?? search.origin;
  const origin = center ? { latitude: center.latitude, longitude: center.longitude } : undefined;
  const cuisine = search.cuisine && search.cuisine !== "All" ? search.cuisine + " " : "";
  const price = discoveryPrices.find(item => item.value === search.priceLevel);
  const nearby = !cuisine && !price && !!center && !search.query.trim() && !search.bounds && !search.alliumFree;
  const diet = search.vegan ? "vegan" : "vegetarian";
  const words = (search.alliumFree ? "no onion no garlic " : "") + diet + " " + cuisine + (search.query.trim() || "restaurants");
  const area = search.bounds ? "Singapore" : search.area;
  const body = nearby ? {
    includedTypes: search.vegan ? ["vegan_restaurant"] : ["vegetarian_restaurant", "vegan_restaurant"],
    maxResultCount: 20, rankPreference: "DISTANCE", languageCode: "en", regionCode: "SG",
    locationRestriction: { circle: { center: origin, radius: search.radius } },
  } : {
    textQuery: origin && !search.bounds ? words : words + " in " + area + (area === "Singapore" ? "" : ", Singapore"),
    pageSize: 20, languageCode: "en", regionCode: "SG",
    ...(price ? { priceLevels: [price.google] } : {}),
    includedType: search.vegan ? "vegan_restaurant" : "vegetarian_restaurant", strictTypeFiltering: true,
    ...(origin && !search.bounds ? { locationBias: { circle: { center: origin, radius: search.radius } }, rankPreference: "DISTANCE" }
      : { locationRestriction: { rectangle: search.bounds ?? singaporeBounds } }),
  };
  return { nearby, body };
}
