import { readFileSync } from 'node:fs';
import path from 'node:path';
import { containsFor, labelsFor } from '../diet-labels.mjs';
import { countUnits, gramsFor, matchFood, nutrients, tableFood, tablePer100, unitOf, volumeMl } from '../nutrition/estimate.mjs';
import { microNutrients } from '../nutrition/nutrients.mjs';
import { COMPOUND_RULES } from '../../src/config/diet-words.mjs';

/**
 * Swaps for a recipe's ingredient lines (docs/AI_FOOD_LIBRARY_PLAN.md §5), from the reviewed rules in
 * server-assets/nutrition/swap-rules.json. Code decides everything the member is told: which lines get a swap, the amount
 * (same volume or weight, or matched sodium or fat from the food library), the one note (a diet label lost > an allergen
 * added > a step change > a taste or texture change > much less protein), and what the swap does to the recipe's
 * exclusions and per-serving nutrition. No AI call is made here.
 */
const data = JSON.parse(readFileSync(path.resolve('server-assets/nutrition/swap-rules.json'), 'utf8'));
const BASES = new Set(['volume', 'weight', 'sodium', 'fat', 'factor', 'leave']);
const ALLERGENS = ['Peanuts', 'Tree nuts', 'Gluten'];
// Swaps poured or spooned, shown in spoons and cups when the line was counted ("2 cubes") rather than in grams.
const SPOONED = new Set(['season', 'sweeten', 'sour', 'heat', 'thicken', 'coat', 'fat', 'flavour-oil', 'creamy', 'liquid']);
const FIGURES = [...nutrients, ...microNutrients];
const words = value => !!value && typeof value.en === 'string' && typeof value.zh === 'string' && value.en.trim().length > 0 && value.zh.trim().length > 0
  && value.en.length <= 40 && value.zh.length <= 24;

/** Rules that fail validation are left out (the router logs them), so one bad entry never takes the whole feature down. */
function validRule(rule) {
  const from = data.profiles[rule.from], to = rule.to === null ? null : data.profiles[rule.to];
  return from && words(from.name) && (to ? words(to.name) : rule.to === null && rule.basis === 'leave') && BASES.has(rule.basis)
    && (rule.basis !== 'factor' || (typeof rule.factor === 'number' && rule.factor > 0 && rule.factor <= 10))
    && (rule.keeps ?? []).every(role => data.roles.includes(role)) && (rule.failsIn ?? []).every(c => data.contexts.includes(c))
    && (!rule.note || words(rule.note)) && (!rule.step || words(rule.step)) && !(rule.note && rule.step)
    && tableFood(rule.from) && (rule.to === null || tableFood(rule.to))
    // A stand-in key carries another food's figures, so an amount matched on sodium or fat would not be accurate.
    && !((rule.basis === 'sodium' || rule.basis === 'fat') && (tableFood(rule.from).analogue || tableFood(rule.to).analogue));
}
const rulesFrom = new Map();
export const invalidRules = [];
for (const rule of data.rules) {
  if (!validRule(rule)) { invalidRules.push(`${rule.from} -> ${rule.to}`); continue; }
  rulesFrom.set(rule.from, [...(rulesFrom.get(rule.from) ?? []), rule]);
}
// Roles small enough for My ingredients to fill quietly from what the member has (a missing oyster sauce, not a missing tofu).
const SMALL = new Set(['season', 'sweeten', 'sour', 'heat', 'fat', 'flavour-oil', 'thicken', 'liquid']);
/** The foods a reviewed rule can put in place of `key` when `key` is a seasoning or similar small part; none for main foods. */
export function swapTargets(key) {
  const roles = data.profiles[key]?.roles ?? [];
  if (!roles.length || !roles.every(role => SMALL.has(role))) return [];
  return (rulesFrom.get(key) ?? []).filter(rule => rule.to && !rule.failsIn?.length).map(rule => rule.to);
}

