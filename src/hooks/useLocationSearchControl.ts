import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DiscoverySearch } from "../types/discovery";
import type { LocationSuggestion, SearchSuggestion } from "../types/location-search";
import { searchWords } from "../utils/search-words";
import { locationQuery } from "../utils/location-search";
import { fetchLocationSuggestions, useLocationSuggestions } from "./useLocationSuggestions";
import { fetchDishSuggestions, useDishSuggestions } from "./useDishSuggestions";
import { useSuggestionKeys } from "./useSuggestionKeys";
import { useLanguage } from "../i18n";
import { exploreText, problemText } from "../utils/location-feedback";

export function useLocationSearchControl(value: string, onChoose: (item: LocationSuggestion) => void,
  onSearch?: (query: string) => void, addressesOnly = false, dishScope?: DiscoverySearch) {
  const [resolving, setResolving] = useState(false), [submitError, setSubmitError] = useState(""), language = useLanguage();
  // A recent entry can be submitted without changing the parent's value (which cancels pending requests).
  // Keep that text visible and retryable until the user edits it or leaves the screen.
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const displayValue = submittedText ?? value;
  const nav = useSuggestionKeys(), { open, setOpen, index, setIndex, keepOpen } = nav;
  const result = useLocationSuggestions(displayValue, open && !resolving);
  // Explore's search box puts dish names from the published menus above the locations (owner, 25 Oct 2026), except a
  // location named exactly what was typed ("Katong" before Katong Laksa); "fried rice" still finds the dish first.
  const dishes = onSearch ? dishScope : undefined;
  const dishRows = useDishSuggestions(displayValue, dishes, !!dishes && open && !resolving);
  const locations = addressesOnly ? result.suggestions.filter(item => item.kind === "address") : result.suggestions;
  // While the dish lookup runs, OneMap's rows wait, so a business named after a dish never flashes up first.
  const suggestions = ordered(locations, dishRows.dishes, displayValue, dishRows.busy);
  const looking = result.busy || dishRows.busy;
  const active = useRef<AbortController | null>(null);
  const cancel = () => { active.current?.abort(); active.current = null; };
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  useEffect(() => () => {
    if (active.current) { active.current.abort(); active.current = null; setResolving(false); }
  }, [value]);
  useFocusEffect(useCallback(() => () => {
    active.current?.abort(); active.current = null; setResolving(false); setOpen(false); keepOpen();
  }, [setOpen, keepOpen]));
  const choose = (item: SearchSuggestion) => {
    cancel(); keepOpen(); setOpen(false); setResolving(false);
    if (item.kind === "dish") onSearch?.(item.name); else onChoose(item);
  };
  const changed = () => { cancel(); setSubmittedText(null); setIndex(-1); setSubmitError(""); setResolving(false); setOpen(true); };
  const submit = async (submittedValue = displayValue) => {
    if (resolving) return;
    const query = locationQuery(submittedValue), sameValue = submittedValue === displayValue;
    if (submittedValue !== value) setSubmittedText(submittedValue);
    if (!submittedValue.trim() && onSearch) { setOpen(false); onSearch(""); return; }
    if (!query) { setSubmitError("enterTwoChars"); setOpen(true); return; }
    if (sameValue && suggestions[index]) { choose(suggestions[index]); return; }
    if (sameValue && suggestions.length && !looking) { choose(suggestions[0]); return; }
    cancel(); keepOpen();
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setResolving(true); setSubmitError(""); setOpen(true);
    try {
      const dishLookup = dishes ? fetchDishSuggestions(query, dishes, controller.signal).catch(() => []) : Promise.resolve([]);
      let failure: unknown;
      const [found, dishFound] = await Promise.all([fetchLocationSuggestions(query, controller.signal)
        .catch((error: unknown) => { failure = error; return { suggestions: [] }; }), dishLookup]);
      if (active.current !== controller || controller.signal.aborted) return;
      // A failed location lookup still lets a dish match through; with no dish it reports the failure as before.
      if (failure !== undefined && !dishFound[0]) throw failure;
      const matches = ordered(addressesOnly ? found.suggestions.filter(item => item.kind === "address") : found.suggestions, dishFound, submittedValue);
      if (matches[0]) choose(matches[0]);
      else if (/^\d+$/.test(query)) setSubmitError(query.length === 6 ? "noPostalAddress" : "enterSixDigit");
      else if (onSearch) { setOpen(false); onSearch(submittedValue.trim()); }
      else setSubmitError("noMatchingLocations");
    } catch (error) {
      if (active.current === controller) setSubmitError(controller.signal.aborted ? "locSearchTooLong" : problemText(error, "locSearchUnavailable"));
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setResolving(false); }
    }
  };
  return { ...result, displayValue, suggestions, open, index, busy: looking || resolving, error: exploreText(language, submitError) || result.error,
    retry: () => { setIndex(-1); setSubmitError(""); if (submittedText !== null) void submit(submittedText); else result.retry(); },
    changed, choose, submit, keepOpen, focus: nav.focus, blur: nav.blur, key: (key: string) => nav.key(key, suggestions.length) };
}

/**
 * Dish rows lead, except that a location named exactly the typed text stays first. When the words match dishes, OneMap's
 * other rows (mostly businesses named after the dish, such as a wanton mee stall) are left out; our area names stay.
 */
function ordered(locations: LocationSuggestion[], dishes: SearchSuggestion[], typed: string, dishesPending = false): SearchSuggestion[] {
  const text = searchWords(typed), exact = locations.filter(item => searchWords(item.name) === text);
  const others = locations.filter(item => !exact.includes(item) && (item.kind === "area" || !dishes.length && !dishesPending));
  return [...exact, ...dishes, ...others];
}
