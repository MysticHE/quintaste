/**
 * Recipe levels trial (docs/game/RECIPE_LEVELS_PLAN.md §6, Phase 0): turns the app's live recipes into level packs with the code
 * steps of the pipeline (compile and check) and reports which play with no new code. The AI shaping step is not run here (its
 * key lives on the server); `shape()` below is a deterministic stand-in that only merges steps, so results are a floor, not the
 * pipeline's final quality. Read-only: fetches the public recipe routes and writes nothing to the app.
 * Usage: npx tsx scripts/recipe-levels-trial.ts [--api https://…] [--offline] [--out .local/recipe-levels/trial-report.json]
 */
import { writeFileSync } from "node:fs";
import { STATIONS, type StationKind } from "../src/game/content/dishes";
import { ITEMS, type ItemTag } from "../src/game/content/items";
import { packHash, PackError, readPack, registerPack, type LevelPack } from "../src/game/content/pack";
import { missionFor } from "../src/game/mission";
import * as sim from "../src/game/sim/engine";
import { bundledRecipes } from "../src/data/recipes";
import { play } from "./game-bot";

const arg = (k: string, d = "") => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const API = arg("api", "https://quintaste.srv1902914.hstgr.cloud"), OUT = arg("out", ".local/recipe-levels/trial-report.json");
type Ing = { id: string; name: string };
type Step = { instruction: string; ingredientIds: string[] };
type Recipe = { id: string; name: string; categories: string[]; ingredients: Ing[]; steps: Step[]; source: string };

/** Recipe ingredient words → a built-in game item (the reviewed equivalents table starts here). Order matters: first match wins. */
const ALIASES: [RegExp, string][] = [
  [/dark soy/, "dark-soy"], [/soy sauce|light soy|^soy$/, "soy"], [/kecap/, "kecap"], [/sesame oil/, "sesame-oil"], [/sesame seed|^sesame$/, "sesame-seeds"],
  [/\boil\b/, "cooking-oil"], [/coconut milk|santan/, "coconut-milk"], [/bee hoon|vermicelli/, "bee-hoon"], [/rice noodle/, "rice-noodles"],
  [/yellow noodle|egg-free yellow/, "yellow-noodles-b"], [/tofu/, "tofu"], [/tempeh/, "tempeh"], [/shiitake/, "shiitake"], [/button mushroom/, "button-mushrooms"],
  [/bean sprout|sprouts/, "bean-sprouts"], [/kangkung|water spinach/, "kangkung"], [/bok choy/, "bok-choy"], [/choy sum/, "choy-sum"], [/broccoli/, "broccoli"],
  [/cabbage/, "cabbage"], [/carrot/, "carrot"], [/sweet potato/, "sweet-potato"], [/potato/, "potato"], [/\bcorn\b/, "corn"], [/tomato(?!.*ketchup)/, "tomato"],
  [/ketchup/, "ketchup-b"], [/capsicum|bell pepper/, "capsicum"], [/pineapple/, "pineapple"], [/cucumber/, "cucumber"], [/jicama|bangkuang/, "jicama"],
  [/lettuce/, "lettuce"], [/peanut/, "peanuts"], [/popiah skin|skins/, "popiah-skins"], [/sweet sauce|tim cheong/, "sweet-sauce-b"], [/chilli bean|doubanjiang|bean paste/, "paste-b"],
  [/chilli paste|sambal oelek/, "chilli-paste-b"], [/sambal/, "sambal-b"], [/stock|broth/, "stock-b"], [/fermented beancurd|fu ru/, "fu-ru"], [/black bean/, "black-beans"],
  [/cornflour|cornstarch|corn starch/, "cornflour"], [/rice vinegar|vinegar/, "rice-vinegar"], [/gula melaka|palm sugar/, "gula-melaka"], [/brown sugar|^sugar$|sugar/, "brown-sugar"],
  [/white pepper|^pepper$/, "white-pepper"], [/\bsalt\b/, "salt"], [/turmeric/, "turmeric"], [/pandan/, "pandan"], [/sago/, "sago"], [/\boats?\b/, "oats"], [/coriander/, "coriander"],
  [/\brice\b/, "rice"], [/ginger/, "ginger"], [/garlic/, "garlic"], [/shallot/, "shallots"], [/spring onion|scallion/, "spring-onion"], [/onion/, "onion"],
  [/dried chill/, "dried-chillies"], [/chilli sauce/, "chilli-sauce"], [/chilli|chili/, "red-chilli"], [/\byam\b|taro/, "yam"], [/\begg\b|eggs/, "egg"], [/honey/, "honey"],
  [/\bmilk\b/, "dairy-milk"], [/lime/, "lime"], [/radish/, "radish"],
];
/** Ingredients a home cook adds without thinking (left out of play, like the built-in dishes do). */
const SKIP = /^(water|ice|hot water|cold water|water for .*)$/;
/** Tags for a new ingredient, from its name; the app's diet module and staff review decide for real (§6). */
const TAG_WORDS: [RegExp, ItemTag][] = [[/garlic|onion|shallot|leek|chive|scallion|asafoetida|hing/, "allium"], [/\begg/, "egg"], [/milk|butter|cheese|cream|ghee|yogh?urt|paneer/, "dairy"],
  [/honey/, "honey"], [/mushroom|shiitake|enoki|oyster/, "mushroom"], [/potato|carrot|radish|beet|ginger|turmeric|yam|taro|galangal/, "root"], [/chilli|chili|pepper flakes/, "hot"]];

