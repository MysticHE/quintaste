/**
 * Game dishes: real recipes simplified to two to four stages of one to three slots (GAME_PLAN §8).
 * Each recipe was checked against how the dish is really cooked; accepted swaps mirror real substitutions
 * (ginger for garlic and shallots, black beans or tempeh for shiitake). Game portions and times are not recipe amounts.
 */
export type StationKind = "pan" | "pot" | "rice" | "board" | "dessert";
export type Slot = { key: string; label: string; accepts: string[]; optional?: boolean };
export type Stage = {
  slots: Slot[]; secs: number; hint: string;
  /** Target heat band override for this stage (0–1). */
  band?: [number, number];
  /** Seconds above the scorch line before this stage burns (leaves and sugar burn faster). */
  scorchSecs?: number;
  /** Items that curdle or split when added while the station is hotter than the band. */
  splitIfHot?: string[];
};
export type Part = { id: string; name: string; station: StationKind; stages: Stage[] };
export type Dish = { id: string; name: string; art: string; recipeId?: string; parts: Part[]; remember: string };

const slot = (key: string, label: string, accepts: string[], optional = false): Slot => ({ key, label, accepts, optional });
const one = (id: string, name: string, art: string, station: StationKind, stages: Stage[], remember: string, recipeId?: string): Dish =>
  ({ id, name, art, recipeId, remember, parts: [{ id, name, station, stages }] });

