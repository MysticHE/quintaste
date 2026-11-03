/**
 * Egg and dairy words in ingredient names, shared by the app's diet labels on the server (server/diet-labels.mjs) and the game's
 * ingredient tags (src/game/compile.ts). Plain JavaScript with no imports, so Node loads it as it is. The QT bot mirrors the words in
 * ops/qt-team/publisher.py (PLANT_WORDS, DAIRY_WORDS, DAIRY_ZH).
 */

/** Words that make the dairy word after them a plant one (coconut milk, soy-milk, vegan cheese, dairy-free cheese read as nondairy). */
export const PLANT_WORDS = 'coconut|oat|soy|soya|almond|rice|cashew|peanut|plant-based|vegan|nondairy|nut|cocoa|shea';

/**
 * Dairy, unless a plant word comes right before it. Buttermilk and plurals count; cream of tartar, Chinese plant milks and plant cream
 * (植物奶油) do not.
 */
export const dairy = new RegExp(String.raw`(?<!\b(${PLANT_WORDS})[\s-])\b(milks?|buttermilk|butters?|creams?(?!\s+of\s+tartar)|cheeses?|yogh?urts?|ghee|paneer|whey|casein|creamers?|brioche)\b`
  + '|牛奶|鲜奶|奶酪|乳酪|芝士|黄油|(?<!椰)(?<!植物)奶油|(?<!椰子)酸奶|酥油|牛油(?!果)|炼乳|淡奶|(?<![豆椰])奶粉|奶精');

/** Egg and egg-based foods (kaya, mayonnaise, custard, meringue, aioli, brioche) unless named vegan or plant-based; custard powder is
 * cornflour, and 蛋白质 / 蛋白粉 are protein. */
export const egg = /(?<!\b(vegan|plant-based|eggless)[\s-])\b(eggs?|kaya|mayo|mayonnaise|custard(?!\s+powder)|meringues?|aioli|brioche)\b|蛋(?!白质|白粉)/;

/**
 * An ingredient name ready for the diet words: lower case, "dairy-free" and "non-dairy" read as "nondairy" (a plant word for dairy only,
 * so "dairy-free egg noodles" still holds egg), and "no garlic", "without egg" or "egg-free" dropped, so a name only counts for what it
 * holds.
 * @param {string} name
 * @returns {string}
 */
export const dietText = name => name.toLowerCase().replace(/\b(dairy-free|non-dairy)\b/g, 'nondairy')
  .replace(/\b(no|without)\s+[a-z]+|\b[a-z]+-free\b/g, ' ');

const PUNGENT = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida'];
/**
 * Prepared ingredients whose labels commonly hide exclusions (a label-checked line clears the rule), shared by the app's recipe labels
 * (src/utils/recipe-dietary.ts) and ingredient swaps (server/swaps/plan.mjs), so a swap's note and the labels it leaves agree.
 * @type {{ pattern: RegExp, hides: string[] }[]}
 */
export const COMPOUND_RULES = [
  { pattern: /\b(stock|bouillon|broth|gravy|soup base|seasoning|curry (powder|paste|sauce)|laksa paste|rempah|sambal|chill?i (bean )?paste|chill?i (oil|crisp)|doubanjiang|ketchup|sweet sauce|tim cheong|hoisin|vegetarian (oyster|mushroom) sauce|mushroom sauce|pasta sauce|marinara|tomato sauce|salsa|spice (mix|blend))\b/i, hides: [...PUNGENT, 'Gluten'] },
  { pattern: /\bpesto\b/i, hides: [...PUNGENT, 'Dairy'] },
  { pattern: /\b(puff )?pastry\b/i, hides: ['Eggs', 'Dairy'] },
  { pattern: /\b(curry paste|laksa paste|rempah|chilli paste)\b/i, hides: ['Root vegetables'] },
  { pattern: /\b(yellow noodles|egg-free noodles|vegan butter|plant-based butter|margarine|mock meat|plant-based mince)\b/i, hides: ['Eggs', 'Dairy', 'Gluten'] },
  { pattern: /\b(fermented beancurd|fu ru)\b/i, hides: ['Gluten'] },
];
