import type { Diet, Exclusion } from "../config/preferences";
import type { Recipe } from "../types/food";
import type { CookBrowse, CookSort, CookedEntry } from "../types/recipe-workspace";
import { evidenceRank } from "./dietary";
import { alliumFree, recipeFit } from "./recipe-dietary";

export const sortLabels: Record<CookSort, string> = { Fit: "Best fit", Time: "Quickest", Recent: "Recently cooked" };
export const selectedRecipeDiets = (browse: CookBrowse): ("Vegan" | "Vegetarian")[] => browse.diets ?? (browse.vegan ? ["Vegan"] : []);
export function cookedStats(cooked: CookedEntry[], recipeId: string) {
  const entries = cooked.filter(entry => entry.recipeId === recipeId);
  return { count: entries.length, last: entries.reduce((latest, entry) => Math.max(latest, entry.finishedAt), 0) };
}
export function activeFilterCount(browse: CookBrowse) {
  return [selectedRecipeDiets(browse).length > 0, browse.alliumFree, browse.time !== "Any", browse.onePot].filter(Boolean).length;
}
type Context = { diet: Diet; excluded: readonly Exclusion[]; cooked: CookedEntry[] };
/** Category is OR within one chip row; every Filters choice narrows (AND) across facets. */
export function browseRecipes(all: Recipe[], browse: CookBrowse, query: string, context: Context) {
  const text = query.trim().toLowerCase(), diets = selectedRecipeDiets(browse);
  const matches = all.filter(recipe => !recipe.withdrawal
    && (!text || [recipe.name, recipe.cuisine, ...recipe.categories, ...recipe.ingredients.map(item => item.name)].join(" ").toLowerCase().includes(text))
    && (browse.category === "All" || recipe.categories.includes(browse.category))
    && (!diets.length || recipe.dietary.diet !== "Unknown" && diets.includes(recipe.dietary.diet))
    && (!browse.alliumFree || alliumFree(recipe))
    && (browse.time === "Any" || recipe.minutes <= +browse.time)
    && (!browse.onePot || !!recipe.onePot));
  const rank = new Map(matches.map(recipe => [recipe.id, evidenceRank(recipeFit(recipe, context.diet, context.excluded))]));
  const last = new Map(matches.map(recipe => [recipe.id, cookedStats(context.cooked, recipe.id).last]));
  const byFit = (a: Recipe, b: Recipe) => rank.get(a.id)! - rank.get(b.id)!;
  return matches.sort((a, b) => browse.sort === "Time" ? a.minutes - b.minutes || byFit(a, b)
    : browse.sort === "Recent" ? last.get(b.id)! - last.get(a.id)! || byFit(a, b) : byFit(a, b));
}
