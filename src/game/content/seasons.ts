/**
 * Seasons (GAME_CONTENT_PLAN §6, all eight from the plan's table): festival menus that are featured around their festival, then stay on the Seasons shelf for good and
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
/** What each season level earns (cosmetics.ts: two decor items, then the season's café skin). */
const REWARDS: Record<string, Record<number, string[]>> = {
  "zhai-days": { 2: ["Lotus lamp"], 4: ["Jade lotus vase"], 6: ["Zhai days skin"] },
  "reunion-kitchen": { 2: ["Plum blossom"], 4: ["Mandarin tree"], 6: ["Reunion kitchen skin"] },
  "sunset-bazaar": { 2: ["Ketupat"], 4: ["Pelita lamps"], 6: ["Sunset bazaar skin"] },
  "nine-days": { 2: ["Yellow lantern"], 4: ["White chrysanthemums"], 6: ["Nine days skin"] },
  "festival-lights": { 2: ["Marigold garland"], 4: ["Oil lamp stand"], 6: ["Festival of lights skin"] },
  "year-end-table": { 2: ["Pine garland"], 4: ["Gift stack"], 6: ["Year-end table skin"] },
  "lantern-bakery": { 2: ["Rabbit lantern"], 4: ["Mooncake tins"], 6: ["Lantern bakery skin"] },
  "dumpling-day": { 2: ["Dumpling bunch"], 4: ["Dragon boat painting"], 6: ["Dumpling day skin"] },
};
const lv = (season: string, k: number, n: number, rest: Omit<Level, "n" | "season" | "unlocks" | "distractors"> & { distractors?: string[] }): Level =>
  ({ distractors: [], ...rest, n, unlocks: REWARDS[season]?.[k] ?? [], season: { id: season, n: k } });

