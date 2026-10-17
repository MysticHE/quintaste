import type { RecipeCategory } from "./food";
export type RecipeDraftIngredient = { id: string; name: string; amount: string; unit: string };
export type RecipeDraftStep = { id: string; title: string; instruction: string; minutes: string; photo?: string; ingredientIds?: string[] };
export type RecipeDraft = {
  id: string; title: string; description: string; author: string; language: string; servings: string; minutes: string;
  diet: "Vegan" | "Vegetarian" | "Unspecified"; photo?: string; ingredients: RecipeDraftIngredient[]; steps: RecipeDraftStep[];
  sponsorship: "" | "None" | "Paid" | "Gifted" | "Affiliate"; rights: boolean; policy: boolean; status: "draft" | "ready"; revision: number; updatedAt: number;
};
/** Recipe-added notes carry structured name/amount/unit so identical lines can merge; manual notes use text only. */
export type ShoppingNote = { id: string; recipeId: string; text: string; checked: boolean; name?: string; amount?: number | null; unit?: string };
export type CookSort = "Fit" | "Time" | "Recent";
export type CookBrowse = {
  category: "All" | RecipeCategory; vegan: boolean; alliumFree: boolean; time: "Any" | "15" | "30";
  onePot: boolean; saved: boolean; sort: CookSort; diets?: ("Vegan" | "Vegetarian")[];
};
export type CookedEntry = { recipeId: string; revision: number; servings: number; finishedAt: number };
export type RecipeWorkspace = {
  drafts: RecipeDraft[]; shopping: ShoppingNote[]; browse: CookBrowse; cooked: CookedEntry[]; shoppingView: "combined" | "recipe";
};
