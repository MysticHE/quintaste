import type { RecipeCategory } from "./food";
/** `listingId` links the line to one of the author's own Market items. */
export type RecipeDraftIngredient = { id: string; name: string; amount: string; unit: string; listingId?: string };
export type RecipeDraftStep = { id: string; title: string; instruction: string; minutes: string; photo?: string; ingredientIds?: string[] };
export type RecipeDraft = {
  id: string; title: string; description: string; author: string; language: string; servings: string; minutes: string;
  diet: "Vegan" | "Vegetarian" | "Unspecified"; categories: RecipeCategory[]; photo?: string; ingredients: RecipeDraftIngredient[]; steps: RecipeDraftStep[];
  sponsorship: "" | "None" | "Paid" | "Gifted" | "Affiliate"; rights: boolean; policy: boolean; status: "draft" | "ready"; revision: number; updatedAt: number;
};
/** Recipe-added notes carry structured name/amount/unit so identical lines can merge; manual notes use text only. */
export type ShoppingNote = { id: string; recipeId: string; text: string; checked: boolean; name?: string; amount?: number | null; unit?: string };
export type CookSort = "Fit" | "Time" | "Recent";
/** Nutrition filter choices, worded as the badges they match (config/nutrition-standards.ts); AND across choices. */
export const nutritionChoices = ["Under 500 kcal", "Higher protein", "Higher fibre", "Under 300 mg sodium"] as const;
export type NutritionChoice = (typeof nutritionChoices)[number];
export type CookBrowse = {
  category: "All" | RecipeCategory; vegan: boolean; alliumFree: boolean; time: "Any" | "15" | "30";
  onePot: boolean; sort: CookSort; diets?: ("Vegan" | "Vegetarian")[]; nutrition?: NutritionChoice[];
};
export type CookedEntry = { recipeId: string; revision: number; servings: number; finishedAt: number };
export type RecipeWorkspace = {
  drafts: RecipeDraft[]; shopping: ShoppingNote[]; browse: CookBrowse; cooked: CookedEntry[]; shoppingView: "combined" | "recipe";
};
