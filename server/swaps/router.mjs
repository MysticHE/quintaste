import { logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, member, throttle, transaction } from '../community/http.mjs';
import { loadRecipe } from '../recipes/lookup.mjs';
import { accountAccess } from '../account-access.mjs';
import { invalidRules, swapPlan } from './plan.mjs';
import { SWAP_AI_PER_DAY, aiOption, aiStatus, askAi } from './ai.mjs';
import { planAccess } from '../ai-recipes/limits.mjs';

/**
 * Ingredient swaps for a recipe (docs/AI_FOOD_LIBRARY_PLAN.md §5): the reviewed rules, worked out by code for each line.
 * Telling us a swap did not work files a correction case for staff. Private recipes never leave the phone, so they have no swaps.
 * Release bar (AI_FOOD_LIBRARY_PLAN.md §9): swaps stay on the master account until a cook has cooked 30 of them; everyone else gets
 * no lines, so the app shows no swap icons.
 */
export const swaps = communityRouter({ guests: true, bodyLimit: '1kb' });
if (invalidRules.length) logger.warn({ event: 'swap_rules_invalid', rules: invalidRules });

const unavailable = () => new CommunityError(404, 'This recipe is unavailable.');
const validId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) && !id.startsWith('private-');
// Plans depend only on the recipe's content (its revision, and its update time for recipes edited in place); the newest 500 are kept.
const plans = new Map();
async function planFor(id, viewer) {
  if (!validId(id)) throw unavailable();
  const recipe = await loadRecipe(id);
  // A private recipe (Snap a dish) has swaps for its author only, like every other view of it.
  if (!recipe || (recipe.privateTo && recipe.privateTo !== viewer)) throw unavailable();
  const key = `${id}:${recipe.revision}:${recipe.updatedAt ?? ''}`;
  let plan = plans.get(key);
  if (!plan) {
    plan = { ...swapPlan(recipe), name: recipe.name };
    plans.set(key, plan);
    if (plans.size > 500) plans.delete(plans.keys().next().value);
  }
  return { plan, recipe };
}

const offered = async user => !!user && (await accountAccess(user.id)).role === 'master';
// "Find more with AI" is part of the AI Recipes plans (owner decision 5); until payments are connected that is the master account.
const aiOffered = async user => await offered(user) && !(await planAccess(user.id)).needsPlan;
// Everyone else gets no lines without the recipe being looked up; `offered` tells the app its stored swaps can be refreshed.
swaps.get('/recipe/:id', async (req, res) => {
  if (!validId(req.params.id)) throw unavailable();
  if (!await offered(res.locals.user)) return res.json({ id: req.params.id, revision: 0, offered: false, lines: [] });
  const { plan: { name: _name, ...plan } } = await planFor(req.params.id, res.locals.user.id);
  res.json({ ...plan, offered: true, ai: await aiOffered(res.locals.user) });
});

/** The line of a recipe's swap plan an AI ask is about. */
async function aiLine(req, res) {
  if (!await aiOffered(res.locals.user)) throw new CommunityError(404, 'That swap is unavailable.');
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(req.params.lineId)) throw new CommunityError(400, 'Invalid request.');
  const { plan, recipe } = await planFor(req.params.id, res.locals.user.id);
  const line = plan.lines.find(item => item.id === req.params.lineId);
  if (!line) throw new CommunityError(404, 'That swap is unavailable.');
  return { recipe, line };
}
/** Where "Find more with AI" stands for a line: { status: 'none' | 'pending' | 'done' | 'failed', options }. */
swaps.get('/recipe/:id/lines/:lineId/ai', member, async (req, res) => {
  const { recipe, line } = await aiLine(req, res);
  res.json(await aiStatus(recipe, line));
});
/** Asks the QT bots for more options for a line, or returns the answer already kept for it; a new ask counts towards the day's 20. */
swaps.post('/recipe/:id/lines/:lineId/ai', member, async (req, res) => {
  const { recipe, line } = await aiLine(req, res), me = res.locals.user.id;
  res.json(await askAi(recipe, line, me, () => throttle('swap-ai:' + me, SWAP_AI_PER_DAY, 86400, `You can ask for ${SWAP_AI_PER_DAY} AI swaps a day. Try again tomorrow.`)));
});

/** "Did the swap work?" answered No: one case per member and swap, so staff can fix or drop the rule. */
swaps.post('/feedback', member, async (req, res) => {
  const me = res.locals.user.id, { recipeId, lineId, to } = req.body ?? {};
  if (!await offered(res.locals.user)) throw new CommunityError(404, 'That swap is unavailable.');
  if (typeof lineId !== 'string' || !(to === null || (typeof to === 'string' && /^[a-z0-9_]{1,60}$/.test(to)))) throw new CommunityError(400, 'Invalid request.');
  const { plan, recipe } = await planFor(recipeId, me);
  const line = plan.lines.find(item => item.id === lineId);
  // A swap from "Find more with AI" counts when the line's kept answer still offers it.
  const option = line && ([...line.options, ...line.more].find(item => item.to === to) ?? (to && await aiOption(recipe, line, to)));
  if (!option) throw new CommunityError(404, 'That swap is unavailable.');
  await throttle('swap-feedback:' + me, 20, 86400);
  const subject = `swap:${plan.id}:${line.key}:${to ?? 'leave'}|by:${me}`;
  const swapName = option.name?.en ?? 'leave it out';
  // Serialised per subject, so a retry racing the first request never files the case twice.
  await transaction(db => db.query(`INSERT INTO ops.case_record(kind,title,description,subject_id)
    SELECT 'correction', $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM ops.case_record WHERE kind='correction' AND subject_id=$3)`,
  [`Swap didn't work: ${line.key} → ${to ?? 'left out'}`.slice(0, 200),
    `A member cooked "${plan.name}" (revision ${plan.revision}) with ${swapName} instead of line ${line.id} (${line.key}) and said the swap did not work. `
    + (option.ai ? 'It was an AI suggestion: check the answer kept in recipes.swap_ai, and add a reviewed rule if it should stay.'
      : 'Check the rule in server-assets/nutrition/swap-rules.json.'), subject]), subject);
  res.status(204).end();
});

swaps.use(errors);
