import { clip } from './recipe.mjs';
import { cardById, replacementPlan } from './dishes.mjs';
import { boostersFor, fixInstruction, missedTargets } from './targets.mjs';
import { photoPrompt, photoSystem, readDiet } from './snap.mjs';
import { ingredientsPrompt, ingredientsSystem } from './ingredients.mjs';
import { nutritionFor } from '../nutrition/service.mjs';
import { recipeClarityNotes, boundedRepairPayload } from '../../admin/src/lib/food-clarity.mjs';

/**
 * Recipe writing for Snap a dish and My ingredients on the QT bots (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E). Code writes the brief
 * (the dish card and replacement plan, or the member's items, and the diet), the bots answer the recipe JSON, and code measures the
 * nutrient targets: a missed one goes back to the bots as a fix round at the front of the quick lane, two at most. The member's
 * photo never reaches the bots.
 */
export const MAX_FIX_ROUNDS = 2;

/** What a quick-lane task carries for one job: small, so the brief is built again from it when the bots claim it. */
export function writingPayload(job) {
  const options = job.options ?? {}, diet = readDiet(options.diet) ?? 'both';
  if (job.kind === 'photo') {
    return { kind: 'photo', round: 0, diet, dish: options.dish?.en ? options.dish : { en: clip(job.input, 120), zh: '' }, card: options.card ?? null,
      components: Array.isArray(options.components) ? options.components : [] };
  }
  return { kind: 'ingredients', round: 0, diet, items: Array.isArray(options.items) ? options.items : [], pantry: Array.isArray(options.pantry) ? options.pantry : [] };
}

/** The brief for the payload's round: the first draft, or a fix round with the recipe written so far. */
export function writingBrief(payload) {
  const system = payload.kind === 'photo' ? photoSystem : ingredientsSystem;
  if (payload.fix && payload._draft) {
    const { title, servings, ingredients, steps, source } = payload._draft;
    const instruction=payload.fix.clarity
      ? 'Repair these ingredient clarity gaps using only the original request and supported facts: '+JSON.stringify(payload.fix.clarity)+'. Do not invent composition or label verification. Explain deliberate substitutions in notes.'
      : fixInstruction(payload.fix.picks, payload.fix.missed);
    const original=writingBrief({...payload,fix:null,_draft:null}).prompt;
    return { system, prompt: instruction + '\nKeep the original requested diet and constraints:\n'+original+'\n\nDraft:\n' + JSON.stringify({ title, servings, ingredients, steps, notes:source?.notes??'' }) };
  }
  if (payload.kind === 'photo') {
    const card = payload.card ? cardById(payload.card) : null;
    const parts = card ? card.parts : payload.components.map(name => ({ name }));
    return { system, prompt: photoPrompt({ dish: payload.dish, card, plan: replacementPlan(parts, payload.diet), diet: payload.diet }) };
  }
  return { system, prompt: ingredientsPrompt(payload) };
}

/** What the member asked for, as the recipe's source records it. */
export const requestOf = payload => clip(payload.kind === 'photo' ? payload.dish?.en : (payload.items ?? []).join(', '), 200);

/**
 * After the bots' answer: null when the recipe is done (targets met, nothing code can add, or the rounds are used), otherwise the
 * payload for the next fix round, carrying the recipe written so far (`_draft`, server-only): the fix brief is built from it, and it is the recipe
 * kept if the fix round fails. The measuring uses the recipe table only (no AI).
 */
export async function nextRound(payload, recipe, usage) {
  if ((payload.round ?? 0) >= MAX_FIX_ROUNDS) return null;
  const clarity=recipeClarityNotes(recipe);
  if(clarity.length)return boundedRepairPayload({...payload,round:(payload.round??0)+1,fix:{clarity},_draft:recipe});
  const card = payload.kind === 'photo' && payload.card ? cardById(payload.card) : null;
  const { nutrition } = await nutritionFor(recipe, { usage, ai: false });
  const missed = await missedTargets(recipe, nutrition, card), picks = boostersFor(recipe, missed);
  if (!picks.length && !missed.includes('sodium')) return null;
  return boundedRepairPayload({ ...payload, round: (payload.round ?? 0) + 1, fix: { picks, missed }, _draft: recipe });
}
