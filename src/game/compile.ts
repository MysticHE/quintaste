/**
 * Compile (docs/game/RECIPE_LEVELS_PLAN.md §6, step 1): a recipe's ingredients and steps become a level draft with code only.
 * Ingredients map to built-in game items or to the shared ingredient list; prep steps drop out; an unbuilt side step (blend,
 * chill) is taken as a ready item; an unbuilt main step (steam, bake, fry, griddle, dough) makes the recipe wait for that technique.
 * Shaping (AI, step 2) then picks stages from this draft, and the checks (step 3) decide whether the level is kept.
 */
import { MAX_STATIONS, STATIONS, type Stage, type StationKind } from "./content/dishes";
import { ITEMS, type GameItem, type ItemTag } from "./content/items";
import { readPack, type LevelPack } from "./content/pack";
import { seedOf } from "./sim/plan";
import { namedIngredientIds } from "../utils/step-ingredients";

export type RecipeInput = { id: string; name: string; categories: string[]; ingredients: { id: string; name: string }[]; steps: { instruction: string; ingredientIds: string[] }[] };
/** What an ingredient name became: a built-in item, an entry on the shared list (unreviewed when no one has checked its tags), or nothing. */
export type Resolved = { id: string; item?: GameItem; unreviewed?: boolean } | null;
/** A step that asks for low or high heat; medium (the station's own band) has no mark. */
export type HeatLevel = "low" | "high";
export type DraftStage = { station: StationKind; items: string[]; step: number; heat?: HeatLevel };
export type Compiled = { needs: string[]; shortcuts: string[]; stages: DraftStage[]; items: Map<string, GameItem>; unreviewed: Set<string> };

