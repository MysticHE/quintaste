import { stapleIngredients } from "../data/ingredient-staples";
import { ingredientGuide } from "../data/ingredient-guide";
import { bundledRecipes } from "../data/recipes";
import { aisleFor, isWater, type Aisle } from "./shopping";

/** One ingredient the shopping list can suggest: a clean name, where it is shelved, and other names it is known by. */
export type LibraryIngredient = { name: string; aisle: Aisle; aliases: string[] };

/** Chinese names for common ingredients, so a Chinese search finds them; keyed by the cleaned English name in lower case. */
const zhNames: Record<string, string> = {
  tofu: "豆腐", "firm tofu": "硬豆腐", "soft tofu": "嫩豆腐", "silken tofu": "嫩豆腐", "tofu puffs": "豆卜", "fried tofu": "豆卜",
  tempeh: "天贝", "fermented beancurd": "腐乳", "soy sauce": "酱油", "light soy sauce": "生抽", "dark soy sauce": "老抽",
  "sesame oil": "麻油", "neutral oil": "食用油", "coconut oil": "椰子油", "olive oil": "橄榄油", "peanut oil": "花生油", salt: "盐",
  sugar: "糖", "brown sugar": "红糖", "gula melaka": "椰糖", "white pepper": "白胡椒粉", "black pepper": "黑胡椒",
  "jasmine rice": "香米", "brown rice": "糙米", "white rice": "白米", "rice noodles": "米粉", "rice vermicelli": "米粉",
  "yellow noodles": "黄面", "egg-free yellow noodles": "无蛋黄面", "white bread": "白面包", "rolled oats": "燕麦片",
  "sago pearls": "西米", "cornflour": "玉米淀粉", "all-purpose wheat flour": "面粉", "coconut milk": "椰奶", "soy milk": "豆浆",
  "plant-based butter": "植物黄油", mushrooms: "蘑菇", "fresh shiitake": "鲜香菇", "shiitake mushrooms": "香菇", cabbage: "包菜",
  "bok choy": "白菜", "choy sum": "菜心", kangkung: "蕹菜", "bean sprouts": "豆芽", "mung bean sprouts": "绿豆芽", carrot: "红萝卜",
  potato: "马铃薯", "sweet potato": "番薯", taro: "芋头", yam: "芋头", pumpkin: "南瓜", tomato: "番茄", cucumber: "黄瓜",
  broccoli: "西兰花", jicama: "沙葛", ginger: "姜", "red chilli": "红辣椒", "green chilli": "青辣椒", "dried chillies": "干辣椒",
  "chilli sauce": "辣椒酱", "chilli bean paste": "豆瓣酱", "sweet sauce": "甜酱", "vegetarian mushroom sauce": "素蚝油",
  "vegetarian oyster sauce": "素蚝油", miso: "味噌", "tamarind paste": "亚参膏", tamarind: "亚参", lime: "酸柑", "lemon juice": "柠檬汁",
  pandan: "香兰叶", "pandan leaves": "香兰叶", "curry leaves": "咖喱叶", "coriander leaves": "芫荽", "sesame seeds": "芝麻",
  "roasted peanuts": "花生", peanuts: "花生", edamame: "毛豆", "shelled edamame": "毛豆", "sweet corn": "玉米", pineapple: "黄梨",
  avocado: "牛油果", "vegetable stock": "蔬菜高汤", "rice vinegar": "米醋", "popiah skins": "薄饼皮", cinnamon: "肉桂", cloves: "丁香",
  "kecap manis": "甜酱油", lentils: "扁豆", "spring onion": "青葱", onion: "洋葱", garlic: "大蒜", shallots: "红葱头",
};
const prep = /^(finely |roughly |thinly )?(grated|minced|chopped|sliced|diced|crushed|shredded|cooked)\s+/i;
const state = /,\s*(raw|dry|cooked|whole|ready to serve|unfortified|with peel|shelled)(?=\s*(,|$))/gi;
/** How a recipe cuts or readies an ingredient ("Tempeh, cubed"): not part of what you buy. */
const handling = /^((finely|roughly|thinly) )?(cubed|sliced|minced|chopped|diced|halved|shredded|crushed|grated|soaked|rinsed|knotted|cold|cut( into \w+)?|in (wedges|chunks|pieces))$/i;
/** Notes in brackets that are reminders, not other names for the ingredient. */
const notAlias = /^(check label|fresh-pressed)$/i;

