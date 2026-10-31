import { logger } from '../config.mjs';
import { frameAt, photoJpeg, previewJpeg, videoSeconds } from './frames.mjs';
import { generate } from './gemini.mjs';
import { photoReviewSchema, photoReviewSystem } from './prompts.mjs';

/**
 * The video frame for each step of an AI recipe. With the video file: three candidate frames per step (around the moment
 * the model named and across the step), reviewed by the model against each step's text; steps with no fitting frame
 * get a second look (the moment the reviewer names, or five frames across the step). The chosen frames are only
 * references: QT Gamer recreates each one as a clean picture, and draws the steps no frame shows (drawings.mjs).
 */
const BATCH = 12;
const finite = value => typeof value === 'number' && Number.isFinite(value);
/** The model may answer "Photo S1-A" or "s1-a"; reduce it to the bare label. */
const labelOf = value => /\b(?:S\d+|C)-(?:[A-C]|R\d)\b/i.exec(String(value ?? ''))?.[0].toUpperCase() ?? null;

async function inPool(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await work(items[index], index); }
  }));
  return results;
}

/** The whole method in short, so a check or a drawing knows what is already in the pan at each stage. */
export const method = recipe => recipe.steps.map((s, index) => `${index + 1}. ${s.instruction}`).join('\n');

/** One review call for a batch of steps; returns { stepNumber: { choice, betterAt, note } }. */
async function review(recipe, steps, candidates, hasVideo, usage, rules = '') {
  /** @type {Array<Record<string, unknown>>} */
  const parts = [{ text: `Recipe: ${recipe.title}\nWhole method:\n${method(recipe)}\n\nSteps to check:\n` + steps.map(s => `${s.number}. ${s.title}: ${s.instruction}`).join('\n')
    + '\nPhotos follow, each after its label.' + (hasVideo ? '' : ' There is no video, so betterAt must be null.') + (rules ? ' ' + rules : '') }];
  for (const candidate of candidates) {
    parts.push({ text: 'Photo ' + candidate.label + (candidate.step ? ' (taken for step ' + candidate.step + ')' : ' (cover candidate)') });
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: candidate.preview.toString('base64') } });
  }
  const result = await generate({ parts, schema: photoReviewSchema, system: photoReviewSystem });
  usage.calls.push(result.usage);
  const picks = {};
  for (const row of result.data.steps ?? []) {
    const step = Number(row.step);
    if (steps.some(s => s.number === step)) picks[step] = { ...row, choice: labelOf(row.choice) };
  }
  return { picks };
}

/** Reviews candidates in batches of steps and fills `chosen` (step number -> candidate); returns steps still missing. */
export async function reviewAll(recipe, candidates, chosen, hasVideo, usage, rules = '') {
  const numbers = [...new Set(candidates.filter(c => c.step).map(c => c.step))];
  const used = new Set([...chosen.values()].map(c => c.label));
  const misses = [];
  for (let i = 0; i < numbers.length; i += BATCH) {
    const batch = numbers.slice(i, i + BATCH);
    const steps = batch.map(number => ({ number, ...recipe.steps[number - 1] }));
    const pool = candidates.filter(c => batch.includes(c.step));
    const { picks } = await review(recipe, steps, pool, hasVideo, usage, rules);
    let unmatched = 0;
    for (const number of batch) {
      // A frame taken for a neighbouring step may show this one better; each frame is still used once. A drawing (no video)
      // was made for one step and only counts for that step.
      const pick = picks[number], found = pool.find(c => c.label === pick?.choice);
      if (pick?.choice && !found) unmatched++;
      const candidate = found && (hasVideo || found.step === number) ? found : null;
      if (candidate && !used.has(candidate.label)) { chosen.set(number, candidate); used.add(candidate.label); }
      else misses.push({ number, betterAt: finite(pick?.betterAt) ? pick.betterAt : null, note: String(pick?.note ?? '').slice(0, 300) });
    }
    if (unmatched) logger.warn({ event: 'ai_recipes_photo_unmatched', steps: batch.length, unmatched });
  }
  return { misses };
}

async function candidate(file, seconds, label, step) {
  const bytes = await frameAt(file, seconds);
  return bytes ? { label, step, bytes, preview: await previewJpeg(bytes) } : null;
}

/**
 * A time the model gave, in seconds within the video. Models sometimes write 1:04 as 104; such a value past the end
 * is read as minutes and seconds. Anything still outside the video is dropped.
 */
