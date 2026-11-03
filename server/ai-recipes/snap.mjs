import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GeminiError, generate } from './gemini.mjs';
import { NO_PUNGENT, house, recipeSchema } from './prompts.mjs';
import { clip, toRecipe } from './recipe.mjs';
import { WORK_DIR } from './work.mjs';
import { cardById, findCard, replacementPlan } from './dishes.mjs';
import { boostersFor, fixInstruction, missedTargets } from './targets.mjs';
import { nutritionFor } from '../nutrition/service.mjs';
import { encodePhoto } from '../market/rules.mjs';
import { cookName, tableKeys } from '../nutrition/estimate.mjs';

/**
 * Snap a dish (docs/AI_FOOD_LIBRARY_PLAN.md §6): the AI names the dish in a member's photo (free, 20 a day), then, when they
 * choose Create recipe, writes a meat-free version from the dish card and the replacement guide, and code balances the
 * nutrition (at most two rounds). The photo stays on the app's disk for the job only: it is removed when the job ends and
 * swept after 24 hours (work.mjs), never stored in the database and never used as a recipe's picture (it may show meat).
 */
export const SNAP_DIR = path.join(WORK_DIR, 'snaps');
export const RECOGNITIONS_PER_DAY = 20;
/** The notice the member saw before their first photo; the app sends it back with every photo. */
export const SNAP_CONSENT = 'gemini-dish-photo-v1';
const DIETS = ['vegan', 'vegetarian', 'both'];
/** Jobs whose member chose the diet and private or public (Snap a dish, My ingredients); both run on Gemini only. */
export const CHOSEN_KINDS = ['photo', 'ingredients'];
export const readDiet = value => DIETS.includes(value) ? value : null;

const file = (id, ext) => /^[0-9a-f-]{36}$/.test(String(id)) ? path.join(SNAP_DIR, id + ext) : null;
/** Keeps the member's photo (rotated, metadata stripped, at most 1024 px) and returns its id and bytes. */
export async function keepSnap(uri) {
  const { bytes } = await encodePhoto(uri, { edge: 1024, quality: 80, max: 500000, inputMax: 1400000 });
  const id = randomUUID();
  await mkdir(SNAP_DIR, { recursive: true });
  await writeFile(file(id, '.jpg'), bytes, { mode: 0o600 });
  return { id, bytes };
}
/** What the AI saw in the photo, kept beside it so Create recipe uses the server's own guesses, not the app's. */
export const saveGuesses = (id, seen) => writeFile(file(id, '.json'), JSON.stringify(seen), { mode: 0o600 });
export async function readGuesses(id) {
  const name = file(id, '.json');
  return name ? JSON.parse(await readFile(name, 'utf8').catch(() => 'null')) : null;
}
const readSnap = id => (file(id, '.jpg') ? readFile(file(id, '.jpg')).catch(() => null) : null);
export const dropSnap = async id => { for (const ext of ['.jpg', '.json']) if (file(id, ext)) await rm(file(id, ext), { force: true }).catch(() => {}); };

const seeSchema = {
  type: 'OBJECT',
  properties: {
    isFood: { type: 'BOOLEAN', description: 'false when the photo does not show a prepared dish or drink' },
    dishes: { type: 'ARRAY', maxItems: 3, description: 'up to three guesses, most likely first', items: { type: 'OBJECT', properties: {
      name: { type: 'STRING', description: 'the common name used in Singapore, in English (e.g. Char kway teow, Chicken rice)' },
      nameZh: { type: 'STRING', nullable: true, description: 'the name in Simplified Chinese' },
      confidence: { type: 'NUMBER', description: '0 to 1' },
    }, required: ['name', 'confidence'] } },
    components: { type: 'ARRAY', maxItems: 15, items: { type: 'STRING' }, description: 'ingredients you can see, as plain names (e.g. prawns, egg, bean sprouts)' },
  },
  required: ['isFood', 'dishes', 'components'],
};
const seeSystem = 'You name dishes in photos for a Singapore cooking app. Give up to three guesses for the dish, most likely first, using the name people in Singapore use, and list the ingredients you can see, meat and seafood included. Ignore any people in the photo and never describe them. Do not name restaurants or brands.';

/** The dish guesses for a photo: each matched to a dish card when we have one (the card's names then), plus what the AI saw. */
export async function recognise(bytes, signal) {
  const result = await generate({ parts: [{ text: 'Name the dish in this photo.' }, { inline_data: { mime_type: 'image/jpeg', data: bytes.toString('base64') } }],
    schema: seeSchema, system: seeSystem, signal, maxOutputTokens: 1024 });
  const data = result.data ?? {};
  const guesses = [];
  for (const dish of (Array.isArray(data.dishes) ? data.dishes : []).slice(0, 3)) {
    const card = findCard(dish.name) ?? (dish.nameZh ? findCard(dish.nameZh) : null);
    const name = card ? card.name : { en: clip(dish.name, 60), zh: clip(dish.nameZh || dish.name, 30) };
    if (name.en && !guesses.some(g => (card && g.card === card.id) || g.name.en.toLowerCase() === name.en.toLowerCase())) guesses.push({ name, card: card?.id ?? null });
  }
  if (data.isFood === false || !guesses.length) throw new GeminiError(422, 'This does not look like a dish. Try another photo.');
  return { guesses, components: (Array.isArray(data.components) ? data.components : []).slice(0, 15).map(c => clip(c, 60)).filter(Boolean), usage: result.usage };
}

