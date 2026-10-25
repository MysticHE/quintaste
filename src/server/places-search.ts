import type { SearchBounds } from "../types/discovery";
import { validSearchArea } from "../utils/discovery-search";

const point = (value: unknown): value is { latitude: number; longitude: number } => !!value && typeof value === "object"
  && typeof (value as SearchBounds["low"]).latitude === "number" && typeof (value as SearchBounds["low"]).longitude === "number";
export function validatedSearch(value: unknown) {
  if (!value || typeof value !== "object") return;
  const input = value as { area?: unknown; query?: unknown; bounds?: unknown };
  if (!validSearchArea(input.area) || typeof input.query !== "string"
    || input.query.length > 100 || /[\u0000-\u001f]/.test(input.query)) return;
  let bounds: SearchBounds | undefined;
  if (input.bounds !== undefined) {
    const candidate = input.bounds as SearchBounds;
    if (!candidate || !point(candidate.low) || !point(candidate.high)) return;
    const { low, high } = candidate;
    if (![low.latitude, low.longitude, high.latitude, high.longitude].every(Number.isFinite)
      || low.latitude < 1.16 || high.latitude > 1.48 || low.longitude < 103.59 || high.longitude > 104.12
      || low.latitude >= high.latitude || low.longitude >= high.longitude) return;
    bounds = candidate;
  }
  const words = input.query.trim() ? "vegetarian " + input.query.trim() : "vegetarian restaurants";
  return { query: words + " in " + input.area + (input.area === "Singapore" ? "" : ", Singapore"), bounds };
}
