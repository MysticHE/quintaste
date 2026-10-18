import { useEffect, useState } from "react";
import { useRemote } from "./useRemote";
import { useDebounced } from "./useDebounced";
import { useFood } from "../state/Food";
import { useMember } from "../components/CommunityGate";
import { accountsEnabled } from "../services/auth-client";
import { forgetPublishedRecipe, recipeById, rememberPublishedRecipe } from "../data/recipes";
import { browsePath, isMemberRecipe, memberRecipe, memberRecipeDetail, memberRecipes, memberSummary, myRecipes } from "../services/member-recipes";
import type { Recipe } from "../types/food";

/** Published member recipes for Cook's search and category, paged like the editorial list. Quietly empty when the service is off. */
export function useMemberRecipes() {
  const { cookSearch, cookBrowse } = useFood(), q = useDebounced(cookSearch);
  const category = cookBrowse.category === "All" ? "" : cookBrowse.category, base = q.trim() + "|" + category;
  const [page, setPage] = useState<{ base: string; cursor: number | null; prior: Recipe[] }>({ base, cursor: null, prior: [] });
  const own = page.base === base ? page : { base, cursor: null, prior: [] };
  const path = accountsEnabled ? browsePath(q, category, own.cursor) : null;
  const remote = useRemote(path, signal => memberRecipes(path!, signal));
  const all = [...own.prior, ...(remote.data?.items ?? []).map(memberSummary)].filter((r, index, rows) => rows.findIndex(x => x.id === r.id) === index);
  return { recipes: all, loading: remote.loading, hasMore: remote.data?.next != null, limited: all.length >= 80,
    more: () => setPage({ base, prior: all, cursor: remote.data?.next ?? null }) };
}
/** One published member recipe with its live shop labels; remembered so Cook mode and Shopping can use it. */
export function useMemberRecipe(id: string | null) {
  const key = isMemberRecipe(id) ? id : null;
  const remote = useRemote(key ? "member-recipe:" + key : null, signal => memberRecipeDetail(key!, signal).then(memberRecipe));
  useEffect(() => {
    if (!key) return;
    if (remote.data) rememberPublishedRecipe(remote.data);
    else if (remote.error?.status === 404) forgetPublishedRecipe(key);
  }, [key, remote.data, remote.error]);
  const gone = remote.error?.status === 404;
  return { recipe: gone ? undefined : remote.data ?? (key ? recipeById(key) : undefined), loading: remote.loading,
    error: remote.error ? (gone ? "Recipe is no longer available." : remote.error.message) : undefined, refresh: remote.refresh };
}
/** Where each of the member's drafts stands on the server, keyed by draft id. */
export function useMyRecipeStatus() {
  const member = useMember(), remote = useRemote(member.member ? "member-recipes:mine" : null, myRecipes);
  return { ...remote, byDraft: new Map((remote.data?.items ?? []).map(item => [item.draftKey, item])), member };
}
