import type { Exclusion } from "../config/preferences";
import { suits, type DietLabel } from "../config/diet-labels";
import type { Recipe } from "../types/food";
import type { CookBrowse, CookSort, CookedEntry } from "../types/recipe-workspace";
import { matchesNutritionChoices } from "./nutrition";
import { fitRank, recipeFit, recipeLabels } from "./recipe-dietary";

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
const words = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** Whole-word match on ingredient names, singular or plural ("peanuts" finds "roasted peanuts, crushed"). */
export function usesIngredient(recipe: Recipe, term: string) {
  // words() leaves only letters, digits and spaces, so the term is safe inside a pattern.
  const t = words(term).replace(/s$/, "");
  if (!t) return false;
  const re = new RegExp("(^| )" + t + "s?( |$)");
  return recipe.ingredients.some(item => re.test(words(item.name)));
}
type Context = { diets: readonly DietLabel[]; excluded: readonly Exclusion[]; cooked: CookedEntry[]; ingredient?: string };
/** Category is OR within one chip row; every Filters choice narrows (AND) across facets. */
export function browseRecipes(all: Recipe[], browse: CookBrowse, query: string, context: Context) {
  const text = query.trim().toLowerCase(), diets = selectedRecipeDiets(browse);
  const matches = all.filter(recipe => !recipe.withdrawal
    && (!text || [recipe.name, recipe.cuisine, ...recipe.categories, ...recipe.ingredients.map(item => item.name)].join(" ").toLowerCase().includes(text))
    && (browse.category === "All" || recipe.categories.includes(browse.category))
    && (!diets.length || suits(diets, recipeLabels(recipe)))
    && (browse.time === "Any" || recipe.minutes <= +browse.time)
    && (!browse.onePot || !!recipe.onePot)
    && matchesNutritionChoices(recipe, browse.nutrition)
    && (!context.ingredient || usesIngredient(recipe, context.ingredient)));
  const rank = new Map(matches.map(recipe => [recipe.id, fitRank(recipeFit(recipe, context.diets, context.excluded))]));
  const last = new Map(matches.map(recipe => [recipe.id, cookedStats(context.cooked, recipe.id).last]));
  const byFit = (a: Recipe, b: Recipe) => rank.get(a.id)! - rank.get(b.id)!;
  return matches.sort((a, b) => browse.sort === "Time" ? a.minutes - b.minutes || byFit(a, b)
    : browse.sort === "Recent" ? last.get(b.id)! - last.get(a.id)! || byFit(a, b) : byFit(a, b));
}
