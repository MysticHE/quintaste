import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationSuggestion } from "../types/location-search";
import { locationQuery } from "../utils/location-search";
import { fetchLocationSuggestions, useLocationSuggestions } from "./useLocationSuggestions";
import { useSuggestionKeys } from "./useSuggestionKeys";
import { useLanguage } from "../i18n";
import { exploreText, problemText } from "../utils/location-feedback";

export function useLocationSearchControl(value: string, onChoose: (item: LocationSuggestion) => void,
  onSearch?: (query: string) => void, addressesOnly = false) {
  const [resolving, setResolving] = useState(false), [submitError, setSubmitError] = useState(""), language = useLanguage();
  // A recent entry can be submitted without changing the parent's value (which cancels pending requests).
  // Keep that text visible and retryable until the user edits it or leaves the screen.
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const displayValue = submittedText ?? value;
  const nav = useSuggestionKeys(), { open, setOpen, index, setIndex, keepOpen } = nav;
  const result = useLocationSuggestions(displayValue, open && !resolving);
  const suggestions = addressesOnly ? result.suggestions.filter(item => item.kind === "address") : result.suggestions;
  const active = useRef<AbortController | null>(null);
  const cancel = () => { active.current?.abort(); active.current = null; };
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  useEffect(() => () => {
    if (active.current) { active.current.abort(); active.current = null; setResolving(false); }
  }, [value]);
  useFocusEffect(useCallback(() => () => {
    active.current?.abort(); active.current = null; setResolving(false); setOpen(false); keepOpen();
  }, [setOpen, keepOpen]));
  const choose = (item: LocationSuggestion) => { cancel(); keepOpen(); setOpen(false); setResolving(false); onChoose(item); };
  const changed = () => { cancel(); setSubmittedText(null); setIndex(-1); setSubmitError(""); setResolving(false); setOpen(true); };
  const submit = async (submittedValue = displayValue) => {
    if (resolving) return;
    const query = locationQuery(submittedValue), sameValue = submittedValue === displayValue;
    if (submittedValue !== value) setSubmittedText(submittedValue);
    if (!submittedValue.trim() && onSearch) { setOpen(false); onSearch(""); return; }
    if (!query) { setSubmitError("enterTwoChars"); setOpen(true); return; }
    if (sameValue && suggestions[index]) { choose(suggestions[index]); return; }
    if (sameValue && suggestions.length && !result.busy) { choose(suggestions[0]); return; }
    cancel(); keepOpen();
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setResolving(true); setSubmitError(""); setOpen(true);
    try {
      const found = await fetchLocationSuggestions(query, controller.signal);
      if (active.current !== controller || controller.signal.aborted) return;
      const matches = addressesOnly ? found.suggestions.filter(item => item.kind === "address") : found.suggestions;
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
  return { ...result, displayValue, suggestions, open, index, busy: result.busy || resolving, error: exploreText(language, submitError) || result.error,
    retry: () => { setIndex(-1); setSubmitError(""); if (submittedText !== null) void submit(submittedText); else result.retry(); },
    changed, choose, submit, keepOpen, focus: nav.focus, blur: nav.blur, key: (key: string) => nav.key(key, suggestions.length) };
}
