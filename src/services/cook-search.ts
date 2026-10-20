import { communityRequest as call } from "./community-api";

/** A Cook search suggestion: a recipe to open, a term to search for, or a category to browse. */
export type SearchSuggestion =
  | { kind: "recipe"; text: string; recipeId: string; minutes: number | null }
  | { kind: "term" | "category"; text: string };

export const recipeSuggestions = (q: string, signal: AbortSignal) =>
  call<{ items: SearchSuggestion[] }>("/api/cook-search/suggest?q=" + encodeURIComponent(q.slice(0, 100)), { signal }).then(r => r.items);
/** A settled search and how many recipes the device showed for it; feeds the wanted-recipe list (members only). */
export const logRecipeSearch = (term: string, results: number) =>
  call<void>("/api/cook-search/searches", { method: "POST", body: { term: term.slice(0, 100), results } });
