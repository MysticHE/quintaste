/**
 * Game dishes: real recipes simplified to two to four stages of one to three slots (GAME_PLAN §8).
 * Each recipe was checked against how the dish is really cooked; accepted swaps mirror real substitutions
 * (ginger for garlic and shallots, black beans or tempeh for shiitake). Game portions and times are not recipe amounts.
 */
import { CHAPTER_DISHES } from "./chapters/index";

export type StationKind = "pan" | "pot" | "rice" | "board" | "dessert" | "blender" | "steamer" | "oven" | "griddle" | "fryer" | "dough" | "fridge";
export type Slot = { key: string; label: string; accepts: string[]; optional?: boolean };
export type Stage = {
  slots: Slot[]; secs: number; hint: string;
  /** Target heat band override for this stage (0–1). */
  band?: [number, number];
  /** Seconds above the scorch line before this stage burns (leaves and sugar burn faster). */
  scorchSecs?: number;
  /** Items that curdle or split when added while the station is hotter than the band. */
  splitIfHot?: string[];
  /** A move the player makes with a tool before the stage can finish (RECIPE_LEVELS_PLAN §8.7): drag the spatula onto the griddle at
   *  halfway (`flip`; too late and the underside burns), or drag the fold onto the dough board once the filling is in (`fold`). */
  turn?: "flip" | "fold";
};
export type Part = { id: string; name: string; station: StationKind; stages: Stage[];
  /** Transfer (RECIPE_LEVELS_PLAN §8.7): this part is never plated; once ready it is dragged onto the station of the part whose slot
   *  accepts this item, carrying what went into it (a blended paste poured into the wok). */
  makes?: string };
export type Dish = { id: string; name: string; art: string; recipeId?: string; parts: Part[]; remember: string };

const slot = (key: string, label: string, accepts: string[], optional = false): Slot => ({ key, label, accepts, optional });
const one = (id: string, name: string, art: string, station: StationKind, stages: Stage[], remember: string, recipeId?: string): Dish =>
  ({ id, name, art, recipeId, remember, parts: [{ id, name, station, stages }] });

