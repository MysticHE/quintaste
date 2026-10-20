import type { Exclusion } from "../config/preferences";
import { suits, type DietLabel } from "../config/diet-labels";
import type { Recipe } from "../types/food";
import type { CookBrowse, CookSort, CookedEntry } from "../types/recipe-workspace";
import { matchesNutritionChoices } from "./nutrition";
import { fitRank, recipeFit } from "./recipe-dietary";
import { dailyShuffle, daypartScore, type DaypartNow } from "./daypart";

export const sortLabels: Record<CookSort, string> = { Fit: "Best fit", Time: "Quickest", Recent: "Recently cooked" };
/** Vegan and/or Vegetarian chosen in Cook filters; a recipe must prove every one (AND). */
export const selectedRecipeDiets = (browse: CookBrowse): DietLabel[] => browse.labels;
export function cookedStats(cooked: CookedEntry[], recipeId: string) {
  const entries = cooked.filter(entry => entry.recipeId === recipeId);
  return { count: entries.length, last: entries.reduce((latest, entry) => Math.max(latest, entry.finishedAt), 0) };
}
export function activeFilterCount(browse: CookBrowse) {
  return [selectedRecipeDiets(browse).length > 0, browse.time !== "Any", browse.onePot, !!browse.nutrition?.length].filter(Boolean).length;
}
/** Lower case, letters and digits only, single spaces: how Cook compares typed text with recipe names. */
export const searchWords = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** Whole-word match on ingredient names, singular or plural ("peanuts" finds "roasted peanuts, crushed"). */
export function usesIngredient(recipe: Recipe, term: string) {
  // searchWords() leaves only letters, digits and spaces, so the term is safe inside a pattern.
  const t = searchWords(term).replace(/s$/, "");
  if (!t) return false;
  const re = new RegExp("(^| )" + t + "s?( |$)");
  return recipe.ingredients.some(item => re.test(searchWords(item.name)));
}
/** `now` (time of day) and `at` (clock) order Best fit; without them Best fit is the diet fit alone. */
type Context = { diets: readonly DietLabel[]; excluded: readonly Exclusion[]; cooked: CookedEntry[]; ingredient?: string; now?: DaypartNow; at?: number };
const day = 86400000;
/**
 * Best fit, in order: the diet fit (the owner's diet promise), then suits this time of day, then shared in the last 7 days,
 * then not cooked in the last 14 days, then a per-day shuffle so recipes that tie take turns at the top.
 */
function feedKey(recipe: Recipe, fit: number, context: Context, lastCooked: number) {
  if (!context.now || context.at === undefined) return [fit];
  const at = context.at, updated = Date.parse(recipe.updatedAt);
  return [fit, daypartScore(recipe, context.now), Number.isFinite(updated) && at - updated <= 7 * day ? 0 : 1,
    lastCooked && at - lastCooked <= 14 * day ? 1 : 0, dailyShuffle(recipe.id, context.now.day)];
}
const compareKeys = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
/** A live recipe whose name, cuisine, categories or ingredients contain the typed text (any recipe when nothing is typed). */
export function matchesQuery(recipe: Recipe, query: string) {
  const text = query.trim().toLowerCase();
  return !recipe.withdrawal && (!text || [recipe.name, recipe.cuisine, ...recipe.categories, ...recipe.ingredients.map(item => item.name)].join(" ").toLowerCase().includes(text));
}
/** Category is OR within one chip row; every Filters choice narrows (AND) across facets. */
export function browseRecipes(all: Recipe[], browse: CookBrowse, query: string, context: Context) {
  const text = query.trim().toLowerCase(), diets = selectedRecipeDiets(browse);
  // One fit per recipe gives both its labels (for the diet filter) and its rank (for Best fit).
  const fits = new Map(all.map(recipe => [recipe.id, recipeFit(recipe, context.diets, context.excluded)]));
  const matches = all.filter(recipe => matchesQuery(recipe, text)
    && (browse.category === "All" || recipe.categories.includes(browse.category))
    && (!diets.length || suits(diets, fits.get(recipe.id)!.labels))
    && (browse.time === "Any" || recipe.minutes <= +browse.time)
    && (!browse.onePot || !!recipe.onePot)
    && matchesNutritionChoices(recipe, browse.nutrition)
    && (!context.ingredient || usesIngredient(recipe, context.ingredient)));
  const last = new Map(matches.map(recipe => [recipe.id, cookedStats(context.cooked, recipe.id).last]));
  const rank = new Map(matches.map(recipe => [recipe.id, feedKey(recipe, fitRank(fits.get(recipe.id)!), context, last.get(recipe.id)!)]));
  const byFit = (a: Recipe, b: Recipe) => compareKeys(rank.get(a.id)!, rank.get(b.id)!);
  return matches.sort((a, b) => browse.sort === "Time" ? a.minutes - b.minutes || byFit(a, b)
    : browse.sort === "Recent" ? last.get(b.id)! - last.get(a.id)! || byFit(a, b) : byFit(a, b));
}
