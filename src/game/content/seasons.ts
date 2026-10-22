/**
 * Seasons (GAME_CONTENT_PLAN §6): festival menus that are featured around their festival, then stay on the Seasons shelf for good and
 * come back each year. Nothing resets, nothing expires, nothing is paid: the label is "Featured now", never a countdown. Each season's
 * six levels are built-in content (the rules version covers them) and replay on the server by season id and number.
 *
 * A season is playable for members only once a reviewer from that community has signed it off (`signedOff`); until then it shows only
 * in development builds and the server refuses its runs in production.
 */
import type { Level, Order } from "./levels";

export type Season = {
  id: string; name: string; blurb: string;
  /** Featured windows by Singapore date, inclusive. Outside them the season still plays from the shelf. */
  featured: { from: string; to: string }[];
  /** The community reviewer's sign-off, recorded in the release that turns the season on. */
  signedOff?: { by: string; on: string };
  levels: Level[];
};

let seq = 0;
const o = (guest: string, dish: string, at: number): Order => ({ id: "z" + ++seq, guest, dish, at });
/** A season level: numbered 1–6 within its season; `n` keeps the main path's timing rules (sim/plan.ts) at the matching difficulty. */
const lv = (season: string, k: number, n: number, rest: Omit<Level, "n" | "season" | "unlocks" | "distractors"> & { distractors?: string[] }): Level =>
  ({ distractors: [], ...rest, n, unlocks: [], season: { id: season, n: k } });

export const SEASONS: Season[] = [
  {
    id: "zhai-days", name: "Zhai days",
    blurb: "Meat-free and five pungent-free cooking for the 1st and 15th of the lunar month and Vesak: every order leaves out garlic, onion and their family.",
    featured: [{ from: "2027-05-13", to: "2027-05-27" }, { from: "2028-05-01", to: "2028-05-15" }],
    levels: [
      lv("zhai-days", 1, 8, { name: "First of the month", brief: "Today every order is five pungent-free. Fried bee hoon starts with ginger, not garlic or shallots.", teach: "Ginger is the zhai aromatic.",
        stations: ["pan"], seats: 2, maxOpen: 2, round: 95, patience: 80, hints: "chip", allRules: ["five"], bonus: "clean",
        orders: [o("office", "bee-hoon", 1), o("mei", "bee-hoon", 8), o("jia", "bee-hoon", 36)] }),
      lv("zhai-days", 2, 9, { name: "Lo han jai", brief: "Buddha's delight is a braise of many vegetables. Lim skips mushrooms, so use baby corn instead of black fungus.", teach: "A dish of many vegetables still has an order: hard ones first.",
        stations: ["pan"], seats: 3, maxOpen: 3, round: 130, patience: 100, hints: "chip", allRules: ["five"], bonus: "order",
        orders: [o("mei", "buddhas-delight", 1), o("lim", "buddhas-delight", 8), o("asha", "buddhas-delight", 40)] }),
      lv("zhai-days", 3, 12, { name: "Char siew, no meat", brief: "Mock char siew is wheat gluten. One char siew sauce lists honey and garlic: read the label.", teach: "Honey and garlic hide in bought sauces.",
        stations: ["pan", "rice"], seats: 3, maxOpen: 3, round: 120, patience: 85, hints: "chip", allRules: ["five"], bonus: "clean",
        orders: [o("jia", "mock-char-siew-rice", 1), o("daniel", "mock-char-siew-rice", 8), o("office", "mock-char-siew-rice", 42)] }),
      lv("zhai-days", 4, 10, { name: "Zhai curry", brief: "A gentle curry with potato and long beans. Lower the heat before the coconut milk.", teach: "A curry needs no onion to taste full.",
        stations: ["pot"], seats: 3, maxOpen: 3, round: 140, patience: 90, hints: "chip", allRules: ["five"], bonus: "steady",
        orders: [o("daniel", "zhai-curry", 1), o("mei", "zhai-curry", 10), o("lim", "zhai-curry", 46)] }),
      lv("zhai-days", 5, 13, { name: "Fifteenth night", brief: "Three dishes, two stations, and every order five pungent-free.", teach: "Plan the slow pot first.",
        stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 150, patience: 88, hints: "none", allRules: ["five"], bonus: "swift", twists: [{ kind: "stockout" }],
        orders: [o("mei", "zhai-curry", 1), o("office", "bee-hoon", 6), o("lim", "buddhas-delight", 34), o("daniel", "zhai-curry", 60)] }),
      lv("zhai-days", 6, 15, { name: "Zhai feast", brief: "The whole zhai menu at once: bee hoon, lo han jai, char siew rice and curry.", teach: "Everything this season taught.",
        stations: ["pan", "pot", "rice"], seats: 4, maxOpen: 4, round: 185, patience: 92, hints: "none", allRules: ["five"], bonus: "golden", twists: [{ kind: "vip" }],
        orders: [o("jia", "mock-char-siew-rice", 1), o("mei", "zhai-curry", 4), o("asha", "buddhas-delight", 12), o("office", "bee-hoon", 38), o("lim", "zhai-curry", 62), o("daniel", "mock-char-siew-rice", 86)] }),
    ],
  },
];

export const seasonById = (id: string) => SEASONS.find(s => s.id === id);
/** One season level, or undefined for an unknown season or number. */
export const seasonLevel = (id: string, n: number) => seasonById(id)?.levels[n - 1];
/** The season featured on a Singapore date (YYYY-MM-DD), if any. */
export const featuredSeason = (day: string) => SEASONS.find(s => s.featured.some(w => day >= w.from && day <= w.to)) ?? null;
/** Where a season level's best is kept: "zhai-days-1". */
export const seasonKey = (id: string, n: number) => id + "-" + n;
/** A season shows to members once signed off; development builds show every season so it can be reviewed. */
export const seasonOpen = (s: Season, dev: boolean) => dev || !!s.signedOff;
/** Seasons open once the player has cleared Chapter 1 (GAME_CONTENT_PLAN §6). */
export const SEASONS_AFTER_LEVEL = 10;