export const SEASONS: Season[] = [
  {
    id: "zhai-days", name: "Zhai days",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Vegetarian cooking for the 1st and 15th of the lunar month and Vesak: every order leaves out garlic, onion and the rest of the five pungent.",
    featured: [{ from: "2027-05-13", to: "2027-05-27" }, { from: "2028-05-01", to: "2028-05-15" }],
    levels: [
      lv("zhai-days", 1, 8, { name: "First of the month", brief: "Today every order is vegetarian. Fried bee hoon starts with ginger, not garlic or shallots.", teach: "Ginger is the zhai aromatic.",
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
      lv("zhai-days", 5, 13, { name: "Fifteenth night", brief: "Three dishes, two stations, and every order vegetarian.", teach: "Plan the slow pot first.",
        stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 150, patience: 88, hints: "none", allRules: ["five"], bonus: "swift", twists: [{ kind: "stockout" }],
        orders: [o("mei", "zhai-curry", 1), o("office", "bee-hoon", 6), o("lim", "buddhas-delight", 34), o("daniel", "zhai-curry", 60)] }),
      lv("zhai-days", 6, 15, { name: "Zhai feast", brief: "The whole zhai menu at once: bee hoon, lo han jai, char siew rice and curry.", teach: "Everything this season taught.",
        stations: ["pan", "pot", "rice"], seats: 4, maxOpen: 4, round: 185, patience: 92, hints: "none", allRules: ["five"], bonus: "golden", twists: [{ kind: "vip" }],
        orders: [o("jia", "mock-char-siew-rice", 1), o("mei", "zhai-curry", 4), o("asha", "buddhas-delight", 12), o("office", "bee-hoon", 38), o("lim", "zhai-curry", 62), o("daniel", "mock-char-siew-rice", 86)] }),
    ],
  },
  {
    id: "reunion-kitchen", name: "Reunion kitchen",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Lunar New Year to Chap Goh Mei: a meat-free reunion table of yusheng, long noodles, braised mushrooms and sweet nian gao.",
    featured: [{ from: "2027-01-30", to: "2027-02-20" }, { from: "2028-01-19", to: "2028-02-09" }],
    levels: [
      lv("reunion-kitchen", 1, 8, { name: "Toss for a good year", brief: "Build the yusheng on the board for everyone to toss. Carrot and radish are roots: Asha has another dish.", teach: "Assemble in order.",
        stations: ["board", "pan"], seats: 3, maxOpen: 3, round: 112, patience: 95, hints: "chip", bonus: "order",
        orders: [o("office", "yusheng", 1), o("asha", "buddhas-delight", 8), o("jia", "yusheng", 38)] }),
      lv("reunion-kitchen", 2, 9, { name: "Long life noodles", brief: "Never cut longevity noodles. One noodle lists egg: Daniel is vegan.", teach: "Egg hides in noodles.",
        stations: ["pan"], seats: 3, maxOpen: 3, round: 116, patience: 92, hints: "chip", bonus: "clean",
        orders: [o("daniel", "longevity-noodles", 1), o("mei", "longevity-noodles", 8), o("office", "longevity-noodles", 40)] }),
      lv("reunion-kitchen", 3, 12, { name: "Braised and bright", brief: "Braised mushrooms simmer while the wok works. Lim skips mushrooms: he has lo han jai with baby corn.", teach: "Plan the slow pot first.",
        stations: ["pot", "pan"], seats: 3, maxOpen: 3, round: 121, patience: 95, hints: "chip", bonus: "steady",
        orders: [o("jia", "braised-mushrooms", 1), o("lim", "buddhas-delight", 6), o("office", "braised-mushrooms", 40)] }),
      lv("reunion-kitchen", 4, 31, { name: "Sweet nian gao", brief: "Steam the nian gao, then fry it between sweet potato and yam on the griddle. Flip it at halfway.", teach: "Steam, then fry.",
        stations: ["steamer", "griddle"], seats: 3, maxOpen: 3, round: 125, patience: 100, hints: "chip", bonus: "golden",
        orders: [o("office", "nian-gao", 1), o("jia", "nian-gao", 14), o("mei", "nian-gao", 48)] }),
      lv("reunion-kitchen", 5, 41, { name: "Pineapple tarts", brief: "Bake pineapple tarts for visiting. Daniel is vegan: margarine, not butter.", teach: "Butter is dairy.",
        stations: ["oven", "pan"], seats: 3, maxOpen: 3, round: 140, patience: 100, hints: "none", bonus: "clean", twists: [{ kind: "change" }],
        orders: [o("daniel", "pineapple-tarts", 1), o("office", "longevity-noodles", 8), o("jia", "pineapple-tarts", 42), o("mei", "longevity-noodles", 66)] }),
      lv("reunion-kitchen", 6, 51, { name: "Chap Goh Mei", brief: "The fifteenth night: the whole reunion menu, with tang yuan to finish.", teach: "Everything this season taught.",
        stations: ["board", "pan", "dough", "dessert"], seats: 4, maxOpen: 4, round: 170, patience: 104, hints: "none", bonus: "swift", twists: [{ kind: "vip" }],
        orders: [o("office", "yusheng", 1), o("mei", "longevity-noodles", 4), o("jia", "yusheng", 12), o("asha", "tang-yuan", 38), o("lim", "buddhas-delight", 62), o("daniel", "tang-yuan", 88)] }),
    ],
  },
  {
    id: "sunset-bazaar", name: "Sunset bazaar",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Hari Raya Puasa: dishes cooked through the afternoon for breaking the fast together at sunset.",
    featured: [{ from: "2027-03-03", to: "2027-03-12" }, { from: "2028-02-20", to: "2028-02-29" }],
    levels: [
      lv("sunset-bazaar", 1, 9, { name: "Before sunset", brief: "The bazaar cooks all afternoon for the evening. Sayur lodeh simmers gently with coconut milk, then the lontong goes in.", teach: "Gentle heat for coconut milk.",
        stations: ["pot"], seats: 2, maxOpen: 2, round: 104, patience: 100, hints: "chip", bonus: "steady",
        orders: [o("office", "sayur-lodeh", 1), o("jia", "sayur-lodeh", 18)] }),
      lv("sunset-bazaar", 2, 21, { name: "Rendang", brief: "Blend the rendang paste, then cook young jackfruit in it until the coconut is nearly dry.", teach: "A paste, then a long simmer.",
        stations: ["blender", "pot"], seats: 3, maxOpen: 3, round: 135, patience: 100, hints: "chip", bonus: "golden",
        orders: [o("office", "jackfruit-rendang", 1), o("nurul", "sayur-lodeh", 10), o("jia", "jackfruit-rendang", 44)] }),
      lv("sunset-bazaar", 3, 31, { name: "Kuih lapis", brief: "Steam the kuih lapis layer by layer while the nasi lemak's rice cooks.", teach: "Steam and rice at once.",
        stations: ["steamer", "rice", "pan"], seats: 3, maxOpen: 3, round: 124, patience: 100, hints: "chip", bonus: "order",
        orders: [o("jia", "nasi-lemak", 1), o("office", "kuih-lapis", 8), o("nurul", "kuih-lapis", 42)] }),
      lv("sunset-bazaar", 4, 14, { name: "Read the sambal", brief: "One sambal lists belacan, a shrimp paste. Nurul likes it less spicy.", teach: "Belacan hides in sambal.",
        stations: ["rice", "pan", "pot"], seats: 3, maxOpen: 3, round: 150, patience: 98, hints: "chip", bonus: "clean", twists: [{ kind: "stockout" }],
        orders: [o("office", "nasi-lemak", 1), o("nurul", "sayur-lodeh", 8), o("jia", "nasi-lemak", 42), o("daniel", "sayur-lodeh", 70)] }),
      lv("sunset-bazaar", 5, 24, { name: "Bazaar rush", brief: "One early order, then the crowd arrives together just before sunset.", teach: "Start the slow dishes early.",
        stations: ["blender", "pot", "steamer"], seats: 3, maxOpen: 3, round: 144, patience: 100, hints: "none", bonus: "swift", twists: [{ kind: "wave", n: 30 }],
        orders: [o("office", "kuih-lapis", 1), o("jia", "jackfruit-rendang", 30), o("nurul", "kuih-lapis", 31), o("lim", "sayur-lodeh", 33)] }),
      lv("sunset-bazaar", 6, 40, { name: "Breaking the fast", brief: "Sunset: rendang, lodeh and kuih for the whole table.", teach: "Everything this season taught.",
        stations: ["blender", "pot", "steamer"], seats: 4, maxOpen: 4, round: 173, patience: 104, hints: "none", bonus: "steady", twists: [{ kind: "vip" }],
        orders: [o("jia", "jackfruit-rendang", 1), o("office", "kuih-lapis", 4), o("nurul", "sayur-lodeh", 12), o("daniel", "kuih-lapis", 38), o("lim", "jackfruit-rendang", 64), o("mei", "kuih-lapis", 90)] }),
    ],
  },
  {
    id: "nine-days", name: "Nine days",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "The Nine Emperor Gods festival and Navaratri: nine days of vegetarian cooking.",
    featured: [{ from: "2027-09-30", to: "2027-10-08" }, { from: "2028-10-18", to: "2028-10-26" }],
    levels: [
      lv("nine-days", 1, 8, { name: "First of nine", brief: "Every order is vegetarian for nine days. Sundal starts with green chilli, not onion.", teach: "No onion, still full of flavour.",
        stations: ["pan"], seats: 2, maxOpen: 2, round: 95, patience: 90, hints: "chip", allRules: ["five"], bonus: "clean",
        orders: [o("mei", "sundal", 1), o("asha", "sundal", 14)] }),
      lv("nine-days", 2, 18, { name: "Payasam", brief: "Toast the vermicelli in ghee, then simmer it gently with milk. Daniel is vegan: oil and coconut milk.", teach: "Gentle heat for milk desserts.",
        stations: ["dessert"], seats: 3, maxOpen: 3, round: 120, patience: 95, hints: "chip", allRules: ["five"], bonus: "steady",
        orders: [o("office", "payasam", 1), o("daniel", "payasam", 10), o("mei", "payasam", 44)] }),
      lv("nine-days", 3, 10, { name: "Zhai stir-fry", brief: "Bee hoon and lo han jai, both vegetarian.", teach: "Ginger is the zhai aromatic.",
        stations: ["pan"], seats: 3, maxOpen: 3, round: 124, patience: 95, hints: "chip", allRules: ["five"], bonus: "order",
        orders: [o("mei", "bee-hoon", 1), o("lim", "buddhas-delight", 8), o("office", "bee-hoon", 40)] }),
      lv("nine-days", 4, 18, { name: "Curry and sweets", brief: "Zhai curry in the pot and payasam in the dessert pot. Lower both before the coconut milk.", teach: "Two gentle heats.",
        stations: ["pot", "dessert"], seats: 3, maxOpen: 3, round: 136, patience: 98, hints: "chip", allRules: ["five"], bonus: "golden", twists: [{ kind: "flare", n: 1 }],
        orders: [o("jia", "zhai-curry", 1), o("daniel", "payasam", 8), o("mei", "zhai-curry", 44)] }),
      lv("nine-days", 5, 13, { name: "Temple lunch", brief: "Sundal, bee hoon and curry for a long table, with no hints.", teach: "Plan the slow pot first.",
        stations: ["pan", "pot"], seats: 3, maxOpen: 3, round: 139, patience: 95, hints: "none", allRules: ["five"], bonus: "swift", twists: [{ kind: "stockout" }],
        orders: [o("asha", "sundal", 1), o("office", "zhai-curry", 6), o("mei", "bee-hoon", 36), o("lim", "sundal", 62)] }),
      lv("nine-days", 6, 19, { name: "Ninth night", brief: "The ninth night: every zhai dish, every station, every order vegetarian.", teach: "Everything this season taught.",
        stations: ["pan", "pot", "dessert"], seats: 4, maxOpen: 4, round: 172, patience: 100, hints: "none", allRules: ["five"], bonus: "steady", twists: [{ kind: "vip" }],
        orders: [o("mei", "zhai-curry", 1), o("asha", "sundal", 4), o("jia", "payasam", 12), o("office", "bee-hoon", 38), o("lim", "buddhas-delight", 62), o("daniel", "payasam", 88)] }),
    ],
  },
  {
    id: "festival-lights", name: "Festival of lights",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Deepavali snacks and sweets: crisp murukku, besan laddu, payasam and sundal for visiting friends.",
    featured: [{ from: "2027-10-21", to: "2027-10-29" }, { from: "2028-10-09", to: "2028-10-17" }],
    levels: [
      lv("festival-lights", 1, 61, { name: "Murukku", brief: "Mix the murukku dough, then fry the spirals in hot oil. Heat the oil first.", teach: "Hot oil first.",
        stations: ["blender", "fryer"], seats: 2, maxOpen: 2, round: 91, patience: 95, hints: "chip", bonus: "golden",
        orders: [o("asha", "murukku", 1), o("office", "murukku", 18)] }),
      lv("festival-lights", 2, 71, { name: "Besan laddu", brief: "Roast the besan in ghee, then roll the laddu on the board. Daniel is vegan: oil, not ghee.", teach: "Ghee is dairy.",
        stations: ["pan", "dough"], seats: 3, maxOpen: 3, round: 118, patience: 98, hints: "chip", bonus: "clean",
        orders: [o("office", "laddu", 1), o("daniel", "laddu", 10), o("asha", "laddu", 44)] }),
      lv("festival-lights", 3, 18, { name: "Payasam for guests", brief: "A pot of payasam for visiting friends.", teach: "Gentle heat for milk.",
        stations: ["dessert", "pan"], seats: 3, maxOpen: 3, round: 116, patience: 95, hints: "chip", bonus: "steady",
        orders: [o("jia", "payasam", 1), o("asha", "sundal", 8), o("office", "payasam", 40)] }),
      lv("festival-lights", 4, 64, { name: "Snack tray", brief: "Murukku, laddu and sundal on one tray of snacks.", teach: "Three stations, one tray.",
        stations: ["blender", "fryer", "pan", "dough"], seats: 3, maxOpen: 3, round: 142, patience: 100, hints: "none", bonus: "order", twists: [{ kind: "stockout" }],
        orders: [o("office", "murukku", 1), o("asha", "laddu", 8), o("jia", "sundal", 40), o("daniel", "murukku", 68)] }),
      lv("festival-lights", 5, 67, { name: "Visiting rush", brief: "One early guest, then a family arrives together.", teach: "Keep the oil hot between orders.",
        stations: ["blender", "fryer", "dessert"], seats: 3, maxOpen: 3, round: 129, patience: 96, hints: "none", bonus: "swift", twists: [{ kind: "wave", n: 26 }],
        orders: [o("office", "payasam", 1), o("jia", "murukku", 26), o("asha", "murukku", 27), o("nurul", "payasam", 29)] }),
      lv("festival-lights", 6, 70, { name: "Lights night", brief: "Every snack and sweet for the whole street.", teach: "Everything this season taught.",
        stations: ["blender", "fryer", "pan", "dough"], seats: 4, maxOpen: 4, round: 166, patience: 102, hints: "none", bonus: "steady", twists: [{ kind: "vip" }, { kind: "flare", n: 1 }],
        orders: [o("asha", "murukku", 1), o("daniel", "laddu", 4), o("jia", "sundal", 12), o("office", "sundal", 38), o("mei", "laddu", 62), o("nurul", "murukku", 88)] }),
    ],
  },
  {
    id: "year-end-table", name: "Year-end table",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Dongzhi and Christmas: tang yuan for the longest night, then a festive table with vegetable devil's curry and cake.",
    featured: [{ from: "2027-12-15", to: "2027-12-26" }, { from: "2028-12-14", to: "2028-12-26" }],
    levels: [
      lv("year-end-table", 1, 71, { name: "Longest night", brief: "Dongzhi: roll tang yuan and simmer them in sweet ginger soup.", teach: "Fold, then simmer.",
        stations: ["dough", "dessert"], seats: 2, maxOpen: 2, round: 98, patience: 98, hints: "chip", bonus: "golden",
        orders: [o("mei", "tang-yuan", 1), o("office", "tang-yuan", 16)] }),
      lv("year-end-table", 2, 21, { name: "Devil's curry", brief: "Blend the chilli paste, cook it with vegetables, then add vinegar for the tang.", teach: "A tangy curry from a paste.",
        stations: ["blender", "pot"], seats: 3, maxOpen: 3, round: 131, patience: 98, hints: "chip", bonus: "steady",
        orders: [o("office", "devils-curry", 1), o("jia", "devils-curry", 12), o("lim", "devils-curry", 46)] }),
      lv("year-end-table", 3, 41, { name: "Festive bake", brief: "Sugee cake and roast vegetables share the oven. Preheat first.", teach: "One oven, two bakes.",
        stations: ["blender", "oven"], seats: 3, maxOpen: 3, round: 128, patience: 100, hints: "chip", bonus: "order",
        orders: [o("office", "sugee-cake", 1), o("jia", "roast-veg", 10), o("daniel", "sugee-cake", 44)] }),
      lv("year-end-table", 4, 45, { name: "Read the cake", brief: "Daniel is vegan: margarine and flaxseed in his sugee cake.", teach: "Butter and egg hide in cake.",
        stations: ["blender", "oven", "pot"], seats: 3, maxOpen: 3, round: 147, patience: 100, hints: "none", bonus: "clean", twists: [{ kind: "change" }],
        orders: [o("daniel", "sugee-cake", 1), o("office", "devils-curry", 8), o("jia", "sugee-cake", 44), o("mei", "roast-veg", 70)] }),
      lv("year-end-table", 5, 47, { name: "Party rush", brief: "One early order, then the party arrives at once.", teach: "Keep the oven busy.",
        stations: ["oven", "pot", "blender"], seats: 3, maxOpen: 3, round: 144, patience: 96, hints: "none", bonus: "swift", twists: [{ kind: "wave", n: 28 }],
        orders: [o("office", "roast-veg", 1), o("jia", "devils-curry", 28), o("nurul", "roast-veg", 29), o("lim", "devils-curry", 31)] }),
      lv("year-end-table", 6, 50, { name: "Year-end feast", brief: "The last night of the year: curry, roast and cake.", teach: "Everything this season taught.",
        stations: ["blender", "pot", "oven"], seats: 4, maxOpen: 4, round: 176, patience: 104, hints: "none", bonus: "steady", twists: [{ kind: "vip" }],
        orders: [o("office", "devils-curry", 1), o("mei", "sugee-cake", 4), o("jia", "sugee-cake", 12), o("daniel", "roast-veg", 38), o("lim", "devils-curry", 62), o("asha", "roast-veg", 88)] }),
    ],
  },
  {
    id: "lantern-bakery", name: "Lantern bakery",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Mid-Autumn: baked and snowskin mooncakes, snow fungus pear soup and fresh pomelo under the full moon.",
    featured: [{ from: "2027-09-05", to: "2027-09-16" }, { from: "2028-09-24", to: "2028-10-04" }],
    levels: [
      lv("lantern-bakery", 1, 71, { name: "Mooncakes", brief: "Fold lotus paste into the pastry, then bake. One lotus paste lists lard: read it.", teach: "Lard hides in fillings.",
        stations: ["dough", "oven"], seats: 2, maxOpen: 2, round: 99, patience: 100, hints: "chip", bonus: "clean",
        orders: [o("office", "baked-mooncake", 1), o("jia", "baked-mooncake", 20)] }),
      lv("lantern-bakery", 2, 81, { name: "Snowskin", brief: "Snowskin mooncakes are never baked: fold them, then set them in the fridge.", teach: "Fold, then chill.",
        stations: ["dough", "fridge"], seats: 3, maxOpen: 3, round: 118, patience: 100, hints: "chip", bonus: "golden",
        orders: [o("office", "snowskin-mooncake", 1), o("daniel", "snowskin-mooncake", 12), o("mei", "snowskin-mooncake", 44)] }),
      lv("lantern-bakery", 3, 21, { name: "Pear soup", brief: "Simmer snow fungus and pear gently, then add rock sugar and goji. Snow fungus is a fungus: Asha has pomelo salad.", teach: "A fungus counts as a mushroom.",
        stations: ["dessert", "board"], seats: 3, maxOpen: 3, round: 119, patience: 98, hints: "chip", bonus: "steady",
        orders: [o("office", "pear-soup", 1), o("asha", "pomelo-salad", 8), o("jia", "pear-soup", 42)] }),
      lv("lantern-bakery", 4, 85, { name: "Read the filling", brief: "Daniel is vegan and Auntie Mei is vegetarian: read every paste.", teach: "Read every filling.",
        stations: ["dough", "oven", "fridge"], seats: 3, maxOpen: 3, round: 142, patience: 100, hints: "none", bonus: "clean", twists: [{ kind: "change" }],
        orders: [o("daniel", "baked-mooncake", 1), o("mei", "snowskin-mooncake", 8), o("office", "baked-mooncake", 42), o("jia", "snowskin-mooncake", 70)] }),
      lv("lantern-bakery", 5, 87, { name: "Lantern walk", brief: "One early order, then everyone arrives from the lantern walk.", teach: "Quick salads keep the crowd happy.",
        stations: ["board", "dessert"], seats: 3, maxOpen: 3, round: 122, patience: 95, hints: "none", bonus: "swift", twists: [{ kind: "wave", n: 24 }],
        orders: [o("office", "pomelo-salad", 1), o("jia", "pear-soup", 24), o("asha", "pomelo-salad", 25), o("lim", "pomelo-salad", 27)] }),
      lv("lantern-bakery", 6, 90, { name: "Full moon", brief: "The full moon: baked and snowskin mooncakes for the whole family.", teach: "Everything this season taught.",
        stations: ["dough", "oven", "fridge"], seats: 4, maxOpen: 4, round: 174, patience: 104, hints: "none", bonus: "steady", twists: [{ kind: "vip" }],
        orders: [o("office", "baked-mooncake", 1), o("mei", "snowskin-mooncake", 4), o("jia", "baked-mooncake", 12), o("daniel", "snowskin-mooncake", 38), o("lim", "baked-mooncake", 64), o("nurul", "snowskin-mooncake", 90)] }),
    ],
  },
  {
    id: "dumpling-day", name: "Dumpling day",
    // Signed off by the owner after a full play-through of all six levels (22 Oct 2026; owner: "sign off as owner").
    signedOff: { by: "owner", on: "2026-10-22" },
    blurb: "Duanwu, the fifth day of the fifth month: zongzi and bean zongzi wrapped in bamboo leaves, with dumplings for the table.",
    featured: [{ from: "2027-06-01", to: "2027-06-10" }, { from: "2028-05-20", to: "2028-05-29" }],
    levels: [
      lv("dumpling-day", 1, 71, { name: "Bean zongzi", brief: "Wrap glutinous rice and beans in bamboo leaves on the board, then boil them.", teach: "Wrap, then boil.",
        stations: ["dough", "pot"], seats: 2, maxOpen: 2, round: 101, patience: 98, hints: "chip", bonus: "golden",
        orders: [o("office", "bean-zongzi", 1), o("jia", "bean-zongzi", 18)] }),
      lv("dumpling-day", 2, 73, { name: "Zongzi", brief: "Fry the filling, wrap it with the rice in bamboo leaves, then boil the zongzi.", teach: "Three stations, one parcel.",
        stations: ["pan", "dough", "pot"], seats: 3, maxOpen: 3, round: 135, patience: 100, hints: "chip", bonus: "steady",
        orders: [o("office", "zongzi", 1), o("jia", "zongzi", 14), o("lim", "bean-zongzi", 46)] }),
      lv("dumpling-day", 3, 75, { name: "Read the wrapper", brief: "Dumplings for the table: one wrapper lists egg, and Daniel is vegan.", teach: "Egg hides in wrappers.",
        stations: ["pan", "dough", "pot"], seats: 3, maxOpen: 3, round: 139, patience: 100, hints: "chip", bonus: "clean",
        orders: [o("daniel", "dumplings", 1), o("office", "zongzi", 8), o("mei", "dumplings", 44)] }),
      lv("dumpling-day", 4, 78, { name: "Steamed and boiled", brief: "Mandu in the steamer, bean zongzi in the pot.", teach: "Two cooked endings.",
        stations: ["dough", "steamer", "pot"], seats: 3, maxOpen: 3, round: 150, patience: 100, hints: "none", bonus: "order", twists: [{ kind: "stockout" }],
        orders: [o("office", "mandu", 1), o("jia", "bean-zongzi", 8), o("lim", "mandu", 44), o("nurul", "bean-zongzi", 70)] }),
      lv("dumpling-day", 5, 77, { name: "Boat race lunch", brief: "One early order, then the paddlers arrive together.", teach: "Keep wrapping.",
        stations: ["dough", "pot"], seats: 3, maxOpen: 3, round: 135, patience: 96, hints: "none", bonus: "swift", twists: [{ kind: "wave", n: 26 }],
        orders: [o("office", "bean-zongzi", 1), o("jia", "bean-zongzi", 26), o("mei", "bean-zongzi", 27), o("lim", "bean-zongzi", 29)] }),
      lv("dumpling-day", 6, 80, { name: "Fifth of the fifth", brief: "Duanwu itself: zongzi, bean zongzi, dumplings and mandu for every table.", teach: "Everything this season taught.",
        stations: ["pan", "dough", "pot", "steamer"], seats: 4, maxOpen: 4, round: 199, patience: 104, hints: "none", bonus: "steady", twists: [{ kind: "vip" }],
        orders: [o("office", "zongzi", 1), o("jia", "bean-zongzi", 4), o("mei", "dumplings", 12), o("daniel", "mandu", 38), o("lim", "zongzi", 64), o("nurul", "bean-zongzi", 90)] }),
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
