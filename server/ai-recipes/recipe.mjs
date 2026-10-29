import { categories as recipeCategories, veganConflict } from '../recipes/rules.mjs';
import { containsFor } from '../diet-labels.mjs';
import { containsMeat } from '../market/rules.mjs';
import { GeminiError } from './gemini.mjs';

/** Shapes the model's JSON into a member recipe the app can render, with diet tags read from the ingredients. */
export const clip = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
const finiteSecond = value => Number.isInteger(value) && value >= 0 && value <= 6 * 3600;
const COUNT_UNITS = /^(pieces?|pcs?\.?|whole|nos?\.?|units?)$/i;

export { containsFor };

/** Answers about the source itself: trying the same request again gives the same answer, so members get no retry for them. */
export const REFUSALS = Object.freeze({
  notRecipe: 'That does not look like a cooking recipe.',
  meat: 'QuinTaste recipes are vegetarian; this one uses meat or seafood.',
  noIngredients: 'No ingredients could be read from this source.',
  noSteps: 'No steps could be read from this source.',
});
export const isRefusal = message => Object.values(REFUSALS).includes(message);

export function toRecipe(draft, { source }) {
  if (draft.isRecipe === false) throw new GeminiError(422, REFUSALS.notRecipe);
  if (draft.diet === 'NotVegetarian') throw new GeminiError(422, REFUSALS.meat);
  const ids = new Map();
  const ingredients = (draft.ingredients ?? []).slice(0, 40).map(item => {
    const name = clip(item.name, 120);
    if (!name) return null;
    let id = slug(name), n = 1;
    while (ids.has(id)) id = slug(name) + '-' + ++n;
    ids.set(id, name.toLowerCase());
    const amount = typeof item.amount === 'number' && item.amount > 0 && item.amount <= 100000 ? Math.round(item.amount * 1000) / 1000 : null;
    const unit = amount === null ? '' : clip(item.unit, 24);
    // A suggested amount is the model's typical figure where the source gave none; the app labels it.
    return { id, name, amount, unit: COUNT_UNITS.test(unit) ? '' : unit, ...(amount !== null && item.suggested === true ? { suggested: true } : {}) };
  }).filter(Boolean);
  if (!ingredients.length) throw new GeminiError(422, REFUSALS.noIngredients);
  if (containsMeat(ingredients.map(i => i.name).join(', '))) throw new GeminiError(422, REFUSALS.meat);
  const contains = containsFor(ingredients);
  const diet = draft.diet === 'Vegan' && !ingredients.some(i => veganConflict(i.name)) && !contains.some(tag => ['Eggs', 'Dairy', 'Honey'].includes(tag)) ? 'Vegan' : 'Vegetarian';
  const byName = name => {
    const wanted = String(name ?? '').toLowerCase();
    return [...ids.entries()].find(([, n]) => n === wanted || n.includes(wanted) || wanted.includes(n))?.[0];
  };
  const video = source.kind === 'video';
  const steps = (draft.steps ?? []).slice(0, 30).map((step, index) => ({
    title: clip(step.title, 120) || 'Step ' + (index + 1),
    instruction: clip(step.instruction, 3000),
    minutes: Number.isInteger(step.timerMinutes) && step.timerMinutes >= 1 && step.timerMinutes <= 180 ? step.timerMinutes : null,
    ingredientIds: [...new Set((step.ingredientNames ?? []).map(byName).filter(Boolean))].slice(0, 40),
    ...(video && finiteSecond(step.at) ? { at: step.at } : {}),
    ...(video && finiteSecond(step.shotAt) ? { shotAt: step.shotAt } : {}),
  })).filter(step => step.instruction);
  if (!steps.length) throw new GeminiError(422, REFUSALS.noSteps);
  const servings = Number.isInteger(draft.servings) ? Math.min(Math.max(draft.servings, 1), 8) : 2;
  const minutes = Number.isInteger(draft.minutes) ? Math.min(Math.max(draft.minutes, 1), 1440) : 30;
  const category = recipeCategories.includes(draft.category) ? draft.category : 'With rice';
  const author = clip(source.creator, 80) || clip(draft.creator, 80) || (video ? 'Video creator' : 'Sourced recipes');
  const recipe = {
    title: clip(draft.title, 100) || 'Untitled recipe', description: clip(draft.description, 2000), author, language: clip(draft.language, 40) || 'English',
    servings, minutes, diet, contains, categories: [category], sponsorship: 'None', ingredients, steps, revision: 1,
    source: { ...source, notes: clip(draft.notes, 500), confidence: Math.min(Math.max(Number(draft.confidence) || 0, 0), 1) },
  };
  return recipe;
}

/** An uploaded video's job input: "upload <local/uuid.ext> <mime type> [original link]" (the file waits on the app's disk). */
export function parseUpload(input) {
  const match = /^upload (local\/[a-f0-9-]{36}\.(?:mp4|mov|webm|3gp|mkv)|files\/[a-z0-9-]{1,64}) (video\/[a-z0-9.+-]{1,40})(?: (https:\/\/\S{1,300}))?$/.exec(String(input));
  return match ? { name: match[1], mimeType: match[2], link: match[3] ?? null } : null;
}
