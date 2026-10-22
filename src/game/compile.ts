/**
 * Compile (docs/game/RECIPE_LEVELS_PLAN.md §6, step 1): a recipe's ingredients and steps become a level draft with code only.
 * Ingredients map to built-in game items or to the shared ingredient list; prep steps drop out; an unbuilt side step (blend,
 * chill) is taken as a ready item; an unbuilt main step (steam, bake, fry, griddle, dough) makes the recipe wait for that technique.
 * Shaping (AI, step 2) then picks stages from this draft, and the checks (step 3) decide whether the level is kept.
 */
import { STATIONS, type StationKind } from "./content/dishes";
import { ITEMS, type GameItem, type ItemTag } from "./content/items";
import { readPack, type LevelPack } from "./content/pack";

export type RecipeInput = { id: string; name: string; categories: string[]; ingredients: { id: string; name: string }[]; steps: { instruction: string; ingredientIds: string[] }[] };
/** What an ingredient name became: a built-in item, an entry on the shared list (unreviewed when no one has checked its tags), or nothing. */
export type Resolved = { id: string; item?: GameItem; unreviewed?: boolean } | null;
export type DraftStage = { station: StationKind; items: string[]; step: number };
export type Compiled = { needs: string[]; shortcuts: string[]; stages: DraftStage[]; items: Map<string, GameItem>; unreviewed: Set<string> };

/** Recipe ingredient words → a built-in game item (the reviewed equivalents table). First match wins. */
const ALIASES: [RegExp, string][] = [
  [/dark soy/, "dark-soy"], [/soy sauce|light soy|^soy$/, "soy"], [/kecap/, "kecap"], [/sesame oil/, "sesame-oil"], [/sesame seed|^sesame$/, "sesame-seeds"],
  [/\boil\b/, "cooking-oil"], [/coconut milk|santan/, "coconut-milk"], [/bee hoon|vermicelli/, "bee-hoon"], [/rice noodle/, "rice-noodles"],
  [/yellow noodle|egg-free yellow/, "yellow-noodles-b"], [/tofu/, "tofu"], [/tempeh/, "tempeh"], [/shiitake/, "shiitake"], [/button mushroom/, "button-mushrooms"],
  [/bean sprout|sprouts/, "bean-sprouts"], [/kangkung|water spinach/, "kangkung"], [/bok choy/, "bok-choy"], [/choy sum/, "choy-sum"], [/broccoli/, "broccoli"],
  [/cabbage/, "cabbage"], [/carrot/, "carrot"], [/sweet potato/, "sweet-potato"], [/potato/, "potato"], [/\bcorn\b/, "corn"], [/tomato(?!.*ketchup)/, "tomato"],
  [/ketchup/, "ketchup-b"], [/capsicum|bell pepper/, "capsicum"], [/pineapple/, "pineapple"], [/cucumber/, "cucumber"], [/jicama|bangkuang/, "jicama"],
  [/lettuce/, "lettuce"], [/peanut/, "peanuts"], [/popiah skin|skins/, "popiah-skins"], [/sweet sauce|tim cheong/, "sweet-sauce-b"], [/chilli bean|doubanjiang|bean paste/, "paste-b"],
  [/chilli paste|sambal oelek/, "chilli-paste-b"], [/sambal/, "sambal-b"], [/stock|broth/, "stock-b"], [/fermented beancurd|fu ru/, "fu-ru"], [/black bean/, "black-beans"],
  [/cornflour|cornstarch|corn starch/, "cornflour"], [/rice vinegar|vinegar/, "rice-vinegar"], [/gula melaka|palm sugar/, "gula-melaka"], [/sugar/, "brown-sugar"],
  [/white pepper|^pepper$/, "white-pepper"], [/\bsalt\b/, "salt"], [/turmeric/, "turmeric"], [/pandan/, "pandan"], [/sago/, "sago"],
  [/soy ?milk|soya milk/, "soy-milk"], [/oat ?milk/, "oat-milk"], [/\boats?\b/, "oats"], [/coriander/, "coriander"],
  [/glutinous rice flour|sticky rice flour/, "glutinous-flour"], [/glutinous rice|sticky rice/, "glutinous-rice"], [/rice flour/, "rice-flour"],
  [/(grated|shredded|desiccated|fresh) coconut|^coconut$/, "grated-coconut"], [/\brice\b/, "rice"], [/ginger/, "ginger"], [/garlic/, "garlic"], [/shallot/, "shallots"], [/spring onion|scallion/, "spring-onion"], [/onion/, "onion"],
  [/dried chill/, "dried-chillies"], [/chilli sauce/, "chilli-sauce"], [/chilli|chili/, "red-chilli"], [/\byam\b|taro/, "yam"], [/\begg\b|eggs/, "egg"], [/honey/, "honey"],
  [/\bmilk\b/, "dairy-milk"], [/lime/, "lime"], [/radish/, "radish"],
];
/** Left out of play, as the built-in dishes do. */
const SKIP = /^(water|ice|hot water|cold water|water for .*)$/;
/** First-pass tags for a new ingredient from its name; it stays unreviewed until staff check it (§6, the diet module decides for real). */
const TAG_WORDS: [RegExp, ItemTag][] = [[/garlic|onion|shallot|leek|chive|scallion|asafoetida|hing/, "allium"], [/\begg/, "egg"], [/milk|butter|cheese|cream|ghee|yogh?urt|paneer/, "dairy"],
  [/honey/, "honey"], [/mushroom|shiitake|enoki|oyster/, "mushroom"], [/potato|carrot|radish|beet|ginger|turmeric|yam|taro|galangal/, "root"], [/chilli|chili|pepper flakes/, "hot"]];
