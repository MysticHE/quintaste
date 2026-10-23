/**
 * Chapter 10, the banquet hall (GAME_CONTENT_PLAN §3): whole meals. One order is a full meal whose parts come from several stations
 * and go out together on one tray (multi-part plating); a shared meal feeds two. What to recognise: every rule, for a whole table.
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { orders, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  pantry("toor-dal", "Toor dal"),
];
export const FORMS: Record<string, ItemForm> = { "toor-dal": { form: "sprinkle", tone: "gold" } };

export const DISHES: Dish[] = [
  { id: "thali", name: "Vegetable thali", art: "dish-thali", remember: "A thali is a whole meal: rice, dal and a vegetable, ready together.",
    parts: [
      { id: "thali-rice", name: "Rice", station: "rice", stages: [{ slots: [slot("rice", "Rice", ["rice"])], secs: 9, hint: "rice" }] },
      { id: "thali-dal", name: "Dal", station: "pot", stages: [
        { slots: [slot("dal", "Toor dal", ["toor-dal"]), slot("spice", "Turmeric", ["turmeric"]), slot("tang", "Tomato", ["tomato"])], secs: 5, hint: "dal, turmeric and tomato" }] },
      { id: "thali-veg", name: "Vegetable", station: "pan", stages: [
        { slots: [slot("veg", "Cabbage", ["cabbage"]), slot("coconut", "Grated coconut", ["grated-coconut"]), slot("spice", "Curry powder", ["curry-powder"])], secs: 3, hint: "cabbage, coconut and curry powder" }] },
    ] },
  { id: "economy-rice", name: "Economy rice", art: "dish-economy-rice", remember: "Economy rice is one plate, many dishes: start the rice and the curry first.",
    parts: [
      { id: "eco-rice", name: "Rice", station: "rice", stages: [{ slots: [slot("rice", "Rice", ["rice"])], secs: 9, hint: "rice" }] },
      { id: "eco-greens", name: "Greens", station: "pan", stages: [
        { slots: [slot("greens", "Greens", ["choy-sum", "kangkung", "cabbage"]), slot("sauce", "Soy", ["soy"])], secs: 3, hint: "greens and soy" }] },
      { id: "eco-curry", name: "Curry", station: "pot", stages: [
        { slots: [slot("veg", "Potato or long beans", ["potato", "long-beans"]), slot("spice", "Curry powder", ["curry-powder"])], secs: 3, hint: "vegetables and curry powder", band: [0.4, 0.65] },
        { slots: [slot("cream", "Coconut milk", ["coconut-milk"])], secs: 3, hint: "coconut milk", band: [0.25, 0.48], splitIfHot: ["coconut-milk"] }] },
    ] },
  { id: "reunion-set", name: "Reunion set", art: "dish-reunion-set", remember: "A reunion meal for a vegetarian table: ginger, fermented beancurd and soy carry the flavour.",
    parts: [
      { id: "reunion-tofu", name: "Steamed tofu", station: "steamer", stages: [
        { slots: [slot("tofu", "Silken tofu", ["silken-tofu"]), slot("sauce", "Soy", ["soy"])], secs: 5, hint: "silken tofu and soy" }] },
      { id: "reunion-veg", name: "Braised vegetables", station: "pan", stages: [
        { slots: [slot("sauce", "Fermented beancurd", ["fu-ru"]), slot("crunch", "Black fungus or baby corn", ["black-fungus", "baby-corn"]), slot("veg", "Cabbage", ["cabbage"])], secs: 4, hint: "fermented beancurd and vegetables" }] },
      { id: "reunion-rice", name: "Rice", station: "rice", stages: [{ slots: [slot("rice", "Rice", ["rice"])], secs: 9, hint: "rice" }] },
    ] },
  { id: "western-set", name: "Western set", art: "dish-western-set", remember: "A set meal: roast in the oven, soup in the pot, toast on the griddle, all out together.",
    parts: [
      { id: "western-roast", name: "Roast", station: "oven", stages: [
        { slots: [slot("base", "Potato or corn", ["potato", "corn"]), slot("green", "Broccoli", ["broccoli"]), slot("oil", "Oil", ["cooking-oil"])], secs: 6, hint: "vegetables and oil" }] },
      { id: "western-soup", name: "Tomato soup", station: "pot", stages: [
        { slots: [slot("tomato", "Tomato", ["tomato"]), slot("stock", "Stock", ["stock-a", "stock-b"])], secs: 5, hint: "tomato and stock" }] },
      { id: "western-toast", name: "Toast", station: "griddle", stages: [
        { slots: [slot("bread", "Bread", ["bread"]), slot("fat", "Butter or margarine", ["butter", "margarine"])], secs: 3, hint: "bread and butter", turn: "flip" }] },
    ] },
];

const { o, share } = orders("m");
export const LEVELS: Level[] = [
  { n: 91, bonus: "golden", name: "A whole meal", brief: "The banquet hall serves whole meals. A thali is rice, dal and a vegetable on one tray: cook all three, then serve it once.", teach: "One order, three stations.",
    stations: ["rice", "pot", "pan"], seats: 2, maxOpen: 2, round: 115, patience: 115, hints: "full", orders: [o("office", "thali", 1), o("jia", "thali", 28)], distractors: [], unlocks: ["Banquet trays"] },
  { n: 92, bonus: "clean", name: "Economy rice", brief: "Rice, greens and curry on one plate. Lower the heat before the coconut milk.", teach: "Start the slowest part first.",
    stations: ["rice", "pan", "pot"], seats: 2, maxOpen: 2, round: 116, patience: 118, hints: "full", orders: [o("office", "economy-rice", 1), o("daniel", "economy-rice", 28)], distractors: [], unlocks: [] },
  { n: 93, bonus: "golden", name: "Reunion", brief: "A reunion set: steamed tofu, braised vegetables and rice. Auntie Mei's whole table is vegetarian.", teach: "A meal for one rule, every part.",
    stations: ["steamer", "pan", "rice"], seats: 3, maxOpen: 3, round: 146, patience: 120, hints: "chip", allRules: ["five"], orders: [o("mei", "reunion-set", 1), o("office", "reunion-set", 20), o("jia", "reunion-set", 60)], distractors: [], unlocks: [] },
  { n: 94, bonus: "steady", name: "Western set", brief: "Roast, soup and toast together. Preheat the oven while the soup simmers.", teach: "Three heats, one tray.",
    stations: ["oven", "pot", "griddle"], seats: 3, maxOpen: 3, round: 147, patience: 120, hints: "chip", orders: [o("office", "western-set", 1), o("jia", "western-set", 22), o("lim", "western-set", 64)], distractors: [], unlocks: [] },
  { n: 95, bonus: "clean", twists: [{ kind: "change" }], name: "Read the whole meal", brief: "Daniel is vegan and Auntie Mei is vegetarian: every part of their meal must suit them.", teach: "One wrong part spoils the meal.",
    stations: ["pot", "rice", "pan"], seats: 3, maxOpen: 3, round: 167, patience: 120, hints: "chip", orders: [o("daniel", "thali", 1), o("mei", "economy-rice", 10), o("office", "thali", 50), o("daniel", "economy-rice", 84)], distractors: [], unlocks: [] },
  { n: 96, bonus: "swift", name: "Family table", brief: "Friends at one table share a meal. Cook it once for both, and make it suit them both.", teach: "A shared meal feeds two.",
    stations: ["rice", "pot", "pan"], seats: 4, maxOpen: 4, round: 134, patience: 122, hints: "chip", orders: [...share("office", "jia", "thali", 1), ...share("mei", "lim", "economy-rice", 40)], distractors: [], unlocks: [] },
  { n: 97, bonus: "swift", twists: [{ kind: "wave", n: 30 }], name: "Banquet rush", brief: "One early meal, then a table arrives together. Rice first, always.", teach: "Triage across whole meals.",
    stations: ["rice", "pan", "pot"], seats: 3, maxOpen: 3, round: 160, patience: 115, hints: "none", orders: [o("office", "economy-rice", 1), o("jia", "thali", 30), o("lim", "economy-rice", 31), o("nurul", "thali", 33)], distractors: [], unlocks: [] },
  { n: 98, bonus: "order", twists: [{ kind: "flare", n: 1 }], name: "Feast and flare", brief: "Whole meals and a flaring wok. Ride out the flare and keep every part warm.", teach: "Keep calm across many stations.",
    stations: ["steamer", "pan", "rice", "pot"], seats: 3, maxOpen: 3, round: 170, patience: 118, hints: "none", orders: [o("office", "reunion-set", 1), o("jia", "economy-rice", 10), o("mei", "reunion-set", 54), o("lim", "thali", 90)], distractors: [], unlocks: [] },
  { n: 99, bonus: "clean", twists: [{ kind: "stockout" }], name: "Every rule", brief: "Vegan, Jain, vegetarian, no mushrooms and less spicy, at one sitting. No hints.", teach: "Every rule, for a whole table.",
    stations: ["pot", "rice", "pan"], seats: 4, maxOpen: 4, round: 184, patience: 120, hints: "none", orders: [o("daniel", "economy-rice", 1), o("asha", "thali", 6), o("mei", "economy-rice", 30), o("lim", "thali", 60), o("nurul", "thali", 92)], distractors: [], unlocks: [] },
  { n: 100, bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }], name: "Head chef", brief: "The banquet hall's biggest night: every meal, every regular, four stations. You are the head chef now.", teach: "Everything the café taught.",
    stations: ["rice", "pot", "pan", "steamer"], seats: 4, maxOpen: 4, round: 225, patience: 122, hints: "none",
    orders: [o("mei", "reunion-set", 1), o("asha", "thali", 6), o("office", "economy-rice", 20), o("daniel", "chee-cheong-fun", 48), o("jia", "reunion-set", 76), o("lim", "thali", 110), o("nurul", "economy-rice", 140)], distractors: [], unlocks: ["Head chef skin", "Head chef medal"] },
];