const dish = (d: Dish) => d;
/** Bumped whenever a level pack adds dishes (content/pack.ts), so caches derived from DISHES know to rebuild. */
export let dishesVersion = 0;
export const dishesChanged = () => { dishesVersion++; };
export const DISHES: Record<string, Dish> = Object.fromEntries(([
  one("bee-hoon", "Fried bee hoon", "dish-beehoon", "pan", [
    { slots: [slot("aroma", "Aromatic", ["ginger", "garlic", "shallots"]), slot("veg", "Vegetable", ["shiitake", "cabbage", "carrot"])], secs: 4, hint: "an aromatic and a vegetable" },
    { slots: [slot("noodle", "Bee hoon", ["bee-hoon"]), slot("sauce", "Soy", ["soy", "dark-soy"]), slot("extra", "Bean sprouts", ["bean-sprouts"], true)], secs: 4, hint: "bee hoon and soy" },
  ], "Fry the aromatics and vegetables first; soaked bee hoon goes in last so it stays whole.", "fried-bee-hoon"),
  one("greens", "Sesame greens & tofu", "dish-greens", "pan", [
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("oil", "Oil", ["cooking-oil"])], secs: 4, hint: "tofu and oil" },
    { slots: [slot("greens", "Greens", ["choy-sum", "bok-choy", "broccoli"]), slot("top", "Topping", ["sesame-seeds", "egg"]), slot("finish", "Sesame oil", ["sesame-oil"], true)], secs: 3, hint: "greens and a topping" },
  ], "Vegetarian is not always vegan: eggs, dairy and honey are not vegan.", "sesame-greens"),
  one("kangkung", "Kangkung with fu ru", "dish-kangkung", "pan", [
    { slots: [slot("sauce", "Fermented beancurd", ["fu-ru"]), slot("heat", "Chilli", ["red-chilli"], true)], secs: 3, hint: "fermented beancurd" },
    { slots: [slot("green", "Kangkung", ["kangkung"])], secs: 3, hint: "the kangkung", band: [0.55, 0.78], scorchSecs: 1.2 },
  ], "Kangkung wants a hot wok and a fast toss: it wilts in seconds, so plate it the moment it is done.", "kangkung"),
  one("kangkung-split", "Kangkung, stems first", "dish-kangkung", "pan", [
    { slots: [slot("sauce", "Fermented beancurd", ["fu-ru"]), slot("stems", "Stems", ["kangkung-stems"])], secs: 4, hint: "fermented beancurd and the stems" },
    { slots: [slot("leaves", "Leaves", ["kangkung-leaves"]), slot("heat", "Chilli", ["red-chilli"], true)], secs: 2, hint: "the leaves", band: [0.55, 0.78], scorchSecs: 1.2 },
  ], "Kangkung stems go in before the leaves: stems need longer, leaves wilt in seconds.", "kangkung"),
  one("mapo-tofu", "Mapo tofu", "dish-mapo", "pan", [
    { slots: [slot("mince", "Mince", ["shiitake", "tempeh"]), slot("aroma", "Aromatic", ["ginger", "garlic"], true)], secs: 2, hint: "minced shiitake or tempeh" },
    { slots: [slot("paste", "Bean paste", ["paste-a", "paste-b"]), slot("beans", "Black beans", ["black-beans"], true)], secs: 2, hint: "a bean paste" },
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("thick", "Cornflour", ["cornflour"]), slot("pepper", "Sichuan pepper", ["sichuan-pepper"], true)], secs: 3, hint: "tofu and cornflour" },
  ], "Fry the mince first, then the bean paste until the oil turns red. Garlic can hide in chilli bean paste: for a vegetarian order, read the label.", "mapo-tofu"),
  one("tomato-tofu", "Tomato tofu", "dish-tomato-tofu", "pan", [
    { slots: [slot("aroma", "Aromatic", ["ginger", "spring-onion", "garlic"]), slot("tomato", "Tomato", ["tomato"])], secs: 4, hint: "an aromatic and tomato" },
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("season", "Seasoning", ["soy", "brown-sugar"])], secs: 3, hint: "tofu and seasoning" },
  ], "Spring onion is a scallion, one of the five pungent, so not vegetarian, even though it looks like a green vegetable."),
  one("sweet-sour", "Sweet & sour tofu", "dish-sweet-sour", "pan", [
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("coat", "Cornflour", ["cornflour"])], secs: 4, hint: "tofu and cornflour" },
    { slots: [slot("sauce", "Ketchup", ["ketchup-a", "ketchup-b"]), slot("sour", "Vinegar", ["rice-vinegar"])], secs: 3, hint: "ketchup and vinegar" },
    { slots: [slot("veg", "Capsicum", ["capsicum"]), slot("fruit", "Pineapple", ["pineapple"])], secs: 2, hint: "capsicum and pineapple" },
  ], "Ketchup often lists onion and garlic powder. Read the label for a vegetarian guest.", "sweet-sour-tofu"),
  one("mee-goreng", "Mee goreng", "dish-mee-goreng", "pan", [
    { slots: [slot("aroma", "Aromatic", ["shallots", "garlic", "ginger"]), slot("paste", "Chilli paste", ["chilli-paste-a", "chilli-paste-b"])], secs: 4, hint: "an aromatic and chilli paste" },
    { slots: [slot("noodles", "Yellow noodles", ["yellow-noodles-a", "yellow-noodles-b"]), slot("protein", "Tempeh or tofu", ["tempeh", "tofu"])], secs: 4, hint: "noodles and tempeh" },
    { slots: [slot("greens", "Bok choy", ["bok-choy"]), slot("sauce", "Kecap manis", ["kecap"]), slot("extra", "Bean sprouts", ["bean-sprouts"], true)], secs: 3, hint: "bok choy and kecap manis" },
  ], "Some yellow noodles contain egg. Read the label for a vegan guest.", "mee-goreng-gentle"),
  one("abc-soup", "ABC soup", "dish-abc-soup", "pot", [
    { slots: [slot("base", "Potato or corn", ["potato", "corn"]), slot("veg", "Carrot or cabbage", ["carrot", "cabbage"])], secs: 7, hint: "two vegetables" },
    { slots: [slot("tomato", "Tomato", ["tomato"]), slot("season", "Seasoning", ["salt", "white-pepper"])], secs: 6, hint: "tomato and seasoning" },
  ], "Soup wants a gentle simmer, not a boil. Corn and cabbage make it root-free for a Jain guest.", "abc-soup"),
  one("laksa", "Coconut laksa", "dish-laksa", "pot", [
    { slots: [slot("spice", "Turmeric", ["turmeric"]), slot("paste", "Chilli paste", ["chilli-paste-a", "chilli-paste-b"])], secs: 4, hint: "turmeric and chilli paste", band: [0.5, 0.78] },
    { slots: [slot("stock", "Stock", ["stock-a", "stock-b"]), slot("cream", "Coconut milk", ["coconut-milk"]), slot("leaf", "Laksa leaves", ["laksa-leaves"], true)], secs: 5, hint: "stock and coconut milk", band: [0.25, 0.48], splitIfHot: ["coconut-milk"] },
    { slots: [slot("noodles", "Rice noodles", ["rice-noodles"]), slot("tofu", "Tofu puffs", ["tofu"]), slot("extra", "Bean sprouts", ["bean-sprouts"], true)], secs: 3, hint: "noodles and tofu", band: [0.25, 0.48] },
  ], "Fry the spice base hot, then lower the heat before the coconut milk so it doesn't split.", "gentle-laksa"),
  one("porridge", "Ginger oat porridge", "dish-porridge", "pot", [
    { slots: [slot("oats", "Oats", ["oats"]), slot("aroma", "Ginger", ["ginger"], true)], secs: 6, hint: "oats" },
    { slots: [slot("topping", "Topping", ["shiitake", "tofu"]), slot("finish", "Coriander", ["coriander"], true)], secs: 3, hint: "a topping" },
  ], "Ginger is optional in a porridge, so it is easy to leave out for a Jain guest.", "oat-porridge"),
  one("claypot", "Claypot rice", "dish-claypot", "rice", [
    { slots: [slot("rice", "Rice", ["rice"])], secs: 12, hint: "rice" },
    { slots: [slot("topping", "Topping", ["shiitake", "tofu", "tempeh"]), slot("greens", "Choy sum", ["choy-sum"]), slot("sauce", "Dark soy", ["dark-soy"])], secs: 3, hint: "toppings and dark soy" },
  ], "Rice takes the longest, so start it first and cook other orders while it steams.", "claypot-rice"),
  dish({
    id: "nasi-lemak", name: "Nasi lemak", art: "dish-nasi-lemak", recipeId: "nasi-lemak",
    remember: "Many sambals contain belacan, a shrimp paste. Check the label in a plant-based kitchen.",
    parts: [
      { id: "coconut-rice", name: "Coconut rice", station: "rice", stages: [
        { slots: [slot("rice", "Rice", ["rice"]), slot("cream", "Coconut milk", ["coconut-milk"]), slot("leaf", "Pandan", ["pandan"], true)], secs: 12, hint: "rice and coconut milk" }] },
      { id: "sambal-tempeh", name: "Sambal tempeh", station: "pan", stages: [
        { slots: [slot("tempeh", "Tempeh", ["tempeh"]), slot("sambal", "Sambal", ["sambal-a", "sambal-b"])], secs: 4, hint: "tempeh and sambal" }] },
    ],
  }),
  dish({
    id: "popiah", name: "Popiah", art: "dish-popiah", recipeId: "popiah",
    remember: "Build popiah in order: skin, sauce, lettuce, then the filling and peanuts, so it rolls without tearing.",
    parts: [
      { id: "popiah-filling", name: "Braised filling", station: "pan", makes: "popiah-filling", stages: [
        { slots: [slot("root", "Jicama", ["jicama"]), slot("veg", "Carrot", ["carrot"])], secs: 4, hint: "jicama and carrot", band: [0.3, 0.6] },
        { slots: [slot("tofu", "Tofu", ["tofu"]), slot("sauce", "Soy", ["soy"])], secs: 3, hint: "tofu and soy", band: [0.3, 0.6] }] },
      { id: "popiah-roll", name: "Roll", station: "board", stages: [
        { slots: [slot("skin", "Skin", ["popiah-skins"])], secs: 0, hint: "a popiah skin" },
        { slots: [slot("sauce", "Sweet sauce", ["sweet-sauce-a", "sweet-sauce-b"])], secs: 0, hint: "sweet sauce" },
        { slots: [slot("leaf", "Lettuce", ["lettuce"])], secs: 0, hint: "lettuce" },
        { slots: [slot("filling", "Filling", ["popiah-filling"]), slot("crunch", "Peanuts", ["peanuts"]), slot("sprouts", "Bean sprouts", ["bean-sprouts"], true)], secs: 0, hint: "the filling and peanuts" }] },
    ],
  }),
  one("bubur", "Bubur cha cha", "dish-bubur", "dessert", [
    { slots: [slot("orange", "Sweet potato", ["sweet-potato"]), slot("yam", "Yam", ["yam"])], secs: 5, hint: "sweet potato and yam" },
    { slots: [slot("sago", "Sago", ["sago"])], secs: 4, hint: "sago pearls" },
    { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("leaf", "Pandan", ["pandan"]), slot("sweet", "Sugar", ["rock-sugar", "brown-sugar"])], secs: 3, hint: "coconut milk, pandan and sugar", splitIfHot: ["coconut-milk"] },
  ], "Coconut milk splits if it boils hard; keep a dessert at a gentle heat.", "bubur-cha-cha"),
  // Chapter 3 (GAME_CONTENT_PLAN §3): the blender, and transfer. Pastes made at home show what went in; bought ones can hide belacan or fish sauce.
  one("coconut-chutney", "Coconut chutney", "dish-coconut-chutney", "blender", [
    { slots: [slot("coconut", "Grated coconut", ["grated-coconut"]), slot("chilli", "Green chilli", ["green-chilli"]), slot("aroma", "Ginger", ["ginger"], true)], secs: 3, hint: "coconut and green chilli" },
    { slots: [slot("tang", "Tamarind", ["tamarind", "lime"]), slot("salt", "Salt", ["salt"])], secs: 2, hint: "tamarind and salt" },
  ], "A blender only needs the lid on and a little time. Ginger is optional, so leave it out for a Jain guest."),
  one("mint-chutney", "Mint chutney", "dish-mint-chutney", "blender", [
    { slots: [slot("herb", "Mint", ["mint"]), slot("green", "Coriander", ["coriander"]), slot("chilli", "Green chilli", ["green-chilli"])], secs: 3, hint: "mint, coriander and green chilli" },
    { slots: [slot("tang", "Lime", ["lime"]), slot("creamy", "Yoghurt", ["yoghurt", "coconut-milk"])], secs: 2, hint: "lime and something creamy" },
  ], "Yoghurt is dairy, so it is not vegan. Coconut milk makes the chutney creamy for a vegan guest."),
  dish({
    id: "sambal-tempeh", name: "Sambal tempeh", art: "dish-sambal-tempeh",
    remember: "Blend your own sambal and you know what is in it. Bought sambal often hides belacan, a shrimp paste.",
    parts: [
      { id: "sambal-blend", name: "Sambal", station: "blender", makes: "fresh-sambal", stages: [
        { slots: [slot("chilli", "Chillies", ["red-chilli", "dried-chillies"]), slot("aroma", "Aromatic", ["shallots", "ginger"]), slot("sour", "Tamarind", ["tamarind"])], secs: 3, hint: "chillies, an aromatic and tamarind" }] },
      { id: "sambal-tempeh", name: "Sambal tempeh", station: "pan", stages: [
        { slots: [slot("oil", "Oil", ["cooking-oil"]), slot("sambal", "Sambal", ["fresh-sambal", "sambal-a", "sambal-b"])], secs: 3, hint: "oil and the sambal", band: [0.45, 0.75] },
        { slots: [slot("tempeh", "Tempeh", ["tempeh"]), slot("sweet", "Sugar", ["gula-melaka", "brown-sugar"])], secs: 4, hint: "tempeh and sugar" }] },
    ],
  }),
  dish({
    id: "laksa-scratch", name: "Laksa from scratch", art: "dish-laksa",
    remember: "Rempah is the spice paste behind laksa. Fry it hot until fragrant, then lower the heat for the coconut milk.",
    parts: [
      { id: "laksa-rempah", name: "Rempah", station: "blender", makes: "laksa-rempah", stages: [
        { slots: [slot("grass", "Lemongrass", ["lemongrass"]), slot("root", "Galangal or ginger", ["galangal", "ginger"]), slot("chilli", "Chillies", ["dried-chillies", "red-chilli"])], secs: 3, hint: "lemongrass, galangal and chillies" },
        { slots: [slot("nut", "Candlenuts", ["candlenuts"]), slot("spice", "Turmeric", ["turmeric"])], secs: 2, hint: "candlenuts and turmeric" }] },
      { id: "laksa-scratch", name: "Laksa", station: "pot", stages: [
        { slots: [slot("oil", "Oil", ["cooking-oil"]), slot("rempah", "Rempah", ["laksa-rempah", "rempah-a", "rempah-b"])], secs: 4, hint: "oil and the rempah", band: [0.5, 0.78] },
        { slots: [slot("stock", "Stock", ["stock-a", "stock-b"]), slot("cream", "Coconut milk", ["coconut-milk"])], secs: 5, hint: "stock and coconut milk", band: [0.25, 0.48], splitIfHot: ["coconut-milk"] },
        { slots: [slot("noodles", "Rice noodles", ["rice-noodles"]), slot("tofu", "Tofu puffs", ["tofu"]), slot("leaf", "Laksa leaves", ["laksa-leaves"], true)], secs: 3, hint: "noodles and tofu", band: [0.25, 0.48] }] },
    ],
  }),
  dish({
    id: "green-curry", name: "Green curry", art: "dish-green-curry",
    remember: "Bought curry pastes often contain fish sauce or shrimp. Blend your own, or read the label.",
    parts: [
      { id: "green-paste", name: "Green paste", station: "blender", makes: "green-curry-paste", stages: [
        { slots: [slot("chilli", "Green chilli", ["green-chilli"]), slot("grass", "Lemongrass", ["lemongrass"]), slot("root", "Galangal or ginger", ["galangal", "ginger"])], secs: 3, hint: "green chilli, lemongrass and galangal" },
        { slots: [slot("herb", "Coriander", ["coriander"]), slot("leaf", "Lime leaves", ["lime-leaves"], true)], secs: 2, hint: "coriander" }] },
      { id: "green-curry", name: "Green curry", station: "pot", stages: [
        { slots: [slot("paste", "Curry paste", ["green-curry-paste", "curry-paste-a", "curry-paste-b"]), slot("cream", "Coconut milk", ["coconut-milk"])], secs: 4, hint: "curry paste and coconut milk", band: [0.25, 0.5], splitIfHot: ["coconut-milk"] },
        { slots: [slot("veg", "Eggplant", ["eggplant"]), slot("protein", "Tofu or tempeh", ["tofu", "tempeh"])], secs: 4, hint: "eggplant and tofu", band: [0.25, 0.5] },
        { slots: [slot("sweet", "Palm sugar", ["gula-melaka", "brown-sugar"]), slot("basil", "Thai basil", ["thai-basil"], true)], secs: 2, hint: "palm sugar", band: [0.25, 0.5] }] },
    ],
  }),
  // Zhai days season (content/seasons.ts): every order is vegetarian; zhai bee hoon is the bee hoon above with ginger.
  one("buddhas-delight", "Lo han jai", "dish-buddhas-delight", "pan", [
    { slots: [slot("aroma", "Ginger", ["ginger"], true), slot("sauce", "Fermented beancurd", ["fu-ru"])], secs: 3, hint: "fermented beancurd" },
    { slots: [slot("veg", "Cabbage", ["cabbage"]), slot("crunch", "Black fungus or baby corn", ["black-fungus", "baby-corn"])], secs: 4, hint: "cabbage and something crunchy" },
    { slots: [slot("skin", "Tofu skin", ["tofu-skin"]), slot("season", "Soy", ["soy"])], secs: 3, hint: "tofu skin and soy" },
  ], "Lo han jai braises hard vegetables first and tofu skin last. Ginger is optional, so a Jain guest can have it."),
  dish({
    id: "mock-char-siew-rice", name: "Mock char siew rice", art: "dish-mock-char-siew-rice",
    remember: "Many char siew sauces contain honey and garlic. Read the label for a vegan or vegetarian order.",
    parts: [
      { id: "plain-rice", name: "Rice", station: "rice", stages: [{ slots: [slot("rice", "Rice", ["rice"])], secs: 10, hint: "rice" }] },
      { id: "mock-char-siew", name: "Mock char siew", station: "pan", stages: [
        { slots: [slot("gluten", "Mock char siew", ["mock-char-siew"]), slot("oil", "Oil", ["cooking-oil"])], secs: 3, hint: "mock char siew and oil" },
        { slots: [slot("sauce", "Char siew sauce", ["char-siew-sauce-a", "char-siew-sauce-b"]), slot("green", "Cucumber", ["cucumber"], true)], secs: 3, hint: "char siew sauce", scorchSecs: 1.5 }] },
    ],
  }),
  one("zhai-curry", "Zhai curry", "dish-zhai-curry", "pot", [
    { slots: [slot("spice", "Curry powder", ["curry-powder"]), slot("oil", "Oil", ["cooking-oil"])], secs: 3, hint: "curry powder and oil", band: [0.45, 0.72] },
    { slots: [slot("veg", "Potato", ["potato"]), slot("beans", "Long beans", ["long-beans"])], secs: 5, hint: "potato and long beans", band: [0.3, 0.55] },
    { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("tofu", "Tofu puffs", ["tofu"])], secs: 3, hint: "coconut milk and tofu puffs", band: [0.25, 0.48], splitIfHot: ["coconut-milk"] },
  ], "Zhai curry gets its depth from curry powder and coconut, with no onion or garlic. Potato is a root, so a Jain guest has another dish."),
  dish({
    id: "sago", name: "Sago gula melaka", art: "dish-sago", recipeId: "sago-gula-melaka",
    remember: "Cook the sago, then warm it gently in coconut milk with a pinch of salt; it splits if it boils. Melt the palm sugar syrup apart and pour it over: palm sugar scorches quickly.",
    parts: [
      { id: "sago-pearls", name: "Sago", station: "dessert", stages: [
        { slots: [slot("sago", "Sago", ["sago"])], secs: 5, hint: "sago pearls" },
        { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("salt", "Salt", ["salt"])], secs: 1, hint: "coconut milk and salt", splitIfHot: ["coconut-milk"] }] },
      { id: "sago-syrup", name: "Palm sugar syrup", station: "pot", stages: [
        { slots: [slot("syrup", "Gula melaka", ["gula-melaka"]), slot("leaf", "Pandan", ["pandan"], true)], secs: 3, hint: "gula melaka", band: [0.25, 0.5], scorchSecs: 1 }] },
    ],
  }),
  ...CHAPTER_DISHES,
] as Dish[]).map(d => [d.id, d]));