/** Verbs that name a technique outright. First match wins. */
const TECH: [string, RegExp][] = [
  ["oven", /\b(oven|bake|baking|air.?fr(y|ier))\b/i], ["steam", /\b(steam|steamer|steaming)\b/i], ["deep-fry", /\b(deep.?fr(y|ied)|oil for frying)\b/i],
  ["griddle", /\b(flip|griddle)\b/i], ["blend", /\b(blend|blender|whisk|purée|puree|grind|pound|froth|beat)\b/i],
  ["chill", /\b(chill|refrigerat\w*|fridge|leave to set)\b/i], ["dough", /\b(knead|dough|roll out|pleat)\b/i],
  ["rice", /\brice cooker\b/i], ["pot", /\b(simmer|boil|blanch|braise|stew|poach|pot|saucepan|cover and cook)\b/i],
  ["pan", /\b(stir.?fry|stir.?fried|saut[ée]|fry|fried|temper|wok|pan.?fr(y|ied)|sear|toss|heat the oil|heat oil)\b/i],
  ["board", /\b(assemble|layer|roll up|top with|spoon over|arrange|serve with|mix|combine|dress)\b/i],
];
/** Words that name a technique only when no verb above does: "fold in" the coconut, "toast" seeds in the wok, "roast" vegetables. */
const LOOSE: [string, RegExp][] = [
  ["pan", /\b(toast|dry.?roast|roast)\w*\s+(the\s+)?([a-z-]+\s+){0,2}(seeds?|spices?|mustard|cumin|fennel|fenugreek|sesame|peanuts?|nuts|cashews?|coconut|curry leaves|dal|lentils)\b/i],
  ["griddle", /\btoast\w*\b/i], ["oven", /\broast\w*\b/i], ["dough", /\b(fold|wrap|wrapped|wrapping)\b/i],
];
/** "Until set" and "overnight" mean the fridge only in a chilled dessert, never while it cooks. */
const SET = /\b(until set|overnight)\b/i, HOT = /\b(cook|heat|stir)\w*\b/i;
/** Recipe verbs (TECH) whose station the game has. */
const BUILT: Record<string, StationKind> = { pan: "pan", pot: "pot", rice: "rice", board: "board", blend: "blender", steam: "steamer", oven: "oven", griddle: "griddle",
  "deep-fry": "fryer", dough: "dough", chill: "fridge" };
/** Side steps a level may shortcut with a ready item (RECIPE_LEVELS_PLAN §8.7); none since the fridge (Chapter 9) is built. */
const SIDE = new Set<string>();
const PREP = /^(rinse|wash|drain|soak|peel|chop|cut|slice|dice|shred|grate|mince|prepare|pat|set aside|measure|knot|crush|marinate|rest|thaw|defrost|trim|halve)/i;
/** A step's technique, or "prep" when the step drops out: a prep step stays only when it also names a cooking verb (the fridge does not count). */
function techOf(text: string, dessert: boolean): string | null {
  const named = TECH.find(([, re]) => re.test(text))?.[0];
  if (PREP.test(text.trim()) && (!named || named === "chill")) return "prep";
  return named ?? LOOSE.find(([, re]) => re.test(text))?.[0] ?? (dessert && SET.test(text) && !HOT.test(text) ? "chill" : null);
}

