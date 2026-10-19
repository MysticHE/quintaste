/**
 * Rush Hour ingredients. Every item is vegetarian; the traps are vegetarian items that break a particular guest's rule,
 * plus bought-in products whose game label hides an allium, egg or animal ingredient (GAME_PLAN §5).
 * Labels are fictional game products, never real brands.
 */
export type ItemTag = "allium" | "egg" | "dairy" | "honey" | "root" | "mushroom" | "hot" | "animal";
export type GameLabel = { title: string; ingredients: string[]; contains: string; flagged?: string };
export type GameItem = {
  id: string; name: string; art: string; tray: "fresh" | "pantry";
  tags?: ItemTag[]; label?: GameLabel; variant?: "A" | "B"; note?: string;
};

const fresh = (id: string, name: string, art = id, tags?: ItemTag[], note?: string): GameItem => ({ id, name, art, tray: "fresh", tags, note });
const pantry = (id: string, name: string, art = id, tags?: ItemTag[], label?: GameLabel, variant?: "A" | "B"): GameItem =>
  ({ id, name, art, tray: "pantry", tags, label, variant });

export const ITEMS: Record<string, GameItem> = Object.fromEntries([
  // Aromatics and alliums
  fresh("ginger", "Ginger", "ginger", ["root"], "A common swap for garlic and shallots, but it is a root, which Jain guests avoid."),
  fresh("garlic", "Garlic", "garlic", ["allium"], "One of the five pungent."),
  fresh("shallots", "Shallots", "shallots", ["allium"], "One of the five pungent."),
  fresh("onion", "Onion", "onion", ["allium", "root"], "One of the five pungent."),
  fresh("spring-onion", "Spring onion", "spring-onion", ["allium"], "Scallions are one of the five pungent."),
  fresh("chives", "Garlic chives", "chives", ["allium"], "One of the five pungent."),
  fresh("leek", "Leek", "leek", ["allium"], "One of the five pungent."),
  fresh("sichuan-pepper", "Sichuan pepper", "sichuan-pepper", [], "Numbing and fragrant; no allium and no root."),
  fresh("red-chilli", "Red chilli", "red-chilli", ["hot"]),
  fresh("dried-chillies", "Dried chillies", "dried-chillies", ["hot"]),
  // Vegetables
  fresh("kangkung", "Kangkung", "kangkung"),
  fresh("kangkung-stems", "Kangkung stems", "kangkung-stems", [], "Stems take longer than leaves, so they go in first."),
  fresh("kangkung-leaves", "Kangkung leaves", "kangkung-leaves", [], "Leaves wilt in seconds."),
  fresh("carrot", "Carrot", "carrot", ["root"]),
  fresh("cabbage", "Cabbage", "cabbage"),
  fresh("choy-sum", "Choy sum", "choysum"),
  fresh("bok-choy", "Bok choy", "bok-choy"),
  fresh("broccoli", "Broccoli", "broccoli"),
  fresh("bean-sprouts", "Bean sprouts", "beansprouts"),
  fresh("capsicum", "Capsicum", "capsicum"),
  fresh("pineapple", "Pineapple", "pineapple"),
  fresh("cucumber", "Cucumber", "cucumber"),
  fresh("tomato", "Tomato", "tomato"),
  fresh("potato", "Potato", "potato", ["root"]),
  fresh("corn", "Corn", "corn"),
  fresh("sweet-potato", "Sweet potato", "sweet-potato", ["root"]),
  fresh("yam", "Yam (taro)", "yam", ["root"]),
  fresh("jicama", "Jicama", "jicama", ["root"]),
  fresh("radish", "Radish", "radish", ["root"]),
  fresh("lettuce", "Lettuce", "lettuce"),
  fresh("lime", "Lime", "lime"),
  fresh("coriander", "Coriander", "coriander"),
  fresh("pandan", "Pandan", "pandan"),
  fresh("oats", "Rolled oats", "oats"),
  pantry("salt", "Salt", "salt"),
  pantry("white-pepper", "White pepper", "white-pepper"),
  fresh("shiitake", "Shiitake", "shiitake", ["mushroom"]),
  fresh("button-mushrooms", "Button mushrooms", "button-mushrooms", ["mushroom"]),
  // Proteins and starches
  fresh("tofu", "Tofu", "tofu"),
  fresh("tempeh", "Tempeh", "tempeh"),
  fresh("egg", "Egg", "egg", ["egg"], "Vegetarian, but not vegan."),
  fresh("bee-hoon", "Bee hoon", "beehoon"),
  fresh("rice-noodles", "Rice noodles", "rice-noodles"),
  pantry("yellow-noodles-a", "Yellow noodles", "yellow-noodles", ["egg"], { title: "Fresh yellow noodles", ingredients: ["Wheat flour", "Water", "Egg", "Salt", "Alkaline salts"], contains: "Wheat, egg", flagged: "Egg" }, "A"),
  pantry("yellow-noodles-b", "Yellow noodles", "yellow-noodles", [], { title: "Egg-free yellow noodles", ingredients: ["Wheat flour", "Water", "Salt", "Alkaline salts"], contains: "Wheat" }, "B"),
  fresh("rice", "Rice", "rice"),
  fresh("sago", "Sago pearls", "sago"),
  fresh("cornflour", "Cornflour", "cornflour"),
  fresh("black-beans", "Black beans", "black-beans", [], "Fermented black beans add savoury depth without alliums."),
  fresh("peanuts", "Peanuts", "peanuts"),
  fresh("sesame-seeds", "Sesame seeds", "sesame-seeds"),
  fresh("popiah-skins", "Popiah skins", "popiah-skins"),
  // Sauces and pantry
  pantry("soy", "Light soy", "soy"),
  pantry("dark-soy", "Dark soy", "dark-soy"),
  pantry("sesame-oil", "Sesame oil", "sesame"),
  pantry("cooking-oil", "Cooking oil", "cooking-oil"),
  pantry("kecap", "Kecap manis", "kecap"),
  pantry("rice-vinegar", "Rice vinegar", "rice-vinegar"),
  pantry("fu-ru", "Fermented beancurd", "fu-ru", [], { title: "Fermented beancurd", ingredients: ["Soybeans", "Water", "Salt", "Rice wine", "Chilli"], contains: "Soy" }),
  pantry("coconut-milk", "Coconut milk", "coconut-milk"),
  pantry("turmeric", "Turmeric", "turmeric"),
  pantry("gula-melaka", "Gula melaka", "gula-melaka"),
  pantry("brown-sugar", "Brown sugar", "brown-sugar"),
  pantry("honey", "Honey", "honey", ["honey"]),
  pantry("dairy-milk", "Milk", "dairy-milk", ["dairy"]),
  pantry("paste-a", "Bean paste", "pasteA", ["allium"], { title: "Chilli bean paste", ingredients: ["Broad beans", "Chilli", "Salt", "Wheat flour", "Garlic", "Soybean oil"], contains: "Wheat, soy", flagged: "Garlic" }, "A"),
  pantry("paste-b", "Bean paste", "pasteB", [], { title: "Chilli bean paste, no garlic", ingredients: ["Broad beans", "Chilli", "Salt", "Wheat flour", "Soybean oil"], contains: "Wheat, soy" }, "B"),
  pantry("ketchup-a", "Ketchup", "ketchup", ["allium"], { title: "Tomato ketchup", ingredients: ["Tomatoes", "Sugar", "Vinegar", "Salt", "Onion powder", "Garlic powder"], contains: "—", flagged: "Onion powder, Garlic powder" }, "A"),
  pantry("ketchup-b", "Ketchup", "ketchup", [], { title: "Tomato ketchup, no onion or garlic", ingredients: ["Tomatoes", "Sugar", "Vinegar", "Salt", "Paprika"], contains: "—" }, "B"),
  pantry("chilli-paste-a", "Chilli paste", "chilli-paste", ["allium"], { title: "Chilli paste", ingredients: ["Chilli", "Shallots", "Garlic", "Oil", "Sugar", "Salt"], contains: "—", flagged: "Shallots, Garlic" }, "A"),
  pantry("chilli-paste-b", "Chilli paste", "chilli-paste", [], { title: "Chilli paste, allium-free", ingredients: ["Chilli", "Oil", "Sugar", "Salt", "Tamarind"], contains: "—" }, "B"),
  pantry("stock-a", "Vegetable stock", "veg-stock", ["allium"], { title: "Vegetable stock", ingredients: ["Water", "Carrot", "Onion", "Celery", "Leek", "Salt"], contains: "Celery", flagged: "Onion, Leek" }, "A"),
  pantry("stock-b", "Vegetable stock", "veg-stock", [], { title: "Vegetable stock, allium-free", ingredients: ["Water", "Corn", "Cabbage", "Tomato", "Salt"], contains: "—" }, "B"),
  pantry("sambal-a", "Sambal", "sambal", ["animal"], { title: "Sambal chilli", ingredients: ["Chilli", "Shallots", "Belacan (shrimp paste)", "Sugar", "Tamarind", "Oil"], contains: "Crustacean", flagged: "Belacan (shrimp paste)" }, "A"),
  pantry("sambal-b", "Sambal", "sambal", [], { title: "Vegetarian sambal, allium-free", ingredients: ["Chilli", "Tamarind", "Gula melaka", "Oil", "Salt"], contains: "—" }, "B"),
  pantry("sweet-sauce-a", "Sweet sauce", "sweet-sauce", ["allium"], { title: "Sweet bean sauce", ingredients: ["Soybeans", "Sugar", "Wheat flour", "Garlic", "Salt"], contains: "Soy, wheat", flagged: "Garlic" }, "A"),
  pantry("sweet-sauce-b", "Sweet sauce", "sweet-sauce", [], { title: "Sweet bean sauce, no garlic", ingredients: ["Soybeans", "Sugar", "Wheat flour", "Salt"], contains: "Soy, wheat" }, "B"),
  pantry("chilli-sauce", "Chilli sauce", "chilli-sauce", ["hot"]),
].map(item => [item.id, item]));

