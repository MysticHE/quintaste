import type { RecipeDraft } from "../types/recipe-workspace";

const status = "Private recipe · Not published or independently reviewed";
const servingsText = (d: RecipeDraft) => /^[1-8]$/.test(d.servings) ? d.servings + " servings" : undefined;
const ingredientText = (i: RecipeDraft["ingredients"][number]) => i.amount.trim() ? [i.amount, i.unit, i.name].filter(Boolean).join(" ") : i.name + ", to taste";
function markdown(d: RecipeDraft) {
  return ["# " + (d.title || "Untitled recipe"), status, [d.author && "By " + d.author, servingsText(d), /^\d+$/.test(d.minutes) && d.minutes + " minutes"].filter(Boolean).join(" · "),
    d.description, "## Ingredients", d.ingredients.map(i => "- " + ingredientText(i)).join("\n"),
    "## Steps", d.steps.map((s, n) => (n + 1) + ". **" + s.title + "** " + s.instruction + (s.minutes ? " (timer " + s.minutes + " min)" : "")).join("\n")].filter(Boolean).join("\n\n");
}
/** schema.org Recipe so other recipe managers can import it; photos are excluded like the private export. */
function schema(d: RecipeDraft) {
  return {
    "@context": "https://schema.org", "@type": "Recipe", name: d.title || "Untitled recipe", description: d.description || undefined,
    author: d.author ? { "@type": "Person", name: d.author } : undefined, inLanguage: d.language || undefined,
    recipeYield: servingsText(d), totalTime: /^\d+$/.test(d.minutes) ? "PT" + d.minutes + "M" : undefined,
    recipeIngredient: d.ingredients.map(ingredientText),
    recipeInstructions: d.steps.map(s => ({ "@type": "HowToStep", name: s.title, text: s.instruction })),
  };
}
export function recipesExportText(drafts: RecipeDraft[]) {
  return [drafts.map(markdown).join("\n\n---\n\n"), "---", "Recipe data (schema.org JSON)", JSON.stringify(drafts.map(schema), null, 2)].join("\n\n");
}