const HEAT = /\b(fr(y|ied|ies)|stir[- ]?fr|boil|simmer|steam|bake|roast|cook|saut|braise|blanch|grill|toast|heat|microwave)/i;
const ROLE_CUES = {
  thicken: /\b(slurry|thicken)/i, coat: /\b(coat|dredge|dust|batter|crisp)/i, bind: /\b(bind|dough|form into|shape into|patties)/i,
  garnish: /\b(garnish|sprinkle|scatter|top with|to serve|serve with|finish with)/i, protein: /\b(scrambl|omelet|beaten eggs?)/i,
  aromatic: /\b(fragrant|aromatic|until soft|sweat)/i,
};
const contains = (name, key) => [...new Set([...containsFor([{ name }]), ...(data.profiles[key]?.contains ?? [])])];
/** What a prepared ingredient's label may hide, as the app reads it (src/utils/recipe-dietary.ts), so labels lost to a swap match. */
const hides = (line) => line.labelChecked ? [] : COMPOUND_RULES.filter(rule => rule.pattern.test(String(line.name ?? ''))).flatMap(rule => rule.hides);
/** The labels the app shows for a contains list and what the ingredients' labels may hide. */
const shown = (list, hidden) => labelsFor([...new Set([...list, ...hidden])]);

/** The text of the steps that use a line, by id or by name. */
function stepText(recipe, line, mention) {
  const lower = mention?.toLowerCase();
  return (recipe.steps ?? []).filter(step => step.ingredientIds?.includes(line.id) || (lower && String(step.instruction ?? '').toLowerCase().includes(lower)))
    .map(step => String(step.instruction ?? '')).join(' ');
}
// Head words too general to name one ingredient on their own.
const GENERAL = new Set(['sauce', 'paste', 'beans', 'leaves', 'seeds', 'powder', 'pieces', 'mix', 'water', 'liquid', 'skins', 'sheets', 'cubes']);
const named = (text, form) => new RegExp(`(?<![a-z])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`).test(text);
/**
 * The forms of the line's name that the steps use, longest first ("Chilli bean paste (doubanjiang)" is "bean paste" there, "Light
 * soy sauce" is "light soy"), so the app can name the swap in the step text. A form another line's name also holds ("oil" beside
 * sesame oil, "soy sauce" beside light and dark soy), a general head word on its own or a leading adjective ("light") is never used.
 */
function mentionsOf(recipe, line, hit) {
  const text = (recipe.steps ?? []).map(step => String(step.instruction ?? '')).join(' ').toLowerCase();
  const name = String(line.name ?? '').toLowerCase(), base = name.split(/[,(]/)[0].trim(), words = base.split(/\s+/).filter(Boolean);
  // Notes in brackets ("check label") are not names.
  const inside = [...name.matchAll(/\(([^)]*)\)/g)].flatMap(match => match[1].split(',')).map(part => part.trim()).filter(part => !/\b(check|label)/.test(part));
  const others = (recipe.ingredients ?? []).filter(other => other.id !== line.id).map(other => String(other.name ?? '').toLowerCase());
  const forms = [name, base, String(hit.text ?? '').toLowerCase(), ...inside,
    ...words.map((_, i) => words.slice(i).join(' ')), ...words.slice(1).map((_, i) => words.slice(0, i + 2).join(' '))];
  return [...new Set(forms)].filter(form => form.length >= 3 && !(form.split(' ').length === 1 && GENERAL.has(form))
    && named(text, form) && !others.some(other => named(other, form)))
    .sort((x, y) => y.length - x.length).slice(0, 6);
}

const round = (value, step) => Math.round(value / step) * step;
/** A kitchen-friendly amount: tsp to ¼, tbsp to ½, cups to ¼; grams to 5 from 20 g, to 1 below. */
function volumeAmount(ml) {
  if (ml >= 60) return { amount: Math.max(0.25, round(ml / 240, 0.25)), unit: 'cup' };
  if (ml >= 15) return { amount: round(ml / 15, 0.5), unit: 'tbsp' };
  return { amount: Math.max(0.25, round(ml / 5, 0.25)), unit: 'tsp' };
}
const gramAmount = grams => ({ amount: grams >= 20 ? round(grams, 5) : grams >= 2 ? Math.round(grams) : Math.max(0.1, Math.round(grams * 10) / 10), unit: 'g' });