/** Recipe ingredient words → a built-in game item (the reviewed equivalents table). First match wins. */
const ALIASES: [RegExp, string][] = [
  // Ahead of the broad words below ("lime", "coriander", "sugar", "bean paste", "sprouts") that would otherwise claim them.
  [/rock sugar/, "rock-sugar"], [/mustard seeds?/, "mustard-seeds"], [/curry lea(f|ves)/, "curry-leaves"], [/curry powder/, "curry-powder"],
  [/laksa lea(f|ves)|daun kesum|vietnamese coriander/, "laksa-leaves"], [/lime lea(f|ves)|kaffir lime|makrut/, "lime-leaves"],
  [/goji|wolfberr/, "goji"], [/\bpears?\b/, "pear"], [/mung beans?\b(?! sprout)/, "mung-beans"], [/\bred beans?\b(?! paste)|adzuki|azuki/, "red-beans"],
  [/baking powder|baking soda|bicarbonate of soda|\bbicarb\b/, "baking-powder"], [/ground almonds?|almond (flour|meal)/, "ground-almonds"],
  [/snow fungus|white fungus|silver ear|tremella/, "snow-fungus"],
  [/dark soy/, "dark-soy"], [/soy sauce|light soy|^soy$/, "soy"], [/kecap/, "kecap"], [/sesame oil/, "sesame-oil"], [/sesame seed|^sesame$/, "sesame-seeds"],
  [/\boil\b/, "cooking-oil"], [/coconut milk|santan/, "coconut-milk"], [/bee hoon|vermicelli/, "bee-hoon"], [/rice noodle/, "rice-noodles"],
  [/yellow noodle|egg-free yellow/, "yellow-noodles-b"], [/tofu/, "tofu"], [/tempeh/, "tempeh"], [/shiitake/, "shiitake"], [/button mushroom/, "button-mushrooms"],
  [/bean sprout|sprouts/, "bean-sprouts"], [/kangkung|water spinach/, "kangkung"], [/bok choy/, "bok-choy"], [/choy sum/, "choy-sum"], [/broccoli/, "broccoli"],
  [/cabbage/, "cabbage"], [/carrot/, "carrot"], [/sweet potato/, "sweet-potato"], [/potato/, "potato"], [/\bcorn\b/, "corn"], [/tomato(?!.*ketchup)/, "tomato"],
  [/ketchup/, "ketchup-b"], [/capsicum|bell pepper/, "capsicum"], [/pineapple/, "pineapple"], [/cucumber/, "cucumber"], [/jicama|bangkuang/, "jicama"],
  [/lettuce/, "lettuce"], [/peanut/, "peanuts"], [/popiah skin|skins/, "popiah-skins"], [/sweet sauce|tim cheong/, "sweet-sauce-b"], [/chilli bean|doubanjiang|bean paste/, "paste-b"],
  [/chilli paste|sambal oelek/, "chilli-paste-b"], [/sambal/, "sambal-b"], [/stock|broth/, "stock-b"], [/fermented beancurd|fu ru/, "fu-ru"], [/black bean/, "black-beans"],
  [/cornflour|cornstarch|corn starch/, "cornflour"], [/rice vinegar|vinegar/, "rice-vinegar"], [/gula melaka|palm sugar/, "gula-melaka"], [/sugar/, "brown-sugar"],
  [/white pepper|^pepper$/, "white-pepper"], [/\bsalt\b/, "salt"], [/turmeric/, "turmeric"], [/pandan/, "pandan"], [/sago/, "sago"],
  [/soy ?milk|soya milk/, "soy-milk"], [/oat ?milk/, "oat-milk"], [/\boats?\b/, "oats"], [/coriander/, "coriander"],
  [/glutinous rice flour|sticky rice flour/, "glutinous-flour"], [/glutinous rice|sticky rice/, "glutinous-rice"], [/rice flour/, "rice-flour"],
  [/(grated|shredded|desiccated|fresh) coconut|^coconut$/, "grated-coconut"], [/\brice\b/, "rice"], [/ginger/, "ginger"], [/garlic/, "garlic"], [/shallot/, "shallots"], [/spring onion|scallion/, "spring-onion"], [/onion/, "onion"],
  [/dried chill/, "dried-chillies"], [/chilli sauce/, "chilli-sauce"], [/chilli|chili/, "red-chilli"], [/\byam\b|taro/, "yam"], [/\begg\b|eggs/, "egg"], [/honey/, "honey"],
  [/\bmilk\b/, "dairy-milk"], [/lime/, "lime"], [/radish/, "radish"],
  // Chinese names, longest first where one contains another (番茄酱 before 番茄, 胡萝卜 before 萝卜, 洋葱 before 葱, 糯米粉 before 米). A single
  // character never claims a name it only sits inside: butter, cream, ghee, lard and avocado (黄油, 奶油, 酥油, 猪油, 牛油果) are not cooking oil,
  // rice wine and millet (米酒, 小米) not rice, galangal (南姜) not ginger; they become their own ingredients with their own tags.
  [/冰糖/, "rock-sugar"], [/咖喱叶/, "curry-leaves"], [/咖喱粉/, "curry-powder"], [/叻沙叶/, "laksa-leaves"], [/青柠叶|酸柑叶/, "lime-leaves"], [/枸杞/, "goji"],
  [/绿豆(?!芽)/, "mung-beans"], [/红豆/, "red-beans"], [/雪耳|白木耳|银耳/, "snow-fungus"], [/老抽/, "dark-soy"], [/生抽|酱油/, "soy"], [/麻油|香油/, "sesame-oil"],
  [/芝麻/, "sesame-seeds"], [/椰奶|椰浆/, "coconut-milk"], [/(?<![蚝黄奶牛酥猪])油/, "cooking-oil"], [/粿条|河粉/, "rice-noodles"], [/黄面/, "yellow-noodles-b"], [/腐乳/, "fu-ru"],
  [/豆腐/, "tofu"], [/天贝/, "tempeh"], [/香菇|冬菇/, "shiitake"], [/蘑菇/, "button-mushrooms"], [/豆芽/, "bean-sprouts"], [/空心菜|蕹菜/, "kangkung"],
  [/小白菜|白菜仔/, "bok-choy"], [/菜心/, "choy-sum"], [/西兰花/, "broccoli"], [/包菜|卷心菜|白菜/, "cabbage"], [/胡萝卜|红萝卜/, "carrot"], [/番薯|红薯|地瓜/, "sweet-potato"],
  [/马铃薯|土豆/, "potato"], [/玉米淀粉|生粉|淀粉/, "cornflour"], [/玉米/, "corn"], [/番茄酱/, "ketchup-b"], [/番茄|西红柿/, "tomato"], [/青椒|彩椒|灯笼椒/, "capsicum"],
  [/菠萝|黄梨/, "pineapple"], [/黄瓜/, "cucumber"], [/沙葛/, "jicama"], [/生菜/, "lettuce"], [/花生/, "peanuts"], [/春卷皮|薄饼皮/, "popiah-skins"], [/甜酱/, "sweet-sauce-b"],
  [/豆瓣酱/, "paste-b"], [/参巴/, "sambal-b"], [/高汤|清汤/, "stock-b"], [/豆豉/, "black-beans"], [/醋/, "rice-vinegar"], [/椰糖/, "gula-melaka"], [/糖/, "brown-sugar"],
  [/白胡椒|胡椒/, "white-pepper"], [/盐/, "salt"], [/黄姜|姜黄/, "turmeric"], [/花椒/, "sichuan-pepper"], [/班兰/, "pandan"], [/西米/, "sago"], [/豆奶|豆浆/, "soy-milk"], [/燕麦奶/, "oat-milk"], [/燕麦/, "oats"],
  [/芫荽|香菜/, "coriander"], [/糯米粉/, "glutinous-flour"], [/糯米/, "glutinous-rice"], [/粘米粉/, "rice-flour"], [/米粉/, "bee-hoon"], [/椰丝/, "grated-coconut"],
  [/(?<!小)米(?!酒)|饭/, "rice"], [/(?<!南)姜/, "ginger"], [/蒜/, "garlic"], [/红葱|葱头/, "shallots"], [/洋葱/, "onion"], [/葱/, "spring-onion"], [/干辣椒/, "dried-chillies"],
  [/辣椒酱/, "chilli-sauce"], [/辣椒/, "red-chilli"], [/芋头/, "yam"], [/蛋/, "egg"], [/蜂蜜/, "honey"], [/牛奶/, "dairy-milk"], [/青柠|酸柑/, "lime"], [/萝卜/, "radish"],
];
/** Left out of play: nearly every recipe uses it and a step of plain water teaches nothing (gyoza's splash to steam is the one built-in exception). */
const SKIP = /^(water|ice|hot water|cold water|water for .*|水|清水|热水|冷水|冰块?)$/;
/** First-pass tags for a new ingredient from its name; it stays unreviewed until staff check it (§6, the diet module decides for real). */
const TAG_WORDS: [RegExp, ItemTag][] = [[/garlic|onion|shallot|leek|chive|scallion|asafoetida|hing|葱|蒜|韭|薤|阿魏/, "allium"], [/\begg|蛋/, "egg"],
  [/milk|butter|cheese|cream|ghee|yogh?urt|paneer|牛奶|奶酪|芝士|黄油|奶油|酸奶|酥油|牛油(?!果)/, "dairy"], [/honey|蜂蜜/, "honey"], [/mushroom|shiitake|enoki|oyster|菇|菌|蘑|木耳/, "mushroom"],
  [/potato|carrot|radish|beet|ginger|turmeric|yam|taro|galangal|薯|萝卜|姜|芋|莲藕/, "root"], [/chilli|chili|pepper flakes|辣/, "hot"]];
