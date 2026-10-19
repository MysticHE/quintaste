/**
 * Levels 1–20 (GAME_PLAN §8, revised 18 October 2026). Each level adds one decision; difficulty rises through
 * orders, open tickets, round time, patience, stations, mixed rules and fading hints. Unlock rewards are cosmetic.
 */
import { DISHES, type StationKind } from "./dishes";
import type { Rule } from "./guests";

export type Order = { id: string; guest: string; dish: string; at: number };

/** A twist changes how a service plays, not only how fast. `n` is kind-specific: flares per service, seconds before a ready dish burns, or when the wave sits. */
export type TwistKind = "flare" | "wave" | "stockout" | "change" | "neglect" | "vip";
export type Twist = { kind: TwistKind; n?: number };
export const TWISTS: Record<TwistKind, { name: string; text: string }> = {
  flare: { name: "Flare-up", text: "The burner surges without much warning. Ease off before it scorches." },
  wave: { name: "Lunch wave", text: "A quiet start, then a crowd all at once. A bell rings a few seconds before they sit." },
  stockout: { name: "Running low", text: "An ingredient runs out mid-service. Swap in another one that suits the guest." },
  change: { name: "Change of mind", text: "A guest changes their order after sitting. Restarting a dish is free." },
  neglect: { name: "Don't walk away", text: "A dish left on a hot burner once it is ready will burn. Plate it fast." },
  vip: { name: "VIP table", text: "One guest tips big but loses patience fast. Serve them first." },
};
/** The optional fourth stamp: one extra thing to try on a replay. */
export type BonusKind = "golden" | "clean" | "order" | "swift" | "steady";
export const BONUS: Record<BonusKind, { name: string; text: string }> = {
  golden: { name: "Golden plate", text: "Keep the needle in the band for one whole plate." },
  clean: { name: "Clean hands", text: "Never put in an ingredient a guest can't eat, and never send a plate back." },
  order: { name: "First come, first served", text: "Serve the guests in the order they sat down." },
  swift: { name: "Swift service", text: "Serve every guest with at least half their patience left." },
  steady: { name: "Steady hands", text: "Spend at least 90% of your cooking time in the heat band." },
};
export type Level = {
  n: number; name: string; brief: string; teach: string;
  stations: StationKind[]; seats: number; maxOpen: number;
  /** Seconds on the clock. Every service is a Rush: there is no untimed mode. */
  round: number; patience: number;
  hints: "full" | "chip" | "none";
  orders: Order[]; distractors: string[];
  /** Extra rules every guest keeps this level (the lunar 15th night). */
  allRules?: Rule[];
  /** What this level adds to the service, on top of the plain loop (see TWISTS). Several can run together. */
  twists?: Twist[];
  /** The optional fourth stamp this level asks for (see BONUS); it never gates a clear or Mastery. */
  bonus?: BonusKind;
  /** Level 20: the player picks three dishes; orders are drawn from them. */
  signature?: boolean;
  unlocks: string[];
  /** Today's special (src/game/special.ts): built per date, never part of the level path. */
  /** Today's special: its date, dish, lunar day and the highest level cleared it was built from (for server replay). */
  special?: { day: string; dish: string; lunar: string | null; top: number };
};

let seq = 0;
const o = (guest: string, dish: string, at: number): Order => ({ id: "o" + ++seq, guest, dish, at });

