import type { LocationSearchResult } from "../types/location-search";
import { locationQuery, readLocationSearch } from "../utils/location-search";
import { ownedApiRequest } from "../services/owned-api";
import { useLanguage } from "../i18n";
import { ExploreError, exploreText, problemText } from "../utils/location-feedback";
import { useDebouncedLookup } from "./useDebouncedLookup";

export async function fetchLocationSuggestions(query: string, signal: AbortSignal): Promise<LocationSearchResult> {
  const response = await ownedApiRequest("/api/location-search", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }), signal });
  if (!response.ok) throw new ExploreError(response.status === 429 ? "waitMinute" : "suggestionsUnavailable");
  return readLocationSearch(await response.json());
}
export function useLocationSuggestions(value: string, enabled: boolean) {
  const language = useLanguage(), query = locationQuery(value) ?? "";
  const lookup = useDebouncedLookup(query, enabled, signal => fetchLocationSuggestions(query, signal));
  const problem = lookup.timedOut ? "locSearchTooLong" : lookup.error !== undefined ? problemText(lookup.error, "locSearchUnavailable") : lookup.data?.warning ?? "";
  return { suggestions: lookup.data?.suggestions ?? [], busy: lookup.busy, error: exploreText(language, problem), retry: lookup.retry };
}
