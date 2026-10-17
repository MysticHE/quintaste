import { alliums, type Diet, type Exclusion } from "../config/preferences";
import type { Ingredient, Recipe } from "../types/food";
import { dietaryResult, hasAlliums } from "./dietary";

/** Prepared ingredients whose labels commonly hide exclusions. A label-checked line clears the rule. */
const compoundRules: { pattern: RegExp; hides: readonly Exclusion[] }[] = [
  { pattern: /\b(stock|bouillon|seasoning|curry (powder|paste)|laksa paste|rempah|sambal|chilli (bean )?paste|doubanjiang|ketchup|sweet sauce|tim cheong|hoisin|vegetarian (oyster|mushroom) sauce|mushroom sauce)\b/i, hides: [...alliums, "Gluten"] },
  { pattern: /\b(curry paste|laksa paste|rempah|chilli paste)\b/i, hides: ["Root vegetables"] },
  { pattern: /\b(yellow noodles|egg-free noodles|vegan butter|plant-based butter|margarine|mock meat|plant-based mince)\b/i, hides: ["Eggs", "Dairy", "Gluten"] },
  { pattern: /\b(fermented beancurd|fu ru)\b/i, hides: ["Gluten"] },
];
export function compoundExclusions(ingredient: Pick<Ingredient, "name" | "labelChecked">): Exclusion[] {
  if (ingredient.labelChecked) return [];
  return [...new Set(compoundRules.filter(rule => rule.pattern.test(ingredient.name)).flatMap(rule => rule.hides))];
}
export function recipeUncertain(recipe: Pick<Recipe, "ingredients" | "dietary">): Exclusion[] {
  return [...new Set(recipe.ingredients.flatMap(compoundExclusions))].filter(value => !recipe.dietary.contains.includes(value));
}
export function recipeFit(recipe: Pick<Recipe, "ingredients" | "dietary">, diet: Diet, excluded: readonly Exclusion[], now = Date.now()) {
  return dietaryResult(recipe.dietary, diet, excluded, now, recipeUncertain(recipe));
}
/** Lines to flag for label checking when they affect the user's current exclusions. */
export function labelCheckIds(recipe: Pick<Recipe, "ingredients" | "dietary">, unknown: readonly Exclusion[]) {
  return new Set(recipe.ingredients.filter(item => compoundExclusions(item).some(value => unknown.includes(value))).map(item => item.id));
}
export function alliumFree(recipe: Pick<Recipe, "ingredients" | "dietary">) {
  const { dietary } = recipe;
  return dietary.ingredientsKnown && !dietary.evidence.withdrawn && !hasAlliums(dietary) && !recipeUncertain(recipe).some(value => alliums.includes(value as typeof alliums[number]));
}
