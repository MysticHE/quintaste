import type { DiscoverySearch } from "../types/discovery";
import type { DishSuggestion } from "../types/location-search";
import { locationQuery } from "../utils/location-search";
import { ownedApiRequest } from "../services/owned-api";
import { useDebouncedLookup } from "./useDebouncedLookup";

/**
 * Dish names from the published menus for what is typed, among the places `scope` (the current Explore tab, labels and area)
 * can list. A failed lookup offers none: the place search still runs.
 */
export async function fetchDishSuggestions(query: string, scope: DiscoverySearch, signal: AbortSignal): Promise<DishSuggestion[]> {
  const response = await ownedApiRequest("/api/dish-search", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, search: { ...scope, query: "" } }), signal });
  if (!response.ok) throw new Error("Dish suggestions unavailable");
  const body = await response.json() as { terms?: unknown };
  if (!Array.isArray(body.terms) || body.terms.length > 3 || body.terms.some(term => typeof term !== "string" || !term.trim() || term.length > 100))
    throw new Error("Dish suggestions unreadable");
  return (body.terms as string[]).map(name => ({ kind: "dish", id: "dish-" + name, name, address: "" }));
}
export function useDishSuggestions(value: string, scope: DiscoverySearch | undefined, enabled: boolean) {
  const query = locationQuery(value) ?? "", key = query && scope ? query + "\n" + JSON.stringify({ ...scope, query: "" }) : "";
  const lookup = useDebouncedLookup(key, enabled, signal => fetchDishSuggestions(query, scope!, signal));
  return { dishes: lookup.data ?? [], busy: lookup.busy };
}
