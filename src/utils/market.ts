import { ingredientTextLimit, type IngredientInfo, type MarketIngredient } from "../config/market-ingredients";
import { alliums, animalExclusions } from "../config/preferences";
import { labelsFor } from "../config/diet-labels";
import { marketLimits } from "../config/market";
import type { Language } from "../config/preferences";
import type { MarketText } from "../i18n/en/market";
import type { Diet, ListingInput, MarketPractice, ListingKind, OwnListing, ShopCategory, ShopPhotoSlot, ShopTrust, Slot } from "../types/community";
import { formatDay, parseDay } from "./day";
import { formatSgDateTime, parseSgDateTime, zhParts } from "./sg-datetime";

export const marketMoney = (cents: number) => "S$" + (cents / 100).toFixed(cents % 100 ? 2 : 0);
/** Form state: text inputs stay as typed; photos are server paths or newly chosen data URIs. */
export type ListingDraft = {
  kind: ListingKind; name: string; category: ShopCategory; price: string; portion: string; description: string; ingredients: string;
  info: IngredientInfo; diets: MarketPractice[]; storage: string; dateMark: string; lot: string; leadDays: number; maxPerOrder: string; perSlot: string;
  photos: Partial<Record<ShopPhotoSlot, string>>;
};
const tagged = (tags: readonly MarketIngredient[], list: readonly string[]) => tags.some(tag => list.includes(tag));
/**
 * A saved listing's labels, as the server worked them out from its tags and ingredient text (stored "vegan" and
 * "five-pungent-free"). Plant-Based shows only when the tags show both an animal product and one of the five pungent.
 */
