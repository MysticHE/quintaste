import type { SearchPoint } from "../types/location-search";
import type { DiscoverySearch, SearchOrigin } from "../types/discovery";

export function validSearchArea(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 80
    && /^[\p{L}\p{N}\p{M} .,'()/-]+$/u.test(value);
}
export function inSingapore(point: { latitude: number; longitude: number }) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && point.latitude >= 1.16 && point.latitude <= 1.48 && point.longitude >= 103.59 && point.longitude <= 104.12;
}
export function distanceKm(origin: SearchPoint, point: { latitude: number; longitude: number }) {
  const radians = Math.PI / 180, lat = (point.latitude - origin.latitude) * radians;
  const lng = (point.longitude - origin.longitude) * radians;
  const value = Math.sin(lat / 2) ** 2 + Math.cos(origin.latitude * radians) * Math.cos(point.latitude * radians) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}
export function searchKey(search: DiscoverySearch) { return JSON.stringify(search); }
export function sameSearchContext(a: DiscoverySearch, b: DiscoverySearch) {
  return a.area === b.area && a.query === b.query && a.vegan === b.vegan && !!a.alliumFree === !!b.alliumFree && a.radius === b.radius
    && !!a.includeOptions === !!b.includeOptions && (a.kitchen ?? null) === (b.kitchen ?? null)
    && (a.cuisine ?? "All") === (b.cuisine ?? "All") && (a.priceLevel ?? null) === (b.priceLevel ?? null)
    && JSON.stringify(a.labels ?? null) === JSON.stringify(b.labels ?? null)
    && JSON.stringify(a.cuisines ?? null) === JSON.stringify(b.cuisines ?? null)
    && JSON.stringify(a.priceLevels ?? null) === JSON.stringify(b.priceLevels ?? null)
    && a.origin?.latitude === b.origin?.latitude && a.origin?.longitude === b.origin?.longitude
    && a.center?.latitude === b.center?.latitude && a.center?.longitude === b.center?.longitude
    && JSON.stringify(a.savedIds ?? null) === JSON.stringify(b.savedIds ?? null);
}
export function originIsFresh(origin: SearchOrigin | null, now: number) {
  return !!origin && now >= origin.capturedAt && now - origin.capturedAt < 30 * 60 * 1000;
}
