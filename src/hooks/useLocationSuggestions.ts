import { useEffect, useRef, useState } from "react";
import type { LocationSearchResult } from "../types/location-search";
import { locationQuery, readLocationSearch } from "../utils/location-search";
import { ownedApiRequest } from "../services/owned-api";
import { useLanguage } from "../i18n";
import { ExploreError, exploreText, problemText } from "../utils/location-feedback";

export async function fetchLocationSuggestions(query: string, signal: AbortSignal): Promise<LocationSearchResult> {
  const response = await ownedApiRequest("/api/location-search", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }), signal });
  if (!response.ok) throw new ExploreError(response.status === 429 ? "waitMinute" : "suggestionsUnavailable");
  return readLocationSearch(await response.json());
}
export function useLocationSuggestions(value: string, enabled: boolean) {
  const [state, setState] = useState<{ query: string; result?: LocationSearchResult; error?: string; busy: boolean }>({ query: "", busy: false });
  const [retry, setRetry] = useState(0), language = useLanguage();
  const active = useRef<AbortController | null>(null);
  const query = locationQuery(value);
  useEffect(() => {
    if (!enabled || !query) return;
    const controller = new AbortController(); active.current = controller;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      setState({ query, busy: true });
      timeout = setTimeout(() => controller.abort(), 10000);
      void fetchLocationSuggestions(query, controller.signal).then(result => {
        if (!controller.signal.aborted && active.current === controller) setState({ query, result, busy: false });
      }).catch(error => {
        if (active.current === controller) setState({ query, busy: false,
          error: controller.signal.aborted ? "locSearchTooLong" : problemText(error, "locSearchUnavailable") });
      }).finally(() => { if (timeout) clearTimeout(timeout); });
    }, 300);
    return () => { active.current = null; clearTimeout(timer); if (timeout) clearTimeout(timeout); controller.abort(); };
  }, [query, enabled, retry]);
  return { suggestions: enabled && query === state.query ? state.result?.suggestions ?? [] : [],
    busy: !!enabled && !!query && (query !== state.query || state.busy),
    error: enabled && query === state.query ? exploreText(language, state.error ?? state.result?.warning ?? "") : "",
    retry: () => setRetry(current => current + 1) };
}
