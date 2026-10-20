import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounced } from "./useDebounced";
import { useFood } from "../state/Food";
import { useMember } from "../components/CommunityGate";
import { accountsEnabled } from "../services/auth-client";
import { logRecipeSearch, recipeSuggestions, type SearchSuggestion } from "../services/cook-search";
import { bundledRecipes } from "../data/recipes";
import { searchWords as normal } from "../utils/recipe-browse";


/**
 * Suggestions for the Cook search box: recipes bundled in the app (matched here) and everything the server knows
 * (QuinTaste, bot, member and AI recipes, linked names, categories, common ingredients), at most eight.
 */
export function useRecipeSuggestions(query: string, open: boolean) {
  const q = useDebounced(query.trim(), 250), wanted = normal(q), active = open && wanted.length >= 2;
  const [remote, setRemote] = useState<{ q: string; items: SearchSuggestion[] } | null>(null);
  const local = useMemo<SearchSuggestion[]>(() => wanted.length < 2 ? [] : bundledRecipes().filter(r => !r.withdrawal && normal(r.name).includes(wanted)).slice(0, 4)
    .map(r => ({ kind: "recipe", text: r.name, recipeId: r.id, minutes: r.minutes })), [wanted]);
  useEffect(() => {
    if (!active || !accountsEnabled) return;
    const controller = new AbortController();
    recipeSuggestions(q, controller.signal).then(items => setRemote({ q, items }))
      .catch(() => { if (!controller.signal.aborted) setRemote({ q, items: [] }); });
    return () => controller.abort();
  }, [q, active]);
  const fetched = remote?.q === q ? remote.items : null, seen = new Set(local.map(item => item.kind === "recipe" ? item.recipeId : item.text));
  const merged = [...local, ...(fetched ?? []).filter(item => !seen.has(item.kind === "recipe" ? item.recipeId : item.text))];
  // Recipes first, then searches and categories.
  const items = active ? [...merged.filter(i => i.kind === "recipe"), ...merged.filter(i => i.kind !== "recipe")].slice(0, 8) : [];
  return { items, busy: active && accountsEnabled && fetched === null, settled: q === query.trim() };
}

/** The last five Cook searches, on this device only, per account or guest; cleared from the search box. */
export function useRecentSearches() {
  const { discoveryScope } = useFood(), key = "@quintaste/recent-recipe-searches/" + discoveryScope;
  // Kept with the key it belongs to, so switching account never shows another person's searches.
  const [stored, setStored] = useState<{ key: string; items: string[] }>({ key: "", items: [] });
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(key).then(raw => {
      const value: unknown = raw ? JSON.parse(raw) : [];
      if (live) setStored({ key, items: Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 5) : [] });
    }).catch(() => { if (live) setStored({ key, items: [] }); });
    return () => { live = false; };
  }, [key]);
  const items = stored.key === key ? stored.items : [];
  const write = useCallback((next: string[]) => { setStored({ key, items: next }); AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {}); }, [key]);
  const remember = useCallback((term: string) => {
    const text = term.trim().slice(0, 60);
    if (normal(text).length < 3) return;
    setStored(current => {
      const before = current.key === key ? current.items : [];
      // "laks" then "laksa" keeps only "laksa".
      const next = [text, ...before.filter(item => normal(item) !== normal(text) && !normal(text).startsWith(normal(item)))].slice(0, 5);
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return { key, items: next };
    });
  }, [key]);
  return { items, remember, clear: () => write([]) };
}

/**
 * Reports a search once it settles (three or more characters, 800 ms idle, results known), at most once per term per
 * session, for members only; failures are ignored because this only feeds the wanted-recipe list.
 */
export function useSearchLog(query: string, results: number, ready: boolean, onSettled?: (term: string) => void) {
  const member = useMember(), settled = useDebounced(query.trim(), 800), sent = useRef(new Set<string>());
  const callback = useRef(onSettled), last = useRef("");
  useEffect(() => { callback.current = onSettled; });
  useEffect(() => {
    const key = normal(settled);
    if (!ready || key.length < 3 || settled !== query.trim()) return;
    // Once per settled term, however often the result count changes while pages load.
    if (last.current !== key) { last.current = key; callback.current?.(settled); }
    if (!member.member || sent.current.has(key)) return;
    sent.current.add(key);
    logRecipeSearch(settled, results).catch(() => {});
  }, [settled, query, results, ready, member.member]);
}
