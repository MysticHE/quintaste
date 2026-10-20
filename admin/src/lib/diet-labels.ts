/**
 * The app's diet labels for staff cards (src/config/diet-labels.ts; the console cannot import app code): Vegan = no
 * egg, dairy or honey; Vegetarian = none of the five pungent; Plant-Based when both are shown present. Unproven shows nothing.
 */
const ANIMAL = ['Eggs', 'Dairy', 'Honey'], PUNGENT = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida'];

function labelsFor(animal: boolean | null, pungent: boolean | null) {
  return [animal === false && 'Vegan', pungent === false && 'Vegetarian', animal === true && pungent === true && 'Plant-Based'].filter(Boolean).join(' + ');
}
/** A recipe's labels from its complete ingredient tags, or '' when it has none yet. */
export function recipeLabels(contains?: string[]) {
  if (!contains) return '';
  return labelsFor(contains.some(tag => ANIMAL.includes(tag)), contains.some(tag => PUNGENT.includes(tag)));
}
/** A Market item's labels as the server stored them on save ('vegan', 'five-pungent-free'), with its practices. */
export function itemLabels(diets: string[] | null, contains: string[], mayContain: string[]) {
  const stored = diets ?? [], tags = [...contains, ...mayContain];
  const labels = labelsFor(stored.includes('vegan') ? false : tags.some(tag => ANIMAL.includes(tag)) || null,
    stored.includes('five-pungent-free') ? false : tags.some(tag => PUNGENT.includes(tag)) || null);
  const practices = stored.flatMap(diet => diet === 'jain' ? ['Jain'] : diet === 'no-egg' ? ['No egg'] : []);
  return [labels, ...practices].filter(Boolean).join(' · ');
}
