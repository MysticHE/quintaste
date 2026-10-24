import type { RecipeDraft } from "../types/recipe-workspace";
import { translate, type Language, type Vars } from "../i18n";
import type { CookKey } from "../i18n/en/cook";

type Say = (key: CookKey, vars?: Vars) => string;
const servingsText = (d: RecipeDraft, t: Say) => /^[1-8]$/.test(d.servings) ? t("servingsCount", { n: d.servings }) : undefined;
const ingredientText = (i: RecipeDraft["ingredients"][number], t: Say) => i.amount.trim() ? [i.amount, i.unit, i.name].filter(Boolean).join(" ") : t("toTaste", { name: i.name });
function markdown(d: RecipeDraft, t: Say) {
  return ["# " + (d.title || t("untitledRecipe")), t("privateStatus"), [d.author && t("byAuthor", { author: d.author }), servingsText(d, t), /^\d+$/.test(d.minutes) && t("minutesLong", { n: d.minutes })].filter(Boolean).join(" · "),
    d.description, "## " + t("ingredients"), d.ingredients.map(i => "- " + ingredientText(i, t)).join("\n"),
    "## " + t("steps"), d.steps.map((s, n) => (n + 1) + ". **" + s.title + "** " + s.instruction + (s.minutes ? t("exportTimer", { n: s.minutes }) : "")).join("\n")].filter(Boolean).join("\n\n");
}
/** schema.org Recipe so other recipe managers can import it; photos are excluded like the private export. */
function schema(d: RecipeDraft, t: Say) {
  return {
    "@context": "https://schema.org", "@type": "Recipe", name: d.title || t("untitledRecipe"), description: d.description || undefined,
    author: d.author ? { "@type": "Person", name: d.author } : undefined, inLanguage: d.language || undefined,
    recipeYield: servingsText(d, t), totalTime: /^\d+$/.test(d.minutes) ? "PT" + d.minutes + "M" : undefined,
    recipeIngredient: d.ingredients.map(i => ingredientText(i, t)),
    recipeInstructions: d.steps.map(s => ({ "@type": "HowToStep", name: s.title, text: s.instruction })),
  };
}
export function recipesExportText(drafts: RecipeDraft[], language: Language = "en") {
  const t: Say = (key, vars) => translate(language, "cook", key, vars);
  return [drafts.map(d => markdown(d, t)).join("\n\n---\n\n"), "---", t("exportData"), JSON.stringify(drafts.map(d => schema(d, t)), null, 2)].join("\n\n");
}
