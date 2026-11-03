import type { Exclusion } from "../config/preferences";

/** Text in both interface languages, from the reviewed swap rules (server-assets/nutrition/swap-rules.json). */
export type SwapWords = { en: string; zh: string };
/** Per-serving change of each figure, and the figures the swapped food has no value for (server/swaps/plan.mjs). */
export type SwapNutrition = { delta: Partial<Record<string, number>>; unknown: string[] };
/**
 * One swap for a line: the food (or leave it out), its amount for the recipe's own servings, at most one note, and what it changes.
 * `ai`: picked by the QT bots under More options (code still worked out everything shown).
 */
export type SwapOption = {
  to: string | null; name?: SwapWords; leave?: true; amount: number | null; unit: string; note?: SwapWords; step?: SwapWords; ai?: true;
  contains: { add: Exclusion[]; remove: Exclusion[] }; nutrition: SwapNutrition | null;
};
/** `mentions`: the forms of the line's name the steps use, longest first, so the swap can be named there too. */
export type SwapLine = { id: string; key: string; mentions: string[]; options: SwapOption[]; more: SwapOption[] };
/** `offered`: the account may use swaps, so its stored swaps can be refreshed from `lines`; `ai`: it may use Find More With AI. */
export type SwapPlan = { id: string; revision: number; offered: boolean; ai: boolean; lines: SwapLine[] };
/** Where Find More With AI stands for one line (server/swaps/ai.mjs). */
export type SwapAiStatus = { status: "none" | "pending" | "done" | "failed"; options: SwapOption[] };
/**
 * A swap the member chose for one line of one recipe revision, kept on the device with everything it changes so the recipe reads
 * swapped offline and in Cook mode. `asked`: the "Did the swap work?" question was answered.
 */
export type ChosenSwap = { recipeId: string; revision: number; lineId: string; original: string; mentions: string[]; option: SwapOption; at: number; asked?: boolean };
