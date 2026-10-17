import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { editorialRequest } from "../services/editorial";
import { recipeById } from "../data/recipes";
import type { Recipe } from "../types/food";

export function useEditorial<T>(path: string | null): { data?: T; error?: string; loading: boolean; refresh: () => void } {
  const [state, setState] = useState<{ path: string; data?: T; error?: string; loading: boolean }>();
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    if (!path) return;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setState(old => ({ ...(old?.path === path ? old : {}), path, loading: true }));
    void editorialRequest<T>(path, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ path, data, loading: false });
    }).catch((error: { unavailable?: boolean }) => { if (!controller.signal.aborted) setState(old => ({ ...(old?.path === path && !error.unavailable ? old : {}), path, loading: false, error: error.unavailable ? "Recipe is no longer available." : "Content is temporarily unavailable. Try again shortly." })); });
  }, [path]);
  useFocusEffect(useCallback(() => {
    refresh(); const sub = AppState.addEventListener("change", s => { if (s === "active") refresh(); });
    return () => { sub.remove(); active.current?.abort(); };
  }, [refresh]));
  return { ...(state?.path === path ? state : { loading: !!path }), refresh };
}
export function usePublishedRecipe(id: string | null) {
  const existing = id ? recipeById(id) : undefined;
  const remote = useEditorial<Recipe>(id && (!existing || existing.provenance) && !id.startsWith("private-") ? "/recipes/" + encodeURIComponent(id) : null);
  return { ...remote, recipe: remote.data ?? existing };
}
