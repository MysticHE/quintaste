import type { Recipe } from "../types/food";
import type { ShoppingNote } from "../types/recipe-workspace";
import { ingredientLine } from "./food-format";

/** Aisles still sort the ingredient library; the shopping list itself was removed (owner, 25 Oct 2026). */
export type Aisle = "Vegetables & fruit" | "Tofu & soy" | "Rice, noodles & bread" | "Sauces & pastes" | "Oils, spices & dry goods" | "Coconut & plant milks" | "Other";
/** Ordered: the first match wins, so "soy sauce" is a sauce and "rice vinegar" is not rice. */
const aisleRules: [RegExp, Aisle][] = [
  [/coconut milk|oat milk|soy milk|plant-based butter|vegan butter/i, "Coconut & plant milks"],
  [/sauce|paste|ketchup|kecap|miso|vinegar|tamarind|fu ru|fermented|sambal|stock/i, "Sauces & pastes"],
  [/\boil\b|salt|sugar|pepper|spice|ground|seeds|cornflour|starch|gula melaka|black beans|peanuts|nuts/i, "Oils, spices & dry goods"],
  [/tofu|tempeh|edamame|beancurd|tau pok|tau kwa/i, "Tofu & soy"],
  [/rice|noodle|bee hoon|vermicelli|bread|oats|sago|skins|flour|pasta/i, "Rice, noodles & bread"],
  [/mushroom|shiitake|cabbage|avocado|greens|bok choy|choy sum|broccoli|sprouts|ginger|chilli|lime|lemon|tomato|potato|carrot|corn|pineapple|cucumber|capsicum|kangkung|pandan|onion|garlic|shallot|coriander|jicama|lettuce|yam|leaves|lemongrass|fruit|vegetable/i, "Vegetables & fruit"],
];
export function aisleFor(text: string): Aisle {
  return aisleRules.find(([pattern]) => pattern.test(text))?.[1] ?? "Other";
}
type ShoppingRecipe = Pick<Recipe, "id" | "name" | "ingredients" | "servings">;
/** Water is in recipes but never bought: it is left out of whole-recipe adds, recipe totals and suggestions. */
export const isWater = (name: string) => /^water\b/i.test(name);
const shoppingLineId = (recipeId: string, ingredientId: string) => recipeId + "-" + ingredientId;
function lineNote(recipe: ShoppingRecipe, item: Recipe["ingredients"][number], servings: number, checked = false): ShoppingNote {
  const scale = servings / recipe.servings;
  return { id: shoppingLineId(recipe.id, item.id), recipeId: recipe.id, recipeName: recipe.name, text: ingredientLine(item, scale).text, checked,
    name: item.name, amount: item.amount === null ? null : item.amount * scale, unit: item.unit };
}
/** Lines saved before 17 October 2026 are text-only with ids `recipeId-ingredientId-[revision-]servings`.
 *  Rebuild them as structured lines so they merge with new additions; unmatched notes stay as written. */
export function upgradeLegacyShopping(notes: ShoppingNote[], resolve: (recipeId: string) => ShoppingRecipe | undefined): ShoppingNote[] {
  const out: ShoppingNote[] = [], index = new Map<string, number>();
  for (const note of notes) {
    const recipe = !note.name && note.recipeId ? resolve(note.recipeId) : undefined;
    const rest = recipe && note.id.startsWith(recipe.id + "-") ? note.id.slice(recipe.id.length + 1) : "";
    const item = recipe?.ingredients.find(i => rest.startsWith(i.id + "-") && /^(\d+-)?[1-8]$/.test(rest.slice(i.id.length + 1)));
    const next = recipe && item ? lineNote(recipe, item, Number(rest.split("-").pop()), note.checked) : note;
    const seen = index.get(next.id);
    if (seen === undefined) { index.set(next.id, out.length); out.push(next); }
    else out[seen] = { ...next, checked: out[seen].checked && next.checked };
  }
  return out;
}
