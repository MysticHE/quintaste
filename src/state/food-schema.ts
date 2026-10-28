import { readAvatar } from "../utils/avatar-schema";
import { emptyRecipeWorkspace, readRecipeWorkspace, mergeRecipeWorkspace } from "./recipe-workspace";
import { readExploreLocal, mergeExploreLocal } from "../utils/explore-local-schema";
import { emptySocial } from "../types/social";
import { readSocial, mergeSocial } from "./social-schema";
import { emptyMarket } from "../types/market";
import { readMarket, mergeMarket } from "./market-schema";
import { areaById } from "../data/areas";
import { readDiscoverySettings } from "../utils/discovery-settings";
import { emptyGame, mergeGame, readGame } from "../game/progress";
import { readPrivatePoint, privatePlaceKind } from "../utils/private-places";
import { recipeById } from "../data/recipes";
import { cookingRecipeById } from "../utils/private-recipes";
import { upgradeLegacyShopping } from "../utils/shopping";
import type { FoodDocument, CookingTimer, LocalCase, PrivatePlace, SavedItem } from "../types/food";

export function emptyFoodDocument(): FoodDocument {
  return {
    avatar: null, recipes: emptyRecipeWorkspace(),
    version: 1, areaId: "tiong-bahru", searchArea: "", onboardingDone: false, adultConfirmed: false,
    saves: [], notes: {}, lists: [], privatePlaces: [], cases: [], cooking: null, timers: [],
    market: emptyMarket(), social: emptySocial(), exploreLocal: readExploreLocal(undefined),
    discoverySettings: readDiscoverySettings(undefined),
    game: emptyGame(),
    notifications: { cooking: false, cases: false, saved: false, marketing: false, quietStart: "22:00", quietEnd: "08:00" },
  };
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, max = 100) { return typeof value === "string" ? value.slice(0, max) : ""; }
function number(value: unknown, fallback = 0) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function array(value: unknown) { return Array.isArray(value) ? value.slice(0, 500).map(record) : []; }
function unique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter(item => { const id = key(item); if (seen.has(id)) return false; seen.add(id); return true; });
}
function readSaves(value: unknown): SavedItem[] {
  return unique(array(value).filter(item => ["place", "dish", "recipe"].includes(String(item.kind)) && (/^[a-z0-9-]{1,80}$/.test(String(item.id)) || (item.kind === "place" && /^(?:google-[A-Za-z0-9_-]{10,200}|catalogue-[a-z0-9-]{3,120})$/.test(String(item.id)))))
    .map(item => ({ kind: item.kind as SavedItem["kind"], id: String(item.id), savedAt: number(item.savedAt), list: text(item.list, 40) })), item => item.kind + ":" + item.id);
}
function readPlaces(value: unknown): PrivatePlace[] {
  const places = unique(array(value).filter(item => text(item.id) && text(item.label))
    .map(item => ({ id: text(item.id), label: text(item.label, 40),
      kind: privatePlaceKind({ kind: item.kind, label: text(item.label, 40) }),
      areaId: areaById(String(item.areaId)) ? String(item.areaId) : undefined,
      address: text(item.address, 500), details: text(item.details, 100), point: readPrivatePoint(item.point),
      postalCode: typeof item.postalCode === "string" && /^[0-9]{6}$/.test(item.postalCode) ? item.postalCode : undefined,
      isDefault: item.isDefault === true })), item => item.id).slice(0, 20);
  const defaultId = places.find(item => item.isDefault)?.id ?? places[0]?.id;
  return places.map(item => ({ ...item, isDefault: item.id === defaultId }));
}
function readTimers(value: unknown): CookingTimer[] {
  return unique(array(value).filter(item => (recipeById(String(item.recipeId)) || /^recipe-[a-z0-9-]{1,73}$/.test(String(item.recipeId))) && text(item.id) && number(item.duration) > 0)
    .map(item => ({ id: text(item.id), recipeId: String(item.recipeId), label: text(item.label, 80),
      duration: Math.min(86400, number(item.duration)), endsAt: typeof item.endsAt === "number" && Number.isFinite(item.endsAt) ? item.endsAt : null,
      remaining: Math.max(0, Math.min(86400, number(item.remaining))), createdAt: number(item.createdAt) })), item => item.id).slice(0, 20);
}
/** Check-offs are view state for the active session; unknown ids are dropped so revisions cannot leave stale ticks. */
function readCookingChecks(cooking: Record<string, unknown>, recipe: { ingredients: { id: string }[]; steps: unknown[] }) {
  const ids = new Set(recipe.ingredients.map(item => item.id));
  const strings = (value: unknown, limit: number) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))].slice(0, limit) : [];
  return {
    gathering: cooking.gathering === true,
    gathered: strings(cooking.gathered, 40).filter(id => ids.has(id)),
    used: strings(cooking.used, 400).filter(key => { const [step, id] = key.split(":"); return /^\d{1,2}$/.test(step) && +step < recipe.steps.length && ids.has(id); }),
    seen: Array.isArray(cooking.seen) ? [...new Set(cooking.seen.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < recipe.steps.length))].slice(0, 100) : undefined,
  };
}
export function readFoodDocument(value: unknown): FoodDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved food data");
  const input = record(value), fallback = emptyFoodDocument(), cooking = record(input.cooking);
  const parsed = readRecipeWorkspace(input.recipes);
  const recipes = { ...parsed, shopping: upgradeLegacyShopping(parsed.shopping, id => cookingRecipeById(id, parsed)) };
  const recipe = cookingRecipeById(text(cooking.recipeId), recipes);
  const notes = Object.fromEntries(Object.entries(record(input.notes)).filter(([key, value]) =>
    (/^(place|dish|recipe):[a-z0-9-]{1,80}$/.test(key) || /^place:(?:google-[A-Za-z0-9_-]{10,200}|catalogue-[a-z0-9-]{3,120})$/.test(key)) && typeof value === "string").slice(0, 500).map(([key, value]) => [key, text(value, 2000)]));
  const notices = record(input.notifications);
  const clock = (value: unknown, fallback: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? String(value) : fallback;
  const cases: LocalCase[] = unique(array(input.cases).filter(item => ["correction", "report"].includes(String(item.kind)) && text(item.id) && text(item.text))
    .map(item => ({ id: text(item.id), kind: item.kind as LocalCase["kind"], target: text(item.target, 120),
      text: text(item.text, 2000), photoUri: typeof item.photoUri === "string" && /^(file:|content:|blob:|data:image\/|https?:)/.test(item.photoUri)
        ? item.photoUri.slice(0, 4000000) : undefined, createdAt: number(item.createdAt), status: "not-sent" as const })), item => item.id).slice(0, 100);
  return {
    ...fallback, avatar: readAvatar(input.avatar), recipes, areaId: areaById(text(input.areaId)) ? String(input.areaId) : fallback.areaId,
    searchArea: typeof input.searchArea === "string" && /^[\p{L}\p{N}\p{M} .,'()/-]{1,80}$/u.test(input.searchArea) ? input.searchArea : "",
    onboardingDone: input.onboardingDone === true, adultConfirmed: input.adultConfirmed === true,
    saves: readSaves(input.saves), notes, lists: Array.isArray(input.lists) ? [...new Set(input.lists.filter((item): item is string => typeof item === "string" && !!item.trim()).map(item => item.trim().slice(0, 40)))].slice(0, 30) : [],
    privatePlaces: readPlaces(input.privatePlaces), cases, timers: readTimers(input.timers),
    market: readMarket(input.market), social: readSocial(input.social), exploreLocal: readExploreLocal(input.exploreLocal),
    discoverySettings: readDiscoverySettings(input.discoverySettings),
    game: readGame(input.game),
    cooking: recipe && !(number(cooking.step) >= recipe.steps.length && number(cooking.recipeVersion, 1) === recipe.revision) ? { recipeId: recipe.id, step: Math.max(0, Math.min(recipe.steps.length, Math.floor(number(cooking.step)))),
      servings: Math.max(1, Math.min(8, Math.floor(number(cooking.servings, recipe.servings)))), startedAt: number(cooking.startedAt), recipeVersion: Math.max(1, Math.floor(number(cooking.recipeVersion, 1))),
      ...readCookingChecks(cooking, recipe) } : null,
    notifications: { cooking: notices.cooking === true, cases: notices.cases === true, saved: notices.saved === true,
      marketing: notices.marketing === true, quietStart: clock(notices.quietStart, "22:00"), quietEnd: clock(notices.quietEnd, "08:00") },
  };
}
export function mergeFoodDocuments(profile: FoodDocument, guest: FoodDocument): FoodDocument {
  return readFoodDocument({
    ...profile, recipes: mergeRecipeWorkspace(profile.recipes, guest.recipes), exploreLocal: mergeExploreLocal(profile.exploreLocal, guest.exploreLocal), social: mergeSocial(profile.social, guest.social), market: mergeMarket(profile.market, guest.market), saves: [...profile.saves, ...guest.saves],
    notes: { ...guest.notes, ...profile.notes }, lists: [...profile.lists, ...guest.lists],
    privatePlaces: [...profile.privatePlaces, ...guest.privatePlaces.map(item => ({ ...item, isDefault: profile.privatePlaces.length ? false : item.isDefault }))],
    cases: [...profile.cases, ...guest.cases], cooking: profile.cooking ?? guest.cooking, timers: [...profile.timers, ...guest.timers],
    game: mergeGame(profile.game, guest.game),
  });
}
