/**
 * Chapter 5, the bakery corner (GAME_CONTENT_PLAN §3): the oven, with preheat. Turn it on and wait for the band before anything goes in;
 * it holds its own heat, and a bake left in once ready burns. What to recognise: butter, egg and honey in bakes; lard in bought pastry.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { fresh, one, orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("semolina", "Semolina"),
  pantry("plain-flour", "Plain flour"),
  pantry("butter", "Butter", "butter", ["dairy"], undefined),
  pantry("margarine", "Margarine", "margarine", [], { title: "Plant margarine", ingredients: ["Palm oil", "Sunflower oil", "Water", "Salt"], contains: "—" }),
  pantry("flaxseed", "Ground flaxseed"),
  pantry("ground-almonds", "Ground almonds"),
  pantry("baking-powder", "Baking powder"),
  fresh("banana", "Banana"),
  pantry("ghee", "Ghee", "ghee", ["dairy"]),
  pantry("puff-pastry-a", "Puff pastry", "puff-pastry", ["animal"], { title: "Puff pastry sheets", ingredients: ["Wheat flour", "Lard", "Water", "Salt"], contains: "Wheat", flagged: "Lard" }, "A"),
  pantry("puff-pastry-b", "Puff pastry", "puff-pastry", [], { title: "Puff pastry sheets, vegetable fat", ingredients: ["Wheat flour", "Vegetable fat", "Water", "Salt"], contains: "Wheat" }, "B"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("sugee-batter", "Sugee batter"),
  pantry("banana-batter", "Banana batter"),
  pantry("pie-filling", "Pie filling"),
];
export const FORMS: Record<string, ItemForm> = {
  semolina: { form: "sprinkle", tone: "gold" }, "plain-flour": { form: "sprinkle", tone: "white" }, flaxseed: { form: "sprinkle", tone: "dark" }, "ground-almonds": { form: "sprinkle", tone: "gold" }, "baking-powder": { form: "sprinkle", tone: "white" },
  butter: { form: "pour", tone: "cream" }, margarine: { form: "pour", tone: "cream" }, ghee: { form: "pour", tone: "oil" },
  "sugee-batter": { form: "pour", tone: "gold" }, "banana-batter": { form: "pour", tone: "gold" }, "pie-filling": { form: "pour", tone: "gold" },
};

export const DISHES: Dish[] = [
  one("roast-veg", "Roast vegetables", "dish-roast-veg", "oven", [
    { slots: [slot("base", "Potato or corn", ["potato", "sweet-potato", "corn"]), slot("green", "Broccoli or capsicum", ["broccoli", "capsicum"]), slot("oil", "Oil", ["cooking-oil"])], secs: 6, hint: "vegetables and oil" },
    { slots: [slot("salt", "Salt", ["salt"]), slot("pepper", "Pepper", ["white-pepper"], true)], secs: 2, hint: "salt" },
  ], "Preheat first: food that goes into a cold oven bakes unevenly. Corn keeps it root-free for a Jain guest."),
  { id: "sugee-cake", name: "Sugee cake", art: "dish-sugee-cake", remember: "Sugee cake is semolina soaked in butter, with ground almonds and plenty of egg. Margarine and flaxseed make it vegan.",
    parts: [
      { id: "sugee-mix", name: "Sugee batter", station: "blender", makes: "sugee-batter", stages: [
        { slots: [slot("grain", "Semolina", ["semolina"]), slot("fat", "Butter or margarine", ["butter", "margarine"])], secs: 3, hint: "semolina and butter" },
        { slots: [slot("bind", "Egg or flaxseed", ["egg", "flaxseed"]), slot("sweet", "Sugar", ["brown-sugar"]), slot("nut", "Ground almonds", ["ground-almonds"])], secs: 2, hint: "egg, sugar and almonds" }] },
      { id: "sugee-cake", name: "Sugee cake", station: "oven", stages: [{ slots: [slot("batter", "Sugee batter", ["sugee-batter"])], secs: 7, hint: "the batter" }] },
    ] },
  { id: "veg-pie", name: "Curry vegetable pie", art: "dish-veg-pie", remember: "Some bought puff pastry is made with lard. Read the label in a plant-based kitchen.",
    parts: [
      { id: "pie-fill", name: "Filling", station: "pan", makes: "pie-filling", stages: [
        { slots: [slot("base", "Potato or corn", ["potato", "corn"]), slot("veg", "Carrot or cabbage", ["carrot", "cabbage"]), slot("spice", "Curry powder", ["curry-powder"])], secs: 3, hint: "vegetables and curry powder" }] },
      { id: "veg-pie", name: "Pie", station: "oven", stages: [
        { slots: [slot("pastry", "Puff pastry", ["puff-pastry-a", "puff-pastry-b"]), slot("fill", "Filling", ["pie-filling"])], secs: 6, hint: "pastry and the filling" }] },
    ] },
  { id: "banana-bread", name: "Banana bread", art: "dish-banana-bread", remember: "Mix the wet ingredients first, then fold in the flour and baking powder. Honey and butter are not vegan; brown sugar and oil bake just as well.",
    parts: [
      { id: "banana-mix", name: "Banana batter", station: "blender", makes: "banana-batter", stages: [
        { slots: [slot("fruit", "Banana", ["banana"]), slot("sweet", "Honey or sugar", ["honey", "brown-sugar"]), slot("fat", "Butter or oil", ["butter", "cooking-oil"])], secs: 2, hint: "banana, something sweet and some fat" },
        { slots: [slot("flour", "Plain flour", ["plain-flour"]), slot("rise", "Baking powder", ["baking-powder"])], secs: 2, hint: "flour and baking powder" }] },
      { id: "banana-bread", name: "Banana bread", station: "oven", stages: [{ slots: [slot("batter", "Banana batter", ["banana-batter"])], secs: 7, hint: "the batter" }] },
    ] },
  one("naan", "Naan", "dish-naan", "oven", [
    { slots: [slot("flour", "Plain flour", ["plain-flour"]), slot("soft", "Yoghurt or coconut milk", ["yoghurt", "coconut-milk"]), slot("rise", "Baking powder", ["baking-powder"])], secs: 5, hint: "flour, yoghurt and baking powder" },
    { slots: [slot("brush", "Ghee or oil", ["ghee", "cooking-oil"])], secs: 1, hint: "ghee to brush" },
  ], "Naan is soft with yoghurt and brushed with ghee, both dairy. Coconut milk and oil make it vegan."),
];

const { o } = orders("v");
export const LEVELS: Level[] = [
  { n: 41, bonus: "golden", name: "The oven", brief: "The bakery corner's oven. Turn it on and wait until the needle reaches the band before the vegetables go in: it holds its heat by itself.", teach: "Preheat, then bake.",
    stations: ["oven"], seats: 2, maxOpen: 2, round: 85, patience: 95, hints: "full", orders: [o("office", "roast-veg", 1), o("asha", "roast-veg", 18)], distractors: ["garlic"], unlocks: ["Oven"] },
  { n: 42, bonus: "clean", name: "Warm bread", brief: "Naan is soft with yoghurt and brushed with ghee. Daniel is vegan: coconut milk and oil.", teach: "Dairy hides in soft breads.",
    stations: ["oven"], seats: 2, maxOpen: 2, round: 90, patience: 95, hints: "full", orders: [o("office", "naan", 1), o("daniel", "naan", 18)], distractors: [], unlocks: [] },
  { n: 43, bonus: "golden", name: "Pie night", brief: "Fry the curry filling in the wok, then pour it onto the pastry in the oven. Keep the oven hot while the wok works.", teach: "Preheat while you prepare.",
    stations: ["pan", "oven"], seats: 3, maxOpen: 3, round: 120, patience: 100, hints: "chip", orders: [o("jia", "veg-pie", 1), o("office", "roast-veg", 10), o("lim", "veg-pie", 42)], distractors: [], unlocks: [] },
  { n: 44, bonus: "steady", name: "Sugee cake", brief: "Beat the sugee batter in the blender, then bake it. The wok handles a quick order meanwhile.", teach: "Blend, bake, and cook between.",
    stations: ["blender", "oven", "pan"], seats: 3, maxOpen: 3, round: 136, patience: 100, hints: "chip", orders: [o("office", "sugee-cake", 1), o("nurul", "kangkung-split", 8), o("jia", "sugee-cake", 40), o("mei", "tomato-tofu", 66)], distractors: [], unlocks: [] },
  { n: 45, bonus: "clean", twists: [{ kind: "change" }], name: "Read the bake", brief: "Daniel is vegan: no butter, egg or honey in his bakes. One puff pastry lists lard: read it for everyone.", teach: "Butter, egg, honey and lard hide in bakes.",
    stations: ["blender", "oven", "pan"], seats: 3, maxOpen: 3, round: 150, patience: 100, hints: "chip", orders: [o("daniel", "banana-bread", 1), o("office", "veg-pie", 8), o("daniel", "sugee-cake", 42), o("jia", "veg-pie", 70)], distractors: [], unlocks: [] },
  { n: 46, bonus: "swift", name: "Naan and chutney", brief: "A calm lunch of naan and mint chutney. Asha keeps Jain food.", teach: "The oven and the blender share the work.",
    stations: ["blender", "oven"], seats: 3, maxOpen: 3, round: 135, patience: 100, hints: "chip", orders: [o("asha", "naan", 1), o("office", "mint-chutney", 10), o("daniel", "naan", 40), o("asha", "mint-chutney", 64)], distractors: [], unlocks: [] },
  { n: 47, bonus: "swift", twists: [{ kind: "wave", n: 24 }], name: "Lunch bake", brief: "One early tray, then the lunch crowd. Keep the oven hot and take each tray out on time.", teach: "A hot oven is ready when you are.",
    stations: ["oven"], seats: 3, maxOpen: 3, round: 115, patience: 95, hints: "none", orders: [o("office", "roast-veg", 1), o("jia", "naan", 24), o("lim", "roast-veg", 25), o("mei", "naan", 27)], distractors: [], unlocks: [] },
  { n: 48, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Bakery and wok", brief: "Pies bake while the wok fries. The wok may flare: the oven never does.", teach: "Two heats, two kinds of control.",
    stations: ["pan", "oven"], seats: 3, maxOpen: 3, round: 143, patience: 100, hints: "none", orders: [o("office", "veg-pie", 1), o("lim", "mapo-tofu", 6), o("jia", "veg-pie", 40), o("nurul", "roast-veg", 68)], distractors: [], unlocks: [] },
  { n: 49, bonus: "clean", twists: [{ kind: "stockout" }], name: "Tea party", brief: "Sugee cake, banana bread and steamed buns, with no hints. Read every label.", teach: "Every rule, at teatime.",
    stations: ["blender", "oven", "pan", "steamer"], seats: 3, maxOpen: 3, round: 154, patience: 105, hints: "none", orders: [o("jia", "sugee-cake", 1), o("daniel", "banana-bread", 8), o("office", "veg-bao", 40), o("mei", "banana-bread", 70)], distractors: [], unlocks: [] },
  { n: 50, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Bakery night", brief: "The whole bakery: oven, blender, wok and pot. The busiest night yet.", teach: "Everything this chapter taught.",
    stations: ["blender", "oven", "pan", "pot"], seats: 4, maxOpen: 4, round: 183, patience: 102, hints: "none",
    orders: [o("asha", "naan", 1), o("jia", "veg-pie", 4), o("office", "sugee-cake", 12), o("daniel", "naan", 36), o("mei", "abc-soup", 58), o("lim", "banana-bread", 82), o("nurul", "roast-veg", 104)], distractors: [], unlocks: ["Bakery skin"] },
];
