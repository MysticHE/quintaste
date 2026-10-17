import { alliums, otherExclusions } from "./preferences";
export const marketIngredients = ["Eggs", "Dairy", "Honey", ...otherExclusions,
  "Soy", "Sesame", "Mustard", "Celery", "Lupin", "Sulphites", ...alliums] as const;
export const ingredientTextLimit = 5000;
export type MarketIngredient = typeof marketIngredients[number];
export type IngredientInfo = { contains: MarketIngredient[]; mayContain: MarketIngredient[]; reviewed: boolean };
export const ingredientLabel = (value: MarketIngredient) => value === "Dairy" ? "Milk / dairy" : value;
export function readIngredientInfo(value: unknown): IngredientInfo {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const read = (input: unknown) => Array.isArray(input) ? marketIngredients.filter(item => input.includes(item)) : [];
  const contains = read(data.contains), mayContain = read(data.mayContain).filter(item => !contains.includes(item));
  const valid = (input: unknown) => Array.isArray(input) && input.every(item => marketIngredients.includes(item));
  return { contains, mayContain, reviewed: data.reviewed === true && valid(data.contains) && valid(data.mayContain) };
}
