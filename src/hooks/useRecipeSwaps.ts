import { useCallback, useEffect, useMemo } from "react";
import { useRemote } from "./useRemote";
import { useFood } from "../state/Food";
import { recipeSwaps, swapDidNotWork } from "../services/swaps-api";
import { applySwaps, readSwaps, recipeLanguage, refreshSwaps, swapsFor, swapsToAsk, type Swappable } from "../utils/swaps";
import type { IngredientSwaps } from "../components/recipes/IngredientList";
import type { ChosenSwap, SwapLine, SwapOption } from "../types/swaps";

/**
 * Ingredient swaps on a published recipe: the swaps on offer for its current revision, the ones the member chose (private, on
 * this device), the recipe with them applied, and the "Did the swap work?" question once they have cooked with them. Private
 * recipes never leave the phone, so they have none. `list` is what the ingredient lists need, with `onOpen` set by the screen.
 */
export function useRecipeSwaps<R extends Swappable>(recipe: R | null | undefined) {
  const { doc, update } = useFood(), id = recipe && !recipe.private ? recipe.id : undefined, revision = recipe?.revision;
  const remote = useRemote(id ? `swaps:${id}:${revision}` : null, signal => recipeSwaps(id!, signal));
  const plan = remote.data && remote.data.revision === revision ? remote.data : null;
  const lines = useMemo(() => new Map((plan?.lines ?? []).map(line => [line.id, line])), [plan]);
  const saved = doc.recipes.swaps;
  const chosen = useMemo(() => recipe ? swapsFor(recipe, saved) : new Map<string, ChosenSwap>(), [recipe, saved]);
  const swapped = useMemo(() => recipe ? applySwaps(recipe, saved) : recipe, [recipe, saved]);
  const ask = useMemo(() => recipe ? swapsToAsk(recipe, saved, doc.recipes.cooked) : [], [recipe, saved, doc.recipes.cooked]);
  const write = useCallback((change: (swaps: ChosenSwap[]) => ChosenSwap[]) =>
    update(current => ({ ...current, recipes: { ...current.recipes, swaps: readSwaps(change(current.recipes.swaps)) } })), [update]);
  // Stored swaps take the current rules' version (or go when no longer offered), so a corrected rule reaches devices that chose it.
  useEffect(() => {
    if (plan?.offered && refreshSwaps(saved, plan)) void write(swaps => refreshSwaps(swaps, plan) ?? swaps);
  }, [plan, saved, write]);
  const choose = useCallback((line: SwapLine, option: SwapOption) => {
    const original = recipe?.ingredients.find(item => item.id === line.id)?.name;
    if (!recipe || !original) return;
    void write(swaps => [{ recipeId: recipe.id, revision: recipe.revision, lineId: line.id, original, mentions: line.mentions, option, at: Date.now() },
      ...swaps.filter(swap => !(swap.recipeId === recipe.id && swap.lineId === line.id))]);
  }, [recipe, write]);
  const undo = useCallback((lineId: string) => {
    if (recipe) void write(swaps => swaps.filter(swap => !(swap.recipeId === recipe.id && swap.lineId === lineId)));
  }, [recipe, write]);
  /** Answers the question for every swap it asked about; No tells staff about each one. Throws when a report could not be sent. */
  const answer = useCallback(async (worked: boolean) => {
    if (!recipe || !ask.length) return;
    if (!worked) await Promise.all(ask.map(swap => swapDidNotWork(recipe.id, swap.lineId, swap.option.to)));
    // Only the swaps asked about: one chosen again for the same line since then is asked about after it is cooked.
    const asked = new Set(ask.map(swap => swap.lineId + "@" + swap.at));
    await write(swaps => swaps.map(swap => swap.recipeId === recipe.id && swap.revision === recipe.revision && asked.has(swap.lineId + "@" + swap.at) ? { ...swap, asked: true } : swap));
  }, [recipe, ask, write]);
  const list = (onOpen: (lineId: string) => void): IngredientSwaps => ({ lines, chosen, language: recipeLanguage(recipe ?? {}), onOpen, onUndo: undo });
  // The recipe Find More With AI can ask about, when this account may use it.
  const ai = plan?.ai && id ? id : null;
  return { lines, chosen, swapped, ask, choose, undo, answer, list, ai };
}
