import { recipeById } from "../data/recipes";
import type { CookingSession, Recipe } from "../types/food";
import type { RecipeDraft, RecipeWorkspace } from "../types/recipe-workspace";
import { ingredientIssue } from "../state/recipe-workspace";
import { translate, type Language, type Vars } from "../i18n";
import type { CookKey } from "../i18n/en/cook";
export type CookingRecipe = Pick<Recipe, "id" | "name" | "servings" | "ingredients" | "steps" | "revision" | "withdrawal"> & { private?: boolean };
function cookingIssueKey(d: RecipeDraft): CookKey | null {
  if (!d.title.trim()) return "issueName";
  if (!/^[1-8]$/.test(d.servings)) return "issueServings";
  if (!d.ingredients.length || d.ingredients.some(ingredientIssue)) return "issueIngredients";
  if (!d.steps.length || d.steps.some(s => !s.title.trim() || !s.instruction.trim() || (s.minutes !== "" && (!/^\d+$/.test(s.minutes) || +s.minutes < 1 || +s.minutes > 180)))) return "issueSteps";
  return null;
}
/** What stops a private draft from being cooked, in `language`, or "". */
export function cookingIssue(d: RecipeDraft, language: Language = "en") {
  const key = cookingIssueKey(d);
  return key ? translate(language, "cook", key) : "";
}
const sponsorKeys = new Map<string, CookKey>([["None", "sponsorNone"], ["Paid", "sponsorPaid"], ["Gifted", "sponsorGifted"], ["Affiliate", "sponsorAffiliate"]]);
/** A sponsorship value as shown ("" reads as not declared); the stored value stays English. */
export function sponsorshipName(value: string, language: Language) {
  const key = value ? sponsorKeys.get(value) : "sponsorNotDeclared";
  return key ? translate(language, "cook", key) : value;
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
    : { recipeId, recipeVersion: revision, step: 0, servings, startedAt: Date.now(), gathering: true, gathered: [], used: [], seen: [] };
}
export function cookingRecipeById(id: string, workspace: RecipeWorkspace): CookingRecipe | undefined {
  const sample = recipeById(id); if (sample) return sample;
  const draft = workspace.drafts.find(d => d.id === id); return draft ? privateCookingRecipe(draft) : undefined;
}
export function recipeShareText(d: RecipeDraft, language: Language = "en") {
  const t = (key: CookKey, vars?: Vars) => translate(language, "cook", key, vars);
  return [d.title || t("untitledRecipe"), d.author ? t("byAuthor", { author: d.author }) : "", t("privateStatus"),
    d.description, t("servingsCount", { n: d.servings }) + (d.minutes ? " · " + t("minutesLong", { n: d.minutes }) : ""),
    t("sponsorshipLine", { value: sponsorshipName(d.sponsorship, language) }),
    t("ingredients"), ...d.ingredients.map(i => i.amount.trim() ? [i.amount, i.unit, i.name].filter(Boolean).join(" ") : t("toTaste", { name: i.name })),
    t("steps"), ...d.steps.map((s, n) => (n + 1) + ". " + s.title + "\n" + s.instruction + (s.minutes ? "\n" + t("timerLine", { n: s.minutes }) : "")),
  ].filter(Boolean).join("\n\n");
}
