import { communityRequest as call } from "./community-api";
import type { Ingredient, Recipe, RecipeCategory } from "../types/food";
import type { RecipeDraft } from "../types/recipe-workspace";
import type { Exclusion, Language } from "../config/preferences";
import { translate } from "../i18n";

type MemberSummary = {
  id: string; name: string; description: string; minutes: number; servings: number; categories: RecipeCategory[]; diet: "Vegan" | "Vegetarian";
  author: string; language: string; sponsorship: string; revision: number; updatedAt: string; image: string | null; ingredientNames: string[];
  nutrition?: Recipe["nutrition"]; source?: Recipe["source"];
  /** Exclusion tags the server read from the ingredient names; the diet labels come from these. */
  contains?: Exclusion[];
};
type MemberDetail = MemberSummary & {
  own: boolean; shop: { id: string; name: string } | null;
  ingredients: Ingredient[]; steps: { title: string; instruction: string; minutes: number | null; ingredientIds: string[]; photo: string | null; at?: number; image?: "frame" | "illustration" }[];
};
export type MyRecipeStatus = { id: string; draftKey: string; live: boolean; liveRevision: number | null; state: "review" | "declined" | null; pendingRevision: number | null; note: string; hidden: boolean };

/** Shared recipe fields in the app's Recipe shape. Diet labels come from the ingredient tags the server reads. */
function base(r: MemberSummary): Omit<Recipe, "ingredients" | "steps"> {
  return { id: r.id, name: r.name, description: r.description, minutes: r.minutes, servings: r.servings, cuisine: "", categories: r.categories,
    dietary: { diet: r.diet, contains: r.contains ?? [], ingredientsKnown: !!r.contains,
      evidence: { source: r.source ? "Read from the video or recipe pages by AI" : "Read from the ingredient list", kind: "community" } },
    author: r.author, language: r.language, revision: r.revision, updatedAt: r.updatedAt,
    ...(r.image ? { image: { path: r.image, width: 1280, height: 960, credit: r.author } } : {}),
    ...(r.nutrition ? { nutrition: r.nutrition } : {}), ...(r.source ? { source: r.source } : {}),
    member: { sponsorship: r.sponsorship, own: false, shop: null } };
}
export function memberSummary(r: MemberSummary): Recipe {
  return { ...base(r), ingredients: r.ingredientNames.map((name, index) => ({ id: "preview-" + index, name, amount: null, unit: "" })), steps: [] };
}
export function memberRecipe(r: MemberDetail): Recipe {
  return { ...base(r), member: { sponsorship: r.sponsorship, own: r.own, shop: r.shop }, ingredients: r.ingredients,
    steps: r.steps.map(s => ({ title: s.title, instruction: s.instruction, ingredientIds: s.ingredientIds, ...(s.minutes ? { timer: { label: s.title, seconds: s.minutes * 60 } } : {}), ...(typeof s.at === "number" ? { at: s.at } : {}),
      ...(s.photo ? { photo: s.photo } : {}), ...(s.image ? { image: s.image } : {}) })) };
}
export const isMemberRecipe = (id: string | null | undefined) => !!id && /^member-[0-9a-f-]{36}$/.test(id);
export function browsePath(q: string, category: string, cursor: number | null) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", String(cursor));
  return "/api/recipes?" + params.toString();
}
export const memberRecipes = (path: string, signal: AbortSignal) => call<{ items: MemberSummary[]; next: number | null }>(path, { signal });
export const memberRecipeDetail = (id: string, signal: AbortSignal) => call<MemberDetail>("/api/recipes/" + id, { signal });
export const myRecipes = (signal: AbortSignal) => call<{ items: MyRecipeStatus[] }>("/api/recipes/mine", { signal });
export const withdrawRecipe = (draftKey: string) => call<{ removed: boolean }>("/api/recipes/mine/" + draftKey, { method: "DELETE" });
export const withdrawRecipes = (draftKeys: string[]) => call<{ removed: number }>("/api/recipes/mine?keys=" + draftKeys.map(encodeURIComponent).join(","), { method: "DELETE" });
/** Sends the draft, its photos and its shop links for staff review. */
export function submitRecipe(d: RecipeDraft) {
  const photos: Record<string, string> = {};
  if (d.photo) photos.cover = d.photo;
  d.steps.forEach((s, index) => { if (s.photo) photos["step-" + index] = s.photo; });
  const recipe = { title: d.title, description: d.description, author: d.author, language: d.language, servings: d.servings, minutes: d.minutes,
    categories: d.categories, sponsorship: d.sponsorship, rights: d.rights, policy: d.policy, revision: d.revision,
    ingredients: d.ingredients.map(i => ({ id: i.id, name: i.name, amount: i.amount, unit: i.unit, ...(i.listingId ? { listingId: i.listingId } : {}) })),
    steps: d.steps.map(s => ({ title: s.title, instruction: s.instruction, minutes: s.minutes, ingredientIds: s.ingredientIds ?? [] })) };
  return call<{ id: string; state: "review" }>("/api/recipes/mine/" + d.id, { method: "PUT", body: { recipe, photos } });
}
/** One short status for a draft beside its server record. A newer local revision means edits were not sent. */
export function recipeStatus(d: RecipeDraft, mine: MyRecipeStatus | undefined, language: Language = "en") {
  const say = (key: Parameters<typeof translate<"cook">>[2]) => translate(language, "cook", key);
  if (!mine) return say(d.status === "ready" ? "statusReadyToSubmit" : "statusPrivateDraft");
  const sent = mine.state ? mine.pendingRevision : mine.liveRevision, unsent = sent !== null && d.revision > sent ? say("statusChangesNotSubmitted") : "";
  if (mine.live && mine.hidden) return say("statusHidden") + unsent;
  if (mine.live) return say("statusPublished") + (mine.state === "review" ? say("statusUpdateInReview") : mine.state === "declined" ? say("statusUpdateNotApproved") : "") + unsent;
  return say(mine.state === "review" ? "statusInReview" : "statusNotApproved") + unsent;
}
