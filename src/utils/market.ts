import { ingredientTextLimit, type IngredientInfo } from "../config/market-ingredients";
import { alliums } from "../config/preferences";
import { marketLimits } from "../config/market";
import type { Diet, ListingInput, ListingKind, OwnListing, ShopCategory, ShopPhotoSlot, ShopTrust, Slot } from "../types/community";
import { parseDay } from "./day";
import { parseSgDateTime } from "./sg-datetime";

export const marketMoney = (cents: number) => "S$" + (cents / 100).toFixed(cents % 100 ? 2 : 0);
/** Form state: text inputs stay as typed; photos are server paths or newly chosen data URIs. */
export type ListingDraft = {
  kind: ListingKind; name: string; category: ShopCategory; price: string; portion: string; description: string; ingredients: string;
  info: IngredientInfo; diets: Diet[]; storage: string; dateMark: string; lot: string; leadDays: number; maxPerOrder: string;
  photos: Partial<Record<ShopPhotoSlot, string>>;
};
export function draftFrom(listing?: OwnListing): ListingDraft {
  return listing ? {
    kind: listing.kind, name: listing.name, category: listing.category, price: listing.priceCents ? String(listing.priceCents / 100) : "", portion: listing.portion,
    description: listing.description, ingredients: listing.ingredients, info: { contains: listing.contains, mayContain: listing.mayContain, reviewed: true },
    diets: listing.diets, storage: listing.storage, dateMark: listing.dateMark ?? "", lot: listing.lot, leadDays: listing.leadDays, maxPerOrder: String(listing.maxPerOrder),
    photos: { ...listing.photos },
  } : { kind: "made", name: "", category: "Bakes", price: "", portion: "", description: "", ingredients: "", info: { contains: [], mayContain: [], reviewed: true },
    diets: [], storage: "", dateMark: "", lot: "", leadDays: 1, maxPerOrder: "5", photos: {} };
}
const cents = (text: string) => /^\d+(\.\d{1,2})?$/.test(text.trim()) ? Math.round(Number(text.trim()) * 100) : 0;
export function listingInput(d: ListingDraft): ListingInput {
  return { kind: d.kind, name: d.name.trim(), category: d.category, priceCents: cents(d.price), portion: d.portion.trim(), description: d.description.trim(),
    ingredients: d.ingredients.trim(), contains: d.info.contains, mayContain: d.info.mayContain, diets: d.diets, storage: d.storage.trim(),
    dateMark: d.kind === "prepacked" && d.dateMark ? d.dateMark : null, lot: d.kind === "prepacked" ? d.lot.trim() : "", leadDays: d.leadDays, maxPerOrder: Number(d.maxPerOrder) || 1 };
}
/** Inline errors before publishing; the server applies the same rules and more. */
export function listingErrors(d: ListingDraft, publish: boolean, now: number): Record<string, string> {
  const errors: Record<string, string> = {}, price = cents(d.price), max = Number(d.maxPerOrder), limit = marketLimits.perOrder;
  if (d.ingredients.length > ingredientTextLimit) errors.ingredients = `Keep the ingredient list within ${ingredientTextLimit} characters.`;
  if (!/^\d{1,2}$/.test(d.maxPerOrder) || max < 1 || max > limit) errors.maxPerOrder = `Allow 1 to ${limit} per order.`;
  if (d.price.trim() && (!price || price > 100000)) errors.price = "Enter a price up to S$1,000.";
  if (!publish) return errors;
  if (!d.name.trim()) errors.name = "Enter an item name.";
  if (!price) errors.price = "Enter a price.";
  if (!d.portion.trim()) errors.portion = "Add the portion or pack size.";
  if (!d.ingredients.trim()) errors.ingredients = "List every ingredient.";
  if (!d.storage.trim()) errors.storage = "Add storage and how soon to eat it.";
  if (!d.photos.item) errors.photos = "Add a photo of the food.";
  if (d.kind === "prepacked") {
    if (!d.photos.label) errors.photos = "Add a clear photo of the product label.";
    const day = parseDay(d.dateMark);
    if (!day || day.getTime() <= now) errors.dateMark = "Add the date mark printed on the pack.";
    if (!d.lot.trim()) errors.lot = "Add the lot or batch number printed on the pack.";
  }
  const conflict = dietConflict(d);
  if (conflict) errors.diets = conflict;
  return errors;
}
const animal = /\b(egg|eggs|milk|butter|cream|cheese|ghee|whey|yogh?urt|honey|gelatine?|lard)\b/i;
/** Plant-based names that contain a dairy word, such as coconut milk or peanut butter. */
const plantDairy = /\b(coconut|soy|soya|oat|almond|rice|cashew|nut|peanut|cocoa|shea|vegan|plant[- ]based)\s+(milk|butter|cream|cheese|yogh?urt)\b|\bcream of tartar\b/gi;
const roots = /\b(potato(es)?|carrots?|beetroots?|radish(es)?|ginger|garlic|onions?|turnips?|yams?|cassava|tapioca|turmeric|leeks?|shallots?|scallions?)\b/i;
const pungent = /\b(garlic|onions?|leeks?|chives|scallions?|shallots?|spring onions?|asafoetida|hing)\b/i;
const meat = /\b(chicken|beef|pork|mutton|lamb|fish|prawns?|shrimp|crab|squid|anchov(y|ies)|ikan bilis|belacan|bacon|ham|lard|gelatine?)\b/i;
const qualified = /\b(vegetarian|vegan|mock|plant[- ]based|meatless)\b/i;
/** A hard contradiction between declared diets and declared allergens; the server blocks the same. */
export function dietConflict(d: Pick<ListingDraft, "diets" | "info">) {
  const has = (tag: string) => d.info.contains.includes(tag as never);
  if (d.diets.includes("vegan") && ["Eggs", "Dairy", "Honey"].some(has)) return "A vegan item can't contain egg, dairy or honey.";
  if (d.diets.includes("no-egg") && has("Eggs")) return "An egg-free item can't contain eggs.";
  if ((d.diets.includes("five-pungent-free") || d.diets.includes("jain")) && alliums.some(has)) return "Remove onion and garlic family items, or the No onion & garlic claim.";
  if (d.diets.includes("jain") && has("Honey")) return "A Jain item can't contain honey.";
  return null;
}
/** Words in the ingredient text that seem to contradict a claim; the seller confirms or corrects. */
export function dietWarnings(d: Pick<ListingDraft, "diets" | "ingredients">) {
  const warnings: string[] = [], text = d.ingredients;
  const animalWord = text.replace(plantDairy, " ").match(animal)?.[0];
  if (d.diets.includes("vegan") && animalWord) warnings.push(`"${animalWord}" usually isn't vegan. If it's plant-based, say so in the ingredients (e.g. oat milk).`);
  if ((d.diets.includes("five-pungent-free") || d.diets.includes("jain")) && pungent.test(text)) warnings.push(`"${text.match(pungent)?.[0]}" conflicts with No onion & garlic. Check spice mixes and sauces too.`);
  if (d.diets.includes("jain") && roots.test(text)) warnings.push(`"${text.match(roots)?.[0]}" is a root vegetable, which Jain diets avoid.`);
  const meatWord = text.match(meat)?.[0];
  if (meatWord && !qualified.test(text)) warnings.push(`Market is vegetarian. Write "mock ${meatWord.toLowerCase()}" or "plant-based" if it's a meat alternative.`);
  return warnings;
}
const time = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit", hour12: true });
const dayName = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", weekday: "short", day: "numeric", month: "short" });
const clock = (at: number) => time.format(at).replace(":00", "").toLowerCase();
/** "Sat 25 Oct, 2 – 4 pm" */
export function slotLabel(slot: Pick<Slot, "starts" | "ends">) {
  const starts = parseSgDateTime(slot.starts), ends = parseSgDateTime(slot.ends);
  if (starts === null || ends === null) return "";
  return `${dayName.format(starts)}, ${clock(starts)} – ${clock(ends)}`;
}
/** "Sat 25 Oct" for list lines. */
export const slotDay = (starts: string | null) => { const at = starts ? parseSgDateTime(starts) : null; return at === null ? "" : dayName.format(at); };
export const handoverPayment = (s: Pick<ShopTrust, "payCash" | "payPaynow">) => [s.payCash && "Cash", s.payPaynow && "PayNow"].filter(Boolean).join(" or ");
