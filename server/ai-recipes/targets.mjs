import { cookName, matchFood, tableFood } from '../nutrition/estimate.mjs';
import { importTs } from '../ts-import.mjs';

/**
 * Nutrient targets for Snap a dish (docs/AI_FOOD_LIBRARY_PLAN.md §3), measured by code from the recipe's per-serving figures; the AI
 * never states a figure. The standards are the app's own (src/config/nutrition-standards.ts), so the app's badges, the bots and
 * these targets agree. Targets apply to meals only. A target that cannot be measured (no figures, no vitamins known) is left out,
 * never guessed; "keeps the protein" applies only when the dish card carries a measured record of the usual dish, and compares
 * protein per 100 kcal, so it holds whatever number and size of servings the recipe is written for.
 */
/** Most sodium a serving may carry (plan §3). */
export const SODIUM_MAX = 600;
/** Share of the usual dish's protein the meat-free version keeps (plan §3, owner decision 7). */
export const KEEP_PROTEIN = 0.9;
/** Foods code may add when a target is missed, in order of preference; each must be in the recipe table so it is weighed. */
const BOOSTERS = {
  protein: ['edamame', 'tofu_firm', 'tempeh', 'peas', 'lentils'],
  vitamin: ['carrot', 'capsicum', 'broccoli', 'sweet_potato', 'pumpkin', 'spinach'],
  mineral: ['tofu_firm', 'sesame_seeds', 'spinach', 'chinese_spinach', 'lentils'],
};

const standards = () => importTs('src/config/nutrition-standards.ts');

/** The targets this recipe misses: 'protein', 'vitamin', 'mineral', 'sodium'. Empty for non-meals and when nothing can be measured. */
export async function missedTargets(recipe, nutrition, card) {
  const { claimCriteria, mealCategories, minerals, nutrientReference, vitamins } = await standards();
  const per = nutrition?.perServing;
  if (!per?.kcal || !(recipe.categories ?? []).some(c => mealCategories.includes(c))) return [];
  const missed = [];
  if (typeof per.protein === 'number') {
    const share = per.protein * 4 / per.kcal;
    const usual = typeof card?.protein === 'number' && card.kcal > 0 ? card.protein / card.kcal * KEEP_PROTEIN : 0;
    if (share < claimCriteria.proteinSourceEnergyShare || per.protein / per.kcal < usual) missed.push('protein');
  }
  // A vitamin or mineral "source" per 100 kcal, as the badges count it; only when the vitamins and minerals are known.
  const micro = nutrition.micro, source = key => typeof micro?.[key] === 'number'
    && micro[key] / (per.kcal / 100) >= nutrientReference[key] * claimCriteria.microSourcePer100KcalShare;
  if (micro && !vitamins.some(source)) missed.push('vitamin');
  if (micro && !minerals.some(source)) missed.push('mineral');
  if (typeof per.sodium === 'number' && per.sodium > SODIUM_MAX) missed.push('sodium');
  return missed;
}

/** Up to two foods to work in for the missed targets, none the recipe already uses; protein first. */
export function boostersFor(recipe, missed) {
  const present = new Set((recipe.ingredients ?? []).map(line => matchFood(line.name)?.key).filter(Boolean));
  const picks = [];
  for (const target of ['protein', 'mineral', 'vitamin']) {
    if (!missed.includes(target) || picks.length >= 2) continue;
    const key = BOOSTERS[target].find(k => !present.has(k) && !picks.some(p => p.key === k) && tableFood(k));
    if (key) picks.push({ key, name: cookName(key), target });
  }
  return picks;
}

/** The instruction for one fixing round: work in the picks and, when sodium is over, cut the salty seasonings. */
export function fixInstruction(picks, missed) {
  const lines = picks.map(p => `- add ${p.name} (for ${p.target === 'protein' ? 'protein' : p.target === 'mineral' ? 'minerals' : 'vitamins'}), in an amount and step that suit the dish`);
  if (missed.includes('sodium')) lines.push(`- bring sodium to at most ${SODIUM_MAX} mg a serving: use less soy sauce, salt and salty pastes, and say so in notes`);
  return 'Revise this recipe and return the complete recipe in the same JSON schema. Keep the dish, its name and everything else as it is, except:\n'
    + lines.join('\n');
}