export function listingLabels(listing: { diets: readonly Diet[]; contains: readonly MarketIngredient[]; mayContain: readonly MarketIngredient[] }) {
  const tags = [...listing.contains, ...listing.mayContain];
  return labelsFor({ animal: listing.diets.includes("vegan") ? false : tagged(tags, animalExclusions) ? true : null,
    pungent: listing.diets.includes("five-pungent-free") ? false : tagged(tags, alliums) ? true : null });
}
/** The labels a draft will get when saved: its tags ("may contain" counts) and words in its ingredient text. */
export function draftLabels(d: Pick<ListingDraft, "info" | "ingredients">) {
  const tags = [...d.info.contains, ...d.info.mayContain], text = d.ingredients.replace(plantDairy, " ");
  return labelsFor({ animal: tagged(tags, animalExclusions) || animal.test(text), pungent: tagged(tags, alliums) || pungent.test(d.ingredients) });
}
/** The seller's own practices; stored "vegan" and "five-pungent-free" are derived and dropped here. */
export const practicesOf = (diets: readonly Diet[]) => diets.filter((diet): diet is MarketPractice => diet === "no-egg" || diet === "jain");
export function draftFrom(listing?: OwnListing): ListingDraft {
  return listing ? {
    kind: listing.kind, name: listing.name, category: listing.category, price: listing.priceCents ? String(listing.priceCents / 100) : "", portion: listing.portion,
    description: listing.description, ingredients: listing.ingredients, info: { contains: listing.contains, mayContain: listing.mayContain, reviewed: true },
    diets: practicesOf(listing.diets), storage: listing.storage, dateMark: listing.dateMark ?? "", lot: listing.lot, leadDays: listing.leadDays, maxPerOrder: String(listing.maxPerOrder),
    perSlot: listing.perSlot ? String(listing.perSlot) : "", photos: { ...listing.photos },
  } : { kind: "made", name: "", category: "Bakes", price: "", portion: "", description: "", ingredients: "", info: { contains: [], mayContain: [], reviewed: true },
    diets: [], storage: "", dateMark: "", lot: "", leadDays: 1, maxPerOrder: "5", perSlot: "", photos: {} };
}
const cents = (text: string) => /^\d+(\.\d{1,2})?$/.test(text.trim()) ? Math.round(Number(text.trim()) * 100) : 0;
export function listingInput(d: ListingDraft): ListingInput {
  return { kind: d.kind, name: d.name.trim(), category: d.category, priceCents: cents(d.price), portion: d.portion.trim(), description: d.description.trim(),
    ingredients: d.ingredients.trim(), contains: d.info.contains, mayContain: d.info.mayContain, diets: d.diets, storage: d.storage.trim(),
    dateMark: d.kind === "prepacked" && d.dateMark ? d.dateMark : null, lot: d.kind === "prepacked" ? d.lot.trim() : "", leadDays: d.leadDays, maxPerOrder: Number(d.maxPerOrder) || 1,
    perSlot: d.perSlot.trim() ? Number(d.perSlot) : null };
}
/** Inline errors before publishing; the server applies the same rules and more. */
export function listingErrors(d: ListingDraft, publish: boolean, now: number, t: MarketText): Record<string, string> {
  const errors: Record<string, string> = {}, price = cents(d.price), max = Number(d.maxPerOrder), limit = marketLimits.perOrder;
  if (d.ingredients.length > ingredientTextLimit) errors.ingredients = t("errIngredientsLength", { n: ingredientTextLimit });
  if (!/^\d{1,2}$/.test(d.maxPerOrder) || max < 1 || max > limit) errors.maxPerOrder = t("errMaxPerOrder", { limit });
  if (d.price.trim() && (!price || price > 100000)) errors.price = t("errPriceMax");
  if (d.perSlot.trim() && (!/^\d{1,3}$/.test(d.perSlot.trim()) || Number(d.perSlot) < 1 || Number(d.perSlot) > 200)) errors.perSlot = t("errPerSlot");
  if (!publish) return errors;
  if (!d.name.trim()) errors.name = t("errName");
  if (!price) errors.price = t("errPrice");
  if (!d.portion.trim()) errors.portion = t("errPortion");
  if (!d.ingredients.trim()) errors.ingredients = t("errIngredients");
  if (!d.storage.trim()) errors.storage = t("errStorage");
  if (!d.photos.item) errors.photos = t("errPhotoItem");
  if (d.kind === "prepacked") {
    if (!d.photos.label) errors.photos = t("errPhotoLabel");
    const day = parseDay(d.dateMark);
    if (!day || day.getTime() <= now) errors.dateMark = t("errDateMark");
    if (!d.lot.trim()) errors.lot = t("errLot");
  }
  const conflict = dietConflict(d, t);
  if (conflict) errors.diets = conflict;
  return errors;
}
const animal = /\b(egg|eggs|milk|butter|cream|cheese|ghee|whey|yogh?urt|honey|gelatine?|lard|kaya|mayo|mayonnaise|meringue|aioli|casein|creamer|brioche)\b/i;
/** Plant-based names that contain a dairy word, such as coconut milk or peanut butter. */
const plantDairy = /\b(coconut|soy|soya|oat|almond|rice|cashew|nut|peanut|cocoa|shea|vegan|plant[- ]based)\s+(milk|butter|cream|cheese|yogh?urt)\b|\bcream of tartar\b/gi;
const roots = /\b(potato(es)?|carrots?|beetroots?|radish(es)?|ginger|garlic|onions?|turnips?|yams?|cassava|tapioca|turmeric|leeks?|shallots?|scallions?)\b/i;
const pungent = /\b(garlic|onions?|leeks?|chives|scallions?|shallots?|spring onions?|asafoetida|(?<!chin )hing)\b/i; // not the Oh Chin Hing brand
const meat = /\b(chicken|beef|pork|mutton|lamb|fish|prawns?|shrimp|crab|squid|anchov(y|ies)|ikan bilis|belacan|bacon|ham|lard|gelatine?)\b/i;
const qualified = /\b(vegetarian|vegan|mock|plant[- ]based|meatless)\b/i;
/** A hard contradiction between declared practices and declared allergens; the server blocks the same. */
export function dietConflict(d: Pick<ListingDraft, "diets" | "info">, t: MarketText) {
  const has = (tag: string) => d.info.contains.includes(tag as never);
  if (d.diets.includes("no-egg") && has("Eggs")) return t("conflictEgg");
  if (d.diets.includes("jain") && alliums.some(has)) return t("conflictJainAllium");
  if (d.diets.includes("jain") && has("Honey")) return t("conflictJainHoney");
  return null;
}
/**
 * Words in the ingredient text that the tags or a practice seem to miss; the seller confirms or corrects. Labels come from
 * the tags, so an untagged egg or garlic would show a wrong Vegan or Vegetarian label.
 */
