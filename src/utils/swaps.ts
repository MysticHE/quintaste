import { exclusions, type Exclusion } from "../config/preferences";
import type { Language } from "../i18n";
import { messages } from "../i18n/messages";
import type { Ingredient, MicroNutrient, Recipe } from "../types/food";
import type { ChosenSwap, SwapOption, SwapPlan, SwapWords } from "../types/swaps";

export const swapLimit = 100;
const macros = ["kcal", "protein", "fat", "carbs", "fibre", "sugar", "sodium"] as const;
const micros: MicroNutrient[] = ["vitA", "vitC", "vitD", "vitE", "b12", "folate", "calcium", "iron", "zinc", "magnesium", "potassium"];
const figures = new Set<string>([...macros, ...micros]);
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The recipe's own language: its text stays in it (members' and QuinTaste's words keep their language). */
export const recipeLanguage = (recipe: { language?: string }): Language => /chinese|中文|zh/i.test(recipe.language ?? "") ? "zh" : "en";
/** A line's name without its preparation or notes ("Chilli bean paste (doubanjiang, check label)" is "Chilli bean paste"). */
export const shortName = (name: string) => name.split(/\s*[,(]/)[0].trim() || name;
/** What swaps need; Cook mode's recipes carry no labels or figures, and private recipes (never on the server) have no swaps. */
export type Swappable = Pick<Recipe, "id" | "revision" | "ingredients" | "steps"> & { language?: string; private?: boolean; dietary?: Recipe["dietary"]; nutrition?: Recipe["nutrition"] };

function readWords(value: unknown): SwapWords | undefined {
  const v = record(value);
  return typeof v.en === "string" && typeof v.zh === "string" && !!v.en.trim() && !!v.zh.trim() && v.en.length <= 40 && v.zh.length <= 24
    ? { en: v.en, zh: v.zh } : undefined;
}
/** Forms of a line's name in step text, longest first. */
export const readMentions = (value: unknown) => Array.isArray(value)
  ? value.filter((form): form is string => typeof form === "string" && form.length >= 3 && form.length <= 120).slice(0, 6).sort((a, b) => b.length - a.length) : [];
const readTags = (value: unknown) => Array.isArray(value) ? exclusions.filter(tag => value.includes(tag)) : [];
/** A swap option as the server sends it; null when anything in it is not what the app can show. */
export function readSwapOption(value: unknown): SwapOption | null {
  const v = record(value), name = readWords(v.name), note = readWords(v.note), step = readWords(v.step), contains = record(v.contains);
  const to = v.to === null ? null : typeof v.to === "string" && /^[a-z0-9_]{1,60}$/.test(v.to) ? v.to : undefined;
  if (to === undefined || (to === null ? v.leave !== true : !name)) return null;
  const amount = v.amount === null ? null : finite(v.amount) && v.amount > 0 && v.amount <= 10000 ? v.amount : undefined;
  if (amount === undefined || typeof v.unit !== "string" || v.unit.length > 24) return null;
  const n = v.nutrition === null ? null : record(v.nutrition), delta: Partial<Record<string, number>> = {};
  if (n) for (const [key, change] of Object.entries(record(n.delta))) if (figures.has(key) && finite(change)) delta[key] = change;
  const unknown = n && Array.isArray(n.unknown) ? n.unknown.filter((key): key is string => typeof key === "string" && figures.has(key)) : [];
  return { to, ...(name ? { name } : { leave: true as const }), amount, unit: v.unit, ...(note ? { note } : {}), ...(step ? { step } : {}), ...(v.ai === true ? { ai: true as const } : {}),
    contains: { add: readTags(contains.add), remove: readTags(contains.remove) }, nutrition: n ? { delta, unknown } : null };
}
/** Chosen swaps from storage: well-formed, one per recipe line, newest first, at most `swapLimit`. */
export function readSwaps(value: unknown): ChosenSwap[] {
  const seen = new Set<string>(), out: ChosenSwap[] = [];
  const items = (Array.isArray(value) ? value.slice(0, swapLimit * 2).map(record) : []).sort((a, b) => Number(b.at) - Number(a.at));
  for (const v of items) {
    const option = readSwapOption(v.option), recipeId = String(v.recipeId ?? ""), lineId = String(v.lineId ?? ""), key = recipeId + "\n" + lineId;
    if (!option || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(recipeId) || !/^[\w-]{1,80}$/.test(lineId) || !finite(v.at) || seen.has(key)) continue;
    if (typeof v.original !== "string" || !v.original || v.original.length > 120) continue;
    seen.add(key);
    out.push({ recipeId, revision: Number.isInteger(v.revision) && Number(v.revision) >= 1 ? Number(v.revision) : 1, lineId, original: v.original,
      mentions: readMentions(v.mentions), option, at: v.at, ...(v.asked === true ? { asked: true } : {}) });
    if (out.length >= swapLimit) break;
  }
  return out;
}
/** Guest swaps join the profile's; the profile's choice for a line wins. */
export const mergeSwaps = (profile: ChosenSwap[], guest: ChosenSwap[]) => readSwaps([...profile, ...guest.filter(g => !profile.some(p => p.recipeId === g.recipeId && p.lineId === g.lineId))]);

/**
 * The swaps in force for this recipe revision, by line id. A recipe edited without a new revision may have moved a line id to another
 * food, so a swap applies only while its line still has the name it was chosen for.
 */
export function swapsFor(recipe: Pick<Recipe, "id" | "revision" | "ingredients">, swaps: readonly ChosenSwap[]) {
  const names = new Map(recipe.ingredients.map(line => [line.id, line.name]));
  return new Map(swaps.filter(swap => swap.recipeId === recipe.id && swap.revision === recipe.revision && names.get(swap.lineId) === swap.original)
    .map(swap => [swap.lineId, swap]));
}
/**
 * Stored swaps brought up to date with the current plan for their recipe revision: each takes the plan's version of the same option
 * (rules corrected since, such as an allergen added), and a swap no longer offered is dropped. Null when nothing changes.
 */
export function refreshSwaps(saved: readonly ChosenSwap[], plan: SwapPlan): ChosenSwap[] | null {
  let changed = false;
  const next = saved.flatMap(swap => {
    // An AI pick is not in the plan's rules: it stays as chosen (its recipe revision still decides when it applies).
    if (swap.recipeId !== plan.id || swap.revision !== plan.revision || swap.option.ai) return [swap];
    const line = plan.lines.find(item => item.id === swap.lineId);
    const option = line && [...line.options, ...line.more].find(item => item.to === swap.option.to);
    if (!line || !option) { changed = true; return []; }
    if (JSON.stringify(option) === JSON.stringify(swap.option) && JSON.stringify(line.mentions) === JSON.stringify(swap.mentions)) return [swap];
    changed = true;
    return [{ ...swap, option, mentions: line.mentions }];
  });
  return changed ? next : null;
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const proper = /^(Chinese|Thai|Japanese|Indian|Korean|Malay)\b/;
// A form followed by one of these names something else ("rice cooker", "rice flour").
const tails = "cooker|flour|starch|vinegar|wine|paper|milk|noodles|vermicelli|cakes?|water";
const pattern = (mentions: readonly string[]) => mentions.length
  ? new RegExp(`(?<![A-Za-z])(${[...mentions].sort((a, b) => b.length - a.length).map(escape).join("|")})(?![A-Za-z])(?!\\s+(${tails})\\b)`, "gi") : null;
/** The swap's name where the original stood, keeping a capital at the start of a sentence. */
const cased = (match: string, name: string) =>
  /^[A-Z]/.test(match) ? name[0].toUpperCase() + name.slice(1) : proper.test(name) ? name : name[0].toLowerCase() + name.slice(1);
const roundTo = (value: number, places: number) => Math.round(Math.max(0, value) * 10 ** places) / 10 ** places;
/** Per-serving figures after the swaps; a figure any swap cannot work out is dropped, and without calories there are no figures. */
function swappedNutrition(nutrition: Recipe["nutrition"], chosen: ChosenSwap[]): Recipe["nutrition"] {
  if (!nutrition || !chosen.length) return nutrition;
  if (chosen.some(swap => !swap.option.nutrition)) return undefined;
  const unknown = new Set(chosen.flatMap(swap => swap.option.nutrition!.unknown));
  const change = (key: string) => chosen.reduce((sum, swap) => sum + (swap.option.nutrition!.delta[key] ?? 0), 0);
  if (unknown.has("kcal")) return undefined;
  const perServing: NonNullable<Recipe["nutrition"]>["perServing"] = { kcal: roundTo(nutrition.perServing.kcal + change("kcal"), 0) };
  for (const key of macros.slice(1)) {
    const before = nutrition.perServing[key];
    if (before !== undefined && !unknown.has(key)) perServing[key] = roundTo(before + change(key), key === "sodium" ? 0 : 1);
  }
  const micro = nutrition.micro && Object.fromEntries(micros.filter(key => nutrition.micro?.[key] !== undefined && !unknown.has(key))
    .map(key => [key, roundTo(nutrition.micro![key]! + change(key), 2)]));
  // Figures from a recipe page are no longer that page's once an ingredient changes: they become QuinTaste's estimate.
  const { site: _site, micro: _micro, ...rest } = nutrition;
  return { ...rest, basis: "estimate", perServing, ...(micro && Object.keys(micro).length ? { micro } : {}) };
}
/**
 * The recipe with the member's swaps applied: the line's food and amount, the steps' wording (the swap named where the original
 * was, a step note on the first step that uses it), the exclusions it carries and its per-serving figures. A line left out is
 * dropped from the list and the steps' ingredient lists. Swaps made for another revision of the recipe are ignored.
 */
export function applySwaps<R extends Swappable>(recipe: R, swaps: readonly ChosenSwap[]): R {
  const chosen = swapsFor(recipe, swaps);
  if (!chosen.size) return recipe;
  const language = recipeLanguage(recipe), used = [...chosen.values()];
  const ingredients: Ingredient[] = recipe.ingredients.flatMap(line => {
    const swap = chosen.get(line.id);
    if (!swap) return [line];
    if (swap.option.leave) return [];
    const { shop: _shop, labelChecked: _checked, suggested: _suggested, ...rest } = line;
    return [{ ...rest, name: swap.option.name![language], amount: swap.option.amount, unit: swap.option.unit }];
  });
  // Every swap's names are replaced in one pass over the original text, so no swap renames words another swap just wrote.
  const owners = new Map(used.filter(swap => !swap.option.leave).flatMap(swap => swap.mentions.map(form => [form.toLowerCase(), swap] as const)));
  const all = pattern([...owners.keys()]);
  // A step note ("soak first") goes on the first step that lists the line, else the first that names it.
  const noteAt = new Map(used.map(swap => [swap.lineId, Math.max(-1, recipe.steps.findIndex(step => step.ingredientIds.includes(swap.lineId)))]));
  const steps = recipe.steps.map((step, index) => {
    let instruction = all ? step.instruction.replace(all, match => cased(match, owners.get(match.toLowerCase())!.option.name![language])) : step.instruction;
    for (const swap of used) {
      const named = step.ingredientIds.includes(swap.lineId) || !!pattern(swap.mentions)?.test(step.instruction);
      const note = swap.option.leave ? { en: messages.en.cook.leaveOutStep, zh: messages.zh.cook.leaveOutStep } : swap.option.step;
      if (named && note && (noteAt.get(swap.lineId) === index || noteAt.get(swap.lineId) === -1)) {
        noteAt.set(swap.lineId, -2);
        const name = swap.option.leave ? shortName(swap.original) : swap.option.name![language];
        instruction += language === "zh" ? `（${name}：${note.zh}。）` : ` (${name[0].toUpperCase() + name.slice(1)}: ${note.en}.)`;
      }
    }
    const ids = step.ingredientIds.filter(id => !chosen.get(id)?.option.leave);
    return instruction === step.instruction && ids.length === step.ingredientIds.length ? step : { ...step, instruction, ingredientIds: ids };
  });
  const removed = new Set<Exclusion>(used.flatMap(swap => swap.option.contains.remove));
  const contains = [...new Set<Exclusion>([...(recipe.dietary?.contains ?? []).filter(tag => !removed.has(tag)), ...used.flatMap(swap => swap.option.contains.add)])];
  return { ...recipe, ingredients, steps, ...(recipe.dietary ? { dietary: { ...recipe.dietary, contains } } : {}),
    ...("nutrition" in recipe ? { nutrition: swappedNutrition(recipe.nutrition, used) } : {}) };
}
/** Swaps on this recipe revision not yet asked about that were in place when the member last finished cooking it. */
export function swapsToAsk(recipe: Pick<Recipe, "id" | "revision" | "ingredients">, swaps: readonly ChosenSwap[], cooked: readonly { recipeId: string; revision: number; finishedAt: number }[]) {
  const last = cooked.find(entry => entry.recipeId === recipe.id && entry.revision === recipe.revision)?.finishedAt ?? 0;
  return [...swapsFor(recipe, swaps).values()].filter(swap => !swap.asked && swap.at < last);
}
