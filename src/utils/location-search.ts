import { areas } from "../data/areas";
import type { LocationSearchResult, LocationSuggestion } from "../types/location-search";
import { inSingapore } from "./discovery-search";

export function locationQuery(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 100 || /[\u0000-\u001f\u007f]/.test(value)) return;
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < 2 || !/[\p{L}\p{N}]/u.test(query)) return;
  const postal = /^(?:singapore\s*|s\s*\(?\s*)?(\d{6})\)?$/i.exec(query);
  return postal ? postal[1] : query;
}
export function matchingAreas(query: string): LocationSuggestion[] {
  const words = query.toLowerCase().split(/\s+/);
  return areas.filter(area => words.every(word => (area.name + " " + area.mrt).toLowerCase().includes(word)))
    .sort((a, b) => Number(b.name.toLowerCase() === query.toLowerCase()) - Number(a.name.toLowerCase() === query.toLowerCase()))
    .slice(0, 3).map(area => ({ kind: "area", id: "area-" + area.id, areaId: area.id, name: area.name, address: area.mrt }));
}
export function isLocationSuggestion(value: unknown): value is LocationSuggestion {
  if (!value || typeof value !== "object") return false;
  const item = value as LocationSuggestion;
  if (typeof item.id !== "string" || !item.id || item.id.length > 300 || typeof item.name !== "string" || !item.name
    || item.name.length > 100 || typeof item.address !== "string" || item.address.length > 300) return false;
  return item.kind === "area" ? areas.some(area => area.id === item.areaId && area.name === item.name)
    : item.kind === "address" && inSingapore(item)
      && (item.postalCode === undefined || /^\d{6}$/.test(item.postalCode));
}
export function readLocationSearch(value: unknown): LocationSearchResult {
  const result = value as LocationSearchResult | null;
  if (!result || !Array.isArray(result.suggestions) || result.suggestions.length > 8
    || result.suggestions.some(item => !isLocationSuggestion(item))
    || (result.warning !== undefined && (typeof result.warning !== "string" || result.warning.length > 200))) {
    throw new Error("Location suggestions could not be read. Please retry.");
  }
  return result;
}
