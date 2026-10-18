import { CommunityError, list, pick, text, uuid } from '../community/http.mjs';
import { containsMeat, noContactDetails, whole } from '../market/rules.mjs';

// Mirrors src/types/food.ts recipeCategories; the server is the authority.
export const categories = ['Breakfast', 'Noodles', 'Rice meals', 'With rice', 'Soups', 'Snacks & kueh', 'Desserts & drinks'];
export const sponsorships = ['None', 'Paid', 'Gifted', 'Affiliate'];
export const linkLimit = 10;
const key = /^[a-z0-9-]{1,80}$/;
/** Animal products a vegan recipe can't list, unless the line names a plant-based version. */
const animal = /\b(eggs?|egg yolks?|milk|butter|ghee|cheese|cream|yogh?urt|paneer|honey|condensed milk|evaporated milk)\b/i;
const plant = /\b(coconut|soy|soya|oat|almond|rice|plant[- ]based|vegan|peanut|nut|cashew|apple|cocoa|dairy[- ]free|egg[- ]free|egg ?replacer|flax)\b/i;
export const veganConflict = name => animal.test(name) && !plant.test(name);

const field = (value, max, label, min = 1) => noContactDetails(text(value, max, { min, field: label }), label);
/** A complete submission: every field the publication review screen requires, checked again here. */
export function readRecipe(body) {
  body ??= {};
  if (body.rights !== true || body.policy !== true) throw new CommunityError(400, 'Confirm your content rights and the publication policy.');
  const diet = pick(body.diet, ['Vegan', 'Vegetarian'], null);
  if (!diet) throw new CommunityError(400, 'Choose Vegan or Vegetarian.');
  const recipeCategories = list(body.categories, categories, 2);
  if (!recipeCategories.length) throw new CommunityError(400, 'Choose a category.');
  const sponsorship = pick(body.sponsorship, sponsorships, null);
  if (!sponsorship) throw new CommunityError(400, 'Choose a sponsorship disclosure, including None.');
  const rawIngredients = Array.isArray(body.ingredients) ? body.ingredients : [];
  if (!rawIngredients.length || rawIngredients.length > 40) throw new CommunityError(400, 'Add 1 to 40 ingredients.');
  const seen = new Set(), linked = new Set();
  const ingredients = rawIngredients.map((item, index) => {
    const id = typeof item?.id === 'string' && key.test(item.id) ? item.id : null;
    if (!id || seen.has(id)) throw new CommunityError(400, 'Ingredient ' + (index + 1) + ' is invalid. Re-open the recipe and try again.');
    seen.add(id);
    const name = field(item.name, 120, 'Ingredient ' + (index + 1)), amountText = typeof item.amount === 'string' ? item.amount.trim() : '';
    let amount = null, unit = '';
    if (amountText) {
      amount = Number(amountText); unit = text(item.unit, 24, { field: 'Unit' });
      if (!/^\d+(\.\d{1,3})?$/.test(amountText) || !(amount > 0) || amount > 100000 || !unit) throw new CommunityError(400, 'Ingredient ' + (index + 1) + ' needs a positive amount and a unit, or no amount for to taste.');
    }
    let listingId = null;
    if (item.listingId !== undefined && item.listingId !== null) {
      if (!uuid(item.listingId) || linked.has(item.listingId)) throw new CommunityError(400, 'Each shop item can be linked to one ingredient.');
      linked.add(listingId = item.listingId);
    }
    return { id, name, amount, unit, ...(listingId ? { listingId } : {}) };
  });
  if (linked.size > linkLimit) throw new CommunityError(400, `Link up to ${linkLimit} shop items.`);
  const names = ingredients.map(i => i.name).join(', ');
  if (containsMeat(names)) throw new CommunityError(400, 'QuinTaste recipes are vegetarian. Remove meat, fish or animal-derived ingredients such as gelatine or lard.');
  if (diet === 'Vegan') {
    const conflict = ingredients.find(i => veganConflict(i.name));
    if (conflict) throw new CommunityError(400, `“${conflict.name}” isn't vegan. Choose Vegetarian or name the plant-based version.`);
  }
  const rawSteps = Array.isArray(body.steps) ? body.steps : [];
  if (!rawSteps.length || rawSteps.length > 30) throw new CommunityError(400, 'Add 1 to 30 steps.');
  const steps = rawSteps.map((step, index) => {
    const minutesText = typeof step?.minutes === 'string' ? step.minutes.trim() : '';
    return {
      title: field(step?.title, 120, 'Step ' + (index + 1) + ' title'),
      instruction: field(step?.instruction, 3000, 'Step ' + (index + 1) + ' instructions'),
      minutes: minutesText ? whole(minutesText, 1, 180, 'Step timers must be 1 to 180 whole minutes.') : null,
      ingredientIds: Array.isArray(step?.ingredientIds) ? [...new Set(step.ingredientIds.filter(id => seen.has(id)))].slice(0, 40) : [],
    };
  });
  return {
    title: field(body.title, 100, 'Recipe name'), description: field(body.description, 2000, 'Description'),
    author: field(body.author, 80, 'Author'), language: text(body.language, 40, { min: 1, field: 'Language' }),
    servings: whole(body.servings, 1, 8, 'Choose 1 to 8 servings.'), minutes: whole(body.minutes, 1, 1440, 'Enter a total time from 1 to 1440 minutes.'),
    diet, categories: recipeCategories, sponsorship, ingredients, steps,
    revision: whole(body.revision, 1, 10000, 'Re-open the recipe and try again.'),
  };
}
export const draftKey = value => {
  if (typeof value !== 'string' || !key.test(value)) throw new CommunityError(404, 'That recipe is unavailable.');
  return value;
};
/** Public id: the row id with a prefix, so member recipes never collide with editorial ones. */
export const publicId = id => 'member-' + id;
export function rowId(value) {
  const id = typeof value === 'string' && value.startsWith('member-') ? value.slice(7) : '';
  if (!uuid(id)) throw new CommunityError(404, 'This recipe is unavailable.');
  return id;
}