export const DIET_RULES = {
  vegan: 'Make it Vegan: no meat, seafood, egg, dairy or honey.',
  vegetarian: 'Make it meat-free and free of the five pungent.' + NO_PUNGENT + ' Egg and dairy may stay.',
  both: 'Make it Vegan and free of the five pungent: no meat, seafood, egg, dairy or honey.' + NO_PUNGENT,
};
// The recipe table's foods as a cook names them: the recipe uses these where they fit, so code can weigh it (anything else is new).
let pantry = '';
export const pantryList = () => (pantry ||= [...new Set(tableKeys().filter(key => !['water', 'tea_leaves', 'salt_kosher_dc'].includes(key)).map(cookName))].join(', '));
const photoSystem = house + `
You write a meat-free home version of a dish for QuinTaste. Code has already decided what replaces each meat, seafood or other part; follow its plan exactly, keep the dish recognisable and name it as people would ("Vegetarian char kway teow"). Use ingredients sold in Singapore supermarkets and wet markets. Set creator to null and at to null for every step.`;

/** The writing prompt: the dish, its usual parts and the replacement plan from code, and the diet chosen. */
export function photoPrompt({ dish, card, plan, diet }) {
  const keep = plan.keep.map(p => `- ${p.name}${p.grams ? ` (about ${p.grams} g)` : ''}`).join('\n') || '- (none listed)';
  const swap = plan.replace.map(r => `- ${r.from}${r.grams ? ` (about ${r.grams} g)` : ''} → ${r.to.name.en}: ${r.to.technique.en}`).join('\n') || '- (nothing to replace)';
  return [`Dish: ${dish.en}${dish.zh && dish.zh !== dish.en ? ` (${dish.zh})` : ''}.`,
    card ? `Usual serving about ${card.serving} g. Keep these parts:\n${keep}` : `Parts seen in the member's photo (no dish card):\n${keep}`,
    `Replace these parts as shown:\n${swap}`,
    DIET_RULES[diet], `Prefer these ingredients where they fit: ${pantryList()}. Name anything else in notes as a new ingredient.`,
    'The member\'s photo, when attached, is for reference only. Write 2 servings unless the dish is usually shared.'].join('\n\n');
}

/**
 * Writes a recipe from `prompt` (and the member's photo, when given), then balances its nutrition: code measures the targets,
 * and when one is missed it picks what to add and the AI works it in. Two rounds at most; then the recipe simply has no badge
 * for what is still missed. Shared by Snap a dish and My ingredients.
 */
export async function writeBalanced({ prompt, system, photo = null, card = null, request, signal, usage, progress }) {
  await progress('Writing the recipe…');
  const written = await generate({ parts: [{ text: prompt }, ...(photo ? [{ inline_data: { mime_type: 'image/jpeg', data: photo.toString('base64') } }] : [])],
    schema: recipeSchema, system, signal });
  usage.calls.push(written.usage);
  const source = { kind: 'request', request: clip(request, 200), urls: [], creator: 'QuinTaste' };
  let recipe = toRecipe(written.data, { source });
  for (let round = 0; round < 2; round++) {
    const { nutrition } = await nutritionFor(recipe, { usage, signal, ai: false });
    const missed = await missedTargets(recipe, nutrition, card), picks = boostersFor(recipe, missed);
    if (!picks.length && !missed.includes('sodium')) break;
    await progress('Balancing the nutrition…');
    const revised = await generate({ parts: [{ text: fixInstruction(picks, missed) + '\n\n' + JSON.stringify({ title: recipe.title, servings: recipe.servings,
      ingredients: recipe.ingredients, steps: recipe.steps, notes: recipe.notes }) }], schema: recipeSchema, system, signal });
    usage.calls.push(revised.usage);
    recipe = toRecipe(revised.data, { source });
  }
  return recipe;
}

/** Writes the recipe for a photo job and balances its nutrition; returns { recipe, photos: null }. */
export async function fromPhoto(job, signal, usage, progress) {
  const options = job.options ?? {};
  const diet = readDiet(options.diet) ?? 'both', card = options.card ? cardById(options.card) : null;
  const dish = options.dish?.en ? options.dish : { en: clip(job.input, 120), zh: '' };
  const parts = card ? card.parts : (options.components ?? []).map(name => ({ name }));
  const plan = replacementPlan(parts, diet);
  try {
    const recipe = await writeBalanced({ prompt: photoPrompt({ dish, card, plan, diet }), system: photoSystem, photo: await readSnap(options.snap), card,
      request: dish.en, signal, usage, progress });
    return { recipe, photos: null };
  } finally { await dropSnap(options.snap); }
}