const TECH: [string, RegExp][] = [
  ["oven", /\b(oven|bake|baking|roast|air.?fr(y|ier))\b/i], ["steam", /\b(steam|steamer|steaming)\b/i], ["deep-fry", /\b(deep.?fr(y|ied)|oil for frying)\b/i],
  ["griddle", /\b(flip|griddle|toast)\b/i], ["blend", /\b(blend|blender|whisk|purée|puree|grind|pound|froth|beat)\b/i],
  ["chill", /\b(chill|refrigerat|fridge|until set|leave to set|overnight)\b/i], ["dough", /\b(knead|dough|roll out)\b/i],
  ["rice", /\brice cooker\b/i], ["pot", /\b(simmer|boil|blanch|braise|stew|poach|pot|saucepan|cover and cook)\b/i],
  ["pan", /\b(stir.?fry|stir.?fried|saut[ée]|fry|fried|temper|wok|pan.?fr(y|ied)|sear|toss|heat the oil|heat oil)\b/i], ["board", /\b(assemble|layer|roll up|top with|spoon over|arrange|serve with)\b/i],
];
const BUILT: Record<string, StationKind> = { pan: "pan", pot: "pot", rice: "rice", board: "board" };
/** Unbuilt techniques a recipe may take as a ready item when they are a side step (§8.7); never the step that defines the dish. */
const SIDE = new Set(["blend", "chill"]);
const PREP = /^(rinse|wash|drain|soak|peel|chop|cut|slice|dice|shred|grate|mince|prepare|pat|set aside|measure|knot|crush)/i;

const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "item";
const clean = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").split(",")[0].trim();
function techniqueOf(step: Step, dessert: boolean): string | null {
  const t = step.instruction, found = TECH.find(([, re]) => re.test(t))?.[0] ?? null;
  return found === "pot" && dessert ? "dessert" : found;
}

type Outcome = { id: string; name: string; source: string; result: "playable" | "needs technique" | "failed check"; needs: string[]; shortcuts: string[];
  stations: string[]; stages: number; builtIn: number; newItems: string[]; dropped: string[]; pictures: number; clears: string; note: string };

