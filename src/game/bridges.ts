/**
 * Bridges from the game into QuinTaste (GAME_PLAN §11). They open the app; they never read the member's own food
 * choices, and Set my food choices is never prefilled from game play.
 */
import { router } from "expo-router";
import { bundledRecipes, recipeById } from "../data/recipes";
import { usesIngredient } from "../utils/recipe-browse";
import { DISHES } from "./content/dishes";
import { BUILTIN } from "./content/pack";
import { ITEMS } from "./content/items";

/** Explore keyword for each game dish: the words menus use, so the search finds places that serve it. */
const NEARBY: Record<string, string> = {
  "bee-hoon": "bee hoon", greens: "greens", kangkung: "kangkung", "kangkung-split": "kangkung", "mapo-tofu": "mapo tofu", "tomato-tofu": "tomato tofu",
  "sweet-sour": "sweet & sour", "mee-goreng": "mee goreng", "abc-soup": "abc soup", laksa: "laksa", porridge: "porridge", claypot: "claypot",
  "nasi-lemak": "nasi lemak", popiah: "popiah", bubur: "bobo cha cha", sago: "sago",
};
/** Cook ingredient words where the game name differs; null where a match would mislead (egg-free noodles are not "with egg"). */
const COOK_TERMS: Record<string, string | null> = { "kangkung-stems": "kangkung", "kangkung-leaves": "kangkung", "button-mushrooms": "mushrooms", egg: null, "dairy-milk": null };

/** The Cook recipe for a game dish: its allium-free adaptation when the guest kept no five pungent. A recipe level's dish opens its own
 *  recipe page (QuinTaste's or a member's), which the bundled list doesn't hold. */
export function cookRecipeId(dishId: string, alliumFree = false): string | null {
  const id = DISHES[dishId]?.recipeId, recipe = id ? recipeById(id) : undefined;
  if (!recipe) return id && !(dishId in BUILTIN.dishes) ? id : null;
  return alliumFree && recipe.adaptationId && recipeById(recipe.adaptationId) ? recipe.adaptationId : recipe.id;
}
export const nearbyTerm = (dishId: string): string | null => NEARBY[dishId] ?? null;
/** The Cook ingredient filter for a pantry item, only when a recipe in the app actually uses it. */
export function ingredientTerm(itemId: string): string | null {
  const it = ITEMS[itemId]; if (!it) return null;
  const term = itemId in COOK_TERMS ? COOK_TERMS[itemId] : it.name.toLowerCase();
  return term && bundledRecipes().some(recipe => usesIngredient(recipe, term)) ? term : null;
}

export const openRecipe = (id: string) => router.push({ pathname: "/cook/recipe/[id]", params: { id } });
export { openNearby } from "../utils/navigation";
export const openIngredient = (term: string) => router.push({ pathname: "/cook", params: { ingredient: term } });
export const openFoodChoices = () => router.push("/food-choices");
