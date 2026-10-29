import { readFileSync } from 'node:fs';
import { pool } from '../config.mjs';
import { alliums } from '../diet-labels.mjs';

/**
 * The QT bots' recipe rulebook as AI Recipes and Wanted recipes use it (owner, 28 Oct 2026; docs/RECIPE_SOURCING_PLAN.md §3),
 * read from server-assets/recipe-charter.json (written by scripts/recipe-charter-sync.mjs from ops/qt-team/recipe_charter.json).
 * - Every AI recipe: animal ingredients the meat check misses (rennet cheese, dashi, belacan, 魚露 ...) send it to staff, who
 *   can ask for a vegetarian swap; staff notes are kept apart from the public recipe (recipe.reviewNotes).
 * - Wanted recipes carry QuinTaste's name, so they are written without the five pungent and one that still has them is not
 *   saved; the owner's taste lessons (drinks, desserts, deep-frying, unclear ingredients) go to staff as notes, never a refusal.
 * - A member's own recipe follows their Food Choices: Vegetarian there (no five pungent) asks for a version without them; one
 *   that still has them waits for staff instead of going live.
 */
let charter = null;
function rules() {
  if (!charter) {
    const data = JSON.parse(readFileSync(new URL('../../server-assets/recipe-charter.json', import.meta.url), 'utf8'));
    charter = { ...data, re: Object.fromEntries(Object.entries(data.patterns).map(([key, source]) => [key, new RegExp(source, 'iu')])),
      animalAll: new RegExp(data.patterns.animal, 'giu') };
  }
  return charter;
}
const norm = text => String(text ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Animal ingredients named in these lines, unless the line qualifies them ('vegetarian oyster sauce', 素). */
export function hiddenAnimal(names) {
  const { re, animalAll } = rules(), found = new Set();
  for (const name of names) {
    const text = norm(name);
    for (const match of text.matchAll(animalAll)) {
      if (!re.animalQualifier.test(text.slice(0, match.index))) found.add(match[0]);
    }
  }
  return [...found];
}

/** The owner's taste lessons as notes for staff reviewing a Wanted recipe; [] when none apply. */
export function houseNotes(recipe) {
  const { re, allowedCategories } = rules(), title = norm(recipe.title), notes = [];
  const names = recipe.ingredients.map(i => i.name), method = norm(recipe.steps.map(s => s.instruction).join(' '));
  const dish = re.dishWord.test(title);
  if (!recipe.categories.every(c => allowedCategories.includes(c))) notes.push(`category ${recipe.categories.join(', ')} (the owner stopped sourcing it)`);
  if (re.drink.test(title) && !dish) notes.push('sounds like a drink (the owner deleted every drink)');
  if (re.dessert.test(title) && !re.savouryCake.test(title) && !dish) notes.push('sounds like a dessert or sweet kueh (the owner deleted these)');
  if (re.deepFry.test(method)) notes.push('deep-fried or battered (owner: no fry)');
  const unclear = names.filter(n => re.genericStock.test(norm(n)) || re.unclear.test(norm(n)) || re.unfamiliar.test(norm(n)));
  if (unclear.length) notes.push('unclear or unfamiliar ingredients: ' + unclear.slice(0, 4).join('; '));
  return notes;
}

/** The five pungent this recipe uses, from its ingredient tags. */
export const pungent = recipe => (recipe.contains ?? []).filter(tag => alliums.includes(tag));

/**
 * Whether this job is written without the five pungent: always for a Wanted recipe; for a member's dish request when their
 * Food Choices include Vegetarian. Video recipes stay as the video made them (the labels then say so).
 */
export async function wantsNoPungent(job, db = pool) {
  if (job.kind === 'demand') return true;
  if (job.kind !== 'request' || !job.user_id) return false;
  const row = (await db.query(`SELECT 'Vegetarian' = ANY(diets) AS yes FROM social.profile WHERE user_id=$1`, [job.user_id])).rows[0];
  return row?.yes === true;
}
