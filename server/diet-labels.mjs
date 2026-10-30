/**
 * Diet labels on the server (owner rule, 20 Oct 2026), twin of src/config/diet-labels.ts. Vegan = no dairy, egg or
 * honey; Vegetarian = none of the five pungent; both can apply; neither (meat-free) is Plant-Based; an unproven check
 * shows nothing. `containsFor` reads the app's exclusion tags from ingredient names (AI and member recipes).
 */
export const dietLabels = ['Vegan', 'Vegetarian', 'Plant-Based'];
export const alliums = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida'];
export const animal = ['Eggs', 'Dairy', 'Honey'];

/** Dairy words, unless a plant word comes right before (coconut milk, almond milk). Shared with server/editorial/validation.mjs;
 * the QT bot mirrors both word lists in ops/qt-team/publisher.py (PLANT_WORDS, DAIRY_WORDS). */
export const dairy = /(?<!\b(coconut|oat|soy|soya|almond|rice|cashew|peanut|plant-based|vegan|nut|cocoa|shea)\s)\b(milk|butter|cream(?!\s+of\s+tartar)|cheese|yogh?urt|ghee|paneer|whey|casein|creamer|brioche)\b/;
/** The app's exclusion names (src/config/preferences.ts), matched on ingredient names. */
/** @type {Array<[string, RegExp]>} */
const TAGS = [
  ['Garlic', /\bgarlic\b/], ['Onion', /\b(onions?|bawang)\b/], ['Shallots', /\bshallots?\b/], ['Scallions', /\b(scallions?|spring onions?|green onions?)\b/],
  ['Leeks', /\bleeks?\b/], ['Chives', /\bchives?\b/], ['Asafoetida', /\b(asafoetida|(?<!chin )hing)\b/],  // not the Oh Chin Hing sesame oil brand
  // Egg-based foods count as egg (kaya, mayonnaise, custard, meringue, aioli, brioche) unless named vegan or plant-based;
  // custard powder is cornflour, so it is not.
  ['Eggs', /(?<!\b(vegan|plant-based|eggless)\s)\b(eggs?|kaya|mayo|mayonnaise|custard(?!\s+powder)|meringues?|aioli|brioche)\b/],
  ['Dairy', dairy],
  ['Honey', /\bhoney\b/], ['Peanuts', /\bpeanuts?\b/], ['Tree nuts', /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?)\b/],
  ['Gluten', /(?<!\b(rice|tapioca|corn|chickpea|potato|glutinous rice|buckwheat|mung bean)\s)\b(wheat|flour|soy sauce|bread|pasta|seitan|barley|rye|noodles?)\b/],
  ['Mushrooms', /\b(mushrooms?|shiitake|enoki|shimeji|portobello)\b/],
  ['Root vegetables', /\b(potato(es)?|carrots?|radish(es)?|turnips?|beet(root)?s?|yams?|taro|sweet potato(es)?|ginger|lotus root|onions?|garlic|shallots?)\b/],
];
/** Exclusion tags found in ingredient names; a name with "-free" or "no garlic" style wording is not counted. */
export const containsFor = ingredients => {
  const names = ingredients.map(i => String(i.name ?? '').toLowerCase().replace(/\b(no|without)\s+[a-z]+|\b[a-z]+-free\b/g, ' ')).join(' | ');
  return TAGS.filter(([, pattern]) => pattern.test(names)).map(([tag]) => tag);
};
/** Labels from a complete contains list. */
export function labelsFor(contains) {
  const hasAnimal = animal.some(tag => contains.includes(tag)), hasPungent = alliums.some(tag => contains.includes(tag));
  return [...(hasAnimal ? [] : ['Vegan']), ...(hasPungent ? [] : ['Vegetarian']), ...(hasAnimal && hasPungent ? ['Plant-Based'] : [])];
}
