import { Buffer } from 'node:buffer';
import { pool } from '../config.mjs';
import { CommunityError } from '../community/http.mjs';
import { aiCandidates, aiOptions } from './plan.mjs';

/**
 * "Find more with AI" under a swap sheet's More options (docs/AI_FOOD_LIBRARY_PLAN.md §5): the QT bots rank up to ten library foods
 * that share the line's role and say why each works. One answer per recipe content and line, shared by every member who asks, so
 * the next member gets it at once and at no cost. The bots only pick; code builds every option (amount, labels, figures, note)
 * with the reviewed rules' own checks each time it is shown. No other engine stands in when the bots are down: the ask fails.
 */
export const SWAP_AI_PER_DAY = 20;
// An ask nobody claims in 10 minutes while no bridge is asking for work, or in STALE_MINUTES at all, fails; the bots never claim it after.
export const STALE_MINUTES = 15;
const QUEUED_MINUTES = 10, CLAIMED_MINUTES = 10, RETRY_HOURS = 6, PAYLOAD_BYTES = 19000;
const contentOf = recipe => `${recipe.revision ?? 1}:${recipe.updatedAt ?? ''}`.slice(0, 200);

const answerSchema = {
  type: 'object', additionalProperties: false, required: ['picks'],
  properties: {
    picks: { type: 'array', maxItems: 3, description: 'the best candidates for this line, best first; none when no candidate works', items: {
      type: 'object', additionalProperties: false, required: ['key', 'why'],
      properties: {
        key: { type: 'string', description: 'a candidate key exactly as given' },
        why: { type: 'string', maxLength: 200, description: 'why it works in this dish, for staff' },
        note: { type: ['object', 'null'], description: 'only when the dish really changes: a few words, e.g. "less savoury" / 鲜味较淡', properties: { en: { type: 'string', maxLength: 40 }, zh: { type: 'string', maxLength: 24 } } },
        step: { type: ['object', 'null'], description: 'only when the method must change: e.g. "press 20 min first" / 先压20分钟', properties: { en: { type: 'string', maxLength: 40 }, zh: { type: 'string', maxLength: 24 } } },
      } } },
    newItems: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 60 }, description: 'better foods that are not candidates, for staff to consider adding' },
  },
};
const system = `You are a careful home cook advising QuinTaste, a Singapore vegetarian cooking app. A member wants something else instead of one ingredient in a recipe. Choose from the candidate foods given only: the ones that do the same job in this dish (its role and cooking method), sold in Singapore. Rank at most three, best first, and say briefly why each works. Give a note or a step change only when the dish really changes. Never suggest meat, seafood or anything not vegetarian. Code works out the amounts and diet labels, so do not state amounts. Answer from the facts given; do not search the web.`;

/** Text cut to at most `max` bytes of UTF-8 (a Chinese character is three), never mid-character. */
const clipBytes = (text, max) => Buffer.byteLength(text) <= max ? text : Buffer.from(text).subarray(0, max).toString('utf8').replace(/\uFFFD+$/, '');
/** What the bots get for one line: the recipe in brief, the line and its role, the candidates, and the answer's schema. */
function payloadFor(recipe, lineId, found) {
  const line = (recipe.ingredients ?? []).find(item => item.id === lineId);
  const lines = (recipe.ingredients ?? []).map(i => [i.amount, i.unit, i.name].filter(v => v !== null && v !== undefined && v !== '').join(' ')).join('; ');
  const steps = clipBytes((recipe.steps ?? []).map((step, i) => `${i + 1}. ${step.instruction ?? ''}`).join('\n'), 6000);
  const prompt = [`Recipe: ${clipBytes(String(recipe.name ?? ''), 300)} (${recipe.servings} servings).`, clipBytes(`Ingredients: ${lines}`, 3000), `Method:\n${steps}`,
    `Instead of: ${line?.name ?? found.name.en} (food "${found.key}", role "${found.role}", ${found.context.join(', ')}).`,
    `Candidates (key: name, roles):\n${found.candidates.map(c => `- ${c.key}: ${c.name.en} / ${c.name.zh} (${c.roles.join(', ')})`).join('\n')}`].join('\n\n');
  return { recipe: { id: recipe.id, name: String(recipe.name ?? '').slice(0, 120) }, line: { id: lineId, key: found.key, role: found.role },
    candidates: found.candidates.map(c => c.key), brief: { system, prompt, schema: answerSchema } };
}

const words = value => value && typeof value.en === 'string' && typeof value.zh === 'string' && value.en.trim() && value.zh.trim()
  && value.en.length <= 40 && value.zh.length <= 24 ? { en: value.en.trim(), zh: value.zh.trim() } : null;
