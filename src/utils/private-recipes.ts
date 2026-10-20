import { recipeById } from "../data/recipes";
import type { CookingSession, Recipe } from "../types/food";
import type { RecipeDraft, RecipeWorkspace } from "../types/recipe-workspace";
import { ingredientIssue } from "../state/recipe-workspace";
export type CookingRecipe = Pick<Recipe, "id" | "name" | "servings" | "ingredients" | "steps" | "revision" | "withdrawal"> & { private?: boolean };
export function cookingIssue(d: RecipeDraft) {
  if (!d.title.trim()) return "Add a recipe name before cooking.";
  if (!/^[1-8]$/.test(d.servings)) return "Choose 1–8 servings.";
  if (!d.ingredients.length || d.ingredients.some(ingredientIssue)) return "Complete each ingredient's name. Amounts need a unit; leave the amount blank for to taste.";
  if (!d.steps.length || d.steps.some(s => !s.title.trim() || !s.instruction.trim() || (s.minutes !== "" && (!/^\d+$/.test(s.minutes) || +s.minutes < 1 || +s.minutes > 180)))) return "Complete the steps; optional timers need 1–180 whole minutes.";
  return "";
}
export function privateCookingRecipe(d: RecipeDraft): CookingRecipe {
  return { id: d.id, name: d.title, servings: /^[1-8]$/.test(d.servings) ? +d.servings : 1, revision: d.revision, private: true,
    ingredients: d.ingredients.map(i => ({ ...i, amount: i.amount.trim() && Number.isFinite(+i.amount) ? +i.amount : null })),
    steps: d.steps.map(s => ({ title: s.title, instruction: s.instruction,
      ingredientIds: (s.ingredientIds ?? []).filter(id => d.ingredients.some(i => i.id === id)),
      ...(s.minutes && /^\d+$/.test(s.minutes) && +s.minutes >= 1 && +s.minutes <= 180 ? { timer: { label: s.title, seconds: +s.minutes * 60 } } : {}),
    })),
  };
}
/** New sessions open on Gather; resuming the same recipe revision keeps progress and only updates servings. */
export function cookingSessionFor(active: CookingSession | null, recipeId: string, revision: number, servings: number): CookingSession {
  return active?.recipeId === recipeId && (active.recipeVersion ?? 1) === revision ? { ...active, servings }
    : { recipeId, recipeVersion: revision, step: 0, servings, startedAt: Date.now(), gathering: true, gathered: [], used: [] };
}
export function cookingRecipeById(id: string, workspace: RecipeWorkspace): CookingRecipe | undefined {
  const sample = recipeById(id); if (sample) return sample;
  const draft = workspace.drafts.find(d => d.id === id); return draft ? privateCookingRecipe(draft) : undefined;
}
export function recipeShareText(d: RecipeDraft) {
  return [d.title || "Untitled recipe", d.author ? "By " + d.author : "", "Private recipe · Not published or independently reviewed",
    d.description, d.servings + " servings" + (d.minutes ? " · " + d.minutes + " minutes" : ""),
    "Sponsorship: " + (d.sponsorship || "Not declared"),
    "Ingredients", ...d.ingredients.map(i => i.amount.trim() ? [i.amount, i.unit, i.name].filter(Boolean).join(" ") : i.name + ", to taste"),
    "Steps", ...d.steps.map((s, n) => (n + 1) + ". " + s.title + "\n" + s.instruction + (s.minutes ? "\nTimer: " + s.minutes + " min" : "")),
  ].filter(Boolean).join("\n\n");
}
