/**
 * Chapter 9, the dessert and salad bar (GAME_CONTENT_PLAN §3): the fridge. Desserts cook in the dessert pot, then set or chill in the
 * fridge (transfer); salads are built on the board. What to recognise: gelatin is animal and agar is not; shrimp paste in rojak sauce.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { fresh, one, orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("agar-a", "Jelly powder", "jelly-powder", ["animal"], { title: "Jelly powder", ingredients: ["Sugar", "Gelatin", "Flavouring"], contains: "—", flagged: "Gelatin" }, "A"),
  pantry("agar-b", "Jelly powder", "jelly-powder", [], { title: "Agar jelly powder", ingredients: ["Agar", "Sugar", "Flavouring"], contains: "—" }, "B"),
  pantry("soy-milk", "Soy milk"),
  pantry("coagulant", "Tofu coagulant"),
  fresh("mango", "Mango"),
  pantry("peanut-sauce", "Peanut sauce"),
  pantry("rojak-sauce-a", "Rojak sauce", "rojak-sauce", ["animal"], { title: "Rojak sauce", ingredients: ["Sugar", "Shrimp paste", "Tamarind", "Chilli"], contains: "Crustacean", flagged: "Shrimp paste" }, "A"),
  pantry("rojak-sauce-b", "Rojak sauce", "rojak-sauce", [], { title: "Rojak sauce, vegetarian", ingredients: ["Sugar", "Tamarind", "Chilli", "Soybean paste"], contains: "Soy" }, "B"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("agar-mix", "Jelly mix"),
  pantry("soy-pudding", "Soy pudding"),
  pantry("cooked-sago", "Cooked sago"),
];
export const FORMS: Record<string, ItemForm> = {
  "soy-milk": { form: "pour", tone: "cream" }, coagulant: { form: "sprinkle", tone: "white" }, "peanut-sauce": { form: "pour", tone: "gold" },
  "rojak-sauce-a": { form: "pour", tone: "soy" }, "rojak-sauce-b": { form: "pour", tone: "soy" }, "agar-a": { form: "sprinkle", tone: "white" },
  "agar-b": { form: "sprinkle", tone: "white" }, "agar-mix": { form: "pour", tone: "cream" }, "soy-pudding": { form: "pour", tone: "cream" },
};

export const DISHES: Dish[] = [
  { id: "agar-agar", name: "Coconut agar-agar", art: "dish-agar-agar", remember: "Gelatin is made from animals; agar comes from seaweed. Read the jelly powder label.",
    parts: [
      { id: "agar-cook", name: "Jelly mix", station: "dessert", makes: "agar-mix", stages: [
        { slots: [slot("set", "Jelly powder", ["agar-a", "agar-b"]), slot("sweet", "Sugar", ["brown-sugar", "gula-melaka"])], secs: 3, hint: "jelly powder and sugar" },
        { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("leaf", "Pandan", ["pandan"], true)], secs: 2, hint: "coconut milk", splitIfHot: ["coconut-milk"] }] },
      { id: "agar-agar", name: "Agar-agar", station: "fridge", stages: [{ slots: [slot("mix", "Jelly mix", ["agar-mix"])], secs: 7, hint: "the jelly mix" }] },
    ] },
  { id: "tau-huay", name: "Tau huay", art: "dish-tau-huay", remember: "A coagulant sets hot soy milk into a silky pudding. Tau huay is eaten warm or chilled, with a syrup.",
    parts: [
      { id: "tau-huay-cook", name: "Soy pudding", station: "dessert", makes: "soy-pudding", stages: [
        { slots: [slot("milk", "Soy milk", ["soy-milk"])], secs: 2, hint: "soy milk" },
        { slots: [slot("set", "Coagulant", ["coagulant"])], secs: 2, hint: "the coagulant" }] },
      { id: "tau-huay", name: "Tau huay", station: "fridge", stages: [
        { slots: [slot("pudding", "Soy pudding", ["soy-pudding"])], secs: 5, hint: "the soy pudding" },
        { slots: [slot("syrup", "Syrup", ["gula-melaka", "brown-sugar"])], secs: 0, hint: "a syrup" }] },
    ] },
  { id: "mango-sago", name: "Mango sago", art: "dish-mango-sago", remember: "Cook the sago, then chill it with mango and coconut milk.",
    parts: [
      { id: "sago-cook", name: "Sago", station: "dessert", makes: "cooked-sago", stages: [{ slots: [slot("sago", "Sago", ["sago"])], secs: 4, hint: "sago pearls" }] },
      { id: "mango-sago", name: "Mango sago", station: "fridge", stages: [
        { slots: [slot("sago", "Cooked sago", ["cooked-sago"]), slot("fruit", "Mango", ["mango"]), slot("cream", "Coconut milk", ["coconut-milk"])], secs: 6, hint: "sago, mango and coconut milk" }] },
    ] },
  { id: "gado-gado", name: "Gado-gado", art: "dish-gado-gado", remember: "Gado-gado is blanched vegetables with peanut sauce. Egg is optional, so it can be vegan.",
    parts: [
      { id: "gado-blanch", name: "Vegetables", station: "pot", stages: [
        { slots: [slot("base", "Potato or cabbage", ["potato", "cabbage"]), slot("beans", "Long beans", ["long-beans"]), slot("sprouts", "Bean sprouts", ["bean-sprouts"])], secs: 4, hint: "vegetables to blanch" }] },
      { id: "gado-plate", name: "Salad", station: "board", stages: [
        { slots: [slot("leaf", "Lettuce", ["lettuce"]), slot("protein", "Tempeh or tofu", ["tempeh", "tofu"])], secs: 0, hint: "lettuce and tempeh" },
        { slots: [slot("sauce", "Peanut sauce", ["peanut-sauce"]), slot("egg", "Egg", ["egg"], true)], secs: 0, hint: "peanut sauce" }] },
    ] },
  one("rojak", "Fruit rojak", "dish-rojak", "board", [
    { slots: [slot("fruit", "Pineapple", ["pineapple"]), slot("cool", "Cucumber", ["cucumber"]), slot("crunch", "Jicama", ["jicama"])], secs: 0, hint: "pineapple, cucumber and jicama" },
    { slots: [slot("sauce", "Rojak sauce", ["rojak-sauce-a", "rojak-sauce-b"]), slot("nuts", "Peanuts", ["peanuts"])], secs: 0, hint: "rojak sauce and peanuts" },
  ], "Rojak sauce is usually made with shrimp paste. Read the label in a plant-based kitchen."),
];

const { o } = orders("c");
export const LEVELS: Level[] = [
  { n: 81, bonus: "golden", name: "The fridge", brief: "Cook the sago in the dessert pot, then pour it into the fridge with mango and coconut milk to chill.", teach: "Cook, then chill.",
    stations: ["dessert", "fridge"], seats: 2, maxOpen: 2, round: 100, patience: 98, hints: "full", orders: [o("office", "mango-sago", 1), o("daniel", "mango-sago", 18)], distractors: [], unlocks: ["Fridge"] },
  { n: 82, bonus: "clean", name: "Silky tau huay", brief: "Heat the soy milk, set it with the coagulant, chill it in the fridge, then add a syrup.", teach: "A coagulant sets hot soy milk.",
    stations: ["dessert", "fridge"], seats: 2, maxOpen: 2, round: 97, patience: 98, hints: "full", orders: [o("office", "tau-huay", 1), o("asha", "tau-huay", 20)], distractors: [], unlocks: [] },
  { n: 83, bonus: "golden", name: "Agar-agar", brief: "Cook the jelly mix, lower the heat before the coconut milk, then set it in the fridge.", teach: "Gentle heat, then set.",
    stations: ["dessert", "fridge"], seats: 3, maxOpen: 3, round: 125, patience: 100, hints: "chip", orders: [o("office", "agar-agar", 1), o("jia", "agar-agar", 14), o("mei", "mango-sago", 44)], distractors: [], unlocks: [] },
  { n: 84, bonus: "steady", name: "Salad bar", brief: "Blanch the vegetables in the pot, then build gado-gado on the board.", teach: "The pot and the board together.",
    stations: ["pot", "board"], seats: 3, maxOpen: 3, round: 120, patience: 100, hints: "chip", orders: [o("office", "gado-gado", 1), o("jia", "rojak", 10), o("lim", "gado-gado", 42)], distractors: [], unlocks: [] },
  { n: 85, bonus: "clean", twists: [{ kind: "change" }], name: "Read the jelly", brief: "One jelly powder lists gelatin, and one rojak sauce lists shrimp paste. Both are animal: read for everyone.", teach: "Gelatin is animal; agar is not.",
    stations: ["dessert", "fridge", "board"], seats: 3, maxOpen: 3, round: 138, patience: 100, hints: "chip", orders: [o("daniel", "agar-agar", 1), o("office", "rojak", 8), o("jia", "agar-agar", 40), o("mei", "rojak", 66)], distractors: [], unlocks: [] },
  { n: 86, bonus: "swift", name: "Afternoon sweets", brief: "A slow afternoon of tau huay and mango sago.", teach: "Cool things take time: start them early.",
    stations: ["dessert", "fridge"], seats: 3, maxOpen: 3, round: 125, patience: 102, hints: "chip", orders: [o("office", "tau-huay", 1), o("asha", "mango-sago", 12), o("lim", "tau-huay", 44)], distractors: [], unlocks: [] },
  { n: 87, bonus: "swift", twists: [{ kind: "wave", n: 22 }], name: "Salad rush", brief: "One early order, then the lunch crowd wants salads at once.", teach: "Boards are quick; keep them moving.",
    stations: ["board", "pot"], seats: 3, maxOpen: 3, round: 115, patience: 92, hints: "none", orders: [o("office", "rojak", 1), o("jia", "gado-gado", 22), o("mei", "rojak", 23), o("lim", "rojak", 25)], distractors: [], unlocks: [] },
  { n: 88, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Dessert night", brief: "Agar-agar and tang yuan share the dessert pot tonight. The pot may flare.", teach: "Plan the dessert pot.",
    stations: ["dessert", "fridge", "dough"], seats: 3, maxOpen: 3, round: 151, patience: 102, hints: "none", orders: [o("office", "agar-agar", 1), o("asha", "tang-yuan", 10), o("jia", "mango-sago", 44), o("mei", "tang-yuan", 74)], distractors: [], unlocks: [] },
  { n: 89, bonus: "clean", twists: [{ kind: "stockout" }], name: "Garden party", brief: "Salads and sweets, with no hints. Read every label.", teach: "Every rule, in the garden.",
    stations: ["dessert", "fridge", "board", "pot"], seats: 3, maxOpen: 3, round: 151, patience: 104, hints: "none", orders: [o("daniel", "agar-agar", 1), o("office", "rojak", 8), o("asha", "tau-huay", 40), o("lim", "gado-gado", 70)], distractors: [], unlocks: [] },
  { n: 90, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Garden terrace", brief: "Fridge, dessert pot, board and pot: the garden terrace is full.", teach: "Everything this chapter taught.",
    stations: ["fridge", "dessert", "board", "pot"], seats: 4, maxOpen: 4, round: 189, patience: 104, hints: "none",
    orders: [o("office", "mango-sago", 1), o("jia", "gado-gado", 4), o("asha", "tau-huay", 12), o("daniel", "agar-agar", 36), o("mei", "rojak", 58), o("lim", "gado-gado", 82), o("nurul", "mango-sago", 104)], distractors: [], unlocks: ["Garden terrace skin"] },
];
