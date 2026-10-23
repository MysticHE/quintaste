/**
 * Chapter 7, the fritter stall (GAME_CONTENT_PLAN §3): the fryer. Oil must be hot before anything goes in (preheat), stays in a narrow
 * band and burns fast; batters are blended first and poured in (transfer). What to recognise: egg in batters, lard in bought pastry.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { one, orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("spring-rolls-a", "Spring rolls", "spring-rolls", ["animal"], { title: "Frozen spring rolls", ingredients: ["Cabbage", "Carrot", "Wheat flour", "Lard", "Salt"], contains: "Wheat", flagged: "Lard" }, "A"),
  pantry("spring-rolls-b", "Spring rolls", "spring-rolls", [], { title: "Frozen spring rolls, vegetable oil", ingredients: ["Cabbage", "Carrot", "Wheat flour", "Vegetable oil", "Salt"], contains: "Wheat" }, "B"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("vadai-batter", "Vadai batter"),
  pantry("pisang-batter", "Fritter batter"),
  pantry("tempura-batter", "Tempura batter"),
];
export const FORMS: Record<string, ItemForm> = {
  "vadai-batter": { form: "pour", tone: "gold" }, "pisang-batter": { form: "pour", tone: "cream" }, "tempura-batter": { form: "pour", tone: "cream" },
};

export const DISHES: Dish[] = [
  { id: "vadai", name: "Vadai", art: "dish-vadai", remember: "Vadai batter is ground urad dal. Ginger is optional, so it can be Jain.",
    parts: [
      { id: "vadai-grind", name: "Vadai batter", station: "blender", makes: "vadai-batter", stages: [
        { slots: [slot("dal", "Urad dal", ["urad-dal"]), slot("chilli", "Green chilli", ["green-chilli"]), slot("aroma", "Ginger", ["ginger"], true)], secs: 3, hint: "urad dal and green chilli" }] },
      { id: "vadai", name: "Vadai", station: "fryer", stages: [{ slots: [slot("batter", "Vadai batter", ["vadai-batter"])], secs: 4, hint: "the batter" }] },
    ] },
  { id: "goreng-pisang", name: "Goreng pisang", art: "dish-goreng-pisang", remember: "Fritters need hot oil: in cold oil the batter soaks it up and turns greasy.",
    parts: [
      { id: "pisang-mix", name: "Fritter batter", station: "blender", makes: "pisang-batter", stages: [
        { slots: [slot("rice", "Rice flour", ["rice-flour"]), slot("flour", "Plain flour", ["plain-flour"])], secs: 2, hint: "rice flour and plain flour" }] },
      { id: "goreng-pisang", name: "Goreng pisang", station: "fryer", stages: [
        { slots: [slot("fruit", "Banana", ["banana"]), slot("batter", "Fritter batter", ["pisang-batter"])], secs: 4, hint: "banana and the batter" }] },
    ] },
  one("spring-rolls", "Spring rolls", "dish-spring-rolls", "fryer", [
    { slots: [slot("rolls", "Spring rolls", ["spring-rolls-a", "spring-rolls-b"])], secs: 4, hint: "the spring rolls" },
  ], "Some bought pastry is made with lard. Read the label in a plant-based kitchen."),
  { id: "tempura", name: "Vegetable tempura", art: "dish-tempura", remember: "Tempura batter is often made with egg. Cornflour makes it crisp and vegan.",
    parts: [
      { id: "tempura-mix", name: "Tempura batter", station: "blender", makes: "tempura-batter", stages: [
        { slots: [slot("flour", "Plain flour", ["plain-flour"]), slot("bind", "Egg or cornflour", ["egg", "cornflour"])], secs: 2, hint: "flour and egg" }] },
      { id: "tempura", name: "Tempura", station: "fryer", stages: [
        { slots: [slot("veg", "Sweet potato or broccoli", ["sweet-potato", "broccoli"]), slot("batter", "Tempura batter", ["tempura-batter"])], secs: 4, hint: "a vegetable and the batter" }] },
    ] },
  one("tofu-puffs", "Fried tofu puffs", "dish-tofu-puffs", "fryer", [
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("coat", "Cornflour", ["cornflour"]), slot("salt", "Salt", ["salt"])], secs: 4, hint: "tofu, cornflour and salt" },
  ], "A cornflour coat keeps fried tofu crisp outside and soft inside."),
];

const { o } = orders("f");
export const LEVELS: Level[] = [
  { n: 61, bonus: "golden", name: "The fryer", brief: "The fritter stall's fryer. Heat the oil until the needle reaches the band before anything goes in, then keep it there: it burns fast.", teach: "Hot oil first, then fry.",
    stations: ["fryer"], seats: 2, maxOpen: 2, round: 85, patience: 92, hints: "full", orders: [o("office", "tofu-puffs", 1), o("daniel", "tofu-puffs", 18)], distractors: [], unlocks: ["Fryer"] },
  { n: 62, bonus: "clean", name: "Banana fritters", brief: "Mix the batter in the blender, then pour it into the hot oil with the banana.", teach: "A batter, then the fryer.",
    stations: ["blender", "fryer"], seats: 2, maxOpen: 2, round: 96, patience: 95, hints: "full", orders: [o("office", "goreng-pisang", 1), o("jia", "goreng-pisang", 20)], distractors: [], unlocks: [] },
  { n: 63, bonus: "golden", name: "Vadai", brief: "Grind the vadai batter and fry it. Asha keeps Jain food: leave the ginger out.", teach: "Optional ingredients make a dish easy to adapt.",
    stations: ["blender", "fryer"], seats: 3, maxOpen: 3, round: 119, patience: 98, hints: "chip", orders: [o("asha", "vadai", 1), o("office", "vadai", 12), o("nurul", "tofu-puffs", 42)], distractors: [], unlocks: [] },
  { n: 64, bonus: "steady", name: "Fritters and noodles", brief: "Fry the fritters while the wok cooks noodles.", teach: "Two hot stations, two bands.",
    stations: ["blender", "fryer", "pan"], seats: 3, maxOpen: 3, round: 140, patience: 100, hints: "chip", orders: [o("office", "goreng-pisang", 1), o("lim", "bee-hoon", 8), o("jia", "vadai", 40), o("mei", "tomato-tofu", 66)], distractors: [], unlocks: [] },
  { n: 65, bonus: "clean", twists: [{ kind: "change" }], name: "Read the batter", brief: "Daniel is vegan: tempura batter can use egg, and one spring roll pack lists lard. Read before you fry.", teach: "Egg hides in batter; lard in pastry.",
    stations: ["blender", "fryer"], seats: 3, maxOpen: 3, round: 135, patience: 98, hints: "chip", orders: [o("daniel", "tempura", 1), o("office", "spring-rolls", 8), o("daniel", "spring-rolls", 40), o("jia", "tempura", 66)], distractors: [], unlocks: [] },
  { n: 66, bonus: "swift", name: "Teatime fritters", brief: "A quiet afternoon of fritters and chutney.", teach: "Keep the oil hot between orders.",
    stations: ["blender", "fryer"], seats: 3, maxOpen: 3, round: 135, patience: 100, hints: "chip", orders: [o("office", "vadai", 1), o("asha", "coconut-chutney", 10), o("jia", "goreng-pisang", 40), o("lim", "vadai", 66)], distractors: [], unlocks: [] },
  { n: 67, bonus: "swift", twists: [{ kind: "wave", n: 22 }], name: "Night stall rush", brief: "One early order, then the night crowd all at once.", teach: "Hot oil waits for no one.",
    stations: ["fryer"], seats: 3, maxOpen: 3, round: 110, patience: 92, hints: "none", orders: [o("office", "spring-rolls", 1), o("jia", "tofu-puffs", 22), o("mei", "spring-rolls", 23), o("lim", "tofu-puffs", 25)], distractors: [], unlocks: [] },
  { n: 68, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Hot oil", brief: "The fryer may flare tonight. Turn the burner off to ride it out.", teach: "Ease off before it burns.",
    stations: ["blender", "fryer", "pan"], seats: 3, maxOpen: 3, round: 143, patience: 100, hints: "none", orders: [o("office", "tempura", 1), o("nurul", "kangkung-split", 8), o("jia", "tempura", 42), o("lim", "goreng-pisang", 70)], distractors: [], unlocks: [] },
  { n: 69, bonus: "clean", twists: [{ kind: "stockout" }], name: "Fritter feast", brief: "Every fritter, with no hints. Read every label.", teach: "Every rule, at the stall.",
    stations: ["blender", "fryer", "griddle"], seats: 3, maxOpen: 3, round: 147, patience: 104, hints: "none", orders: [o("daniel", "tempura", 1), o("office", "spring-rolls", 8), o("asha", "vadai", 40), o("mei", "prata", 70)], distractors: [], unlocks: [] },
  { n: 70, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Night market", brief: "Fryer, griddle, oven and blender: the night market's busiest hour.", teach: "Everything this chapter taught.",
    stations: ["blender", "fryer", "griddle", "oven"], seats: 4, maxOpen: 4, round: 179, patience: 102, hints: "none",
    orders: [o("asha", "vadai", 1), o("jia", "goreng-pisang", 4), o("office", "prata", 12), o("daniel", "tempura", 36), o("mei", "roast-veg", 58), o("lim", "spring-rolls", 82), o("nurul", "kaya-toast", 104)], distractors: [], unlocks: ["Night stall skin"] },
];
