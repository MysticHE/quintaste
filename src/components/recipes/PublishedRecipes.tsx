import { useState } from "react";
import { useEditorial } from "../../hooks/useEditorial";
import { useDebounced } from "../../hooks/useDebounced";
import type { EditorialPage, RecipeSummary } from "../../services/editorial";
import { useFood } from "../../state/Food";

export function usePublishedRecipes() {
  const { cookSearch, cookBrowse: browse } = useFood();
  const q = useDebounced(cookSearch), base = "/recipes?q=" + encodeURIComponent(q.trim()) + "&category=" + encodeURIComponent(browse.category === "All" ? "" : browse.category);
  const [page, setPage] = useState<{ base: string; cursor: string | null; prior: RecipeSummary[] }>({ base, cursor: null, prior: [] });
  const own = page.base === base ? page : { base, cursor: null, prior: [] };
  const remote = useEditorial<EditorialPage<RecipeSummary>>(base + (own.cursor ? "&cursor=" + encodeURIComponent(own.cursor) : ""));
  const all = [...own.prior, ...(remote.data?.items ?? [])].filter((r, index, rows) => rows.findIndex(x => x.id === r.id) === index);
  return { ...remote, recipes: all.map(r => ({ ...r, ingredients: (r.ingredientNames ?? []).map((name, index) => ({ id: "preview-" + index, name, amount: null, unit: "" })), steps: [] })),
    hasMore: !!remote.data?.nextCursor, limited: all.length >= 80,
    more: () => setPage({ base, prior: all, cursor: remote.data?.nextCursor ?? null }) };
}
