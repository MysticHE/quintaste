/**
 * Chapter 6, the breakfast counter (GAME_CONTENT_PLAN §3): the griddle with flip. At halfway the dish waits for the spatula; flip it
 * in time or the underside burns. What to recognise: ghee in flatbreads, egg in kaya, and radish (a root) in carrot cake.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { fresh, one, orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("wholemeal-flour", "Wholemeal flour"),
  pantry("prata-dough-a", "Prata dough", "prata-dough", ["dairy"], { title: "Frozen prata dough", ingredients: ["Wheat flour", "Water", "Ghee", "Sugar", "Salt"], contains: "Wheat, milk", flagged: "Ghee" }, "A"),
  pantry("prata-dough-b", "Prata dough", "prata-dough", [], { title: "Frozen prata dough, plant oil", ingredients: ["Wheat flour", "Water", "Vegetable oil", "Sugar", "Salt"], contains: "Wheat" }, "B"),
  fresh("bread", "White bread", "bread"),
  pantry("kaya-a", "Kaya", "kaya", ["egg"], { title: "Kaya coconut jam", ingredients: ["Coconut milk", "Egg", "Sugar", "Pandan"], contains: "Egg", flagged: "Egg" }, "A"),
  pantry("kaya-b", "Kaya", "kaya", [], { title: "Kaya coconut jam, egg-free", ingredients: ["Coconut milk", "Sugar", "Pandan", "Tapioca starch"], contains: "—" }, "B"),
  pantry("radish-cake", "Radish cake", "radish-cake", ["root"], { title: "Steamed radish cake", ingredients: ["Radish", "Rice flour", "Water", "Salt"], contains: "—" }),
  pantry("oat-milk", "Oat milk"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("thosai-batter", "Thosai batter"),
  pantry("pancake-batter", "Pancake batter"),
];
export const FORMS: Record<string, ItemForm> = {
  "wholemeal-flour": { form: "sprinkle", tone: "gold" }, "kaya-a": { form: "pour", tone: "gold" }, "kaya-b": { form: "pour", tone: "gold" },
  "oat-milk": { form: "pour", tone: "cream" }, "thosai-batter": { form: "pour", tone: "cream" }, "pancake-batter": { form: "pour", tone: "cream" },
};

export const DISHES: Dish[] = [
  { id: "thosai", name: "Thosai", art: "dish-thosai", remember: "Thosai batter is fermented rice and urad dal, like idli. It is spread thin on a hot griddle and crisped on one side only, then folded.",
    parts: [
      { id: "thosai-grind", name: "Thosai batter", station: "blender", makes: "thosai-batter", stages: [
        { slots: [slot("rice", "Rice", ["rice"]), slot("dal", "Urad dal", ["urad-dal"])], secs: 3, hint: "rice and urad dal" }] },
      { id: "thosai", name: "Thosai", station: "griddle", stages: [
        { slots: [slot("batter", "Thosai batter", ["thosai-batter"]), slot("oil", "Oil", ["cooking-oil"])], secs: 5, hint: "the batter and oil" }] },
    ] },
  one("prata", "Roti prata", "dish-prata", "griddle", [
    { slots: [slot("dough", "Prata dough", ["prata-dough-a", "prata-dough-b"]), slot("oil", "Oil", ["cooking-oil"])], secs: 5, hint: "prata dough and oil", turn: "flip" },
  ], "Bought prata dough can be made with ghee, which is dairy. Read the label for a vegan guest."),
  one("chapati", "Chapati", "dish-chapati", "griddle", [
    { slots: [slot("flour", "Wholemeal flour", ["wholemeal-flour"])], secs: 4, hint: "wholemeal flour", turn: "flip" },
    { slots: [slot("brush", "Ghee or oil", ["ghee", "cooking-oil"])], secs: 1, hint: "ghee or oil to brush" },
  ], "Chapati is often brushed with ghee. Oil keeps it vegan."),
  one("kaya-toast", "Kaya toast", "dish-kaya-toast", "griddle", [
    { slots: [slot("bread", "Bread", ["bread"])], secs: 3, hint: "bread", turn: "flip" },
    { slots: [slot("jam", "Kaya", ["kaya-a", "kaya-b"]), slot("fat", "Butter or margarine", ["butter", "margarine"])], secs: 1, hint: "kaya and a slab of butter" },
  ], "Toast the bread dry, then fill it with kaya and a cold slab of butter. Kaya is made with egg: an egg-free kaya and margarine make it vegan."),
  one("carrot-cake", "Fried carrot cake", "dish-carrot-cake", "griddle", [
    { slots: [slot("cake", "Radish cake", ["radish-cake"]), slot("oil", "Oil", ["cooking-oil"])], secs: 4, hint: "radish cake and oil", turn: "flip" },
    { slots: [slot("radish", "Chye poh", ["chye-poh"]), slot("sauce", "Dark soy", ["dark-soy"]), slot("egg", "Egg", ["egg"], true)], secs: 2, hint: "chye poh and dark soy" },
  ], "Carrot cake is really radish cake, a root, so it is not for a Jain guest. Egg is optional for a vegan one."),
  { id: "pancakes", name: "Pancakes", art: "dish-pancakes", remember: "Baking powder makes pancakes rise, so they need no egg: oat milk, margarine and palm sugar make them vegan.",
    parts: [
      { id: "pancake-mix", name: "Pancake batter", station: "blender", makes: "pancake-batter", stages: [
        { slots: [slot("flour", "Plain flour", ["plain-flour"]), slot("milk", "Milk", ["dairy-milk", "oat-milk"]), slot("rise", "Baking powder", ["baking-powder"])], secs: 2, hint: "flour, milk and baking powder" }] },
      { id: "pancakes", name: "Pancakes", station: "griddle", stages: [
        { slots: [slot("batter", "Pancake batter", ["pancake-batter"]), slot("fat", "Butter or margarine", ["butter", "margarine"])], secs: 4, hint: "the batter and butter", turn: "flip" },
        { slots: [slot("syrup", "Honey or palm sugar", ["honey", "gula-melaka"])], secs: 1, hint: "something sweet" }] },
    ] },
];

const { o } = orders("g");
export const LEVELS: Level[] = [
  { n: 51, bonus: "golden", name: "The griddle", brief: "The breakfast counter's griddle. Halfway through, drag the spatula onto it to flip the prata, or the underside burns.", teach: "Flip at halfway.",
    stations: ["griddle"], seats: 2, maxOpen: 2, round: 80, patience: 90, hints: "full", orders: [o("office", "prata", 1), o("jia", "prata", 16)], distractors: [], unlocks: ["Griddle"] },
  { n: 52, bonus: "clean", name: "Chapati", brief: "Flip the chapati, then brush it. Daniel is vegan: oil, not ghee.", teach: "Ghee is dairy.",
    stations: ["griddle"], seats: 2, maxOpen: 2, round: 90, patience: 92, hints: "full", orders: [o("office", "chapati", 1), o("daniel", "chapati", 18)], distractors: [], unlocks: [] },
  { n: 53, bonus: "golden", name: "Thosai", brief: "Grind the thosai batter and spread it on the griddle. Unlike prata, a crisp thosai is never flipped.", teach: "Some things cook on one side.",
    stations: ["blender", "griddle"], seats: 3, maxOpen: 3, round: 114, patience: 98, hints: "chip", orders: [o("asha", "thosai", 1), o("office", "thosai", 12), o("jia", "chapati", 42)], distractors: [], unlocks: [] },
  { n: 54, bonus: "steady", name: "Breakfast for all", brief: "Prata and thosai on the griddle, and a quick order from the wok.", teach: "The griddle and the wok at once.",
    stations: ["blender", "griddle", "pan"], seats: 3, maxOpen: 3, round: 136, patience: 100, hints: "chip", orders: [o("office", "prata", 1), o("nurul", "bee-hoon", 8), o("asha", "thosai", 40), o("lim", "prata", 66)], distractors: [], unlocks: [] },
  { n: 55, bonus: "clean", twists: [{ kind: "change" }], name: "Read the jam", brief: "Daniel is vegan: one kaya lists egg, and one prata dough lists ghee. Read both.", teach: "Egg hides in kaya; ghee in dough.",
    stations: ["griddle"], seats: 3, maxOpen: 3, round: 130, patience: 98, hints: "chip", orders: [o("daniel", "kaya-toast", 1), o("office", "prata", 8), o("daniel", "prata", 40), o("mei", "kaya-toast", 66)], distractors: [], unlocks: [] },
  { n: 56, bonus: "swift", name: "Pancake morning", brief: "A calm morning of pancakes. Daniel is vegan: oat milk, margarine and palm sugar.", teach: "Pancakes need no egg.",
    stations: ["blender", "griddle"], seats: 3, maxOpen: 3, round: 122, patience: 100, hints: "chip", orders: [o("office", "pancakes", 1), o("daniel", "pancakes", 12), o("jia", "pancakes", 44)], distractors: [], unlocks: [] },
  { n: 57, bonus: "swift", twists: [{ kind: "wave", n: 22 }], name: "Kopitiam rush", brief: "One early order, then the breakfast crowd at once. Flip every one on time.", teach: "Watch every flip.",
    stations: ["griddle"], seats: 3, maxOpen: 3, round: 110, patience: 92, hints: "none", orders: [o("office", "kaya-toast", 1), o("jia", "prata", 22), o("lim", "kaya-toast", 23), o("mei", "prata", 25)], distractors: [], unlocks: [] },
  { n: 58, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Carrot cake stall", brief: "Fry the radish cake, flip it, then add chye poh. Radish is a root: Asha has thosai.", teach: "Carrot cake is radish.",
    stations: ["blender", "griddle", "pan"], seats: 3, maxOpen: 3, round: 143, patience: 100, hints: "none", orders: [o("office", "carrot-cake", 1), o("asha", "thosai", 8), o("jia", "carrot-cake", 42), o("lim", "carrot-cake", 70)], distractors: [], unlocks: [] },
  { n: 59, bonus: "clean", twists: [{ kind: "stockout" }], name: "Brunch", brief: "Pancakes, kaya toast and naan, with no hints. Read every label.", teach: "Every rule, at brunch.",
    stations: ["blender", "griddle", "oven"], seats: 3, maxOpen: 3, round: 146, patience: 104, hints: "none", orders: [o("daniel", "pancakes", 1), o("office", "kaya-toast", 8), o("asha", "naan", 40), o("mei", "kaya-toast", 70)], distractors: [], unlocks: [] },
  { n: 60, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Kopitiam morning", brief: "Griddle, oven, steamer and blender: the breakfast counter's busiest morning.", teach: "Everything this chapter taught.",
    stations: ["blender", "griddle", "oven", "steamer"], seats: 4, maxOpen: 4, round: 184, patience: 102, hints: "none",
    orders: [o("asha", "thosai", 1), o("jia", "kaya-toast", 4), o("office", "carrot-cake", 12), o("daniel", "chee-cheong-fun", 36), o("mei", "prata", 58), o("lim", "roast-veg", 82), o("nurul", "pancakes", 104)], distractors: [], unlocks: ["Kopitiam skin"] },
];
