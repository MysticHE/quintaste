import type { Recipe } from "../types/food";
import { translate, type Language, type Vars } from "../i18n";
import type { CookKey } from "../i18n/en/cook";
import { ingredientLine } from "./food-format";
import { sponsorshipName } from "./private-recipes";

/** Plain text for sharing a published recipe, with who stands behind its ingredient claims. */
export function recipeShareMessage(recipe: Recipe, language: Language = "en") {
  const t = (key: CookKey, vars?: Vars) => translate(language, "cook", key, vars);
  const facts = translate(language, "common", "minutes", { n: recipe.minutes }) + " · " + t("servingsCount", { n: recipe.servings });
  const body = recipe.ingredients.map(i => ingredientLine(i, 1, language).text).join("\n") + "\n\n" + recipe.steps.map((s, n) => (n + 1) + ". " + s.instruction).join("\n\n");
  if (recipe.member) return recipe.name + "\n" + t("byAuthor", { author: recipe.author }) + " · " + facts + "\n" + body +
    "\n\n" + t("shareMemberFooter") + (recipe.member.sponsorship !== "None" ? "\n" + t("sponsorshipLine", { value: sponsorshipName(recipe.member.sponsorship, language) }) : "");
  return recipe.name + "\n" + facts + "\n" + body +
    (recipe.provenance ? "\n\n" + t("shareReviewedFooter") + "\n" + recipe.provenance.sources.join("\n") : "\n\n" + t("shareBundledFooter"));
}