/**
 * Verbs that name a technique outright. First match wins. Baking powder is not baking; "stir to blend" and "blend in" only mix; "fried
 * tofu" and "deep-fried shallots" describe an ingredient, so frying counts only as fry or frying; tossing is the wok, except tossing
 * something with a sauce, oil or seasoning to coat it (a marinade, a dressing, potatoes before roasting). Methods the game has no station
 * for take the nearest one: a grill the griddle, a pressure cooker, slow cooker or microwave the pot, quick pickling the fridge. Chinese steps
 * read by their cooking characters (炒 stir-fry, 蒸 steam, 炖 braise…), which need no word boundaries, except inside an ingredient's name
 * (烤麸 kao fu, 炸酱 bean sauce, 煎饼 crepe).
 */
const TECH: [string, RegExp][] = [
  ["oven", /\b(oven|bake|baking(?![\s-]+(powder|soda))|air.?fr(y|ier))\b|烤(?!麸)|焗|烘/i], ["steam", /\b(steam|steamer|steaming)\b|蒸/i],
  ["deep-fry", /\b(deep.?fr(y|ying)|oil for frying)\b|炸(?!酱)/i],
  ["griddle", /\b(flip|griddle|grill|grilling|broil|broiling|char|barbecue|bbq)\b|翻面|烙|铁板/i],
  ["blend", /\b((?<!to )blend(?!\s+in\b)|blender|purée|puree|grind|pound|froth|food processor|chopper|pulse (until|to))\b|搅拌机|料理机|打成|打碎|磨成|捣/i],
  ["chill", /\b(chill|refrigerat\w*|fridge|leave to set|pickle (the|it|them)|pickling|quick.?pickle|leave to ferment)\b|冷藏|冰箱|冷冻|冰镇|腌渍/i],
  ["dough", /\b(knead|dough|roll out|pleat|crimp)\b|揉|擀|包好|包成|捏/i],
  ["rice", /\brice cooker\b|电饭锅|电饭煲/i],
  ["pot", /\b(simmer|boil|blanch|braise|stew|poach|pot|saucepan|cover and cook|pressure.?cook\w*|slow.?cook\w*|instant pot|multi.?cooker|clay ?pot|microwave\w*)\b|煮|炖|焖|煲|熬|焯|汆|卤/i],
  ["pan", /\b(stir.?fr(y|ying)|saut[ée]\w*|fry|frying|temper|wok|pan.?fr(y|ying)|sear|heat the oil|heat oil|toss(?![^.]*?\bwith\b[^.]*?\b(sauce|soy|oil|salt|flour|cornflour|marinade|seasoning|dressing|spices?|sugar)\b))\b|炒|煎(?!饼)|爆香|炝/i],
  ["board", /\b(assemble|layer|roll up|top with|spoon over|arrange|serve with|mix|combine|dress)\b|拌|摆盘|装盘|铺/i],
];
/** A temperature with its unit ("190°C", "375 °F", "200°", "180 C", "180度"): the number, then C or F when given (Celsius otherwise). One
 * pattern for the oven setup words, the oven technique and the oven heat, so they always agree. */
