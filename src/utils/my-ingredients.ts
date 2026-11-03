import type { Language } from "../config/preferences";

/**
 * My ingredients (docs/AI_FOOD_LIBRARY_PLAN.md §7): an item has an English name (what the server matches) and a Chinese one (what
 * a Chinese-language member sees); an item typed by the member uses their words for both. `sure` is false for one the AI doubts.
 */
export type FoodItem = { en: string; zh: string; sure: boolean };
export const MAX_ITEMS = 25, MAX_BASICS = 12, MAX_PHOTOS = 3, ITEM_MIN = 2, ITEM_MAX = 40;
/** What most kitchens keep; the member edits the list and it stays on the device for their account. */
export const DEFAULT_BASICS: FoodItem[] = [
  { en: "rice", zh: "米", sure: true }, { en: "oil", zh: "油", sure: true }, { en: "salt", zh: "盐", sure: true }, { en: "soy sauce", zh: "酱油", sure: true },
];
export const basicsKey = (userId: string) => "@quintaste/basics/" + userId;
export const itemName = (item: FoodItem, language: Language) => (language === "zh" ? item.zh : item.en) || item.en;
export const typedItem = (text: string): FoodItem => { const name = text.trim().replace(/\s+/g, " "); return { en: name, zh: name, sure: true }; };
export const validItemText = (text: string) => { const length = text.trim().length; return length >= ITEM_MIN && length <= ITEM_MAX; };
const same = (a: FoodItem, b: FoodItem) => a.en.toLowerCase() === b.en.toLowerCase();
/** Adds items not already in the list (by English name), up to `max`. */
export const addItems = (list: FoodItem[], more: FoodItem[], max: number) => {
  const next = [...list];
  for (const item of more) if (next.length < max && !next.some(i => same(i, item))) next.push(item);
  return next;
};
/** A stored list, or null when it is not one (the default then applies). */
export function readItems(raw: string | null): FoodItem[] | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(value)) return null;
    return value.filter((i): i is FoodItem => !!i && typeof i.en === "string" && typeof i.zh === "string" && validItemText(i.en))
      .map(i => ({ en: i.en, zh: i.zh, sure: true })).slice(0, MAX_BASICS);
  } catch { return null; }
}
/** Items carried to "Matching recipes" in the route: English and Chinese names joined, so the next screen needs nothing else. */
export const encodeItems = (items: FoodItem[]) => JSON.stringify(items.map(i => [i.en, i.zh]));
export function decodeItems(value: unknown): FoodItem[] {
  try {
    const list: unknown = typeof value === "string" ? JSON.parse(value) : [];
    if (!Array.isArray(list)) return [];
    return addItems([], list.filter((pair): pair is [string, string] => Array.isArray(pair) && typeof pair[0] === "string" && typeof pair[1] === "string" && validItemText(pair[0]))
      .map(([en, zh]) => ({ en: en.trim(), zh: zh.trim() || en.trim(), sure: true })), MAX_ITEMS);
  } catch { return []; }
}