/** Compile (code): ingredients to game items, steps to stations, prep steps out, unbuilt side steps shortcut, unbuilt main steps refused. */
function compile(r: Recipe): { pack?: LevelPack; outcome: Omit<Outcome, "clears" | "result"> & { result?: Outcome["result"] } } {
  const dessert = r.categories.some(c => /dessert|drink/i.test(c)), byId = new Map(r.ingredients.map(i => [i.id, i]));
  const newItems = new Map<string, { id: string; name: string; art: string; tray: "fresh"; tags?: ItemTag[] }>(), dropped: string[] = [], needs: string[] = [], shortcuts: string[] = [];
  const itemFor = (ing: Ing): string | null => {
    const n = clean(ing.name);
    if (SKIP.test(n)) return null;
    const hit = ALIASES.find(([re]) => re.test(n))?.[1];
    if (hit && ITEMS[hit]) return hit;
    const id = "x-" + slug(n), tags = TAG_WORDS.filter(([re]) => re.test(n)).map(([, t]) => t);
    if (!newItems.has(id)) newItems.set(id, { id, name: ing.name.replace(/\(.*?\)/g, "").split(",")[0].trim().slice(0, 60) || id, art: "card-" + id, tray: "fresh", ...(tags.length ? { tags } : {}) });
    return id;
  };
  const stages: { station: StationKind; items: string[] }[] = [];
  for (const step of r.steps) {
    const tech = techniqueOf(step, dessert), items = [...new Set(step.ingredientIds.map(id => byId.get(id)).filter((x): x is Ing => !!x).map(itemFor).filter((x): x is string => !!x))];
    if (!items.length) continue;
    if (!tech && PREP.test(step.instruction.trim())) continue;
    if (tech && SIDE.has(tech)) { shortcuts.push(tech); continue; }
    if (tech && !BUILT[tech] && tech !== "dessert") { needs.push(tech); continue; }
    const station: StationKind = tech === "dessert" ? "dessert" : tech ? BUILT[tech] : stages.at(-1)?.station ?? (dessert ? "dessert" : "pan");
    const last = stages.at(-1);
    if (last && last.station === station && new Set([...last.items, ...items]).size <= 3) last.items = [...new Set([...last.items, ...items])];
    else stages.push({ station, items });
  }
  const base = { id: r.id, name: r.name, source: r.source, needs: [...new Set(needs)], shortcuts: [...new Set(shortcuts)], dropped, pictures: newItems.size + 1, note: "" };
  if (needs.length) return { outcome: { ...base, result: "needs technique", stations: [], stages: 0, builtIn: 0, newItems: [...newItems.values()].map(i => i.name) } };
  // Shape stand-in: one part per station in order of first use, at most four stages each (adjacent stages merge, extra items are dropped).
  const parts = [...new Set(stages.map(s => s.station))].slice(0, 3).map(station => {
    let list = stages.filter(s => s.station === station).map(s => [...s.items]);
    while (list.length > 4) { const a = list.shift()!, b = list.shift()!; list = [[...new Set([...a, ...b])], ...list]; }
    return { station, stages: list.map(items => { if (items.length > 3) dropped.push(...items.slice(3).map(i => ITEMS[i]?.name ?? newItems.get(i)?.name ?? i)); return items.slice(0, 3); }) };
  });
  const used = new Set(parts.flatMap(p => p.stages.flat()));
  const pack = { format: 1, id: ("trial-" + r.id).slice(0, 64), techniques: parts.map(p => p.station),
    items: [...newItems.values()].filter(i => used.has(i.id)),
    dishes: [{ id: "t-" + slug(r.id), name: r.name.slice(0, 60), art: "dish-t-" + slug(r.id), recipeId: r.id, remember: "Cook it in the order the recipe gives.",
      parts: parts.map((p, n) => ({ id: "t-" + slug(r.id) + "-" + n, name: r.name.slice(0, 60), station: p.station,
        stages: p.stages.map((items, k) => ({ slots: items.map((it, s) => ({ key: "s" + s, label: (ITEMS[it]?.name ?? newItems.get(it)!.name).slice(0, 40), accepts: [it] })),
          secs: p.station === "rice" && k === 0 ? 10 : p.station === "board" ? 0 : 3, hint: "step " + (k + 1) })) })) }] };
  return { pack: readPack(pack), outcome: { ...base, stations: parts.map(p => STATIONS[p.station].name), stages: parts.reduce((n, p) => n + p.stages.length, 0),
    builtIn: [...used].filter(i => !i.startsWith("x-")).length, newItems: pack.items.map(i => i.name), pictures: pack.items.length + 1 } };
}