/** "Oil, canola" → "Canola oil"; "Tempeh, cubed" → "Tempeh"; "Tofu, fried (tau pok)" → "Fried tofu" with the alias "tau pok". */
function clean(raw: string) {
  const aliases = [...raw.matchAll(/\(([^)]+)\)/g)].flatMap(match => match[1].split(",")).map(alias => alias.trim()).filter(alias => alias && !notAlias.test(alias));
  let name = raw.replace(/\s*\([^)]*\)/g, "").replace(state, "").replace(/\s+mixed with .*$/i, "").trim();
  const parts = name.split(",").map(part => part.trim()).filter(part => part && !handling.test(part));
  name = parts.length === 2 && parts[1].split(" ").length <= 2 ? parts[1] + " " + parts[0].toLowerCase() : parts[0] ?? "";
  name = name.replace(prep, "");
  return { name: name.charAt(0).toUpperCase() + name.slice(1), aliases };
}
/** Folds simple plurals so "Limes" and "Lime", or "Tomatoes" and "Tomato", are one entry. */
function key(name: string) {
  const word = name.toLowerCase();
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (/(ches|shes|sses|xes|oes)$/.test(word)) return word.slice(0, -2);
  return /[^su]s$/.test(word) ? word.slice(0, -1) : word;
}
/** Whether two ingredient names are the same thing to buy: "Garlic, minced" and "Garlic", or "Tomatoes" and "tomato". */
export const sameIngredient = (a: string, b: string) => key(clean(a).name) === key(clean(b).name);

let library: LibraryIngredient[] | null = null;
/**
 * Ingredients from the packaged recipes first, then the reviewed nutrition table; water, combined lines ("Broccoli & bok choy") and duplicates left out.
 * Uses the packaged recipes rather than the staff-edited set, so the cached list is the same whenever it is first built.
 */
export function ingredientLibrary(): LibraryIngredient[] {
  if (library) return library;
  const raw = [...bundledRecipes(true).flatMap(recipe => recipe.ingredients.map(item => item.name)), ...stapleIngredients];
  const seen = new Map<string, LibraryIngredient>();
  for (const value of raw) {
    const { name, aliases } = clean(value);
    if (!name || isWater(name) || / (&|or) /.test(name)) continue;
    const id = key(name), zh = zhNames[name.toLowerCase()];
    const entry = seen.get(id) ?? { name, aisle: aisleFor(name), aliases: [] };
    entry.aliases = [...new Set([...entry.aliases, ...aliases, ...(zh ? [zh] : [])])];
    seen.set(id, entry);
  }
  for (const [word, guide] of Object.entries(ingredientGuide)) {
    const entry = seen.get(key(word.replace(/-/g, " ")));
    if (entry && guide.aliases) entry.aliases = [...new Set([...entry.aliases, ...guide.aliases.split("·").map(alias => alias.trim())])];
  }
  library = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  return library;
}

/** Up to `limit` ingredients for what was typed: exact first, then names starting with it, then any word or alias that does. */
export function searchIngredients(query: string, limit = 6): LibraryIngredient[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (item: LibraryIngredient) => {
    const name = item.name.toLowerCase(), names = [name, ...item.aliases.map(alias => alias.toLowerCase())];
    if (names.includes(q)) return 0;
    if (name.startsWith(q)) return 1;
    if (names.some(value => value.split(/[\s&-]+/).some(word => word.startsWith(q)))) return 2;
    return names.some(value => value.includes(q)) ? 3 : -1;
  };
  return ingredientLibrary().map(item => ({ item, rank: score(item) })).filter(entry => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.item.name.length - b.item.name.length).slice(0, limit).map(entry => entry.item);
}
