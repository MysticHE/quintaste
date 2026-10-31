import type { Ingredient, RecipeStep } from "../types/food";

// Describing words that say nothing about which ingredient a step means ("light coconut milk" is the milk, not "light").
const PLAIN = new Set(["plain", "fresh", "whole", "light", "dark", "ground", "unsweetened", "sweetened", "unflavoured", "unflavored", "extra",
  "cold", "warm", "hot", "large", "small", "medium", "ripe", "chilled", "cooking", "packed", "raw", "dried", "dry", "fine", "finely", "the", "and", "for"]);
const CJK = /[㐀-鿿]/;
// A step that puts things in ("add the tubers and sago", "divide the rice and add the tofu") keeps every tag, even ones prepared earlier.
const ADDS = /\b(?:add|adds|adding|put|pour|divide|combine|stir in|fold in|mix in|place|arrange|sprinkle|scatter|garnish|serve with|top with)\b|加入|放入|倒入|拌入/i;
// Singular form, so "eggs" matches "egg", "pieces" matches "piece" and "tomatoes" matches "tomato".
const stem = (word: string) => /(?:oes|ches|shes|xes|sses)$/.test(word) ? word.slice(0, -2) : /[^s]s$/.test(word) ? word.slice(0, -1) : word;
const words = (text: string) => new Set((text.toLowerCase().match(/[a-z]+/g) ?? []).map(stem));
// The ingredient's own name, without preparation or caveats after a comma or bracket ("Pumpkin flesh, cubed" → "Pumpkin flesh").
const core = (name: string) => name.split(/[,(（，]/)[0].trim();

/**
 * The ingredients a piece of recipe text names, by a word no other ingredient in the recipe shares: "coconut" in a recipe with coconut
 * milk, oil and sugar names none of them, and "black pepper" names the black pepper, not the bell pepper. Chinese names match whole.
 * Shared by Cook mode and the game's level compiler (src/game/compile.ts), so both read a step the same way.
 */
export function namedIngredientIds(ingredients: Pick<Ingredient, "id" | "name">[], text: string): string[] {
  const names = ingredients.map(item => ({ id: item.id, name: core(item.name) }));
  const owners = new Map<string, number>();
  for (const { name } of names) for (const word of words(name)) owners.set(word, (owners.get(word) ?? 0) + 1);
  const said = words(text), lower = text.toLowerCase();
  return names.filter(({ name }) => CJK.test(name) ? lower.includes(name.toLowerCase())
    : [...words(name)].some(word => word.length > 2 && !PLAIN.has(word) && owners.get(word) === 1 && said.has(word))).map(({ id }) => id);
}

/**
 * The ingredients Cook mode lists under a step: what the step adds or handles. Recipes sometimes tag a step with everything already in
 * the pan ("Whisk until hot" listing all eight ingredients of step 1, "Lower in the coated pieces" listing the whole batter). Such a
 * step re-lists at least three earlier tags, two thirds of its own, and puts nothing in; it lists its new ingredients plus the earlier
 * ones its instruction names, by a word no other ingredient in the recipe shares ("taste and add more coconut sugar", "remove the
 * cinnamon stick"). Every other step lists its tags as they are, so assembling ("add the tubers and sago") or adding something prepared
 * earlier ("put the crushed spices in") keeps them. The recipe's own tags are not changed.
 */
export function stepIngredientIds(recipe: { ingredients: Pick<Ingredient, "id" | "name">[]; steps: Pick<RecipeStep, "instruction" | "ingredientIds">[] }, index: number) {
  const step = recipe.steps[index];
  if (!step) return [];
  const earlier = new Set(recipe.steps.slice(0, index).flatMap(item => item.ingredientIds));
  const repeated = step.ingredientIds.filter(id => earlier.has(id)).length;
  if (repeated < 3 || repeated * 3 < step.ingredientIds.length * 2 || ADDS.test(step.instruction)) return step.ingredientIds;
  const named = new Set(namedIngredientIds(recipe.ingredients, step.instruction));
  return step.ingredientIds.filter(id => !earlier.has(id) || named.has(id));
}