const seconds = (value, total) => {
  if (!finite(value) || value < 0) return null;
  if (!total || value <= total) return value;
  const minutes = Math.floor(value / 100) * 60 + (value % 100);
  return value % 100 < 60 && minutes <= total ? minutes : null;
};

/** Each step's span in the video: from its start to the next step's start (at most 20 s when the end is unknown). */
function spans(recipe, total) {
  const starts = recipe.steps.map(step => seconds(step.at, total) ?? seconds(step.shotAt, total));
  return recipe.steps.map((step, index) => {
    const from = starts[index];
    if (from === null) return null;
    const next = starts.slice(index + 1).find(t => t !== null && t > from);
    return { from, to: next ?? Math.min(from + 20, total || from + 20), shot: seconds(step.shotAt, total) };
  });
}

/**
 * Real frames from the downloaded or uploaded video, every one checked by the model against its step: two candidates per
 * step (the moment the model named, or a third of the way in, and later in the step), since the chosen frame is only
 * QT Gamer's reference and its clean picture is checked again (drawings.mjs).
 */
export async function framesFor(file, recipe, usage) {
  const total = await videoSeconds(file);
  const clamp = t => Math.round(Math.min(Math.max(0, t), Math.max(0, total - 0.5)) * 2) / 2;
  const take = jobs => inPool(jobs, 3, job => candidate(file, job.t, job.label, job.step)).then(made => made.filter(Boolean));
  const span = spans(recipe, total), jobs = [];
  span.forEach((s, index) => {
    if (!s) return;
    const times = [s.shot ?? s.from + (s.to - s.from) * 0.35, s.from + (s.to - s.from) * 0.7].filter(finite).map(clamp);
    [...new Set(times)].slice(0, 2).forEach((t, n) => jobs.push({ t, label: `S${index + 1}-${'AB'[n]}`, step: index + 1 }));
  });
  const made = await take(jobs);
  const chosen = new Map();
  const first = await reviewAll(recipe, made, chosen, true, usage);
  // Second look for every step still without a photo: the moment the reviewer named, else five frames across the
  // step's span widened by two seconds each side.
  const retry = first.misses.flatMap(m => {
    const s = span[m.number - 1], at = seconds(m.betterAt, total);
    const times = at !== null ? [at, at + 1.5] : s ? [0, 0.25, 0.5, 0.75, 1].map(f => s.from - 2 + (s.to - s.from + 4) * f) : [];
    return [...new Set(times.map(clamp))].map((t, n) => ({ t, label: `S${m.number}-R${n}`, step: m.number }));
  });
  if (retry.length) {
    const second = await take(retry);
    if (second.length) await reviewAll(recipe, second, chosen, true, usage);
  }
  return finish(chosen);
}

/** Knife work and washing on its own, which a reader follows without a picture. */
const PREP = /^((finely|roughly|thinly|coarsely)\s+)?(peel|chop|dice|mince|slice|cut|shred|halve|quarter|wash|rinse|trim|grate|pat|drain|soak|measure|prepare|set aside)\b/i;
const COOKING = /\b(pans?|woks?|pots?|oven|heat|fry|fries|fried|saut\w*|simmer|boil|bake|roast|steam|stir|toss|pour|serve|plate)\b/i;

/**
 * The steps (0-based) worth drawing when there are more than `count`: the last step (the finished dish) always, plain
 * prep steps dropped first, then an even spread over what is left so no stretch of the method goes unshown.
 */
export function stepsToDraw(recipe, indexes, count) {
  if (indexes.length <= count) return indexes;
  const prep = index => PREP.test(recipe.steps[index].instruction.trim()) && !COOKING.test(recipe.steps[index].instruction);
  // only the recipe's own final step is the finished dish; with `only` the last index may just be the last unfilmed step
  const final = recipe.steps.length - 1, keepFinal = indexes.includes(final), slots = keepFinal ? count - 1 : count;
  let pool = indexes.filter(index => index !== final);
  const prepSteps = pool.filter(prep);
  while (pool.length > slots && prepSteps.length) { const drop = prepSteps.shift(); pool = pool.filter(index => index !== drop); }
  if (pool.length > slots) pool = Array.from({ length: slots }, (_, n) => pool[Math.round(n * (pool.length - 1) / Math.max(1, slots - 1))]);
  return [...new Set([...pool, ...(keepFinal ? [final] : [])])].sort((a, b) => a - b);
}

/** The chosen frames keyed by 0-based step index. */
async function finish(chosen) {
  const steps = new Map();
  for (const [number, candidate] of chosen) {
    const bytes = await photoJpeg(candidate.bytes);
    if (bytes) steps.set(number - 1, bytes);
  }
  return { steps };
}