/** Grams of the swap for a weighed line, by the rule's basis; null when the basis needs a figure the library lacks. */
function targetGrams(rule, grams) {
  if (rule.basis === 'weight' || rule.basis === 'volume') return grams;
  if (rule.basis === 'factor') return grams * rule.factor;
  const key = rule.basis === 'sodium' ? 'sodium' : 'fat', a = tablePer100(rule.from)?.[key], b = tablePer100(rule.to)?.[key];
  return a > 0 && b > 0 ? grams * a / b : null;
}

/** The swap's amount in the line's own kind of unit (volume, weight or count), and its grams when they are known. */
function amountFor(rule, line, from) {
  if (line.amount === null || line.amount === undefined) return { amount: null, unit: '', grams: null, fromGrams: null };
  const fromGrams = gramsFor(line, from), to = tableFood(rule.to), unit = unitOf(line.unit);
  if (fromGrams === undefined) {
    // An amount the table cannot weigh ("1 bunch") keeps its unit when the swap is like for like.
    if (rule.basis === 'weight' || rule.basis === 'volume') return { amount: line.amount, unit: line.unit, grams: null, fromGrams: null };
    if (rule.basis === 'factor') return { amount: round(line.amount * rule.factor, 0.25) || 0.25, unit: line.unit, grams: null, fromGrams: null };
    return null;
  }
  if (rule.basis === 'volume' && volumeMl(unit) !== undefined) {
    const grams = to.gPerMl ? line.amount * volumeMl(unit) * to.gPerMl : fromGrams;
    return { amount: line.amount, unit: line.unit, grams, fromGrams };
  }
  const grams = targetGrams(rule, fromGrams);
  if (grams === null) return null;
  const counted = countUnits.has(unit) || unit === 'each' ? (to.per?.[unit] ?? to.each) : undefined;
  const spooned = to.gPerMl && (volumeMl(unit) !== undefined || (!counted && !/^(g|grams?|kg)$/.test(unit) && data.profiles[rule.to].roles.some(r => SPOONED.has(r))));
  const shown = spooned ? volumeAmount(grams / to.gPerMl)
    : counted ? { amount: Math.max(0.5, round(grams / counted, 0.5)), unit: line.unit }
      : gramAmount(grams);
  return { ...shown, grams, fromGrams };
}

/** Per-serving change of every figure, and the figures it cannot work out (a food the library has no value for). */
function nutritionDelta(rule, fromGrams, grams, servings) {
  if (fromGrams === null || (grams === null && rule.basis !== 'leave')) return null;
  const a = tablePer100(rule.from), negligible = rule.to !== null && tableFood(rule.to)?.negligible;
  const b = rule.to === null || negligible ? null : tablePer100(rule.to);
  const delta = {}, unknown = [];
  for (const key of FIGURES) {
    const before = a?.[key], after = rule.to === null || negligible ? 0 : b?.[key];
    if (typeof before !== 'number' || typeof after !== 'number') { unknown.push(key); continue; }
    const change = (after * (grams ?? 0) - before * fromGrams) / 100 / servings;
    delta[key] = key === 'kcal' ? Math.round(change) : Math.round(change * 100) / 100;
  }
  return { delta, unknown };
}

const NOTES = {
  Vegan: { en: 'not vegan', zh: '非纯素' }, Vegetarian: { en: 'has five pungent', zh: '含五辛' },
  // A prepared swap whose label may hide what the recipe was free of.
  maybeVegan: { en: 'may not be vegan', zh: '可能非纯素' }, maybeVegetarian: { en: 'may have five pungent', zh: '可能含五辛' },
  Peanuts: { en: 'contains peanuts', zh: '含花生' }, 'Tree nuts': { en: 'contains tree nuts', zh: '含坚果' },
  Gluten: { en: 'contains gluten', zh: '含麸质' }, protein: { en: 'less protein', zh: '蛋白质较少' },
};
/** The one note, in priority order; none when nothing that matters changes. */
function noteFor(rule, before, after, add, nutrition, recipe) {
  const lost = recipe.dietary?.ingredientsKnown === false ? undefined
    : shown(before.contains, before.hidden).find(label => label !== 'Plant-Based' && !shown(after.contains, after.hidden).includes(label));
  if (lost) return labelsFor(after.contains).includes(lost) ? NOTES['maybe' + lost] : NOTES[lost];
  const allergen = ALLERGENS.find(tag => add.includes(tag));
  if (allergen) return NOTES[allergen];
  if (rule.step) return rule.step;
  if (rule.note) return rule.note;
  const protein = recipe.nutrition?.perServing?.protein, drop = nutrition?.delta.protein;
  if (typeof protein === 'number' && typeof drop === 'number' && drop <= -3 && -drop >= protein * 0.25) return NOTES.protein;
  return undefined;
}