const DEG = (digits: string) => String.raw`(${digits})\s*(?:°\s*(?:([cf])\b)?|([cf])\b|度)`;
/** What a fold closes when it is the dough board's move: "fold the wonton", not "fold in the coriander". */
const WRAPPER = String.raw`(skins?|wrappers?|parcels?|dumplings?|wontons?|gyozas?|samosas?|puffs?|pastry|pastries|half.?moons?|triangles?)`;
/**
 * Words that name a technique only when no verb above does: "toast" seeds in the wok, "roast" vegetables, an oven temperature, "wrap"
 * or fold a parcel and seal its edges. "Toasted sesame oil" and "roasted peanuts" describe an ingredient and "smells toasty" a stage, so
 * neither counts.
 */
const LOOSE: [string, RegExp][] = [
  ["pan", /\b(toast|dry.?roast|roast)(?!ed\b)\w*\s+(the\s+)?([a-z-]+\s+){0,2}(seeds?|spices?|mustard|cumin|fennel|fenugreek|sesame|peanuts?|nuts|cashews?|coconut|curry leaves|dal|lentils)\b/i],
  ["griddle", /\btoast(?!(ed|y)\b)\w*\b/i], ["oven", new RegExp(String.raw`\broast(?!ed\b)\w*\b|\b` + DEG(String.raw`\d{3}`), "i")],
  ["dough", new RegExp(String.raw`\b(?<!(cling|plastic|food) )(wrap|wrapped|wrapping)\b|\b(pinch|seal|crimp)\w*\s+(the\s+)?(edges?|sides|seams?|shut|closed)\b` +
    String.raw`|\bfold\w*\b(?=.*\b${WRAPPER}\b)|\b${WRAPPER}\b(?=.*\bfold\w*\b)`, "i")],
];
/** A step that names no technique but cooks ("Warm oil, soften the onion", "whisk it into the pan") stays on the heat it was on, or the wok,
 * never on the cold board. */
const HEAT = /\b(heat\w*|warm\w*|cook\w*|soften\w*|fragrant|golden|thicken\w*|pan|skillet|non.?stick)\b|加热|热锅|烧热|[大中小]火|翻匀/i;
const HEATED = new Set<StationKind>(["pan", "pot", "dessert", "rice", "steamer", "oven", "griddle", "fryer"]);
/** "Until set" and "overnight" mean the fridge only in a chilled dessert, never while it cooks. */
const SET = /\b(until set|overnight)\b/i, HOT = /\b(cook|heat|stir)\w*\b/i;
/** Recipe verbs (TECH) whose station the game has. */
const BUILT: Record<string, StationKind> = { pan: "pan", pot: "pot", rice: "rice", board: "board", blend: "blender", steam: "steamer", oven: "oven", griddle: "griddle",
  "deep-fry": "fryer", dough: "dough", chill: "fridge" };
/** Side steps a level may shortcut with a ready item (RECIPE_LEVELS_PLAN §8.7); none since the fridge (Chapter 9) is built. */
const SIDE = new Set<string>();
/** Steps that only prepare: English starts with the verb. */
const PREP = /^(rinse|wash|drain|soak|peel|chop|cut|slice|dice|shred|grate|mince|prepare|pat|set aside|measure|knot|crush|marinate|rest|thaw|defrost|trim|halve|cover (the )?([a-z-]+ ){1,3}with (warm |hot |cold |boiling )?water)/i;
/** Chinese puts the prep verb after the food ("豆腐切块"), so these count anywhere, but only in a step with no heat ("切块，中火加热" cooks). */
const PREP_ZH = /切|洗|浸泡|泡(?!打)|剁|腌|削|去皮|沥干/;
/** An oven temperature, with its other scale after it ("190°C", "190°C/375°F", "200 C (400 F)"). */
const TEMP = DEG(String.raw`\d{2,3}`);
/**
 * Words that only ready the oven or a tray, or take something out ("Heat the oven to 190°C", "Line a tin with baking paper", "Remove
 * from the oven"), teach no technique, so they are read out of the step and whatever else it says stays: "Preheat the oven to 180°C and
 * bake for 25 minutes" still bakes.
 */
