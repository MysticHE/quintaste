/**
 * Chapter 8, the dumpling house (GAME_CONTENT_PLAN §3): the dough board, with fold. Fill the wrapper, drag the fold onto the board to
 * close it, then carry it to the pot, pan, fryer, steamer or dessert pot (transfer). What to recognise: egg in wrappers, garlic chives
 * in fillings.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { fresh, orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("wrappers-a", "Dumpling wrappers", "dumpling-wrappers", ["egg"], { title: "Dumpling wrappers", ingredients: ["Wheat flour", "Water", "Egg", "Salt"], contains: "Wheat, egg", flagged: "Egg" }, "A"),
  pantry("wrappers-b", "Dumpling wrappers", "dumpling-wrappers", [], { title: "Dumpling wrappers, egg-free", ingredients: ["Wheat flour", "Water", "Salt"], contains: "Wheat" }, "B"),
  pantry("samosa-pastry", "Samosa pastry"),
  pantry("glutinous-flour", "Glutinous rice flour"),
  pantry("black-sesame", "Black sesame paste"),
  fresh("green-peas", "Green peas"),
  pantry("water", "Water"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("dumpling-filling", "Dumpling filling"),
  pantry("samosa-filling", "Samosa filling"),
  pantry("raw-dumplings", "Dumplings"),
  pantry("raw-gyoza", "Gyoza"),
  pantry("raw-samosas", "Samosas"),
  pantry("raw-tang-yuan", "Tang yuan"),
  pantry("raw-mandu", "Mandu"),
];
export const FORMS: Record<string, ItemForm> = {
  "glutinous-flour": { form: "sprinkle", tone: "white" }, "black-sesame": { form: "pour", tone: "soy" }, water: { form: "pour", tone: "white" },
  "dumpling-filling": { form: "pour", tone: "soy" }, "samosa-filling": { form: "pour", tone: "gold" },
};

export const DISHES: Dish[] = [
  { id: "dumplings", name: "Vegetable dumplings", art: "dish-dumplings", remember: "Garlic chives are an allium. Ginger fills a dumpling for a vegetarian guest.",
    parts: [
      { id: "dumpling-fill", name: "Filling", station: "pan", makes: "dumpling-filling", stages: [
        { slots: [slot("veg", "Cabbage", ["cabbage"]), slot("bite", "Savoury bite", ["shiitake", "black-beans", "tofu"]), slot("aroma", "Chives or ginger", ["chives", "ginger"])], secs: 3, hint: "cabbage, something savoury and chives" }] },
      { id: "dumpling-fold", name: "Dumplings", station: "dough", makes: "raw-dumplings", stages: [
        { slots: [slot("wrap", "Wrappers", ["wrappers-a", "wrappers-b"]), slot("fill", "Filling", ["dumpling-filling"])], secs: 0, hint: "wrappers and the filling", turn: "fold" }] },
      { id: "dumplings", name: "Dumplings", station: "pot", stages: [{ slots: [slot("dumplings", "Dumplings", ["raw-dumplings"])], secs: 4, hint: "the dumplings" }] },
    ] },
  { id: "gyoza", name: "Pan-fried gyoza", art: "dish-gyoza", remember: "Fry the gyoza until the bottoms brown, then add a splash of water and cover them to steam. Many dumpling wrappers contain egg: read the label for a vegan guest.",
    parts: [
      { id: "gyoza-fold", name: "Gyoza", station: "dough", makes: "raw-gyoza", stages: [
        { slots: [slot("wrap", "Wrappers", ["wrappers-a", "wrappers-b"]), slot("veg", "Cabbage", ["cabbage"]), slot("aroma", "Chives or ginger", ["chives", "ginger"])], secs: 0, hint: "wrappers, cabbage and chives", turn: "fold" }] },
      { id: "gyoza", name: "Gyoza", station: "pan", stages: [
        { slots: [slot("gyoza", "Gyoza", ["raw-gyoza"]), slot("oil", "Oil", ["cooking-oil"])], secs: 2, hint: "the gyoza and oil" },
        { slots: [slot("water", "Water", ["water"])], secs: 2, hint: "a splash of water" }] },
    ] },
  { id: "samosa", name: "Samosa", art: "dish-samosa", remember: "Potato samosas suit most guests; peas fill them for a Jain guest who skips roots.",
    parts: [
      { id: "samosa-fill", name: "Filling", station: "pan", makes: "samosa-filling", stages: [
        { slots: [slot("base", "Potato or peas", ["potato", "green-peas"]), slot("spice", "Curry powder", ["curry-powder"])], secs: 3, hint: "potato and curry powder" }] },
      { id: "samosa-fold", name: "Samosas", station: "dough", makes: "raw-samosas", stages: [
        { slots: [slot("pastry", "Samosa pastry", ["samosa-pastry"]), slot("fill", "Filling", ["samosa-filling"])], secs: 0, hint: "pastry and the filling", turn: "fold" }] },
      { id: "samosa", name: "Samosa", station: "fryer", stages: [{ slots: [slot("samosas", "Samosas", ["raw-samosas"])], secs: 4, hint: "the samosas" }] },
    ] },
  { id: "tang-yuan", name: "Tang yuan", art: "dish-tang-yuan", remember: "Tang yuan are glutinous rice balls round a filling, simmered in a gentle sweet soup.",
    parts: [
      { id: "tang-yuan-fold", name: "Rice balls", station: "dough", makes: "raw-tang-yuan", stages: [
        { slots: [slot("flour", "Glutinous rice flour", ["glutinous-flour"]), slot("fill", "Black sesame or peanuts", ["black-sesame", "peanuts"])], secs: 0, hint: "rice flour and a filling", turn: "fold" }] },
      { id: "tang-yuan", name: "Tang yuan", station: "dessert", stages: [
        { slots: [slot("balls", "Rice balls", ["raw-tang-yuan"]), slot("sweet", "Brown sugar", ["brown-sugar"]), slot("aroma", "Ginger", ["ginger"], true)], secs: 4, hint: "the rice balls and sugar" }] },
    ] },
  { id: "mandu", name: "Steamed mandu", art: "dish-mandu", remember: "Fold, then steam: a dumpling left in the steamer goes soggy.",
    parts: [
      { id: "mandu-fold", name: "Mandu", station: "dough", makes: "raw-mandu", stages: [
        { slots: [slot("wrap", "Wrappers", ["wrappers-a", "wrappers-b"]), slot("tofu", "Tofu", ["tofu"]), slot("veg", "Cabbage", ["cabbage"])], secs: 0, hint: "wrappers, tofu and cabbage", turn: "fold" }] },
      { id: "mandu", name: "Mandu", station: "steamer", stages: [{ slots: [slot("mandu", "Mandu", ["raw-mandu"])], secs: 5, hint: "the mandu" }] },
    ] },
];

const { o } = orders("d");
export const LEVELS: Level[] = [
  { n: 71, bonus: "golden", name: "The dough board", brief: "Put the wrappers and filling on the dough board, drag the fold onto it to close the gyoza, then fry them in the wok and steam them with a splash of water.", teach: "Fill, fold, cook.",
    stations: ["dough", "pan"], seats: 2, maxOpen: 2, round: 95, patience: 95, hints: "full", orders: [o("office", "gyoza", 1), o("jia", "gyoza", 20)], distractors: [], unlocks: ["Dough board"] },
  { n: 72, bonus: "clean", name: "Steamed mandu", brief: "Fold the mandu, then steam them. Take them out on time.", teach: "Fold, then steam.",
    stations: ["dough", "steamer"], seats: 2, maxOpen: 2, round: 96, patience: 95, hints: "full", orders: [o("office", "mandu", 1), o("lim", "mandu", 20)], distractors: [], unlocks: [] },
  { n: 73, bonus: "golden", name: "Dumpling soup", brief: "Fry the filling, fold the dumplings, then boil them in the pot.", teach: "Three stations, one dish.",
    stations: ["pan", "dough", "pot"], seats: 3, maxOpen: 3, round: 131, patience: 100, hints: "chip", orders: [o("office", "dumplings", 1), o("jia", "dumplings", 14), o("lim", "gyoza", 46)], distractors: [], unlocks: [] },
  { n: 74, bonus: "steady", name: "Samosa stall", brief: "Spice the filling in the wok, fold the samosas, then fry them in hot oil.", teach: "Fold, then fry.",
    stations: ["pan", "dough", "fryer"], seats: 3, maxOpen: 3, round: 128, patience: 100, hints: "chip", orders: [o("office", "samosa", 1), o("asha", "samosa", 12), o("jia", "samosa", 46)], distractors: [], unlocks: [] },
  { n: 75, bonus: "clean", twists: [{ kind: "change" }], name: "Read the wrapper", brief: "Daniel is vegan: one wrapper lists egg. Auntie Mei is vegetarian: garlic chives are out, ginger is in.", teach: "Egg hides in wrappers; chives are an allium.",
    stations: ["dough", "pan", "steamer"], seats: 3, maxOpen: 3, round: 141, patience: 100, hints: "chip", orders: [o("daniel", "gyoza", 1), o("mei", "gyoza", 8), o("daniel", "mandu", 40), o("office", "mandu", 66)], distractors: [], unlocks: [] },
  { n: 76, bonus: "swift", name: "Sweet soup", brief: "A gentle evening: tang yuan in sweet ginger soup. Asha keeps Jain food: leave the ginger out.", teach: "A dough board and a dessert pot.",
    stations: ["dough", "dessert"], seats: 3, maxOpen: 3, round: 119, patience: 100, hints: "chip", orders: [o("office", "tang-yuan", 1), o("asha", "tang-yuan", 12), o("mei", "tang-yuan", 44)], distractors: [], unlocks: [] },
  { n: 77, bonus: "swift", twists: [{ kind: "wave", n: 22 }], name: "Dumpling rush", brief: "One early order, then the dinner crowd. Keep folding.", teach: "Fold the next while one cooks.",
    stations: ["dough", "pan"], seats: 3, maxOpen: 3, round: 115, patience: 94, hints: "none", orders: [o("office", "gyoza", 1), o("jia", "gyoza", 22), o("lim", "gyoza", 23), o("nurul", "gyoza", 25)], distractors: [], unlocks: [] },
  { n: 78, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Fried and boiled", brief: "Samosas in the fryer, dumplings in the pot. The oil may flare.", teach: "Two cooked endings for one fold.",
    stations: ["pan", "dough", "fryer", "pot"], seats: 3, maxOpen: 3, round: 173, patience: 108, hints: "none", orders: [o("office", "samosa", 1), o("jia", "dumplings", 8), o("asha", "samosa", 44), o("lim", "dumplings", 74)], distractors: [], unlocks: [] },
  { n: 79, bonus: "clean", twists: [{ kind: "stockout" }], name: "Folding feast", brief: "Every fold, with no hints. Read every label.", teach: "Every rule, at the dumpling house.",
    stations: ["dough", "pan", "steamer", "dessert"], seats: 3, maxOpen: 3, round: 152, patience: 104, hints: "none", orders: [o("daniel", "mandu", 1), o("mei", "gyoza", 8), o("asha", "tang-yuan", 40), o("office", "gyoza", 70)], distractors: [], unlocks: [] },
  { n: 80, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Dumpling house night", brief: "Dough board, wok, fryer and steamer: the dumpling house is full.", teach: "Everything this chapter taught.",
    stations: ["dough", "pan", "fryer", "steamer"], seats: 4, maxOpen: 4, round: 193, patience: 108, hints: "none",
    orders: [o("office", "mandu", 1), o("jia", "samosa", 4), o("lim", "mandu", 12), o("daniel", "gyoza", 36), o("mei", "steamed-tofu", 58), o("asha", "samosa", 82), o("nurul", "spring-rolls", 104)], distractors: [], unlocks: ["Dumpling house skin"] },
];