export const itemName = (id: string) => { const it = ITEMS[id]; return it ? it.name + (it.variant ? " " + it.variant : "") : id; };

/** Colour family of what a poured or sprinkled item leaves in the pan (the playfield maps each to a CSS token). */
export type ItemTone = "soy" | "oil" | "cream" | "red" | "white" | "gold" | "dark";
/**
 * Items that go in from a container: poured (sauces, oils, milks, pastes) or sprinkled (powders, seeds, grains from a bowl).
 * The container never stays in the pan; the pan keeps a pool or speckles in the item's tone. Display only, not a rule.
 */
export type ItemForm = { form: "pour" | "sprinkle"; tone: ItemTone };
const forms = (form: ItemForm["form"], tone: ItemTone, ids: string[]) => ids.map(id => [id, { form, tone }] as const);
export const ITEM_FORM: Record<string, ItemForm> = Object.fromEntries([
  ...forms("pour", "soy", ["soy", "dark-soy", "kecap", "sweet-sauce-a", "sweet-sauce-b"]),
  ...forms("pour", "oil", ["sesame-oil", "cooking-oil", "rice-vinegar", "stock-a", "stock-b", "honey", "gula-melaka"]),
  ...forms("pour", "cream", ["coconut-milk", "dairy-milk"]),
  ...forms("pour", "red", ["paste-a", "paste-b", "ketchup-a", "ketchup-b", "chilli-paste-a", "chilli-paste-b", "sambal-a", "sambal-b", "chilli-sauce", "fu-ru"]),
  ...forms("sprinkle", "white", ["salt", "cornflour", "sesame-seeds", "rice", "sago", "oats"]),
  ...forms("sprinkle", "gold", ["turmeric", "brown-sugar", "peanuts"]),
  ...forms("sprinkle", "dark", ["white-pepper", "black-beans"]),
]);

/** Look-alike pairs (A and B) where one label hides a problem, e.g. ["paste-a", "paste-b"]. */
export const PAIRS: [string, string][] = Object.values(ITEMS).filter(i => i.variant === "A").map(a => [a.id, a.id.replace(/-a$/, "-b")] as [string, string]).filter(([, b]) => !!ITEMS[b]);
/** A run's shuffle: which look-alike hides the problem is decided per run, so no jar is "always the bad one". */
export type Flip = Record<string, string>;
/**
 * What an item really is in this run: its tags and label. The card's name, letter and picture stay fixed, so a swapped
 * pair looks the same and only reading the label tells them apart.
 */
export const factsOf = (id: string, flip?: Flip) => ITEMS[flip?.[id] ?? id] ?? ITEMS[id];