/** What every option for one line is worked out from: its food, role, cooking context and the exclusions it removes. */
function lineContext(recipe, line, others, othersHidden, recipeContains, inRecipe) {
  const hit = matchFood(line.name);
  if (!hit || hit.food.negligible || !data.profiles[hit.key]) return null;
  const profile = data.profiles[hit.key], mentions = mentionsOf(recipe, line, hit), text = stepText(recipe, line, mentions[0]);
  const role = profile.roles.find(r => ROLE_CUES[r]?.test(text)) ?? profile.roles[0];
  const recipeText = (recipe.steps ?? []).map(step => String(step.instruction ?? '')).join(' ');
  const context = new Set([...(/\b(bake|oven|preheat)/i.test(recipeText) ? ['baking'] : []), ...(/deep[- ]?fr/i.test(recipeText) ? ['deep-fry'] : []),
    HEAT.test(text || recipeText) ? 'cooked' : 'raw']);
  const remove = contains(String(line.name ?? ''), hit.key).filter(tag => !others.includes(tag) && recipeContains.includes(tag));
  return { recipe, line, hit, profile, mentions, text, role, context, remove, othersHidden, recipeContains, inRecipe };
}

/** One option for a rule (a reviewed one, or one code built for an AI pick), or null when its amount cannot be worked out. */
function buildOption(ctx, rule) {
  const { recipe, line, hit, remove, othersHidden, recipeContains } = ctx;
  const to = rule.to === null ? null : data.profiles[rule.to];
  const amount = rule.basis === 'leave' ? { amount: null, unit: '', grams: 0, fromGrams: line.amount == null ? null : gramsFor(line, hit.food) ?? null } : amountFor(rule, line, hit.food);
  if (!amount) return null;
  const kept = recipeContains.filter(tag => !remove.includes(tag));
  // `tags` is everything the new food carries (the app re-adds it after any swap's removals); `add` is only what is new here, for the note.
  const tags = to ? contains(to.name.en, rule.to) : [], add = tags.filter(tag => !kept.includes(tag));
  // "To taste" lines are left out of every estimate, so swapping one changes no figure.
  const nutrition = line.amount === null || line.amount === undefined ? { delta: {}, unknown: [] }
    : recipe.servings > 0 ? nutritionDelta(rule, amount.fromGrams, amount.grams, recipe.servings) : null;
  const afterContains = [...kept, ...add];
  const before = { contains: recipeContains, hidden: [...othersHidden, ...hides(line)] };
  const after = { contains: afterContains, hidden: to ? [...othersHidden, ...hides({ name: to.name.en })] : othersHidden };
  const note = noteFor(rule, before, after, add, nutrition, recipe);
  return { to: rule.to, ...(to ? { name: to.name } : { leave: true }), amount: amount.amount, unit: amount.unit,
    ...(note ? { note } : {}), ...(rule.step ? { step: rule.step } : {}), contains: { add: tags, remove }, nutrition };
}

/** The reviewed rules that fit the line's role and context, skipping foods the recipe already has ("the black beans and black beans"). */
const fitting = ctx => (rulesFrom.get(ctx.hit.key) ?? []).filter(rule => (rule.keeps ?? ctx.profile.roles).includes(ctx.role)
  && !(rule.failsIn ?? []).some(c => ctx.context.has(c)) && !ctx.inRecipe.has(rule.to));

/** Every applicable swap for one line, in the rules' order (the first three shown), or null when the line has none. */
function optionsFor(ctx) {
  if (!ctx || !rulesFrom.has(ctx.hit.key)) return null;
  const options = fitting(ctx).map(rule => buildOption(ctx, rule)).filter(Boolean);
  return options.length ? { id: ctx.line.id, key: ctx.hit.key, mentions: ctx.mentions, options: options.slice(0, 3), more: options.slice(3) } : null;
}