/** The bots' answer as stored: picks among the task's candidates only, each with a short reason and at most a note or a step. */
export function readAnswer(body, candidates) {
  const allowed = new Set(candidates), seen = new Set(), picks = [];
  for (const pick of Array.isArray(body?.picks) ? body.picks : []) {
    if (picks.length >= 3 || typeof pick?.key !== 'string' || !allowed.has(pick.key) || seen.has(pick.key)) continue;
    seen.add(pick.key);
    const step = words(pick.step), note = step ? null : words(pick.note);
    picks.push({ to: pick.key, why: String(pick.why ?? '').slice(0, 200), ...(step ? { step } : note ? { note } : {}) });
  }
  const newItems = (Array.isArray(body?.newItems) ? body.newItems : []).filter(v => typeof v === 'string').map(v => v.slice(0, 60)).slice(0, 3);
  return { picks, newItems };
}

/** A queued or claimed ask that waited too long fails now (the bots are down or busy), so the member is not left waiting. */
async function expire(row) {
  const bridge = (await pool.query("SELECT seen_at > now() - make_interval(mins => $1) AS live FROM recipes.ai_bot_bridge WHERE id='qt-swaps'", [QUEUED_MINUTES])).rows[0];
  const age = (at, minutes) => at && Date.now() - new Date(at).getTime() > minutes * 60000;
  if ((row.status === 'queued' && ((age(row.created_at, QUEUED_MINUTES) && !bridge?.live) || age(row.created_at, STALE_MINUTES)))
    || (row.status === 'claimed' && age(row.claimed_at, CLAIMED_MINUTES))) {
    await pool.query("UPDATE recipes.swap_ai SET status='failed', error='timeout', answered_at=now() WHERE id=$1 AND status=$2", [row.id, row.status]);
    return { ...row, status: 'failed', answered_at: new Date() };
  }
  return row;
}

/** The answer's options as the member sees them, leaving out foods the reviewed rules already offer for the line. */
function shown(recipe, line, row) {
  const offered = new Set([...line.options, ...line.more].map(option => option.to));
  return aiOptions(recipe, line.id, (row.result?.picks ?? []).filter(pick => !offered.has(pick.to)));
}

/** Where the ask stands: { status: 'none' | 'pending' | 'done' | 'failed', options }. */
export async function aiStatus(recipe, line) {
  let row = (await pool.query('SELECT * FROM recipes.swap_ai WHERE recipe_id=$1 AND content=$2 AND line_id=$3', [recipe.id, contentOf(recipe), line.id])).rows[0];
  if (!row) return { status: 'none', options: [] };
  if (row.status === 'queued' || row.status === 'claimed') row = await expire(row);
  if (row.status === 'done') return { status: 'done', options: shown(recipe, line, row) };
  return { status: row.status === 'failed' ? 'failed' : 'pending', options: [] };
}

/**
 * Asks the bots for the line, or returns the answer someone already got. An ask that only timed out (the bots were busy or down) can
 * be asked again at once; one the bots answered with a failure waits six hours. `fresh` (the member's daily count) runs only once the
 * ask is known to fit, just before it is queued; a cached answer costs nothing.
 */
export async function askAi(recipe, line, userId, fresh) {
  const now = await aiStatus(recipe, line);
  if (now.status === 'done' || now.status === 'pending') return now;
  const found = aiCandidates(recipe, line.id);
  if (!found?.candidates.length) return { status: 'done', options: [] };
  if (now.status === 'failed') {
    const row = (await pool.query('SELECT answered_at, error FROM recipes.swap_ai WHERE recipe_id=$1 AND content=$2 AND line_id=$3', [recipe.id, contentOf(recipe), line.id])).rows[0];
    if (row?.error !== 'timeout' && row?.answered_at && Date.now() - new Date(row.answered_at).getTime() < RETRY_HOURS * 3600000) return now;
  }
  const payload = payloadFor(recipe, line.id, found);
  if (Buffer.byteLength(JSON.stringify(payload)) > PAYLOAD_BYTES) throw new CommunityError(422, 'This recipe is too long to ask about.');
  await fresh();
  await pool.query(`INSERT INTO recipes.swap_ai (recipe_id, content, line_id, payload, requested_by) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (recipe_id, content, line_id) DO UPDATE SET status='queued', payload=EXCLUDED.payload, result=NULL, error='', created_at=now(),
      claimed_at=NULL, answered_at=NULL, requested_by=EXCLUDED.requested_by WHERE recipes.swap_ai.status='failed'`,
  [recipe.id, contentOf(recipe), line.id, payload, userId]);
  return { status: 'pending', options: [] };
}

/** The AI option a member chose for a line, when the cached answer still offers it (for "Did the swap work?"). */
export async function aiOption(recipe, line, to) {
  const now = await aiStatus(recipe, line);
  return now.options.find(option => option.to === to) ?? null;
}
