import type { Recipe } from "../types/food";
import { breakfastSnacks } from "./recipe-library/breakfast-snacks";
import { classics } from "./recipe-library/classics";
import { dishesSoups } from "./recipe-library/dishes-soups";
import { noodlesRice } from "./recipe-library/noodles-rice";

export const recipes: Recipe[] = [...classics, ...breakfastSnacks, ...noodlesRice, ...dishesSoups];
const published = new Map<string, { recipe: Recipe; at: number }>();
export function rememberPublishedRecipe(recipe: Recipe, at = Date.now()) {
  published.delete(recipe.id); published.set(recipe.id, { recipe, at });
  while (published.size > 40) published.delete(published.keys().next().value!);
}
export function forgetPublishedRecipe(id: string) { published.delete(id); }
export function recipeById(id: string) {
  const entry = published.get(id);
  return recipes.find(recipe => recipe.id === id) ?? (entry && Date.now() - entry.at < 86400000 ? entry.recipe : undefined);
}