/** Each line's context, with what the other lines already hold. */
function contexts(recipe) {
  const lines = recipe.ingredients ?? [], recipeContains = recipe.dietary?.contains ?? containsFor(lines);
  const keys = lines.map(line => matchFood(line.name)?.key), hidden = lines.map(hides);
  const each = lines.map((line, index) => contains(String(line.name ?? ''), keys[index]));
  return lines.map((line, index) => {
    const others = (list) => list.filter((_, other) => other !== index).flat();
    return lineContext(recipe, line, others(each), others(hidden), recipeContains, new Set(others(keys)));
  });
}

/** Swaps for every line of a recipe that has some: { id, revision, lines: [...] }. */
export function swapPlan(recipe) {
  return { id: recipe.id, revision: recipe.revision ?? 1, lines: contexts(recipe).map(optionsFor).filter(Boolean) };
}

/**
 * For the AI under More options (server/swaps/ai.mjs): the line's food, role and context in words, and up to ten library foods
 * that share its role, are in the recipe table and are not already offered or in the recipe. Null for a line with no profile.
 */
export function aiCandidates(recipe, lineId) {
  const ctx = contexts(recipe).find(item => item?.line.id === lineId);
  return ctx ? { key: ctx.hit.key, name: ctx.profile.name, role: ctx.role, context: [...ctx.context], steps: ctx.text,
    candidates: candidatesFor(ctx).map(key => ({ key, name: data.profiles[key].name, roles: data.profiles[key].roles })) } : null;
}
// How many reviewed rules swap to each food: foods cooks reach for often are the safer candidates.
const targeted = new Map();
for (const rules of rulesFrom.values()) for (const rule of rules) if (rule.to) targeted.set(rule.to, (targeted.get(rule.to) ?? 0) + 1);
/** Up to ten foods with the line's role, most alike first: more roles in common with the line's food, then more often a rule's target. */
function candidatesFor(ctx) {
  const offered = new Set(fitting(ctx).map(rule => rule.to)), mine = new Set(ctx.profile.roles);
  return Object.entries(data.profiles).filter(([key, profile]) => key !== ctx.hit.key && !offered.has(key) && !ctx.inRecipe.has(key)
    && profile.roles.includes(ctx.role) && tableFood(key))
    .map(([key, profile]) => ({ key, shared: profile.roles.filter(role => mine.has(role)).length, used: targeted.get(key) ?? 0 }))
    .sort((a, b) => b.shared - a.shared || b.used - a.used || a.key.localeCompare(b.key)).slice(0, 10).map(c => c.key);
}

/**
 * Options for the AI's picks, built by code exactly like reviewed swaps: the amount by a basis code chooses from the role (sodium
 * for salty seasonings, fat for fats, otherwise volume or weight like for like), the labels and allergens it changes, the figures,
 * and at most one note (the AI's short note or step change only when code finds nothing that matters more). Picks outside the
 * candidates are dropped.
 */
export function aiOptions(recipe, lineId, picks) {
  const ctx = contexts(recipe).find(item => item?.line.id === lineId);
  if (!ctx) return [];
  const allowed = new Set(candidatesFor(ctx));
  const stand = key => !!tableFood(key)?.analogue;
  return picks.filter(pick => allowed.has(pick.to)).map(pick => {
    const basis = ctx.role === 'season' && !stand(ctx.hit.key) && !stand(pick.to) && tablePer100(ctx.hit.key)?.sodium > 0 && tablePer100(pick.to)?.sodium > 0 ? 'sodium'
      : ['fat', 'flavour-oil'].includes(ctx.role) && !stand(ctx.hit.key) && !stand(pick.to) ? 'fat' : volumeMl(unitOf(ctx.line.unit)) !== undefined ? 'volume' : 'weight';
    const option = buildOption(ctx, { from: ctx.hit.key, to: pick.to, basis, ...(pick.step ? { step: pick.step } : pick.note ? { note: pick.note } : {}) });
    return option && { ...option, ai: true };
  }).filter(Boolean).slice(0, 3);
}
