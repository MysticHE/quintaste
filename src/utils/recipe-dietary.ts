import { alliums, animalExclusions, type Exclusion } from "../config/preferences";
import { labelsFrom, suits, type DietLabel } from "../config/diet-labels";
import type { Ingredient, Recipe } from "../types/food";

/** Prepared ingredients whose labels commonly hide exclusions. A label-checked line clears the rule. */
const compoundRules: { pattern: RegExp; hides: readonly Exclusion[] }[] = [
  { pattern: /\b(stock|bouillon|broth|gravy|soup base|seasoning|curry (powder|paste|sauce)|laksa paste|rempah|sambal|chill?i (bean )?paste|chill?i (oil|crisp)|doubanjiang|ketchup|sweet sauce|tim cheong|hoisin|vegetarian (oyster|mushroom) sauce|mushroom sauce|pasta sauce|marinara|tomato sauce|salsa|spice (mix|blend))\b/i, hides: [...alliums, "Gluten"] },
  { pattern: /\bpesto\b/i, hides: [...alliums, "Dairy"] },
  { pattern: /\b(puff )?pastry\b/i, hides: ["Eggs", "Dairy"] },
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
type RecipeFacts = Pick<Recipe, "ingredients" | "dietary">;
const known = (recipe: RecipeFacts) => recipe.dietary.ingredientsKnown && !recipe.dietary.evidence.withdrawn;

/**
 * The recipe's own labels from its ingredients (src/config/diet-labels.ts): Vegan when no dairy, egg or honey, Vegetarian
 * when none of the five pungent, Plant-Based when neither. A prepared ingredient that may hide one keeps that label off.
 */
export const recipeLabels = (recipe: RecipeFacts): DietLabel[] => labelsFrom(recipe.dietary.contains, known(recipe), recipeUncertain(recipe));

/**
 * How a recipe sits with the reader's own choices: Conflicts when it contains something they avoid (dairy, egg and honey
 * for Vegan; the five pungent for Vegetarian; their own exclusions), Unknown when that cannot be ruled out, else Fits.
 */
export function recipeFit(recipe: RecipeFacts, wanted: readonly DietLabel[], excluded: readonly Exclusion[]) {
  const labels = recipeLabels(recipe), uncertain = recipeUncertain(recipe), { contains } = recipe.dietary;
  const avoided = [...new Set<Exclusion>([...excluded, ...(wanted.includes("Vegan") ? animalExclusions : []), ...(wanted.includes("Vegetarian") ? alliums : [])])];
  const conflicts = avoided.filter(value => contains.includes(value));
  const unknown = avoided.filter(value => !conflicts.includes(value) && (!known(recipe) || uncertain.includes(value)));
  const fit: "Fits" | "Unknown" | "Conflicts" = conflicts.length ? "Conflicts" : unknown.length || !suits(wanted, labels) ? "Unknown" : "Fits";
  return { fit, labels, conflicts, unknown };
}
/** Sort weight for "Best fit": fits first, unknown next, conflicts last. */
export const fitRank = (result: ReturnType<typeof recipeFit>) => result.fit === "Conflicts" ? 2 : result.fit === "Unknown" ? 1 : 0;
/** Lines to flag for label checking when they affect the user's current exclusions. */
export function labelCheckIds(recipe: RecipeFacts, unknown: readonly Exclusion[]) {
  return new Set(recipe.ingredients.filter(item => compoundExclusions(item).some(value => unknown.includes(value))).map(item => item.id));
}
