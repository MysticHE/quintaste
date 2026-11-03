import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GeminiError, generate } from './gemini.mjs';
import { NO_PUNGENT, house } from './prompts.mjs';
import { clip } from './recipe.mjs';
import { WORK_DIR } from './work.mjs';
import { findCard } from './dishes.mjs';
import { encodePhoto } from '../market/rules.mjs';
import { cookName, tableKeys } from '../nutrition/estimate.mjs';

/**
 * Snap a dish (docs/AI_FOOD_LIBRARY_PLAN.md §6): Gemini names the dish in a member's photo (free, 20 a day); when they choose
 * Create recipe, the QT bots write a meat-free version from the dish card and the replacement guide (writing.mjs, Phase E). The
 * photo stays on the app's disk only until the job reaches the bots (they never get it), and is swept after 24 hours (work.mjs);
 * it is never stored in the database and never used as a recipe's picture (it may show meat).
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
export const photoSystem = house + `
You write a meat-free home version of a dish for QuinTaste. Code has already decided what replaces each meat, seafood or other part; follow its plan exactly, keep the dish recognisable and name it as people would ("Vegetarian char kway teow"). Use ingredients sold in Singapore supermarkets and wet markets. Set creator to null and at to null for every step.`;

/** The writing prompt: the dish, its usual parts and the replacement plan from code, and the diet chosen. */
export function photoPrompt({ dish, card, plan, diet }) {
  const keep = plan.keep.map(p => `- ${p.name}${p.grams ? ` (about ${p.grams} g)` : ''}`).join('\n') || '- (none listed)';
  const swap = plan.replace.map(r => `- ${r.from}${r.grams ? ` (about ${r.grams} g)` : ''} → ${r.to.name.en}: ${r.to.technique.en}`).join('\n') || '- (nothing to replace)';
  return [`Dish: ${dish.en}${dish.zh && dish.zh !== dish.en ? ` (${dish.zh})` : ''}.`,
    card ? `Usual serving about ${card.serving} g. Keep these parts:\n${keep}` : `Parts seen in the member's photo (no dish card):\n${keep}`,
    `Replace these parts as shown:\n${swap}`,
    DIET_RULES[diet], `Prefer these ingredients where they fit: ${pantryList()}. Name anything else in notes as a new ingredient.`,
    'Write 2 servings unless the dish is usually shared.'].join('\n\n');
}
