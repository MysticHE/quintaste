import { CommunityError } from '../community/http.mjs';
import { GeminiError, generate } from './gemini.mjs';
import { house } from './prompts.mjs';
import { clip } from './recipe.mjs';
import { guidePart } from './dishes.mjs';
import { DIET_RULES, pantryList, readDiet, writeBalanced } from './snap.mjs';

/**
 * My ingredients (docs/AI_FOOD_LIBRARY_PLAN.md §7): the AI lists the food in a member's fridge or shelf photo (free, counted with
 * Snap a dish), the member corrects the list, and "Create a new one with these" writes a recipe from mostly those items.
 * The photo is read and dropped at once: the list, not the photo, is all a job keeps.
 */
export const MAX_ITEMS = 25, MAX_PANTRY = 12;

const seeSchema = {
  type: 'OBJECT',
  properties: {
    isFood: { type: 'BOOLEAN', description: 'false when the photo shows no food or cooking ingredients' },
    items: { type: 'ARRAY', maxItems: 20, items: { type: 'OBJECT', properties: {
      name: { type: 'STRING', description: 'a plain ingredient name in English, singular or as sold (e.g. choy sum, firm tofu, eggs)' },
      nameZh: { type: 'STRING', nullable: true, description: 'the name in Simplified Chinese' },
      sure: { type: 'BOOLEAN', description: 'false when the item is partly hidden, blurred or could be something else' },
    }, required: ['name', 'sure'] } },
  },
  required: ['isFood', 'items'],
};
const seeSystem = 'You list the cooking ingredients in a photo of a fridge, shelf or kitchen counter for a Singapore cooking app. Name each food once, in plain words a home cook uses, without brands or pack sizes. Mark an item unsure when you cannot see it clearly. Ignore any people in the photo and never describe them.';

/** The foods in one photo, as `{ name: { en, zh }, sure }`. Meat and seafood are left out: every QuinTaste recipe is meat-free. */
export async function seeItems(bytes, signal) {
  const result = await generate({ parts: [{ text: 'List the ingredients in this photo.' }, { inline_data: { mime_type: 'image/jpeg', data: bytes.toString('base64') } }],
    schema: seeSchema, system: seeSystem, signal, maxOutputTokens: 1024 });
  const data = result.data ?? {}, items = [];
  for (const item of Array.isArray(data.items) ? data.items : []) {
    const en = clip(item.name, 40);
    if (!en || ['meat', 'seafood'].includes(guidePart(en)?.diet) || items.some(i => i.name.en.toLowerCase() === en.toLowerCase())) continue;
    items.push({ name: { en, zh: clip(item.nameZh || en, 20) }, sure: item.sure !== false });
  }
  if (data.isFood === false || !items.length) throw new GeminiError(422, 'No ingredients found in this photo. Try another one.');
  return { items };
}

/** A list of item names from the app: trimmed, 2 to 40 characters, no repeats, at most `max`. */
export function readItems(value, max, field) {
  if (value !== undefined && !Array.isArray(value)) throw new CommunityError(400, `Check ${field}.`);
  const items = [];
  for (const raw of value ?? []) {
    const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 40) throw new CommunityError(400, `Check ${field}.`);
    if (!items.some(i => i.toLowerCase() === name.toLowerCase())) items.push(name);
  }
  if (items.length > max) throw new CommunityError(400, `Use at most ${max} ${field}.`);
  return items;
}

const system = house + `
You write a home recipe for QuinTaste from the ingredients a member has. Use mostly their items, plus at most two extra ingredients from a Singapore supermarket; the basics they keep may be used freely. Never add meat or seafood. Name the dish as people would. Set creator to null and at to null for every step.`;

/** The writing prompt: the member's items, their basics and the diet chosen. */
export function ingredientsPrompt({ items, pantry, diet }) {
  return [`The member has: ${items.join(', ')}.`, pantry.length ? `Basics they keep: ${pantry.join(', ')}.` : 'They keep no basics beyond water.',
    'Use as many of their items as suit one dish; leave out any that do not fit, and any meat or seafood among them. Add at most two other ingredients and name them in notes.',
    DIET_RULES[diet], `Prefer these ingredients where they fit: ${pantryList()}.`, 'Write 2 servings.'].join('\n\n');
}

/** Writes the recipe for an ingredients job and balances its nutrition; returns { recipe, photos: null }. */
export async function fromIngredients(job, signal, usage, progress) {
  const options = job.options ?? {};
  const items = Array.isArray(options.items) ? options.items : [], pantry = Array.isArray(options.pantry) ? options.pantry : [];
  const diet = readDiet(options.diet) ?? 'both';
  const recipe = await writeBalanced({ prompt: ingredientsPrompt({ items, pantry, diet }), system, request: items.join(', '), signal, usage, progress });
  return { recipe, photos: null };
}
