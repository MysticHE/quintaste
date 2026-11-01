import type { DiscoverySearch } from "../types/discovery";
import type { DishSuggestion, PlaceSuggestion } from "../types/location-search";
import { locationQuery } from "../utils/location-search";
import { ownedApiRequest } from "../services/owned-api";
import { useDebouncedLookup } from "./useDebouncedLookup";

const label = (value: unknown, max: number) => typeof value === "string" && !!value.trim() && value.length <= max;
/**
 * Place names (first) and dish names from the published menus for what is typed, among the places `scope` (the current
 * Explore tab, labels and area) can list. A failed lookup offers none: the place search still runs.
 */
export async function fetchDishSuggestions(query: string, scope: DiscoverySearch, signal: AbortSignal): Promise<(PlaceSuggestion | DishSuggestion)[]> {
  const response = await ownedApiRequest("/api/dish-search", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, search: { ...scope, query: "" } }), signal });
  if (!response.ok) throw new Error("Dish suggestions unavailable");
  const body = await response.json() as { terms?: unknown; places?: unknown };
  if (!Array.isArray(body.terms) || body.terms.length > 3 || body.terms.some(term => !label(term, 100)))
    throw new Error("Dish suggestions unreadable");
  // Servers before 1 Nov 2026 send no places.
  const places = Array.isArray(body.places) ? body.places.slice(0, 5).filter((place: unknown): place is { id: string; name: string; address: string } =>
    !!place && typeof place === "object" && label((place as Record<string, unknown>).id, 160) && label((place as Record<string, unknown>).name, 200)
    && typeof (place as Record<string, unknown>).address === "string") : [];
  return [...places.map(place => ({ kind: "place" as const, id: place.id, name: place.name, address: place.address.slice(0, 200) })),
    ...(body.terms as string[]).map(name => ({ kind: "dish" as const, id: "dish-" + name, name, address: "" }))];
}
export function useDishSuggestions(value: string, scope: DiscoverySearch | undefined, enabled: boolean) {
  const query = locationQuery(value) ?? "", key = query && scope ? query + "\n" + JSON.stringify({ ...scope, query: "" }) : "";
  const lookup = useDebouncedLookup(key, enabled, signal => fetchDishSuggestions(query, scope!, signal));
  return { dishes: lookup.data ?? [], busy: lookup.busy };
}
