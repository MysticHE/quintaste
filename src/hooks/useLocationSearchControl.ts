import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationSuggestion } from "../types/location-search";
import { locationQuery } from "../utils/location-search";
import { fetchLocationSuggestions, useLocationSuggestions } from "./useLocationSuggestions";

export function useLocationSearchControl(value: string, onChoose: (item: LocationSuggestion) => void,
  onSearch?: (query: string) => void, addressesOnly = false) {
  const [open, setOpen] = useState(false), [index, setIndex] = useState(-1);
  const [resolving, setResolving] = useState(false), [submitError, setSubmitError] = useState("");
  const result = useLocationSuggestions(value, open && !resolving);
  const suggestions = addressesOnly ? result.suggestions.filter(item => item.kind === "address") : result.suggestions;
  const active = useRef<AbortController | null>(null), blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => { active.current?.abort(); active.current = null; };
  const keepOpen = () => { if (blurTimer.current) clearTimeout(blurTimer.current); };
  useEffect(() => () => { active.current?.abort(); active.current = null; if (blurTimer.current) clearTimeout(blurTimer.current); }, []);
  useEffect(() => () => {
    if (active.current) { active.current.abort(); active.current = null; setResolving(false); }
  }, [value]);
  useFocusEffect(useCallback(() => () => {
    active.current?.abort(); active.current = null; setResolving(false); setOpen(false);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []));
  const choose = (item: LocationSuggestion) => { cancel(); keepOpen(); setOpen(false); setResolving(false); onChoose(item); };
  const changed = () => { cancel(); setIndex(-1); setSubmitError(""); setResolving(false); setOpen(true); };
  const submit = async () => {
    if (resolving) return;
    const query = locationQuery(value);
    if (!value.trim() && onSearch) { setOpen(false); onSearch(""); return; }
    if (!query) { setSubmitError("Enter at least two characters to search."); setOpen(true); return; }
    if (suggestions[index]) { choose(suggestions[index]); return; }
    if (suggestions.length && !result.busy) { choose(suggestions[0]); return; }
    cancel(); keepOpen();
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setResolving(true); setSubmitError(""); setOpen(true);
    try {
      const found = await fetchLocationSuggestions(query, controller.signal);
      if (active.current !== controller || controller.signal.aborted) return;
      const matches = addressesOnly ? found.suggestions.filter(item => item.kind === "address") : found.suggestions;
      if (matches[0]) choose(matches[0]);
      else if (/^\d+$/.test(query)) setSubmitError(query.length === 6 ? "No address found for this postal code. Check the code and retry."
        : "Enter a six-digit Singapore postal code.");
      else if (onSearch) { setOpen(false); onSearch(value.trim()); }
      else setSubmitError("No matching locations. Try another name or postal code.");
    } catch (error) {
      if (active.current === controller) setSubmitError(controller.signal.aborted ? "Location search took too long. Please retry."
        : error instanceof Error ? error.message : "Location search is unavailable.");
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setResolving(false); }
    }
  };
  return { ...result, suggestions, open, index, busy: result.busy || resolving, error: submitError || result.error,
    retry: () => { setIndex(-1); setSubmitError(""); result.retry(); },
    changed, choose, submit, keepOpen, focus: () => { keepOpen(); setOpen(true); },
    blur: () => { blurTimer.current = setTimeout(() => setOpen(false), 150); },
    key: (key: string) => {
      if (key === "Escape") { setOpen(false); return true; }
      if (key !== "ArrowDown" && key !== "ArrowUp") return false;
      setOpen(true);
      setIndex(current => suggestions.length ? current < 0 ? (key === "ArrowDown" ? 0 : suggestions.length - 1)
        : (current + (key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length : -1);
      return true;
    } };
}
