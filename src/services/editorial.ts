import AsyncStorage from "@react-native-async-storage/async-storage";
import { ownedApiRequest } from "./owned-api";
import type { Recipe } from "../types/food";
import { forgetPublishedRecipe, rememberPublishedRecipe } from "../data/recipes";
import { utf8Bytes } from "../state/food-capacity";

type Cache = { data: unknown; etag: string; at: number };
const cache = new Map<string, Cache>();
const requests = new Map<string, { promise: Promise<unknown>; controller: AbortController; users: number }>();
const failures = new Map<string, number>();
const key = "quintaste:public-editorial:v1", fresh = 15 * 60000, offline = 86400000;
let hydration: Promise<void> | undefined, writes = Promise.resolve();
const bytes = (value: unknown) => utf8Bytes(JSON.stringify(value));
function validate(path: string, data: unknown, at = Date.now()) {
  if (!data || typeof data !== "object" || bytes(data) > 64000) throw new Error("Invalid content response");
  const d = data as Record<string, unknown>;
  const identity = (r: Record<string, unknown>) => r && typeof r.id === "string" && /^[a-z0-9][a-z0-9-]{2,150}$/.test(r.id);
  const recipeShape = (r: Recipe, detail: boolean) => identity(r as unknown as Record<string, unknown>) && typeof r.name === "string" && r.name.length <= 160
    && Number.isInteger(r.minutes) && r.minutes >= 1 && r.minutes <= 180 && Number.isInteger(r.servings) && r.servings >= 1 && r.servings <= 8
    && Array.isArray(r.categories) && r.categories.length > 0 && r.categories.every(c => typeof c === "string")
    && r.dietary && ["Vegetarian", "Vegan"].includes(r.dietary.diet) && Array.isArray(r.dietary.contains) && r.dietary.contains.every(c => typeof c === "string")
    && r.dietary.evidence && r.dietary.evidence.kind === "editorial" && typeof r.dietary.evidence.checkedAt === "string" && typeof r.dietary.evidence.source === "string"
    && r.provenance?.kitchenTested === false && Array.isArray(r.provenance.sources) && r.provenance.sources.every(s => typeof s === "string" && s.startsWith("https://"))
    && (!r.image || /^\/api\/editorial\/assets\/[a-f0-9]{64}\.jpg$/.test(r.image.path))
    && (!detail || r.ingredients.every(i => i && typeof i.id === "string" && typeof i.name === "string" && typeof i.unit === "string" && (i.amount === null || Number.isFinite(i.amount)))
      && r.steps.every(s => s && typeof s.title === "string" && typeof s.instruction === "string" && Array.isArray(s.ingredientIds)));
  if (path.startsWith("/recipes/")) {
    const r = data as Recipe;
    if (r.id !== path.slice(9) || typeof r.name !== "string" || !Array.isArray(r.ingredients) || !r.ingredients.length || r.ingredients.length > 30 || !Array.isArray(r.steps) || !r.steps.length || r.steps.length > 20 || !r.dietary || !Array.isArray(r.categories) || !r.provenance || r.provenance.kitchenTested !== false || !Number.isInteger(r.revision)) throw new Error("Invalid recipe");
    if (!recipeShape(r, true)) throw new Error("Invalid recipe fields");
    rememberPublishedRecipe(r, at);
  } else {
    if (!Array.isArray(d.items) || d.items.length > 20 || typeof d.revision !== "string" || !/^[a-f0-9]{64}$/.test(d.revision) || d.nextCursor !== null && typeof d.nextCursor !== "string") throw new Error("Invalid content page");
    for (const item of d.items) {
      if (path.startsWith("/recipes")) {
        if (!recipeShape(item, false) || !Array.isArray(item.ingredientNames) || item.ingredientNames.length > 30 || !item.ingredientNames.every((n: unknown) => typeof n === "string" && n.length <= 160)) throw new Error("Invalid recipe summary");
      } else if (!identity(item) || !["title", "organiser", "startsAt", "location", "address", "dietEvidence", "checkedAt", "status"].every(k => typeof item[k] === "string") || !Array.isArray(item.sources) || !item.sources.length || !item.sources.every((url: unknown) => typeof url === "string" && url.startsWith("https://")) || !Number.isFinite(Date.parse(item.startsAt))) throw new Error("Invalid event");
    }
  }
  return data;
}
async function hydrate() {
  hydration ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(key); if (!raw || raw.length > 512000) return;
      const entries: unknown = JSON.parse(raw); if (!Array.isArray(entries) || entries.length > 40) return;
      for (const [path, entry] of entries) if (typeof path === "string" && /^\/(recipes|events)(?:[/?]|$)/.test(path) && entry && typeof entry.at === "number" && Date.now() - entry.at < offline && entry.at <= Date.now() + 30000 && typeof entry.etag === "string") {
        try { validate(path, entry.data, entry.at); if (!cache.has(path)) cache.set(path, entry); } catch { /* Drop invalid public rows. */ }
      }
    } catch { /* Public cache corruption never affects private saves. */ }
  })(); await hydration;
}
function save(path: string, entry: Cache) {
  cache.delete(path); cache.set(path, entry);
  while (cache.size > 40 || bytes([...cache]) > 512000) cache.delete(cache.keys().next().value!);
  const raw = JSON.stringify([...cache]); writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key, raw)).catch(() => {});
}
export async function editorialRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  await hydrate(); if (signal?.aborted) throw new Error("Cancelled");
  const prior = cache.get(path);
  if (prior && Date.now() - prior.at < fresh) return validate(path, prior.data, prior.at) as T;
  if (Date.now() - (failures.get(path) ?? 0) < 60000) {
    if (prior && Date.now() - prior.at < offline) return prior.data as T;
    throw new Error("Content is temporarily unavailable. Try again shortly.");
  }
  let pending = requests.get(path);
  if (pending?.controller.signal.aborted) { requests.delete(path); pending = undefined; }
  if (!pending) {
    if (requests.size >= 8) throw new Error("Please try again shortly.");
    const controller = new AbortController();
    const promise = (async () => {
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await ownedApiRequest(`/api/editorial/${path.slice(1)}`, { signal: controller.signal, headers: prior?.etag ? { "If-None-Match": prior.etag } : {} });
        if (response.status === 304 && prior) { validate(path, prior.data); save(path, { ...prior, at: Date.now() }); return prior.data; }
        if (response.status === 404 && path.startsWith("/recipes/")) { cache.delete(path); forgetPublishedRecipe(path.slice(9)); throw Object.assign(new Error("Recipe is no longer available."), { unavailable: true }); }
        if (!response.ok) throw new Error("Content is temporarily unavailable.");
        const text = await response.text(); if (text.length > 64000) throw new Error("Content response too large");
        const data = validate(path, JSON.parse(text)); save(path, { data, at: Date.now(), etag: response.headers.get("etag") ?? "" }); failures.delete(path); return data;
      } catch (e) {
        if ((e as { unavailable?: boolean }).unavailable) throw e;
        if (!controller.signal.aborted) { failures.set(path, Date.now()); while (failures.size > 40) failures.delete(failures.keys().next().value!); }
        if (!controller.signal.aborted && prior && Date.now() - prior.at < offline) return validate(path, prior.data, prior.at);
        throw e;
      } finally { clearTimeout(timeout); if (requests.get(path)?.controller === controller) requests.delete(path); }
    })(); pending = { promise, controller, users: 0 }; requests.set(path, pending);
  }
  const own = pending; own.users++;
  let released = false;
  const release = () => { if (released) return; released = true; own.users--; if (!own.users && requests.get(path) === own) own.controller.abort(); };
  signal?.addEventListener("abort", release, { once: true });
  try { const data = await own.promise; if (signal?.aborted) throw new Error("Cancelled"); return data as T; }
  finally { signal?.removeEventListener("abort", release); release(); }
}
export type EditorialPage<T> = { revision: string; items: T[]; total: number; nextCursor: string | null };
export type RecipeSummary = Omit<Recipe, "ingredients" | "steps"> & { ingredientNames?: string[] };
export type ExternalEvent = { id: string; title: string; organiser: string; startsAt: string; endsAt: string | null; location: string; address: string; feeAmount: number | null; currency: string | null; feeNote: string; registrationUrl: string | null; registrationDeadline: string | null; dietEvidence: string; status: string; checkedAt: string; sources: string[] };