export function dietWarnings(d: Pick<ListingDraft, "diets" | "ingredients" | "info">, t: MarketText) {
  const warnings: string[] = [], text = d.ingredients, tagged = [...d.info.contains, ...d.info.mayContain] as string[];
  const animalWord = text.replace(plantDairy, " ").match(animal)?.[0], pungentWord = text.match(pungent)?.[0];
  if (animalWord && !["Eggs", "Dairy", "Honey"].some(tag => tagged.includes(tag))) warnings.push(t("warnAnimal", { word: animalWord }));
  if (pungentWord && !alliums.some(tag => tagged.includes(tag))) warnings.push(t("warnPungent", { word: pungentWord }));
  if (d.diets.includes("jain") && roots.test(text)) warnings.push(t("warnRoot", { word: String(text.match(roots)?.[0]) }));
  const meatWord = text.match(meat)?.[0];
  if (meatWord && !qualified.test(text)) warnings.push(t("warnMeat", { word: meatWord.toLowerCase() }));
  return warnings;
}
const time = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit", hour12: true });
const dayName = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", weekday: "short", day: "numeric", month: "short" });
const clock = (at: number) => time.format(at).replace(":00", "").toLowerCase();
/** Chinese dates use the same parts as Social (sg-datetime): "10月25日（周六）", "下午2:00". */
const zhDay = (at: number) => { const p = zhParts(at); return `${p.month}月${p.day}日（${p.weekday}）`; };
const zhClock = (at: number, period = true) => { const p = zhParts(at); return (period ? p.period : "") + p.clock; };
const dayLabel = (at: number, language: Language) => language === "zh" ? zhDay(at) : dayName.format(at);
/** "Sat 25 Oct, 2 – 4 pm"; Chinese "10月25日（周六）下午2:00–4:00". */
export function slotLabel(slot: Pick<Slot, "starts" | "ends">, language: Language) {
  const starts = parseSgDateTime(slot.starts), ends = parseSgDateTime(slot.ends);
  if (starts === null || ends === null) return "";
  if (language === "zh") return `${zhDay(starts)}${zhClock(starts)}–${zhClock(ends, zhParts(starts).period !== zhParts(ends).period)}`;
  return `${dayName.format(starts)}, ${clock(starts)} – ${clock(ends)}`;
}
/** When a slot stops taking orders: "Fri 24 Oct, 2 pm"; Chinese "10月24日（周五）下午2:00". */
export function slotCutoffLabel(slot: Pick<Slot, "starts" | "cutoffHours">, language: Language) {
  const starts = parseSgDateTime(slot.starts);
  if (starts === null) return "";
  const at = starts - slot.cutoffHours * 3600000;
  return language === "zh" ? zhDay(at) + zhClock(at) : `${dayName.format(at)}, ${clock(at)}`;
}
/** True once a slot's order cut-off has passed. */
export const slotCutoffPassed = (slot: Pick<Slot, "starts" | "cutoffHours">, now: number) => (parseSgDateTime(slot.starts) ?? 0) - slot.cutoffHours * 3600000 <= now;
/** Checkout's `items` parameter: "listingId:quantity,listingId:quantity". */
export const itemsParam = (items: readonly { listingId: string | null; quantity: number }[]) =>
  items.filter(item => item.listingId).map(item => item.listingId + ":" + item.quantity).join(",");
export function readItemsParam(value: string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of (value ?? "").split(",")) {
    const [id, quantity] = part.split(":"), n = Number(quantity);
    if (id && Number.isInteger(n) && n > 0) out[id] = Math.min(n, marketLimits.perOrder);
  }
  return out;
}
/** "Sat 25 Oct" for list lines. */
export const slotDay = (starts: string | null, language: Language) => { const at = starts ? parseSgDateTime(starts) : null; return at === null ? "" : dayLabel(at, language); };
/** "Delivery · East side only" or "Meetup · Tampines MRT". */
export const slotPlace = (slot: Pick<Slot, "mode" | "place">, t: MarketText) => slot.mode === "delivery" ? t("delivery") + (slot.place ? " · " + slot.place : "") : t("meetup") + " · " + slot.place;
export const handoverPayment = (s: Pick<ShopTrust, "payCash" | "payPaynow">, t: MarketText) =>
  s.payCash && s.payPaynow ? t("payCashOrPaynow") : s.payCash ? t("payCash") : s.payPaynow ? "PayNow" : "";
/** A stored YYYY-MM-DD day such as a date mark: "12 Mar 2027"; Chinese "2027年3月12日". */
export const marketDate = (value: string, language: Language) => formatDay(value, language);
/** A message time for screen readers: "Sat 25 Oct 2026, 7:00 pm"; Chinese "2026年10月25日（周六）晚上7:00". */
export const messageTime = (at: number, language: Language) => formatSgDateTime(at, language);
