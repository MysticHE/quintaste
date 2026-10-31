import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { editorialRequest, type StaffRecipes } from "../services/editorial";
import { bundledRecipeIds, recipeById } from "../data/recipes";
import type { Recipe } from "../types/food";
import { useMemberRecipe } from "./useMemberRecipes";
import { isMemberRecipe } from "../services/member-recipes";
import { useT } from "../i18n";

// Public content only, so one copy serves every account; a reopened tab shows its last result at once while it refreshes.
const cache = new Map<string, unknown>(), cacheSize = 40;
function remember(path: string, data: unknown) {
  cache.delete(path); cache.set(path, data);
  if (cache.size > cacheSize) cache.delete(cache.keys().next().value!);
}
/** `keepPrevious` keeps the last page on screen while a new search or page loads (`stale` is then true); see useRemote. */
export function useEditorial<T>(path: string | null, keepPrevious = false): { data?: T; error?: string; loading: boolean; stale?: boolean; gone?: boolean; refresh: () => void } {
  const t = useT("cook");
  // The failure is kept as a key so its message follows the language chosen afterwards.
  // `previous` is what the last path showed, kept until the new path's first result or failure.
  const [state, setState] = useState<{ path: string; data?: T; previous?: T; failure?: "errorRecipeGone" | "errorContentDown"; loading: boolean }>();
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    if (!path) return;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setState(old => ({ ...(old?.path === path ? old : { previous: old?.data ?? old?.previous }), path, loading: true }));
    void editorialRequest<T>(path, controller.signal).then(data => {
      if (!controller.signal.aborted) { remember(path, data); setState({ path, data, loading: false }); }
    }).catch((error: { unavailable?: boolean }) => {
      // Hidden or removed content is forgotten at once, so a later visit never shows it while checking again.
      if (error.unavailable) cache.delete(path);
      if (!controller.signal.aborted) setState(old => ({ ...(old?.path === path && !error.unavailable ? old : {}), previous: undefined, path, loading: false, failure: error.unavailable ? "errorRecipeGone" : "errorContentDown" })); });
  }, [path]);
  useFocusEffect(useCallback(() => {
    refresh(); const sub = AppState.addEventListener("change", s => { if (s === "active") refresh(); });
    return () => { sub.remove(); active.current?.abort(); };
  }, [refresh]));
  const previous = keepPrevious && path ? (state?.path === path ? state.previous : state?.data ?? state?.previous) : undefined;
  const cached = path ? cache.get(path) as T | undefined : undefined;
  if (state?.path !== path) return cached !== undefined ? { data: cached, loading: true, refresh }
    : previous !== undefined ? { data: previous, loading: true, stale: true, refresh } : { loading: !!path, refresh };
  const { failure, previous: _previous, ...rest } = state;
  if (rest.data === undefined && !failure && cached !== undefined) return { ...rest, data: cached, refresh };
  if (rest.data === undefined && !failure && previous !== undefined) return { ...rest, data: previous, stale: true, refresh };
  // `gone`: the server says this content no longer exists (staff deleted or hid it, or it was withdrawn).
  return { ...rest, error: failure && t(failure), gone: failure === "errorRecipeGone", refresh };
}
export function usePublishedRecipe(id: string | null) {
  // Bundled recipes come with the app; staff edits and hides of them arrive in one small list, never per recipe.
  const bundled = !!id && bundledRecipeIds.has(id), staff = useEditorial<StaffRecipes>(bundled ? "/staff-recipes" : null);
  const existing = id ? recipeById(id) : undefined, member = useMemberRecipe(id);
  const remote = useEditorial<Recipe>(id && !bundled && !isMemberRecipe(id) && (!existing || existing.provenance) && !id.startsWith("private-") ? "/recipes/" + encodeURIComponent(id) : null);
  if (isMemberRecipe(id)) return member;
  // A bundled recipe missing from the bundle as staff left it was hidden or deleted in the console (the last hide list is
  // kept on the device, so this holds offline too).
  if (bundled) return { loading: staff.loading && !existing, error: undefined as string | undefined, refresh: staff.refresh, recipe: existing, gone: !existing };
  return { ...remote, recipe: remote.gone ? undefined : remote.data ?? existing, gone: !!remote.gone };
}
