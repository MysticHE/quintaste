import type { Recipe } from "../types/food";
import type { RecipeWorkspace, ShoppingNote } from "../types/recipe-workspace";
import { ingredientLine } from "./food-format";

export const aisles = ["Vegetables & fruit", "Tofu & soy", "Rice, noodles & bread", "Sauces & pastes", "Oils, spices & dry goods", "Coconut & plant milks", "Other"] as const;
export type Aisle = (typeof aisles)[number];
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
type ShoppingRecipe = Pick<Recipe, "id" | "ingredients" | "servings">;
function lineNote(recipe: ShoppingRecipe, item: Recipe["ingredients"][number], servings: number, checked = false): ShoppingNote {
  const scale = servings / recipe.servings;
  return { id: recipe.id + "-" + item.id, recipeId: recipe.id, text: ingredientLine(item, scale).text, checked,
    name: item.name, amount: item.amount === null ? null : item.amount * scale, unit: item.unit };
}
/** Adds a recipe's scaled ingredients (or only ingredientIds); re-adding replaces that recipe's amounts instead of duplicating lines.
 *  A tick survives only when the line is unchanged, so a larger amount is never hidden as already bought. */
export function addRecipeToShopping(workspace: RecipeWorkspace, recipe: ShoppingRecipe, servings: number, ingredientIds?: string[]): RecipeWorkspace {
  const notes = recipe.ingredients.filter(item => ingredientIds ? ingredientIds.includes(item.id) : !/^water\b/i.test(item.name)).map(item => lineNote(recipe, item, servings));
  const fresh = new Map(notes.map(note => [note.id, note]));
  const kept = workspace.shopping.map(note => {
    const next = fresh.get(note.id);
    return next ? { ...next, checked: note.checked && note.text === next.text } : note;
  });
  return { ...workspace, shopping: [...kept, ...notes.filter(note => !workspace.shopping.some(existing => existing.id === note.id))] };
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
export type ShoppingRow = { key: string; ids: string[]; text: string; spoken: string; checked: boolean; recipeIds: string[]; aisle: Aisle };
function mergeKey(note: ShoppingNote) {
  return note.name ? note.name.trim().toLowerCase() + "|" + (note.amount === null ? "to-taste" : (note.unit ?? "").toLowerCase()) : "note|" + note.id;
}
function toRow(group: ShoppingNote[]): ShoppingRow {
  const first = group[0];
  const line = first.name && group.length > 1
    ? ingredientLine({ name: first.name, unit: first.unit ?? "", amount: first.amount === null || first.amount === undefined ? null : group.reduce((sum, note) => sum + (note.amount ?? 0), 0) })
    : { text: first.text, spoken: first.text };
  return { key: mergeKey(first), ids: group.map(note => note.id), text: line.text, spoken: line.spoken, checked: group.every(note => note.checked),
    recipeIds: [...new Set(group.map(note => note.recipeId).filter(Boolean))], aisle: aisleFor(first.name ?? first.text) };
}
/** Identical name + unit lines merge across recipes; different units never merge. */
export function combinedRows(notes: ShoppingNote[]) {
  const groups = new Map<string, ShoppingNote[]>();
  for (const note of notes) groups.set(mergeKey(note), [...(groups.get(mergeKey(note)) ?? []), note]);
  const rows = [...groups.values()].map(toRow);
  return aisles.map(aisle => ({ title: aisle as string, rows: rows.filter(row => row.aisle === aisle) })).filter(section => section.rows.length);
}
export function recipeRows(notes: ShoppingNote[], recipeName: (id: string) => string) {
  const order = [...new Set(notes.map(note => note.recipeId))];
  // Unmerged rows key by note id: one recipe can list the same name and unit twice.
  return order.map(recipeId => ({ title: recipeId ? recipeName(recipeId) : "Your items", rows: notes.filter(note => note.recipeId === recipeId).map(note => ({ ...toRow([note]), key: note.id })) }));
}
export function shoppingShareText(notes: ShoppingNote[]) {
  const sections = combinedRows(notes.filter(note => !note.checked));
  return ["Shopping list", ...sections.map(section => section.title + "\n" + section.rows.map(row => "- " + row.text).join("\n"))].join("\n\n");
}