/**
 * Station settings. Heated stations have a burner and a band; `thermostat` stations (the oven) hold the middle of their band by
 * themselves once on, and never scorch; `preheat` stations refuse food until they reach their band; `burnAfter` is how long a
 * ready dish can stay in before it spoils (`spoil` says why), on any station.
 */
export type StationConfig = { name: string; art: string; heat: boolean; onRate: number; offRate: number; gain: number; loss: number; band: [number, number]; scorch: number; scorchSecs: number;
  thermostat?: boolean; preheat?: boolean; burnAfter?: number; spoil?: string };
/** The most cooking stations a level or a recipe level's dish uses (owner, 23 Oct 2026): a phone shows two at a time and the row slides to the rest. */
export const MAX_STATIONS = 4;
export const STATIONS: Record<StationKind, StationConfig> = {
  pan: { name: "Wok", art: "stove-wok", heat: true, onRate: 1.2, offRate: 1.2, gain: 0.35, loss: 0.38, band: [0.4, 0.7], scorch: 0.85, scorchSecs: 2 },
  pot: { name: "Soup pot", art: "soup-pot", heat: true, onRate: 0.7, offRate: 0.22, gain: 0.32, loss: 0.3, band: [0.3, 0.55], scorch: 0.82, scorchSecs: 3 },
  dessert: { name: "Dessert pot", art: "dessert-pot", heat: true, onRate: 0.8, offRate: 0.45, gain: 0.3, loss: 0.34, band: [0.22, 0.44], scorch: 0.6, scorchSecs: 1.5 },
  rice: { name: "Rice cooker", art: "rice-cooker", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
  board: { name: "Assembly board", art: "assembly-board", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
  blender: { name: "Blender", art: "blender", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
  // Chapters 4–10 (GAME_CONTENT_PLAN §3): one technique each.
  steamer: { name: "Steamer", art: "steamer", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99,
    burnAfter: 7, spoil: "It steamed too long and went soggy. Take dishes out of the steamer as soon as they're ready." },
  oven: { name: "Oven", art: "oven", heat: true, thermostat: true, preheat: true, onRate: 0, offRate: 0, gain: 0.09, loss: 0.035, band: [0.55, 0.8], scorch: 2, scorchSecs: 99,
    burnAfter: 6, spoil: "It stayed in the hot oven and burnt. Take bakes out as soon as they're ready." },
  griddle: { name: "Griddle", art: "griddle", heat: true, onRate: 1, offRate: 0.9, gain: 0.33, loss: 0.36, band: [0.4, 0.68], scorch: 0.86, scorchSecs: 2.2 },
  fryer: { name: "Fryer", art: "fryer", heat: true, preheat: true, onRate: 0.6, offRate: 0.22, gain: 0.32, loss: 0.3, band: [0.55, 0.8], scorch: 0.9, scorchSecs: 1.6 },
  dough: { name: "Dough board", art: "dough-board", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
  fridge: { name: "Fridge", art: "fridge", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
};
/** The tool a turn is made with, for the playfield and messages. */
export const TURN_TOOL: Record<NonNullable<Stage["turn"]>, { name: string; art: string; verb: string }> = {
  flip: { name: "Spatula", art: "tool-spatula", verb: "Flip" },
  fold: { name: "Fold", art: "tool-fold", verb: "Fold" },
};