async function recipes(): Promise<Recipe[]> {
  const out: Recipe[] = bundledRecipes(true).map(r => ({ id: r.id, name: r.name, categories: r.categories, ingredients: r.ingredients, steps: r.steps, source: "bundled" }));
  if (process.argv.includes("--offline")) return out;
  const get = async (path: string) => (await fetch(API + path)).json();
  for (const it of (await get("/api/editorial/recipes")).items) { const r = await get("/api/editorial/recipes/" + it.id); out.push({ ...r, source: "QuinTaste" }); }
  for (const it of (await get("/api/recipes")).items) { const r = await get("/api/recipes/" + it.id); out.push({ ...(r.recipe ?? r), source: "member" }); }
  return out;
}

async function main() {
const list = await recipes(), outcomes: Outcome[] = [];
for (const r of list) {
  let done: Outcome;
  try {
    const { pack, outcome } = compile(r);
    if (!pack) { outcomes.push({ ...outcome, result: "needs technique", clears: "" } as Outcome); continue; }
    registerPack(pack);
    const mission = missionFor(pack, "service"), clears = [1, 2, 3, 4, 5, 6].filter(seed => play(sim.createRun(mission, "sprout", [], undefined, seed), 2.2).cleared).length;
    done = { ...outcome, result: clears >= 5 ? "playable" : "failed check", clears: clears + "/6", note: packHash(pack) } as Outcome;
  } catch (error) {
    done = { id: r.id, name: r.name, source: r.source, result: "failed check", needs: [], shortcuts: [], stations: [], stages: 0, builtIn: 0, newItems: [], dropped: [], pictures: 0, clears: "",
      note: error instanceof PackError ? "pack: " + error.message : String((error as Error).message).slice(0, 120) };
  }
  outcomes.push(done);
}
const count = (k: Outcome["result"]) => outcomes.filter(o => o.result === k).length;
for (const o of outcomes) console.log([o.result.padEnd(15), o.name.slice(0, 38).padEnd(38), o.source.padEnd(9), o.needs.length ? "needs " + o.needs.join("+")
  : `${o.stations.join("+")} · ${o.stages} stages · ${o.builtIn} built-in, ${o.newItems.length} new · ${o.clears}${o.shortcuts.length ? " · shortcut " + o.shortcuts.join("+") : ""}${o.dropped.length ? " · dropped " + o.dropped.join(", ") : ""}${o.note.startsWith("pack") ? " · " + o.note : ""}`].join(" | "));
const playable = outcomes.filter(o => o.result === "playable");
const summary = { at: new Date().toISOString(), recipes: outcomes.length, playable: count("playable"), needsTechnique: count("needs technique"), failedCheck: count("failed check"),
  needs: Object.fromEntries([...new Set(outcomes.flatMap(o => o.needs))].map(t => [t, outcomes.filter(o => o.needs.includes(t)).length])),
  newPicturesPerPlayable: playable.length ? +(playable.reduce((n, o) => n + o.pictures, 0) / playable.length).toFixed(1) : 0, aiShaping: "not run (compile and check only)" };
console.log("\n" + JSON.stringify(summary));
writeFileSync(OUT, JSON.stringify({ summary, outcomes }, null, 1));
}
main().catch(error => { console.error(error); process.exit(1); });