const SETUP = new RegExp([String.raw`\b(pre)?heat (the |your )?oven\b(\s+(to|at))?(\s*${TEMP}([\s,/]*(or\s+)?\(?\s*${TEMP}\s*\)?)*)?`,
  String.raw`\bline (a |the )?[a-z -]*?\b(tray|tin|sheet|dish|pan)\b( with [a-z -]*?\b(paper|foil|parchment)\b)?`,
  String.raw`\b(remove|take|lift)\b[^.;,]*?\b(from|out of) the oven\b`].join("|"), "gi");
/** Full stops of measures and abbreviations ("1 tbsp. oil", "e.g.") are not sentence ends, so rules that read one sentence see all of it. */
const plain = (text: string) => text.replace(/\b(tbsp|tbs|tsp|oz|lb|lbs|approx|e\.g|i\.e|etc)\./gi, "$1");
/**
 * A step's technique, or "prep" when the step drops out: a prep step stays only when it also names a cooking verb (the fridge does not
 * count; "toast" is also a noun, so cutting the toast stays prep).
 */
function techOf(step: string, dessert: boolean): string | null {
  const text = plain(step).replace(SETUP, " ").replace(/^[\s.,;:]*(and\s+)?/i, "");
  const named = TECH.find(([, re]) => re.test(text))?.[0], loose = named ? undefined : LOOSE.find(([, re]) => re.test(text))?.[0];
  const prep = PREP.test(text) || (PREP_ZH.test(text) && !HEAT.test(text));
  if (prep && (!named || named === "chill") && (!loose || loose === "griddle")) return "prep";
  return named ?? loose ?? (dessert && SET.test(text) && !HOT.test(text) ? "chill" : null);
}

