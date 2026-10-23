/**
 * Dishes and ingredients for the seasons after Zhai days (GAME_CONTENT_PLAN §6): Reunion kitchen, Sunset bazaar, Nine days, Festival of
 * lights, Year-end table, Lantern bakery and Dumpling day. Their levels are in content/seasons.ts. Everything stays vegetarian; care
 * notes from the plan apply (no ancestor altars, deities or palanquins; fasting is broken at sunset; traditional fillings with lard).
 */
import type { Dish } from "../dishes";
import type { GameItem, ItemForm } from "../items";
import type { Level } from "../levels";
import { fresh, one, pantry, slot } from "../make";

export const ITEMS: GameItem[] = [
  fresh("pomelo", "Pomelo"),
  pantry("plum-sauce", "Plum sauce"),
  pantry("pineapple-jam", "Pineapple jam"),
  pantry("lontong", "Lontong"),
  fresh("jackfruit", "Young jackfruit"),
  pantry("chickpeas", "Chickpeas"),
  pantry("vermicelli", "Vermicelli"),
  pantry("besan", "Besan"),
  pantry("lotus-paste-a", "Lotus paste", "lotus-paste", ["animal"], { title: "Lotus seed paste", ingredients: ["Lotus seeds", "Sugar", "Lard"], contains: "—", flagged: "Lard" }, "A"),
  pantry("lotus-paste-b", "Lotus paste", "lotus-paste", [], { title: "Lotus seed paste, vegetable oil", ingredients: ["Lotus seeds", "Sugar", "Peanut oil"], contains: "Peanut" }, "B"),
  fresh("glutinous-rice", "Glutinous rice"),
  fresh("bamboo-leaves", "Bamboo leaves"),
  fresh("chestnuts", "Chestnuts"),
  fresh("snow-fungus", "Snow fungus", "snow-fungus", ["mushroom"], "A white fungus: guests who skip mushrooms skip this too."),
  fresh("pear", "Pear"),
  pantry("goji", "Goji berries"),
  pantry("mung-beans", "Mung beans"),
  pantry("red-beans", "Red beans"),
  // Made in a station, never on the shelf (Part.makes).
  pantry("steamed-nian-gao", "Steamed nian gao"),
  pantry("rendang-paste", "Rendang paste"),
  pantry("murukku-dough", "Murukku dough"),
  pantry("laddu-mix", "Laddu mix"),
  pantry("devil-paste", "Devil's curry paste"),
  pantry("raw-mooncakes", "Mooncakes"),
  pantry("raw-snowskin", "Snowskin mooncakes"),
  pantry("zongzi-filling", "Zongzi filling"),
  pantry("raw-zongzi", "Zongzi"),
  pantry("raw-bean-zongzi", "Bean zongzi", "raw-zongzi"),
];
export const FORMS: Record<string, ItemForm> = {
  "plum-sauce": { form: "pour", tone: "red" }, "pineapple-jam": { form: "pour", tone: "gold" }, chickpeas: { form: "sprinkle", tone: "gold" },
  besan: { form: "sprinkle", tone: "gold" }, "rendang-paste": { form: "pour", tone: "red" }, "murukku-dough": { form: "pour", tone: "cream" },
  "laddu-mix": { form: "pour", tone: "gold" }, "devil-paste": { form: "pour", tone: "red" }, goji: { form: "sprinkle", tone: "red" },
  "mung-beans": { form: "sprinkle", tone: "gold" }, "red-beans": { form: "sprinkle", tone: "red" },
  "zongzi-filling": { form: "pour", tone: "soy" }, "lotus-paste-a": { form: "pour", tone: "soy" }, "lotus-paste-b": { form: "pour", tone: "soy" },
};