export const LEVELS: Level[] = [
  { n: 1, bonus: "golden", name: "First plate", brief: "Your first order: fried bee hoon for the office lunch crowd. Drag each ingredient onto the wok, keep the heat in the band, then drag the dish to the plates.", teach: "Drag, heat, plate and serve.",
    stations: ["pan"], seats: 1, maxOpen: 1, round: 75, patience: 70, hints: "full", orders: [o("office", "bee-hoon", 1)], distractors: ["tofu"], unlocks: ["Monstera and lotus painting"] },
  { n: 2, bonus: "clean", name: "Read the ticket", brief: "Daniel is vegan. Eggs are vegetarian, but not vegan, so choose his topping carefully.", teach: "Vegetarian is not always vegan.",
    stations: ["pan"], seats: 2, maxOpen: 2, round: 70, patience: 80, hints: "full", orders: [o("office", "greens", 1), o("daniel", "greens", 12)], distractors: ["garlic", "carrot"], unlocks: [] },
  { n: 3, bonus: "golden", twists: [{ kind: "flare", n: 1 }], name: "Feel the heat", brief: "Kangkung leaves scorch in seconds. Keep the needle in the striped band, then ease off.", teach: "Hold the heat band.",
    stations: ["pan"], seats: 2, maxOpen: 2, round: 65, patience: 75, hints: "full", orders: [o("daniel", "kangkung", 1), o("office", "kangkung", 10)], distractors: ["garlic", "tofu"], unlocks: [] },
  { n: 4, bonus: "order", name: "Stems before leaves", brief: "Real kangkung: stems go in first, leaves last. Three orders, two at a time.", teach: "Cook in the order the vegetable needs.",
    stations: ["pan"], seats: 2, maxOpen: 2, round: 90, patience: 70, hints: "full", orders: [o("office", "kangkung-split", 1), o("daniel", "kangkung-split", 6), o("office", "kangkung-split", 42)], distractors: ["kangkung", "garlic"], unlocks: ["Lotus bowl decor"] },
  { n: 5, bonus: "clean", name: "Check the label", brief: "Auntie Mei keeps no five pungent today. Two bean pastes look the same; read the labels.", teach: "Garlic hides in pastes. Ginger is a common swap.",
    stations: ["pan"], seats: 3, maxOpen: 3, round: 95, patience: 75, hints: "chip", orders: [o("office", "mapo-tofu", 1), o("mei", "mapo-tofu", 4), o("daniel", "mapo-tofu", 32)], distractors: ["kangkung", "carrot"], unlocks: ["Lotus clip"] },
  { n: 6, bonus: "swift", twists: [{ kind: "wave", n: 28 }], name: "First lunch rush", brief: "One early guest, then the lunch crowd: three guests sit within seconds of the bell. Cook one while you serve another.", teach: "Plan your next order while the wok cooks.",
    stations: ["pan"], seats: 3, maxOpen: 3, round: 120, patience: 72, hints: "chip", orders: [o("office", "bee-hoon", 1), o("mei", "mapo-tofu", 28), o("daniel", "kangkung-split", 30), o("mei", "bee-hoon", 32)], distractors: [], unlocks: ["Pip the puppy", "Chalkboard menu"] },
  { n: 7, bonus: "steady", twists: [{ kind: "stockout" }], name: "Choose your menu", brief: "Sweet and sour tofu has three steps. One ketchup lists onion and garlic powder.", teach: "Read every bought-in sauce.",
    stations: ["pan"], seats: 3, maxOpen: 3, round: 130, patience: 75, hints: "chip", orders: [o("jia", "sweet-sour", 1), o("mei", "sweet-sour", 6), o("office", "tomato-tofu", 36), o("mei", "tomato-tofu", 60)], distractors: ["cucumber"], unlocks: ["Cuisine collections"] },
  { n: 8, bonus: "clean", twists: [{ kind: "change" }], name: "Small preferences", brief: "Uncle Lim skips mushrooms; Nurul likes it less spicy. Leave out what they don't want.", teach: "Preferences change the dish, not the lesson.",
    stations: ["pan"], seats: 3, maxOpen: 3, round: 120, patience: 70, hints: "chip", orders: [o("lim", "mapo-tofu", 1), o("nurul", "kangkung-split", 5), o("office", "bee-hoon", 30), o("lim", "bee-hoon", 56)], distractors: [], unlocks: ["Coral scarf"] },
  { n: 9, bonus: "golden", twists: [{ kind: "neglect", n: 7 }], name: "Second station", brief: "The soup pot joins the wok. Soup wants a gentle simmer while the wok runs hot.", teach: "Two stations, two heat bands.",
    stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 115, patience: 80, hints: "chip", orders: [o("office", "abc-soup", 1), o("daniel", "kangkung-split", 5), o("mei", "abc-soup", 32), o("nurul", "kangkung-split", 52)], distractors: [], unlocks: ["Soup pot"] },
  { n: 10, bonus: "steady", twists: [{ kind: "neglect", n: 6 }], name: "Carryover heat", brief: "A pot keeps heating after you turn it off. Lower the heat before the coconut milk, or it splits.", teach: "Heat carries over; plan ahead.",
    stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 145, patience: 85, hints: "chip", orders: [o("jia", "laksa", 1), o("mei", "laksa", 8), o("office", "bee-hoon", 38), o("daniel", "laksa", 62)], distractors: [], unlocks: [] },
  { n: 11, bonus: "order", twists: [{ kind: "stockout" }], name: "The swap", brief: "Mee goreng starts with shallots and garlic. Auntie Mei needs the allium-free swap.", teach: "Ginger and an allium-free paste stand in for shallots and garlic.",
    stations: ["pan"], seats: 3, maxOpen: 3, round: 140, patience: 77, hints: "none", orders: [o("office", "mee-goreng", 1), o("mei", "mee-goreng", 6), o("daniel", "mee-goreng", 32), o("lim", "mapo-tofu", 58)], distractors: [], unlocks: ["Lilac scarf"] },
  { n: 12, bonus: "swift", twists: [{ kind: "vip" }], name: "Read the queue", brief: "Rice takes the longest. Start it early and cook the quick dishes while it steams.", teach: "Start the slowest dish first.",
    stations: ["pan", "rice"], seats: 3, maxOpen: 3, round: 140, patience: 75, hints: "none", orders: [o("jia", "claypot", 1), o("office", "kangkung-split", 4), o("lim", "claypot", 22), o("nurul", "mee-goreng", 42), o("daniel", "claypot", 64)], distractors: [], unlocks: ["Rice cooker"] },
  { n: 13, bonus: "golden", twists: [{ kind: "stockout" }], name: "Two-stage dish", brief: "Laksa spice fries hot, then the broth simmers low. Change the heat between stages.", teach: "One dish can need two heats.",
    stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 175, patience: 90, hints: "none", orders: [o("jia", "laksa", 1), o("mei", "abc-soup", 6), o("daniel", "laksa", 26), o("office", "bee-hoon", 48), o("mei", "laksa", 72)], distractors: [], unlocks: ["Mushroom cap"] },
  { n: 14, bonus: "clean", twists: [{ kind: "change" }], name: "Hidden in the paste", brief: "A new supplier's sambal lists belacan, a shrimp paste, and one yellow noodle lists egg.", teach: "Animal ingredients can hide in bought-in products.",
    stations: ["pan", "rice"], seats: 3, maxOpen: 3, round: 150, patience: 83, hints: "none", orders: [o("jia", "nasi-lemak", 1), o("daniel", "mee-goreng", 6), o("office", "nasi-lemak", 30), o("mei", "mee-goreng", 52), o("nurul", "nasi-lemak", 74)], distractors: [], unlocks: [] },
  { n: 15, bonus: "order", twists: [{ kind: "vip" }], name: "A fourth table", brief: "Four seats now. Keep each guest's rules straight.", teach: "Match each plate to the right person.",
    stations: ["pan", "pot", "rice"], seats: 4, maxOpen: 4, round: 160, patience: 82, hints: "none", orders: [o("mei", "sweet-sour", 1), o("lim", "abc-soup", 4), o("jia", "claypot", 8), o("daniel", "kangkung-split", 30), o("office", "abc-soup", 55), o("nurul", "sweet-sour", 78)], distractors: [], unlocks: [] },
  { n: 16, bonus: "steady", twists: [{ kind: "neglect", n: 7 }], name: "Finish together", brief: "Popiah is built in order on the assembly board, with a braised filling from the wok.", teach: "Layer order matters.",
    stations: ["pan", "board"], seats: 3, maxOpen: 3, round: 140, patience: 85, hints: "none", orders: [o("office", "popiah", 1), o("mei", "popiah", 2), o("daniel", "greens", 40), o("jia", "popiah", 62)], distractors: [], unlocks: ["Assembly board"] },
  { n: 17, bonus: "clean", twists: [{ kind: "stockout" }, { kind: "change" }], name: "A familiar twist", brief: "Asha keeps Jain food: no roots and no mushrooms either, so ginger is not the swap.", teach: "Ginger is a root.",
    stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 150, patience: 80, hints: "none", orders: [o("asha", "mapo-tofu", 1), o("office", "porridge", 6), o("asha", "abc-soup", 34), o("lim", "mapo-tofu", 56), o("mei", "porridge", 78)], distractors: [], unlocks: [] },
  { n: 18, bonus: "golden", twists: [{ kind: "neglect", n: 6 }, { kind: "flare", n: 1 }], name: "Lunar 15th night", brief: "Tonight every ticket is five pungent-free, and desserts join the menu. Palm sugar scorches fast.", teach: "Gentle heat for sugar and coconut.",
    stations: ["pan", "pot", "dessert"], seats: 3, maxOpen: 3, round: 185, patience: 80, hints: "none", allRules: ["five"], orders: [o("mei", "bubur", 1), o("daniel", "mapo-tofu", 6), o("office", "sago", 32), o("jia", "laksa", 52), o("mei", "bubur", 76), o("nurul", "sago", 98)], distractors: [], unlocks: ["Paper lanterns", "Lantern charm", "Lantern night skin", "Dessert pot"] },
  { n: 19, bonus: "swift", twists: [{ kind: "vip" }, { kind: "stockout" }, { kind: "flare", n: 1 }], name: "Dinner service", brief: "The busiest night yet: four guests at once, every station, mixed rules.", teach: "Triage: start long dishes, finish quick ones.",
    stations: ["pan", "pot", "rice", "dessert"], seats: 4, maxOpen: 4, round: 175, patience: 80, hints: "none", orders: [o("jia", "nasi-lemak", 1), o("mei", "mee-goreng", 4), o("asha", "abc-soup", 8), o("daniel", "bubur", 28), o("lim", "claypot", 50), o("nurul", "kangkung-split", 70), o("office", "sago", 92)], distractors: [], unlocks: [] },
  { n: 20, bonus: "order", twists: [{ kind: "flare", n: 1 }, { kind: "vip" }, { kind: "change" }], name: "Your signature service", brief: "Choose three dishes you have mastered. Your regulars come for your signature menu.", teach: "Everything you have learned.",
    stations: ["pan", "pot", "rice", "dessert", "board"], seats: 4, maxOpen: 4, round: 170, patience: 90, hints: "none", signature: true,
    orders: [o("mei", "*", 1), o("daniel", "*", 4), o("jia", "*", 10), o("asha", "*", 32), o("lim", "*", 56), o("nurul", "*", 80)], distractors: [], unlocks: ["Signature badge", "Signature café skin"] },
];

export const levelByNumber = (n: number) => LEVELS[n - 1];
/** Dishes a level needs, for the brief and the book. */
export const levelDishes = (level: Level) => [...new Set(level.orders.map(x => x.dish).filter(d => d !== "*"))].map(id => DISHES[id]);
