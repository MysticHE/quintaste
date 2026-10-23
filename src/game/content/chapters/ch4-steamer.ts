/**
 * Chapter 4, the steam kitchen (GAME_CONTENT_PLAN §3): the steamer. A steamer needs no heat control, but a dish left in it once it is
 * ready goes soggy (burn-if-left). What to recognise: egg in custards and milk in bought dough; yam and radish are roots for a Jain guest.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { fresh, one, orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("urad-dal", "Urad dal"),
  pantry("rice-flour", "Rice flour"),
  pantry("chye-poh", "Chye poh", "chye-poh", ["root"], { title: "Preserved radish (chye poh)", ingredients: ["Radish", "Salt", "Sugar"], contains: "—" }),
  pantry("bao-dough-a", "Bao dough", "bao-dough", ["dairy"], { title: "Steamed bun dough", ingredients: ["Wheat flour", "Milk", "Sugar", "Yeast", "Shortening"], contains: "Wheat, milk", flagged: "Milk" }, "A"),
  pantry("bao-dough-b", "Bao dough", "bao-dough", [], { title: "Steamed bun dough, plant-based", ingredients: ["Wheat flour", "Water", "Sugar", "Yeast", "Vegetable oil"], contains: "Wheat" }, "B"),
  fresh("silken-tofu", "Silken tofu"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("idli-batter", "Idli batter"),
  pantry("bao-filling", "Bao filling"),
];
export const FORMS: Record<string, ItemForm> = {
  "urad-dal": { form: "sprinkle", tone: "white" }, "rice-flour": { form: "sprinkle", tone: "white" }, "chye-poh": { form: "sprinkle", tone: "dark" },
  "idli-batter": { form: "pour", tone: "cream" }, "bao-filling": { form: "pour", tone: "soy" },
};

export const DISHES: Dish[] = [
  one("steamed-tofu", "Steamed tofu", "dish-steamed-tofu", "steamer", [
    { slots: [slot("tofu", "Silken tofu", ["silken-tofu", "tofu"]), slot("aroma", "Ginger", ["ginger"], true)], secs: 5, hint: "silken tofu" },
    { slots: [slot("sauce", "Soy", ["soy"]), slot("oil", "Sesame oil", ["sesame-oil"])], secs: 2, hint: "soy and sesame oil" },
  ], "A steamer cooks by itself, but a dish left in once it is ready goes soggy. Take it out on time."),
  { id: "idli", name: "Idli", art: "dish-idli", remember: "Idli batter is rice and urad dal ground together, then steamed until soft and springy.",
    parts: [
      { id: "idli-grind", name: "Idli batter", station: "blender", makes: "idli-batter", stages: [
        { slots: [slot("rice", "Rice", ["rice"]), slot("dal", "Urad dal", ["urad-dal"])], secs: 3, hint: "rice and urad dal" }] },
      { id: "idli", name: "Idli", station: "steamer", stages: [
        { slots: [slot("batter", "Idli batter", ["idli-batter"])], secs: 5, hint: "the batter" }] },
    ] },
  one("chee-cheong-fun", "Chee cheong fun", "dish-chee-cheong-fun", "steamer", [
    { slots: [slot("flour", "Rice flour", ["rice-flour"]), slot("oil", "Oil", ["cooking-oil"])], secs: 5, hint: "rice flour and oil" },
    { slots: [slot("sauce", "Sweet sauce", ["sweet-sauce-a", "sweet-sauce-b"]), slot("top", "Sesame seeds", ["sesame-seeds"])], secs: 1, hint: "sweet sauce and sesame" },
  ], "Sweet sauce can list garlic. Read the label for a vegetarian order."),
  { id: "chwee-kueh", name: "Chwee kueh", art: "dish-chwee-kueh", remember: "Chye poh is preserved radish, a root, so chwee kueh is not for a Jain guest.",
    parts: [
      { id: "chwee-cakes", name: "Rice cakes", station: "steamer", stages: [{ slots: [slot("flour", "Rice flour", ["rice-flour"])], secs: 6, hint: "rice flour" }] },
      { id: "chye-poh", name: "Chye poh", station: "pan", stages: [
        { slots: [slot("radish", "Chye poh", ["chye-poh"]), slot("oil", "Oil", ["cooking-oil"]), slot("heat", "Chilli", ["red-chilli"], true)], secs: 3, hint: "chye poh and oil" }] },
    ] },
  { id: "veg-bao", name: "Vegetable bao", art: "dish-veg-bao", remember: "Bought bun dough often contains milk. Read the label for a vegan guest.",
    parts: [
      { id: "bao-fill", name: "Filling", station: "pan", makes: "bao-filling", stages: [
        { slots: [slot("veg", "Cabbage", ["cabbage"]), slot("bite", "Savoury bite", ["shiitake", "black-beans"]), slot("sauce", "Soy", ["soy"])], secs: 3, hint: "cabbage, something savoury and soy" }] },
      { id: "veg-bao", name: "Bao", station: "steamer", stages: [
        { slots: [slot("dough", "Bao dough", ["bao-dough-a", "bao-dough-b"]), slot("fill", "Filling", ["bao-filling"])], secs: 5, hint: "dough and the filling" }] },
    ] },
  one("steamed-egg", "Steamed egg", "dish-steamed-egg", "steamer", [
    { slots: [slot("egg", "Egg", ["egg"]), slot("stock", "Stock", ["stock-a", "stock-b"])], secs: 5, hint: "egg and stock" },
    { slots: [slot("sauce", "Soy", ["soy"]), slot("oil", "Sesame oil", ["sesame-oil"])], secs: 1, hint: "soy and sesame oil" },
  ], "A custard is set with egg, so it is vegetarian but never vegan."),
  one("yam-cake", "Yam cake", "dish-yam-cake", "steamer", [
    { slots: [slot("yam", "Yam", ["yam"]), slot("flour", "Rice flour", ["rice-flour"])], secs: 6, hint: "yam and rice flour" },
    { slots: [slot("crunch", "Peanuts", ["peanuts"]), slot("heat", "Chilli", ["red-chilli"], true)], secs: 1, hint: "peanuts" },
  ], "Yam (taro) is a root, so a Jain guest has another dish."),
];

const { o } = orders("s");
export const LEVELS: Level[] = [
  { n: 31, bonus: "golden", name: "The steamer", brief: "The steam kitchen opens. Drag the tofu into the steamer: it cooks by itself. Take it out as soon as it's ready, or it goes soggy.", teach: "Fill the steamer, then take it out on time.",
    stations: ["steamer"], seats: 2, maxOpen: 2, round: 78, patience: 85, hints: "full", orders: [o("office", "steamed-tofu", 1), o("daniel", "steamed-tofu", 16)], distractors: ["garlic"], unlocks: ["Steamer"] },
  { n: 32, bonus: "clean", name: "Grind, then steam", brief: "Idli batter is ground in the blender, then poured into the steamer.", teach: "A batter can be made, then steamed.",
    stations: ["blender", "steamer"], seats: 2, maxOpen: 2, round: 95, patience: 92, hints: "full", orders: [o("office", "idli", 1), o("asha", "idli", 20)], distractors: [], unlocks: [] },
  { n: 33, bonus: "clean", name: "Rice rolls", brief: "Chee cheong fun steams first, then gets its sauce. One sweet sauce lists garlic, and Auntie Mei is vegetarian.", teach: "Read the sauce label.",
    stations: ["steamer"], seats: 3, maxOpen: 3, round: 105, patience: 88, hints: "chip", orders: [o("office", "chee-cheong-fun", 1), o("mei", "chee-cheong-fun", 10), o("daniel", "steamed-tofu", 38)], distractors: [], unlocks: [] },
  { n: 34, bonus: "golden", name: "Fill the bun", brief: "Fry the bao filling in the wok, then pour it into the steamer with the dough.", teach: "The wok and the steamer work together.",
    stations: ["pan", "steamer"], seats: 3, maxOpen: 3, round: 122, patience: 96, hints: "chip", orders: [o("jia", "veg-bao", 1), o("office", "kangkung-split", 8), o("lim", "veg-bao", 40), o("nurul", "steamed-tofu", 62)], distractors: [], unlocks: [] },
  { n: 35, bonus: "clean", twists: [{ kind: "change" }], name: "Read the dough", brief: "Daniel is vegan: one bun dough lists milk, and steamed egg is never vegan. Read before you steam.", teach: "Egg sets a custard; milk hides in dough.",
    stations: ["pan", "steamer"], seats: 3, maxOpen: 3, round: 132, patience: 96, hints: "chip", orders: [o("daniel", "veg-bao", 1), o("office", "steamed-egg", 8), o("jia", "veg-bao", 40), o("mei", "steamed-egg", 64)], distractors: [], unlocks: [] },
  { n: 36, bonus: "swift", name: "Idli breakfast", brief: "A calm breakfast: idli with coconut chutney, and Asha keeps Jain food.", teach: "Two blends, one steamer.",
    stations: ["blender", "steamer"], seats: 3, maxOpen: 3, round: 128, patience: 96, hints: "chip", orders: [o("asha", "idli", 1), o("office", "coconut-chutney", 10), o("daniel", "idli", 40), o("asha", "coconut-chutney", 66)], distractors: [], unlocks: [] },
  { n: 37, bonus: "swift", twists: [{ kind: "wave", n: 22 }], name: "Dim sum rush", brief: "One early order, then the dim sum crowd all at once. Keep the steamer full and empty it fast.", teach: "Steam one while you serve another.",
    stations: ["steamer"], seats: 3, maxOpen: 3, round: 104, patience: 90, hints: "none", orders: [o("office", "chee-cheong-fun", 1), o("jia", "steamed-tofu", 22), o("daniel", "chee-cheong-fun", 23), o("mei", "steamed-tofu", 25)], distractors: [], unlocks: [] },
  { n: 38, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Chwee kueh stall", brief: "Steam the rice cakes while the chye poh fries. Chye poh is radish: Asha is Jain, so she has idli.", teach: "Roots hide in pickles too.",
    stations: ["blender", "steamer", "pan"], seats: 3, maxOpen: 3, round: 138, patience: 96, hints: "none", orders: [o("office", "chwee-kueh", 1), o("asha", "idli", 8), o("lim", "chwee-kueh", 40), o("nurul", "chwee-kueh", 66)], distractors: [], unlocks: [] },
  { n: 39, bonus: "clean", twists: [{ kind: "stockout" }], name: "Teatime", brief: "Yam cake, bao and steamed egg, with no hints. Yam is a root; egg is not vegan.", teach: "Every rule, at teatime.",
    stations: ["pan", "steamer"], seats: 3, maxOpen: 3, round: 155, patience: 100, hints: "none", orders: [o("jia", "yam-cake", 1), o("daniel", "veg-bao", 8), o("office", "steamed-egg", 42), o("mei", "yam-cake", 68), o("lim", "veg-bao", 92)], distractors: [], unlocks: [] },
  { n: 40, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Steam kitchen night", brief: "Every station at once: steamer, wok, pot and blender. The steam kitchen's busiest night.", teach: "Everything this chapter taught.",
    stations: ["blender", "steamer", "pan", "pot"], seats: 4, maxOpen: 4, round: 180, patience: 100, hints: "none",
    orders: [o("asha", "idli", 1), o("jia", "veg-bao", 4), o("office", "chwee-kueh", 12), o("mei", "laksa-scratch", 36), o("daniel", "chee-cheong-fun", 58), o("lim", "idli", 82), o("nurul", "yam-cake", 104)], distractors: [], unlocks: ["Bamboo steamer skin"] },
];