export const DISHES: Dish[] = [
  // Reunion kitchen (Lunar New Year, Chap Goh Mei).
  one("yusheng", "Vegetarian yusheng", "dish-yusheng", "board", [
    { slots: [slot("shred", "Carrot or radish", ["carrot", "radish"]), slot("cool", "Cucumber", ["cucumber"]), slot("fruit", "Pomelo", ["pomelo"])], secs: 0, hint: "carrot, cucumber and pomelo" },
    { slots: [slot("sauce", "Plum sauce", ["plum-sauce"]), slot("crunch", "Peanuts", ["peanuts"]), slot("seeds", "Sesame", ["sesame-seeds"], true)], secs: 0, hint: "plum sauce and peanuts" },
  ], "Yusheng is tossed high for a good year. Carrot and radish are roots, so a Jain guest has another dish."),
  one("longevity-noodles", "Longevity noodles", "dish-longevity-noodles", "pan", [
    { slots: [slot("aroma", "Ginger", ["ginger"]), slot("bite", "Mushroom or fungus", ["shiitake", "black-fungus"])], secs: 3, hint: "ginger and mushrooms" },
    { slots: [slot("noodles", "Noodles", ["yellow-noodles-a", "yellow-noodles-b"]), slot("sauce", "Soy", ["soy"])], secs: 3, hint: "noodles and soy" },
  ], "Long noodles for a long life: never cut them. Some yellow noodles contain egg."),
  one("braised-mushrooms", "Braised mushrooms", "dish-braised-mushrooms", "pot", [
    { slots: [slot("mush", "Shiitake", ["shiitake"]), slot("button", "Button mushrooms", ["button-mushrooms"])], secs: 4, hint: "two kinds of mushroom" },
    { slots: [slot("sauce", "Dark soy", ["dark-soy"]), slot("sweet", "Sugar", ["brown-sugar"])], secs: 3, hint: "dark soy and sugar" },
  ], "Braised mushrooms are a reunion favourite; a guest who skips mushrooms has another dish."),
  { id: "nian-gao", name: "Fried nian gao", art: "dish-nian-gao", remember: "Steamed nian gao is sliced and pan-fried between sweet potato and yam until crisp.",
    parts: [
      { id: "nian-gao-steam", name: "Nian gao", station: "steamer", makes: "steamed-nian-gao", stages: [
        { slots: [slot("flour", "Glutinous rice flour", ["glutinous-flour"]), slot("sweet", "Brown sugar", ["brown-sugar"])], secs: 5, hint: "rice flour and brown sugar" }] },
      { id: "nian-gao", name: "Fried nian gao", station: "griddle", stages: [
        { slots: [slot("cake", "Nian gao", ["steamed-nian-gao"]), slot("root", "Sweet potato or yam", ["sweet-potato", "yam"]), slot("oil", "Oil", ["cooking-oil"])], secs: 4, hint: "nian gao, sweet potato and oil", turn: "flip" }] },
    ] },
  one("pineapple-tarts", "Pineapple tarts", "dish-pineapple-tarts", "oven", [
    { slots: [slot("flour", "Plain flour", ["plain-flour"]), slot("fat", "Butter or margarine", ["butter", "margarine"])], secs: 4, hint: "flour and butter" },
    { slots: [slot("jam", "Pineapple jam", ["pineapple-jam"])], secs: 3, hint: "pineapple jam" },
  ], "Pineapple tarts are buttery; margarine makes them vegan."),
  // Sunset bazaar (Hari Raya Puasa): cooked through the afternoon for breaking the fast at sunset.
  one("sayur-lodeh", "Sayur lodeh", "dish-sayur-lodeh", "pot", [
    { slots: [slot("veg", "Cabbage or long beans", ["cabbage", "long-beans"]), slot("root", "Carrot", ["carrot"]), slot("tofu", "Tofu", ["tofu"])], secs: 4, hint: "vegetables and tofu", band: [0.35, 0.6] },
    { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("spice", "Turmeric", ["turmeric"])], secs: 3, hint: "coconut milk and turmeric", band: [0.25, 0.48], splitIfHot: ["coconut-milk"] },
    { slots: [slot("cakes", "Lontong", ["lontong"])], secs: 1, hint: "the lontong", band: [0.25, 0.48] },
  ], "Sayur lodeh is a gentle coconut stew, served over lontong rice cakes."),
  { id: "jackfruit-rendang", name: "Jackfruit rendang", art: "dish-jackfruit-rendang", remember: "Rendang cooks long and slow until the coconut is nearly dry. Young jackfruit stands in for meat.",
    parts: [
      { id: "rendang-grind", name: "Rendang paste", station: "blender", makes: "rendang-paste", stages: [
        { slots: [slot("chilli", "Chillies", ["dried-chillies", "red-chilli"]), slot("root", "Galangal or ginger", ["galangal", "ginger"]), slot("grass", "Lemongrass", ["lemongrass"])], secs: 3, hint: "chillies, galangal and lemongrass" }] },
      { id: "jackfruit-rendang", name: "Rendang", station: "pot", stages: [
        { slots: [slot("paste", "Rendang paste", ["rendang-paste"]), slot("fruit", "Jackfruit", ["jackfruit"])], secs: 4, hint: "the paste and jackfruit", band: [0.45, 0.72] },
        { slots: [slot("cream", "Coconut milk", ["coconut-milk"]), slot("toast", "Grated coconut", ["grated-coconut"])], secs: 4, hint: "coconut milk and grated coconut", band: [0.25, 0.5], splitIfHot: ["coconut-milk"] }] },
    ] },
  one("kuih-lapis", "Kuih lapis", "dish-kuih-lapis", "steamer", [
    { slots: [slot("flour", "Rice flour", ["rice-flour"]), slot("cream", "Coconut milk", ["coconut-milk"])], secs: 4, hint: "rice flour and coconut milk" },
    { slots: [slot("sweet", "Sugar", ["brown-sugar", "gula-melaka"]), slot("leaf", "Pandan", ["pandan"])], secs: 4, hint: "sugar and pandan" },
  ], "Kuih lapis is steamed one layer at a time, so every layer sets before the next."),
  // Nine days (Nine Emperor Gods, Navaratri) and Festival of lights (Deepavali).
  one("sundal", "Sundal", "dish-sundal", "pan", [
    { slots: [slot("oil", "Oil", ["cooking-oil"]), slot("chilli", "Green chilli", ["green-chilli"])], secs: 2, hint: "oil and green chilli" },
    { slots: [slot("beans", "Chickpeas", ["chickpeas"]), slot("coconut", "Grated coconut", ["grated-coconut"]), slot("salt", "Salt", ["salt"])], secs: 3, hint: "chickpeas, coconut and salt" },
  ], "Sundal is a simple chickpea offering made without onion or garlic."),
  one("payasam", "Payasam", "dish-payasam", "dessert", [
    { slots: [slot("noodle", "Vermicelli", ["vermicelli"]), slot("fat", "Ghee or oil", ["ghee", "cooking-oil"])], secs: 3, hint: "vermicelli and ghee" },
    { slots: [slot("milk", "Milk or coconut milk", ["dairy-milk", "coconut-milk"]), slot("sweet", "Sugar", ["brown-sugar", "gula-melaka"])], secs: 4, hint: "milk and sugar", splitIfHot: ["coconut-milk"] },
  ], "Payasam is often made with milk and ghee; coconut milk and oil make it vegan."),
  { id: "murukku", name: "Murukku", art: "dish-murukku", remember: "Murukku dough is rice flour and urad dal, pressed into spirals and fried crisp.",
    parts: [
      { id: "murukku-mix", name: "Murukku dough", station: "blender", makes: "murukku-dough", stages: [
        { slots: [slot("flour", "Rice flour", ["rice-flour"]), slot("dal", "Urad dal", ["urad-dal"])], secs: 2, hint: "rice flour and urad dal" }] },
      { id: "murukku", name: "Murukku", station: "fryer", stages: [{ slots: [slot("dough", "Murukku dough", ["murukku-dough"])], secs: 4, hint: "the dough" }] },
    ] },
  { id: "laddu", name: "Besan laddu", art: "dish-laddu", remember: "Roast the besan gently in ghee, then roll the laddu while warm. Oil keeps them vegan.",
    parts: [
      { id: "laddu-roast", name: "Laddu mix", station: "pan", makes: "laddu-mix", stages: [
        { slots: [slot("flour", "Besan", ["besan"]), slot("fat", "Ghee or oil", ["ghee", "cooking-oil"])], secs: 3, hint: "besan and ghee", band: [0.35, 0.6] }] },
      { id: "laddu", name: "Laddu", station: "dough", stages: [
        { slots: [slot("mix", "Laddu mix", ["laddu-mix"]), slot("sweet", "Sugar", ["brown-sugar"])], secs: 0, hint: "the mix and sugar", turn: "fold" }] },
    ] },
  // Year-end table (Dongzhi, Christmas).
  { id: "devils-curry", name: "Vegetable devil's curry", art: "dish-devils-curry", remember: "Devil's curry gets its tang from vinegar. This one is made with vegetables, never meat.",
    parts: [
      { id: "devil-grind", name: "Curry paste", station: "blender", makes: "devil-paste", stages: [
        { slots: [slot("chilli", "Chillies", ["dried-chillies", "red-chilli"]), slot("root", "Ginger", ["ginger"]), slot("nut", "Candlenuts", ["candlenuts"])], secs: 3, hint: "chillies, ginger and candlenuts" }] },
      { id: "devils-curry", name: "Devil's curry", station: "pot", stages: [
        { slots: [slot("paste", "Curry paste", ["devil-paste"]), slot("veg", "Potato or cabbage", ["potato", "cabbage"])], secs: 4, hint: "the paste and vegetables", band: [0.4, 0.68] },
        { slots: [slot("sour", "Vinegar", ["rice-vinegar"]), slot("sweet", "Sugar", ["brown-sugar"])], secs: 3, hint: "vinegar and sugar", band: [0.3, 0.55] }] },
    ] },
  // Lantern bakery (Mid-Autumn).
  { id: "baked-mooncake", name: "Baked mooncake", art: "dish-baked-mooncake", remember: "Traditional lotus paste is often made with lard. Read the label in a plant-based kitchen.",
    parts: [
      { id: "mooncake-fold", name: "Mooncakes", station: "dough", makes: "raw-mooncakes", stages: [
        { slots: [slot("flour", "Plain flour", ["plain-flour"]), slot("paste", "Lotus paste", ["lotus-paste-a", "lotus-paste-b"])], secs: 0, hint: "flour and lotus paste", turn: "fold" }] },
      { id: "baked-mooncake", name: "Baked mooncake", station: "oven", stages: [{ slots: [slot("cakes", "Mooncakes", ["raw-mooncakes"])], secs: 6, hint: "the mooncakes" }] },
    ] },
  { id: "snowskin-mooncake", name: "Snowskin mooncake", art: "dish-snowskin-mooncake", remember: "Snowskin mooncakes are never baked: they set in the fridge.",
    parts: [
      { id: "snowskin-fold", name: "Snowskin", station: "dough", makes: "raw-snowskin", stages: [
        { slots: [slot("flour", "Glutinous rice flour", ["glutinous-flour"]), slot("paste", "Lotus paste", ["lotus-paste-a", "lotus-paste-b"])], secs: 0, hint: "rice flour and lotus paste", turn: "fold" }] },
      { id: "snowskin-mooncake", name: "Snowskin mooncake", station: "fridge", stages: [{ slots: [slot("cakes", "Snowskin", ["raw-snowskin"])], secs: 6, hint: "the snowskin mooncakes" }] },
    ] },
  one("pear-soup", "Snow fungus pear soup", "dish-pear-soup", "dessert", [
    { slots: [slot("fungus", "Snow fungus", ["snow-fungus"]), slot("fruit", "Pear", ["pear"])], secs: 6, hint: "snow fungus and pear" },
    { slots: [slot("sweet", "Rock sugar", ["rock-sugar"]), slot("berry", "Goji berries", ["goji"])], secs: 2, hint: "rock sugar and goji" },
  ], "Snow fungus and pear simmer gently into a light autumn soup; goji goes in at the end so it stays plump. Snow fungus is a fungus, so a guest who skips mushrooms has another dish."),
  one("pomelo-salad", "Pomelo salad", "dish-pomelo-salad", "board", [
    { slots: [slot("fruit", "Pomelo", ["pomelo"]), slot("herb", "Mint", ["mint"])], secs: 0, hint: "pomelo and mint" },
    { slots: [slot("crunch", "Peanuts", ["peanuts"]), slot("tang", "Lime", ["lime"])], secs: 0, hint: "peanuts and lime" },
  ], "Pomelo is the Mid-Autumn fruit: fresh, sweet and sour."),
  // Dumpling day (Duanwu).
  { id: "zongzi", name: "Vegetarian zongzi", art: "dish-zongzi", remember: "Zongzi are wrapped in bamboo leaves and boiled until the glutinous rice is soft.",
    parts: [
      { id: "zongzi-fill", name: "Filling", station: "pan", makes: "zongzi-filling", stages: [
        { slots: [slot("bite", "Shiitake or chestnuts", ["shiitake", "chestnuts"]), slot("crunch", "Peanuts", ["peanuts"]), slot("sauce", "Dark soy", ["dark-soy"])], secs: 3, hint: "mushrooms, peanuts and dark soy" }] },
      { id: "zongzi-wrap", name: "Zongzi", station: "dough", makes: "raw-zongzi", stages: [
        { slots: [slot("rice", "Glutinous rice", ["glutinous-rice"]), slot("leaf", "Bamboo leaves", ["bamboo-leaves"]), slot("fill", "Filling", ["zongzi-filling"])], secs: 0, hint: "rice, leaves and the filling", turn: "fold" }] },
      { id: "zongzi", name: "Zongzi", station: "pot", stages: [{ slots: [slot("zongzi", "Zongzi", ["raw-zongzi"])], secs: 5, hint: "the zongzi" }] },
    ] },
  { id: "bean-zongzi", name: "Bean zongzi", art: "dish-bean-zongzi", remember: "Bean zongzi fill the rice with mung or red beans instead of a fried filling. Wrap them tightly and boil them long, until the rice is soft.",
    parts: [
      { id: "bean-zongzi-wrap", name: "Bean zongzi", station: "dough", makes: "raw-bean-zongzi", stages: [
        { slots: [slot("rice", "Glutinous rice", ["glutinous-rice"]), slot("beans", "Mung or red beans", ["mung-beans", "red-beans"]), slot("leaf", "Bamboo leaves", ["bamboo-leaves"])], secs: 0, hint: "rice, beans and leaves", turn: "fold" }] },
      { id: "bean-zongzi", name: "Bean zongzi", station: "pot", stages: [
        { slots: [slot("zongzi", "Bean zongzi", ["raw-bean-zongzi"])], secs: 5, hint: "the bean zongzi" }] },
    ] },
];
/** Season levels live in content/seasons.ts, by season. */
export const LEVELS: Level[] = [];