export const ingredientKey = (name: string) => name.toLowerCase().replace(/\(.*?\)/g, "").split(",")[0].trim();
export const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "item";
/** A built-in item for an ingredient name, null when it should be left out, or undefined when the shared list must decide. */
export function builtinFor(name: string): string | null | undefined {
  const n = ingredientKey(name);
  if (SKIP.test(n)) return null;
  const hit = ALIASES.find(([re]) => re.test(n))?.[1];
  return hit && ITEMS[hit] ? hit : undefined;
}
/** A new shared-list entry for an ingredient the game has no item for: keyword tags, a Sketch card until a picture is approved. */
export function newItem(name: string): GameItem {
  const id = "x-" + slug(ingredientKey(name)), tags = TAG_WORDS.filter(([re]) => re.test(ingredientKey(name))).map(([, t]) => t);
  return { id, name: name.replace(/\(.*?\)/g, "").split(",")[0].trim().slice(0, 60) || id, art: "card-" + id, tray: "fresh", ...(tags.length ? { tags } : {}) };
}

/** Step 1: the draft. `resolve` maps an ingredient name to an item (built-in or shared list). */
export function compileRecipe(r: RecipeInput, resolve: (name: string) => Resolved): Compiled {
  const dessert = r.categories.some(c => /dessert|drink/i.test(c)), byId = new Map(r.ingredients.map(i => [i.id, i]));
  const items = new Map<string, GameItem>(), unreviewed = new Set<string>(), needs: string[] = [], shortcuts: string[] = [], stages: DraftStage[] = [];
  const itemFor = (name: string) => {
    const found = resolve(name);
    if (!found) return null;
    if (found.item) items.set(found.id, found.item);
    if (found.unreviewed) unreviewed.add(found.id);
    return found.id;
  };
  r.steps.forEach((step, n) => {
    const found = techOf(step.instruction, dessert);
    if (found === "prep") return;
    const tech = found === "pot" && dessert ? "dessert" : found;
    const ids = [...new Set(step.ingredientIds.map(id => byId.get(id)?.name).filter((x): x is string => !!x).map(itemFor).filter((x): x is string => !!x))];
    if (!ids.length) return;
    if (tech && SIDE.has(tech)) { shortcuts.push(tech); return; }
    if (tech && !BUILT[tech] && tech !== "dessert") { needs.push(tech); return; }
    const station: StationKind = tech === "dessert" ? "dessert" : tech ? BUILT[tech] : stages.at(-1)?.station ?? (dessert ? "dessert" : "board");
    const last = stages.at(-1);
    if (last && last.station === station && new Set([...last.items, ...ids]).size <= 3) last.items = [...new Set([...last.items, ...ids])];
    else stages.push({ station, items: ids, step: n });
  });
  return { needs: [...new Set(needs)], shortcuts: [...new Set(shortcuts)], stages, items, unreviewed };
}

/** The level's shape: per station, two to four stages of one to three items, with a short hint each and the lesson. */
export type Shape = { remember: string; parts: { station: StationKind; stages: { items: string[]; hint: string; optional?: string[] }[] }[] };
const nameOf = (c: Compiled, id: string) => ITEMS[id]?.name ?? c.items.get(id)?.name ?? id;

/** A shape from code alone: adjacent stages merge until there are four per station, extra items drop. For trials and tests, never a silent stand-in for the AI. */
export function codeShape(c: Compiled): Shape {
  const parts = [...new Set(c.stages.map(s => s.station))].slice(0, 3).map(station => {
    let list = c.stages.filter(s => s.station === station).map(s => [...s.items]);
    while (list.length > 4) { const a = list.shift()!, b = list.shift()!; list = [[...new Set([...a, ...b])], ...list]; }
    return { station, stages: list.map(items => ({ items: items.slice(0, 3), hint: items.slice(0, 3).map(id => nameOf(c, id).toLowerCase()).join(", ") })) };
  });
  return { remember: "Cook it in the order the recipe gives.", parts };
}

