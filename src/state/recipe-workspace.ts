import { recipeCategories } from "../types/food";
import { readLabels, type DietLabel } from "../config/diet-labels";
import { nutritionChoices, type CookBrowse, type CookedEntry, type RecipeDraft, type RecipeDraftIngredient, type RecipeWorkspace } from "../types/recipe-workspace";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";
const rows = (value: unknown) => Array.isArray(value) ? value.slice(0, 100).map(record) : [];
export const defaultCookBrowse: CookBrowse = { category: "All", labels: [], time: "Any", onePot: false, sort: "Fit", nutrition: [] };
export const cookedLimit = 200;
export const emptyRecipeWorkspace = (): RecipeWorkspace => ({ drafts: [], shopping: [], browse: defaultCookBrowse, cooked: [], shoppingView: "combined" });
/** A blank amount means "to taste"; any amount given must be positive with a unit. */
export function ingredientIssue(i: RecipeDraftIngredient) {
  if (!i.name.trim()) return true;
  if (!i.amount.trim()) return false;
  return !/^\d+(\.\d{1,3})?$/.test(i.amount.trim()) || +i.amount <= 0 || !i.unit.trim();
}
const choice = <T extends string>(value: unknown, values: readonly T[], fallback: T): T => values.includes(value as T) ? value as T : fallback;
/**
 * Diet labels chosen in Cook filters. Before 20 Oct 2026 the filter stored `diets`, matched as OR (Vegetarian then meant
 * eggs and dairy allowed, which every recipe is, so only Vegan on its own narrowed anything), and a separate `alliumFree`
 * toggle, now the Vegetarian label; `vegan` and a string `filter` are older still.
 */