const dish = (d: Dish) => d;
export const DISHES: Record<string, Dish> = Object.fromEntries(([
  one("bee-hoon", "Fried bee hoon", "dish-beehoon", "pan", [
    { slots: [slot("aroma", "Aromatic", ["ginger", "garlic", "shallots"]), slot("veg", "Vegetable", ["shiitake", "cabbage", "carrot"])], secs: 4, hint: "an aromatic and a vegetable" },
    { slots: [slot("noodle", "Bee hoon", ["bee-hoon"]), slot("sauce", "Soy", ["soy", "dark-soy"]), slot("extra", "Bean sprouts", ["bean-sprouts"], true)], secs: 4, hint: "bee hoon and soy" },
  ], "Fry the aromatics and vegetables first; soaked bee hoon goes in last so it stays whole.", "fried-bee-hoon"),
  one("greens", "Sesame greens & tofu", "dish-greens", "pan", [
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("oil", "Oil", ["cooking-oil", "sesame-oil"])], secs: 4, hint: "tofu and oil" },
    { slots: [slot("greens", "Greens", ["choy-sum", "bok-choy", "broccoli"]), slot("top", "Topping", ["sesame-seeds", "egg"])], secs: 3, hint: "greens and a topping" },
  ], "Vegetarian is not always vegan: eggs, dairy and honey are not vegan.", "sesame-greens"),
  one("kangkung", "Kangkung with fu ru", "dish-kangkung", "pan", [
    { slots: [slot("sauce", "Fermented beancurd", ["fu-ru"]), slot("heat", "Chilli", ["red-chilli"], true)], secs: 3, hint: "fermented beancurd" },
    { slots: [slot("green", "Kangkung", ["kangkung"])], secs: 3, hint: "the kangkung", scorchSecs: 1.2 },
  ], "Leafy greens cook in seconds; a hot wok scorches them fast, so ease the heat once they go in.", "kangkung"),
  one("kangkung-split", "Kangkung, stems first", "dish-kangkung", "pan", [
    { slots: [slot("sauce", "Fermented beancurd", ["fu-ru"]), slot("stems", "Stems", ["kangkung-stems"])], secs: 4, hint: "fermented beancurd and the stems" },
    { slots: [slot("leaves", "Leaves", ["kangkung-leaves"]), slot("heat", "Chilli", ["red-chilli"], true)], secs: 2, hint: "the leaves", scorchSecs: 1.2 },
  ], "Kangkung stems go in before the leaves: stems need longer, leaves wilt in seconds.", "kangkung"),
  one("mapo-tofu", "Mapo tofu", "dish-mapo", "pan", [
    { slots: [slot("aroma", "Aromatic", ["ginger", "garlic", "sichuan-pepper"]), slot("paste", "Bean paste", ["paste-a", "paste-b"])], secs: 4, hint: "an aromatic and a bean paste" },
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("extra", "Savoury bite", ["shiitake", "black-beans", "tempeh"])], secs: 4, hint: "tofu and something savoury" },
  ], "Garlic can hide in chilli bean paste. For a no five pungent order, read the label and use ginger.", "mapo-tofu"),
  one("tomato-tofu", "Tomato tofu", "dish-tomato-tofu", "pan", [
    { slots: [slot("aroma", "Aromatic", ["ginger", "spring-onion", "garlic"]), slot("tomato", "Tomato", ["tomato"])], secs: 4, hint: "an aromatic and tomato" },
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("season", "Seasoning", ["soy", "brown-sugar"])], secs: 3, hint: "tofu and seasoning" },
  ], "Spring onion is a scallion, one of the five pungent, even though it looks like a green vegetable."),
  one("sweet-sour", "Sweet & sour tofu", "dish-sweet-sour", "pan", [
    { slots: [slot("tofu", "Tofu", ["tofu"]), slot("coat", "Cornflour", ["cornflour"])], secs: 4, hint: "tofu and cornflour" },
    { slots: [slot("veg", "Capsicum", ["capsicum"]), slot("fruit", "Pineapple", ["pineapple"])], secs: 3, hint: "capsicum and pineapple" },
    { slots: [slot("sauce", "Ketchup", ["ketchup-a", "ketchup-b"]), slot("sour", "Vinegar", ["rice-vinegar"])], secs: 3, hint: "ketchup and vinegar" },
  ], "Ketchup often lists onion and garlic powder. Read the label for a no five pungent guest.", "sweet-sour-tofu"),
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
    { slots: [slot("stock", "Stock", ["stock-a", "stock-b"]), slot("cream", "Coconut milk", ["coconut-milk"])], secs: 5, hint: "stock and coconut milk", band: [0.25, 0.48], splitIfHot: ["coconut-milk"] },
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
    remember: "Many sambals contain belacan, a shrimp paste. Check the label in a vegetarian kitchen.",
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
      { id: "popiah-filling", name: "Braised filling", station: "pan", stages: [
        { slots: [slot("root", "Jicama", ["jicama"]), slot("veg", "Carrot", ["carrot"])], secs: 4, hint: "jicama and carrot", band: [0.3, 0.6] },
        { slots: [slot("tofu", "Tofu", ["tofu"]), slot("sauce", "Soy", ["soy"])], secs: 3, hint: "tofu and soy", band: [0.3, 0.6] }] },
      { id: "popiah-roll", name: "Roll", station: "board", stages: [
        { slots: [slot("skin", "Skin", ["popiah-skins"])], secs: 0, hint: "a popiah skin" },
        { slots: [slot("sauce", "Sweet sauce", ["sweet-sauce-a", "sweet-sauce-b"])], secs: 0, hint: "sweet sauce" },
        { slots: [slot("leaf", "Lettuce", ["lettuce"])], secs: 0, hint: "lettuce" },
        { slots: [slot("crunch", "Peanuts", ["peanuts"]), slot("sprouts", "Bean sprouts", ["bean-sprouts"], true)], secs: 0, hint: "peanuts" }] },
    ],
  }),
  one("bubur", "Bubur cha cha", "dish-bubur", "dessert", [
    { slots: [slot("orange", "Sweet potato", ["sweet-potato"]), slot("yam", "Yam", ["yam"])], secs: 5, hint: "sweet potato and yam" },
    { slots: [slot("sago", "Sago", ["sago"])], secs: 4, hint: "sago pearls" },
    { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("leaf", "Pandan", ["pandan"])], secs: 3, hint: "coconut milk and pandan", splitIfHot: ["coconut-milk"] },
  ], "Coconut milk splits if it boils hard; keep a dessert at a gentle heat.", "bubur-cha-cha"),
  one("sago", "Sago gula melaka", "dish-sago", "dessert", [
    { slots: [slot("sago", "Sago", ["sago"])], secs: 5, hint: "sago pearls" },
    { slots: [slot("syrup", "Gula melaka", ["gula-melaka"]), slot("cream", "Coconut milk", ["coconut-milk"])], secs: 3, hint: "gula melaka and coconut milk", scorchSecs: 1, splitIfHot: ["coconut-milk"] },
  ], "Palm sugar scorches quickly. Melt it gently, never on high heat.", "sago-gula-melaka"),
] as Dish[]).map(d => [d.id, d]));

export const STATIONS: Record<StationKind, { name: string; art: string; heat: boolean; onRate: number; offRate: number; gain: number; loss: number; band: [number, number]; scorch: number; scorchSecs: number }> = {
  pan: { name: "Wok", art: "stove-wok", heat: true, onRate: 1.2, offRate: 1.2, gain: 0.35, loss: 0.38, band: [0.4, 0.7], scorch: 0.85, scorchSecs: 2 },
  pot: { name: "Soup pot", art: "soup-pot", heat: true, onRate: 0.7, offRate: 0.22, gain: 0.32, loss: 0.3, band: [0.3, 0.55], scorch: 0.82, scorchSecs: 3 },
  dessert: { name: "Dessert pot", art: "dessert-pot", heat: true, onRate: 0.8, offRate: 0.45, gain: 0.3, loss: 0.34, band: [0.22, 0.44], scorch: 0.6, scorchSecs: 1.5 },
  rice: { name: "Rice cooker", art: "rice-cooker", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
  board: { name: "Assembly board", art: "assembly-board", heat: false, onRate: 0, offRate: 0, gain: 0, loss: 0, band: [0, 1], scorch: 2, scorchSecs: 99 },
};