/** Checks a shape against its draft: only the draft's items, built stations, 1–4 stages of 1–3 items, short text. Returns the problem or null. */
export function shapeProblem(c: Compiled, s: Shape): string | null {
  const allowed = new Set(c.stages.flatMap(x => x.items)), text = (t: unknown, max: number) => typeof t === "string" && t.trim().length > 0 && t.length <= max;
  if (!s || !Array.isArray(s.parts) || !s.parts.length || s.parts.length > 3) return "give one to three parts";
  if (!text(s.remember, 240) || /https?:|www\.|tiktok|instagram|youtube|facebook/i.test(s.remember)) return "remember must be one short sentence with no links or platform names";
  for (const p of s.parts) {
    if (typeof p.station !== "string" || !Object.hasOwn(STATIONS, p.station)) return "station " + String(p.station) + " is not one the game has";
    if (!Array.isArray(p.stages) || p.stages.length < 1 || p.stages.length > 4) return "each part needs one to four stages";
    for (const st of p.stages) {
      if (!Array.isArray(st.items) || st.items.length < 1 || st.items.length > 3 || st.items.some(i => !allowed.has(i))) return "each stage needs one to three of the given ingredient ids, and no others";
      if (!text(st.hint, 80)) return "each stage needs a hint under 80 characters";
      // Which ingredients are optional decides which guests can eat the dish, so it never comes from the AI (QT-052).
      if (st.optional?.length) return "nothing may be marked optional";
    }
  }
  const used = new Set(s.parts.flatMap(p => p.stages.flatMap(st => st.items)));
  if (used.size < Math.min(2, allowed.size)) return "use at least two of the given ingredients";
  return null;
}

/** Seconds per stage by station: rice's first stage is long, boards and dough assemble at once, slow appliances take a while. */
const stageSecs = (station: StationKind, k: number) => station === "rice" && k === 0 ? 10 : station === "board" || station === "dough" ? 0
  : station === "fridge" ? 8 : station === "oven" ? 6 : station === "steamer" ? 5 : 3;
const TURNS: Partial<Record<StationKind, "flip" | "fold">> = { griddle: "flip", dough: "fold" };

/** Step 3's input: the level pack from a recipe, its draft and a checked shape. Throws PackError when the pack is not valid. */
export function buildPack(r: RecipeInput, c: Compiled, s: Shape): LevelPack {
  const id = "t-" + slug(r.id), used = new Set(s.parts.flatMap(p => p.stages.flatMap(st => st.items)));
  // Transfer (§8.7): a blender part followed by another station makes a paste that part's first step takes; a blender part alone is the dish.
  const paste = s.parts.some((p, n) => p.station === "blender" && n < s.parts.length - 1) ? { id: (id + "-paste").slice(0, 40), name: (r.name.slice(0, 50) + " paste") } : null;
  const pasteAt = paste ? s.parts.findIndex(p => p.station === "blender") : -1;
  return readPack({
    format: 1, id: "recipe-" + slug(r.id),
    techniques: [...new Set(s.parts.map(p => p.station))],
    items: [...[...c.items.values()].filter(i => used.has(i.id)), ...(paste ? [{ id: paste.id, name: paste.name, art: "card-" + paste.id, tray: "pantry" }] : [])],
    ...(paste ? { forms: { [paste.id]: { form: "pour", tone: "red" } } } : {}),
    ...(c.unreviewed.size ? { unreviewed: [...c.unreviewed].filter(i => used.has(i)) } : {}),
    dishes: [{ id, name: r.name.slice(0, 60), art: "dish-" + slug(r.id), recipeId: r.id, remember: s.remember.trim(),
      parts: s.parts.map((p, n) => ({ id: id + "-" + n, name: r.name.slice(0, 60), station: p.station, ...(n === pasteAt ? { makes: paste!.id } : {}),
        stages: [...(paste && n === pasteAt + 1 ? [{ slots: [{ key: "paste", label: "Blended paste", accepts: [paste.id] }], secs: 2, hint: "the blended paste" }] : []),
          ...p.stages.map((st, k) => ({ slots: st.items.map((it, j) => ({ key: "s" + j, label: nameOf(c, it).slice(0, 40), accepts: [it] })),
            secs: stageSecs(p.station, k), hint: st.hint.trim(),
            // The technique's move comes with the station, never from the AI: the griddle's last stage is flipped, the dough's folded.
            ...(k === p.stages.length - 1 && TURNS[p.station] ? { turn: TURNS[p.station] } : {}) }))] })) }],
  });
}