function readBrowseLabels(b: Record<string, unknown>, legacy: unknown): DietLabel[] {
  if (Array.isArray(b.labels)) return readLabels(b.labels).filter(label => label !== "Plant-Based");
  const old = Array.isArray(b.diets) ? b.diets.filter(diet => diet === "Vegan" || diet === "Vegetarian") : null;
  const vegan = old ? old.length === 1 && old[0] === "Vegan" : legacy === "Vegan" || b.vegan === true;
  const vegetarian = legacy === "No alliums" || b.alliumFree === true;
  return [...(vegan ? ["Vegan" as const] : []), ...(vegetarian ? ["Vegetarian" as const] : [])];
}
function readBrowse(value: unknown, legacy: unknown): CookBrowse {
  const b = record(value);
  if (!Object.keys(b).length) return { ...defaultCookBrowse, labels: readBrowseLabels(b, legacy) };
  const storedNutrition = b.nutrition;
  const nutrition = Array.isArray(storedNutrition) ? nutritionChoices.filter(item => storedNutrition.includes(item)) : [];
  return { category: choice(b.category, ["All", ...recipeCategories] as const, "All"), labels: readBrowseLabels(b, legacy),
    time: choice(b.time, ["Any", "15", "30"] as const, "Any"), onePot: b.onePot === true, sort: choice(b.sort, ["Fit", "Time", "Recent"] as const, "Fit"), nutrition };
}
function readCooked(value: unknown): CookedEntry[] {
  return (Array.isArray(value) ? value.slice(0, cookedLimit).map(record) : []).filter(e => /^[a-z0-9-]{1,80}$/.test(String(e.recipeId)) && typeof e.finishedAt === "number" && Number.isFinite(e.finishedAt))
    .map(e => ({ recipeId: String(e.recipeId), revision: Number.isInteger(e.revision) ? Math.max(1, Number(e.revision)) : 1,
      servings: Number.isInteger(e.servings) ? Math.max(1, Math.min(8, Number(e.servings))) : 1, finishedAt: Number(e.finishedAt) }));
}
export const emptyRecipeDraft = (id: string): RecipeDraft => ({ id, title: "", description: "", author: "", language: "English", servings: "2", minutes: "", categories: [], ingredients: [], steps: [], sponsorship: "", rights: false, policy: false, status: "draft", revision: 1, updatedAt: Date.now() });
export function recipePhoto(value: unknown) {
  return typeof value === "string" && value.length <= 300000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : undefined;
}
export function publicationIssue(d: RecipeDraft) {
  if (!d.title.trim() || !d.author.trim() || !d.language.trim() || !d.description.trim()) return "Add a name, description, author and language.";
  if (!d.photo) return "Add a recipe photo.";
  if (!/^[1-8]$/.test(d.servings) || !/^\d+$/.test(d.minutes) || +d.minutes < 1 || +d.minutes > 1440) return "Choose 1–8 servings and a total time from 1 to 1440 minutes.";
  if (!d.categories.length) return "Choose a category.";
  if (!d.ingredients.length || d.ingredients.some(ingredientIssue)) return "Give every ingredient a name. Amounts need a unit (use item for whole pieces); leave the amount blank for to-taste ingredients.";
  if (!d.steps.length || d.steps.some(s => !s.title.trim() || !s.instruction.trim() || (s.minutes !== "" && (!/^\d+$/.test(s.minutes) || +s.minutes < 1 || +s.minutes > 180)))) return "Add a title and instructions to each step. Optional timers must be 1–180 whole minutes.";
  if (!d.sponsorship) return "Choose a sponsorship disclosure, including None if there is no sponsorship.";
  if (!d.rights || !d.policy) return "Confirm your content rights and publication policy.";
  return "";
}
export function readRecipeWorkspace(value: unknown): RecipeWorkspace {
  const v = record(value), seen = new Set<string>();
  const drafts = rows(v.drafts).filter(d => typeof d.id === "string" && /^[a-z0-9-]{1,80}$/.test(d.id) && !seen.has(d.id) && !!seen.add(d.id)).slice(0, 20).map(d => {
    const draft: RecipeDraft = { ...emptyRecipeDraft(String(d.id)), title: text(d.title, 100), description: text(d.description, 2000), author: text(d.author, 80), language: text(d.language, 40), servings: text(d.servings, 2), minutes: text(d.minutes, 4), categories: Array.isArray(d.categories) ? recipeCategories.filter(c => (d.categories as unknown[]).includes(c)).slice(0, 2) : [], photo: recipePhoto(d.photo), sponsorship: d.sponsorship === "None" || d.sponsorship === "Paid" || d.sponsorship === "Gifted" || d.sponsorship === "Affiliate" ? d.sponsorship : "", rights: d.rights === true, policy: d.policy === true, revision: Number.isInteger(d.revision) ? Math.max(1, Math.min(10000, Number(d.revision))) : 1, updatedAt: typeof d.updatedAt === "number" && Number.isFinite(d.updatedAt) ? d.updatedAt : 0,
      ingredients: rows(d.ingredients).slice(0, 40).map((i, n) => ({ id: text(i.id, 80) || "ingredient-" + n, name: text(i.name, 120), amount: text(i.amount, 12), unit: text(i.unit, 24), ...(typeof i.listingId === "string" && /^[0-9a-f-]{36}$/.test(i.listingId) ? { listingId: i.listingId } : {}) })),
      steps: rows(d.steps).slice(0, 30).map((s, n) => ({ id: text(s.id, 80) || "step-" + n, title: text(s.title, 120), instruction: text(s.instruction, 3000), minutes: text(s.minutes, 3), photo: recipePhoto(s.photo), ingredientIds: Array.isArray(s.ingredientIds) ? [...new Set(s.ingredientIds.filter((id): id is string => typeof id === "string" && rows(d.ingredients).some(i => i.id === id)))].slice(0, 40) : [] })) };
    draft.status = d.status === "ready" && !publicationIssue(draft) ? "ready" : "draft";
    return draft;
  });
  const shopping = rows(v.shopping).filter(n => text(n.id, 80) && text(n.text, 300)).map(n => ({ id: text(n.id, 80), recipeId: text(n.recipeId, 80), text: text(n.text, 300), checked: n.checked === true,
    ...(text(n.name, 120) ? { name: text(n.name, 120), amount: typeof n.amount === "number" && Number.isFinite(n.amount) && n.amount > 0 ? n.amount : null, unit: text(n.unit, 24) } : {}) }));
  return { drafts, shopping, browse: readBrowse(v.browse, v.filter), cooked: readCooked(v.cooked), shoppingView: v.shoppingView === "recipe" ? "recipe" : "combined" };
}
export function workspaceSizeIssue(workspace: RecipeWorkspace) {
  const bytes = workspace.drafts.reduce((n, d) => n + (d.photo?.length ?? 0) + d.steps.reduce((m, s) => m + (s.photo?.length ?? 0), 0), 0);
  return workspace.drafts.length > 20 ? "Keep up to 20 recipe drafts. Delete a draft before adding another." : bytes > 1200000 ? "Recipe photo storage is full. Remove a photo or choose a smaller image." : workspace.shopping.length > 100 ? "Your shopping notes are full. Remove a note first." : "";
}
export function mergeRecipeWorkspace(profile: RecipeWorkspace, guest: RecipeWorkspace): RecipeWorkspace {
  const cooked = [...profile.cooked, ...guest.cooked.filter(g => !profile.cooked.some(p => p.recipeId === g.recipeId && p.finishedAt === g.finishedAt))]
    .sort((a, b) => b.finishedAt - a.finishedAt).slice(0, cookedLimit);
  const merged = { ...profile, cooked, drafts: [...profile.drafts, ...guest.drafts.filter(d => !profile.drafts.some(p => p.id === d.id)).map(d => ({ ...d, rights: false, policy: false, status: "draft" as const }))], shopping: [...profile.shopping, ...guest.shopping.filter(n => !profile.shopping.some(p => p.id === n.id))] };
  const issue = workspaceSizeIssue(merged); if (issue) throw new Error(issue); return merged;
}
