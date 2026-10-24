import type { MarketKey } from "../i18n/en/market";
import { alliums, otherExclusions } from "./preferences";
export const marketIngredients = ["Eggs", "Dairy", "Honey", ...otherExclusions,
  "Soy", "Sesame", "Mustard", "Celery", "Lupin", "Sulphites", ...alliums] as const;
export const ingredientTextLimit = 5000;
export type MarketIngredient = typeof marketIngredients[number];
export type IngredientInfo = { contains: MarketIngredient[]; mayContain: MarketIngredient[]; reviewed: boolean };
/** Ingredients are stored by their English names; these message keys name them on screen. */
export const ingredientKeys: Record<MarketIngredient, MarketKey> = {
  Eggs: "ingredientEggs", Dairy: "ingredientDairy", Honey: "ingredientHoney", Peanuts: "ingredientPeanuts", "Tree nuts": "ingredientTreeNuts",
  Gluten: "ingredientGluten", Mushrooms: "ingredientMushrooms", Soy: "ingredientSoy", Sesame: "ingredientSesame", Mustard: "ingredientMustard",
  Celery: "ingredientCelery", Lupin: "ingredientLupin", Sulphites: "ingredientSulphites", Garlic: "ingredientGarlic", Onion: "ingredientOnion",
  Leeks: "ingredientLeeks", Chives: "ingredientChives", Scallions: "ingredientScallions", Shallots: "ingredientShallots", Asafoetida: "ingredientAsafoetida",
};
export function readIngredientInfo(value: unknown): IngredientInfo {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const read = (input: unknown) => Array.isArray(input) ? marketIngredients.filter(item => input.includes(item)) : [];
  const contains = read(data.contains), mayContain = read(data.mayContain).filter(item => !contains.includes(item));
  const valid = (input: unknown) => Array.isArray(input) && input.every(item => marketIngredients.includes(item));
  return { contains, mayContain, reviewed: data.reviewed === true && valid(data.contains) && valid(data.mayContain) };
}
