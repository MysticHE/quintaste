import type { Recipe } from "../types/food";
import { ingredientLine } from "./food-format";

/** Plain text for sharing a published recipe, with who stands behind its ingredient claims. */
export function recipeShareMessage(recipe: Recipe) {
  if (recipe.member) return recipe.name + "\nBy " + recipe.author + " · " + recipe.minutes + " min · " + recipe.servings + " servings\n" +
    recipe.ingredients.map(i => ingredientLine(i).text).join("\n") + "\n\n" + recipe.steps.map((s, n) => (n + 1) + ". " + s.instruction).join("\n\n") +
    "\n\nShared on QuinTaste · Ingredient claims are the author’s." + (recipe.member.sponsorship !== "None" ? "\nSponsorship: " + recipe.member.sponsorship : "");
  return recipe.name + "\n" + recipe.minutes + " min · " + recipe.servings + " servings\n" +
    recipe.ingredients.map(i => ingredientLine(i).text).join("\n") + "\n\n" +
    recipe.steps.map((s, n) => (n + 1) + ". " + s.instruction).join("\n\n") + (recipe.provenance ? "\n\nQuinTaste · Source-reviewed adaptation; not kitchen-tested.\n" + recipe.provenance.sources.join("\n") : "\n\nQuinTaste bundled recipe · Ingredient claims unreviewed.");
}