/** Words asking for high or low heat; "medium-high" is high and "medium-low" low. */
// "Char" counts only as the verb (char, charred, charring, chargrill), never chard or charcoal; "gently" only when it is about the heat
// (simmer gently, gentle heat), not handling (stir gently, fold gently).
const HIGH = /\b(high heat|high flame|medium.?high|very hot|smoking hot|sear(s|ed|ing)?|blister(s|ed|ing)?|char(s|red|ring)?|chargrill\w*|wok hei|rolling boil|full boil)\b|大火|猛火|旺火|爆炒/gi;
const LOW = /\b(low heat|low flame|medium.?low|on low|lowest|very low|gentle (heat|simmer|boil|flame)|(simmer|cook|heat|warm|bubble)\w*(\s+[a-z-]+){0,3}?\s+(very\s+)?gently|gently (simmer|cook|heat|warm|bubble)\w*|barely simmer\w*|without boiling|(do not|don't) (let it )?boil)\b|小火|文火|慢火|微火/gi;
const DEGREES = new RegExp(DEG(String.raw`\d{2,3}`), "i");
const lastAt = (re: RegExp, text: string) => Math.max(-1, ...[...text.matchAll(re)].map(m => m.index));
/**
 * How hot a step asks a heat station to be. The last mention wins ("bring to a rolling boil, then simmer gently" ends low); an oven
 * reads its temperature (170°C or less low, 210°C or more high), as recipes rarely say "low oven", taking the recipe's oven
 * temperature when the step gives none ("Heat the oven to 220°C" usually comes steps before "Bake for 20 minutes").
 */
function heatOf(text: string, station: StationKind, ovenTemp: string): HeatLevel | undefined {
  if (!STATIONS[station].heat) return undefined;
  const deg = station === "oven" ? DEGREES.exec(text) ?? DEGREES.exec(ovenTemp) : null;
  if (deg) {
    const c = (deg[2] ?? deg[3])?.toLowerCase() === "f" ? (Number(deg[1]) - 32) * 5 / 9 : Number(deg[1]);
    return c <= 170 ? "low" : c >= 210 ? "high" : undefined;
  }
  const high = lastAt(HIGH, text), low = lastAt(LOW, text);
  return high < 0 && low < 0 ? undefined : high > low ? "high" : "low";
}

export const ingredientKey = (name: string) => name.toLowerCase().replace(/\(.*?\)|（.*?）/g, "").split(/[,，]/)[0].trim();
/** An id-safe name; a name with no Latin letters (豆腐, 香菇) gets one from its hash, so two Chinese ingredients never share an id. */
export const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30)
  || (/[^\x00-\x7f]/.test(s) ? "u" + seedOf(s).toString(36) : "item");
/** A built-in item for an ingredient name, null when it should be left out, or undefined when the shared list must decide. */
export function builtinFor(name: string): string | null | undefined {
  const n = ingredientKey(name);
  if (SKIP.test(n)) return null;
  const hit = ALIASES.find(([re]) => re.test(n))?.[1];
  return hit && ITEMS[hit] ? hit : undefined;
}
/** A new shared-list entry for an ingredient the game has no item for: keyword tags, a Sketch card until a picture is approved. */
export function newItem(name: string): GameItem {
  const id = "x-" + slug(ingredientKey(name)), tags = TAG_WORDS.filter(([re]) => re.test(ingredientKey(name))).map(([, t]) => t);
  return { id, name: name.replace(/\(.*?\)/g, "").split(",")[0].trim().slice(0, 60) || id, art: "card-" + id, tray: "fresh", ...(tags.length ? { tags } : {}) };
}

/** Step 1: the draft. `resolve` maps an ingredient name to an item (built-in or shared list). */
export function compileRecipe(r: RecipeInput, resolve: (name: string) => Resolved): Compiled {
  const dessert = r.categories.some(c => /dessert|drink/i.test(c)), byId = new Map(r.ingredients.map(i => [i.id, i]));
  const items = new Map<string, GameItem>(), unreviewed = new Set<string>(), needs: string[] = [], shortcuts: string[] = [], stages: DraftStage[] = [];
  const ovenTemp = r.steps.map(s => s.instruction).find(t => /oven|烤箱/i.test(t) && DEGREES.test(t)) ?? "";
  const itemFor = (name: string) => {
    const found = resolve(name);
    if (!found) return null;
    if (found.item) items.set(found.id, found.item);
    if (found.unreviewed) unreviewed.add(found.id);
    return found.id;
  };
  r.steps.forEach((step, n) => {
    // Written recipes (AI ones most) often link an ingredient only where it is first prepared, so a step that lists none takes the ones
    // its text names: "Pour the egg mixture into the pan" would otherwise drop out of the level.
    const linked = step.ingredientIds.length ? step.ingredientIds : namedIngredientIds(r.ingredients, step.instruction);
    for (const part of partsOf(step.instruction, linked, r.ingredients, dessert)) {
      const found = techOf(part.text, dessert);
      if (found === "prep") continue;
      const tech = found === "pot" && dessert ? "dessert" : found;
      const ids = [...new Set(part.ids.map(id => byId.get(id)?.name).filter((x): x is string => !!x).map(itemFor).filter((x): x is string => !!x))];
      if (!ids.length) continue;
      if (tech && SIDE.has(tech)) { shortcuts.push(tech); continue; }
      if (tech && !BUILT[tech] && tech !== "dessert") { needs.push(tech); continue; }
      const hot = !tech && HEAT.test(part.text) ? [...stages].reverse().find(s => HEATED.has(s.station))?.station ?? (dessert ? "dessert" : "pan") : null;
      const station: StationKind = tech === "dessert" ? "dessert" : tech ? BUILT[tech] : hot ?? stages.at(-1)?.station ?? (dessert ? "dessert" : "board");
      const heat = heatOf(part.text, station, ovenTemp), last = stages.at(-1);
      if (last && last.station === station && last.heat === heat && new Set([...last.items, ...ids]).size <= 3) last.items = [...new Set([...last.items, ...ids])];
      else stages.push({ station, items: ids, step: n, ...(heat ? { heat } : {}) });
    }
  });
  return { needs: [...new Set(needs)], shortcuts: [...new Set(shortcuts)], stages, items, unreviewed };
}

/** Sentence ends, "then" and 然后 / ，再: where one step moves on to its next action. Decimals ("1.5 cups") need the space after a stop. */
const PARTS = /(?<=[.;!?])\s+|(?<=[。；])|,?\s+then\s+|，?然后|，再/i;
/** A technique's station, the dessert pot standing in for the pot in a dessert. */
const stationFor = (tech: string, dessert: boolean) => tech === "pot" && dessert ? "dessert" : BUILT[tech] ?? tech;
/**
 * A step read part by part when it does more than one technique ("Fry the tofu until golden, then add the stock and simmer"): each part
 * that names a technique and an ingredient becomes its own stage on its own station, with the ingredients it names; ingredients no such
 * part names go with the first. A step with one technique (however many sentences) stays whole, as before.
 */
function partsOf(text: string, linked: string[], ingredients: RecipeInput["ingredients"], dessert: boolean): { text: string; ids: string[] }[] {
  const whole = [{ text, ids: linked }], pieces = plain(text).split(PARTS).map(p => p.trim()).filter(Boolean);
  if (pieces.length < 2) return whole;
  const read = pieces.map(p => ({ text: p, tech: techOf(p, dessert), ids: namedIngredientIds(ingredients, p).filter(id => linked.includes(id)) }));
  const cooking = read.filter(p => p.tech && p.tech !== "prep" && p.ids.length);
  if (new Set(cooking.map(p => stationFor(p.tech!, dessert))).size < 2) return whole;
  const said = new Set(cooking.flatMap(p => p.ids)), rest = linked.filter(id => !said.has(id));
  return cooking.map((p, k) => ({ text: p.text, ids: k === 0 ? [...p.ids, ...rest] : p.ids }));
}

/** The level's shape: per station, two to four stages of one to three items, with a short hint each and the lesson. */
export type Shape = { remember: string; parts: { station: StationKind; stages: { items: string[]; hint: string; optional?: string[] }[] }[] };
const nameOf = (c: Compiled, id: string) => ITEMS[id]?.name ?? c.items.get(id)?.name ?? id;

/** A shape from code alone: adjacent stages merge until there are four per station, extra items drop. For trials and tests, never a silent stand-in for the AI. */
export function codeShape(c: Compiled): Shape {
  const parts = [...new Set(c.stages.map(s => s.station))].slice(0, MAX_STATIONS).map(station => {
    let list = c.stages.filter(s => s.station === station).map(s => [...s.items]);
    while (list.length > 4) { const a = list.shift()!, b = list.shift()!; list = [[...new Set([...a, ...b])], ...list]; }
    return { station, stages: list.map(items => ({ items: items.slice(0, 3), hint: items.slice(0, 3).map(id => nameOf(c, id).toLowerCase()).join(", ") })) };
  });
  return { remember: "Cook it in the order the recipe gives.", parts };
}

/** Checks a shape against its draft: only the draft's items, built stations, 1–4 stages of 1–3 items, short text. Returns the problem or null. */
export function shapeProblem(c: Compiled, s: Shape): string | null {
  const allowed = new Set(c.stages.flatMap(x => x.items)), text = (t: unknown, max: number) => typeof t === "string" && t.trim().length > 0 && t.length <= max;
  if (!s || !Array.isArray(s.parts) || !s.parts.length || s.parts.length > MAX_STATIONS) return "give one to " + MAX_STATIONS + " parts";
  if (!text(s.remember, 240) || /https?:|www\.|tiktok|instagram|youtube|facebook/i.test(s.remember)) return "remember must be one short sentence with no links or platform names";
  for (const p of s.parts) {
    if (typeof p.station !== "string" || !Object.hasOwn(STATIONS, p.station)) return "station " + String(p.station) + " is not one the game has";
    if (!Array.isArray(p.stages) || p.stages.length < 1 || p.stages.length > 4) return "each part needs one to four stages";
    for (const st of p.stages) {
      if (!Array.isArray(st.items) || st.items.length < 1 || st.items.length > 3 || st.items.some(i => !allowed.has(i))) return "each stage needs one to three of the given ingredient ids, and no others";
      if (!text(st.hint, 80)) return "each stage needs a hint under 80 characters";
      // Which ingredients are optional decides which guests can eat the dish, so it never comes from the AI (QT-052).
      if (st.optional?.length) return "nothing may be marked optional";
    }
  }
  const used = new Set(s.parts.flatMap(p => p.stages.flatMap(st => st.items)));
  if (used.size < Math.min(2, allowed.size)) return "use at least two of the given ingredients";
  return null;
}

/** Seconds per stage by station: rice's first stage is long, boards and dough assemble at once, slow appliances take a while. */
const stageSecs = (station: StationKind, k: number) => station === "rice" && k === 0 ? 10 : station === "board" || station === "dough" ? 0
  : station === "fridge" ? 8 : station === "oven" ? 6 : station === "steamer" ? 5 : 3;
const TURNS: Partial<Record<StationKind, "flip" | "fold">> = { griddle: "flip", dough: "fold" };

/** A blended paste is named for what goes into it ("Chilli paste", "Coriander paste"), never after the whole recipe. */
function pasteName(c: Compiled, s: Shape): string {
  const names = s.parts.filter(p => p.station === "blender").flatMap(p => p.stages.flatMap(st => st.items)).map(it => nameOf(c, it));
  if (names.some(n => /chil+i|chili|sambal/i.test(n))) return "Chilli paste";
  return names.length === 1 ? names[0].slice(0, 40) + " paste" : "Spice paste";
}

/** Target bands for a stage that asks for low or high heat (the station's own band is medium), each clear of the station's scorch line. */
const HEAT_BANDS: Partial<Record<StationKind, Record<HeatLevel, [number, number]>>> = {
  pan: { low: [0.25, 0.48], high: [0.55, 0.78] }, pot: { low: [0.25, 0.48], high: [0.42, 0.68] }, dessert: { low: [0.14, 0.32], high: [0.3, 0.5] },
  griddle: { low: [0.26, 0.46], high: [0.52, 0.76] }, fryer: { low: [0.45, 0.66], high: [0.64, 0.84] }, oven: { low: [0.42, 0.62], high: [0.66, 0.88] },
};
/** What splits or curdles in a pot that is too hot (coconut milk in a laksa), so its stage cooks on low heat. */
const SPLITS = /coconut milk|coconut cream|santan|yogh?urt|\bcream\b|椰奶|椰浆/i;
/**
 * A shaped stage's heat, from code, never from the AI: the band the draft steps behind its items asked for when they agree, low for a
 * stage holding something that splits (unless the recipe says high), and a burn that comes sooner on high. The hint says it. Recipe levels
 * keep heat to the band: they never split a stage (the built-in curries do), which would make a player wait for the pot to cool.
 */
function stageHeat(c: Compiled, station: StationKind, items: string[]): { prefix: string; extra: Pick<Stage, "band" | "scorchSecs"> } {
  const bands = HEAT_BANDS[station], cfg = STATIONS[station];
  if (!bands) return { prefix: "", extra: {} };
  // The draft steps behind this stage are read by its own items: oil or salt in several steps would borrow other steps' heat.
  const here = c.stages.filter(d => d.station === station), own = items.filter(i => here.filter(d => d.items.includes(i)).length === 1);
  const key = own.length ? own : items;
  const asked = new Set(here.filter(d => d.items.some(i => key.includes(i))).map(d => d.heat ?? "medium"));
  const said = asked.size === 1 && !asked.has("medium") ? [...asked][0] as HeatLevel : undefined;
  const heat = said ?? (items.some(i => SPLITS.test(nameOf(c, i))) ? "low" : undefined);
  if (!heat) return { prefix: "", extra: {} };
  return { prefix: heat + " heat: ", extra: { band: bands[heat], ...(heat === "high" && cfg.scorch < 1 ? { scorchSecs: Math.round(cfg.scorchSecs * 6) / 10 } : {}) } };
}

/** Step 3's input: the level pack from a recipe, its draft and a checked shape. Throws PackError when the pack is not valid. */
export function buildPack(r: RecipeInput, c: Compiled, s: Shape): LevelPack {
  const id = "t-" + slug(r.id), used = new Set(s.parts.flatMap(p => p.stages.flatMap(st => st.items)));
  // Transfer (§8.7): a blender part followed by another station makes a paste that part's first step takes; a blender part alone is the dish.
  const paste = s.parts.some((p, n) => p.station === "blender" && n < s.parts.length - 1) ? { id: (id + "-paste").slice(0, 40), name: pasteName(c, s) } : null;
  const pasteAt = paste ? s.parts.findIndex(p => p.station === "blender") : -1;
  return readPack({
    format: 1, id: "recipe-" + slug(r.id),
    techniques: [...new Set(s.parts.map(p => p.station))],
    items: [...[...c.items.values()].filter(i => used.has(i.id)), ...(paste ? [{ id: paste.id, name: paste.name, art: "card-" + paste.id, tray: "pantry" }] : [])],
    ...(paste ? { forms: { [paste.id]: { form: "pour", tone: "red" } } } : {}),
    ...(c.unreviewed.size ? { unreviewed: [...c.unreviewed].filter(i => used.has(i)) } : {}),
    dishes: [{ id, name: r.name.slice(0, 60), art: "dish-" + slug(r.id), recipeId: r.id, remember: s.remember.trim(),
      parts: s.parts.map((p, n) => ({ id: id + "-" + n, name: r.name.slice(0, 60), station: p.station, ...(n === pasteAt ? { makes: paste!.id } : {}),
        stages: [...(paste && n === pasteAt + 1 ? [{ slots: [{ key: "paste", label: "Blended paste", accepts: [paste.id] }], secs: 2, hint: "the blended paste" }] : []),
          ...p.stages.map((st, k) => {
            const heat = stageHeat(c, p.station, st.items);
            return { slots: st.items.map((it, j) => ({ key: "s" + j, label: nameOf(c, it).slice(0, 40), accepts: [it] })),
              secs: stageSecs(p.station, k), hint: heat.prefix + st.hint.trim().slice(0, 80 - heat.prefix.length), ...heat.extra,
              // The technique's move comes with the station, never from the AI: the griddle's last stage is flipped, the dough's folded.
              ...(k === p.stages.length - 1 && TURNS[p.station] ? { turn: TURNS[p.station] } : {}) };
          })] })) }],
  });
}
