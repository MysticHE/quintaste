import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { editorialRequest, type StaffRecipes } from "../services/editorial";
import { bundledRecipeIds, recipeById } from "../data/recipes";
import type { Recipe } from "../types/food";
import { useMemberRecipe } from "./useMemberRecipes";
import { isMemberRecipe } from "../services/member-recipes";
import { useT } from "../i18n";

export function useEditorial<T>(path: string | null): { data?: T; error?: string; loading: boolean; refresh: () => void } {
  const t = useT("cook");
  // The failure is kept as a key so its message follows the language chosen afterwards.
  const [state, setState] = useState<{ path: string; data?: T; failure?: "errorRecipeGone" | "errorContentDown"; loading: boolean }>();
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    if (!path) return;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setState(old => ({ ...(old?.path === path ? old : {}), path, loading: true }));
    void editorialRequest<T>(path, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ path, data, loading: false });
    }).catch((error: { unavailable?: boolean }) => { if (!controller.signal.aborted) setState(old => ({ ...(old?.path === path && !error.unavailable ? old : {}), path, loading: false, failure: error.unavailable ? "errorRecipeGone" : "errorContentDown" })); });
  }, [path]);
  useFocusEffect(useCallback(() => {
    refresh(); const sub = AppState.addEventListener("change", s => { if (s === "active") refresh(); });
    return () => { sub.remove(); active.current?.abort(); };
  }, [refresh]));
  if (state?.path !== path) return { loading: !!path, refresh };
  const { failure, ...rest } = state;
  return { ...rest, error: failure && t(failure), refresh };
}
export function usePublishedRecipe(id: string | null) {
  // Bundled recipes come with the app; staff edits and hides of them arrive in one small list, never per recipe.
  const bundled = !!id && bundledRecipeIds.has(id), staff = useEditorial<StaffRecipes>(bundled ? "/staff-recipes" : null);
  const existing = id ? recipeById(id) : undefined, member = useMemberRecipe(id);
  const remote = useEditorial<Recipe>(id && !bundled && !isMemberRecipe(id) && (!existing || existing.provenance) && !id.startsWith("private-") ? "/recipes/" + encodeURIComponent(id) : null);
  if (isMemberRecipe(id)) return member;
  if (bundled) return { loading: staff.loading && !existing, error: undefined as string | undefined, refresh: staff.refresh, recipe: existing, gone: false };
  return { ...remote, recipe: remote.data ?? existing, gone: false };
}
