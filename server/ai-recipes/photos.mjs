import { logger } from '../config.mjs';
import { frameAt, photoJpeg, previewJpeg, videoSeconds } from './frames.mjs';
import { generate, generateImage } from './gemini.mjs';
import { photoReviewSchema, photoReviewSystem } from './prompts.mjs';

/**
 * Step photos and a cover for an AI recipe. With the video file: three candidate frames per step (around the moment
 * the model named and across the step), reviewed by the model against each step's text; steps with no fitting frame
 * get a second look (the moment the reviewer names, or five frames across the step). Steps no frame shows, and every
 * step when there is no file (YouTube blocks servers), get an illustration reviewed the same way and redrawn once.
 */
const BATCH = 12, MAX_ILLUSTRATIONS = 24;
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
const method = recipe => recipe.steps.map((s, index) => `${index + 1}. ${s.instruction}`).join('\n');

/** One review call for a batch of steps; returns { stepNumber: { choice, betterAt, note } } and the cover label. */
async function review(recipe, steps, candidates, hasVideo, usage) {
  /** @type {Array<Record<string, unknown>>} */
  const parts = [{ text: `Recipe: ${recipe.title}\nWhole method:\n${method(recipe)}\n\nSteps to check:\n` + steps.map(s => `${s.number}. ${s.title}: ${s.instruction}`).join('\n')
    + '\nPhotos follow, each after its label.' + (hasVideo ? '' : ' There is no video, so betterAt must be null.') }];
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
  return { picks, cover: labelOf(result.data.cover) };
}

/** Reviews candidates in batches of steps and fills `chosen` (step number -> candidate); returns steps still missing. */
async function reviewAll(recipe, candidates, chosen, hasVideo, usage, cover = []) {
  const numbers = [...new Set(candidates.filter(c => c.step).map(c => c.step))];
  const used = new Set([...chosen.values()].map(c => c.label));
  let coverPick = null;
  const misses = [];
  for (let i = 0; i < numbers.length || (i === 0 && cover.length); i += BATCH) {
    const batch = numbers.slice(i, i + BATCH);
    const steps = batch.map(number => ({ number, ...recipe.steps[number - 1] }));
    const last = i + BATCH >= numbers.length;
    const pool = [...candidates.filter(c => batch.includes(c.step)), ...(last ? cover : [])];
    if (!pool.length) break;
    const { picks, cover: coverLabel } = await review(recipe, steps, pool, hasVideo, usage);
    let unmatched = 0;
    for (const number of batch) {
      // A frame taken for a neighbouring step may show this one better; each frame is still used once.
      const pick = picks[number], candidate = pool.find(c => c.label === pick?.choice);
      if (pick?.choice && !candidate) unmatched++;
      if (candidate && !used.has(candidate.label)) { chosen.set(number, candidate); used.add(candidate.label); }
      else misses.push({ number, betterAt: finite(pick?.betterAt) ? pick.betterAt : null, note: String(pick?.note ?? '').slice(0, 300) });
    }
    if (unmatched) logger.warn({ event: 'ai_recipes_photo_unmatched', steps: batch.length, unmatched });
    if (last && coverLabel) coverPick = pool.find(c => c.label === coverLabel) ?? null;
  }
  return { misses, coverPick };
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

/** Real frames from the downloaded or uploaded video, every one checked by the model against its step. */
export async function framesFor(file, recipe, { coverAt = null } = {}, usage) {
  const total = await videoSeconds(file);
  const clamp = t => Math.round(Math.min(Math.max(0, t), Math.max(0, total - 0.5)) * 2) / 2;
  const take = jobs => inPool(jobs, 3, job => candidate(file, job.t, job.label, job.step)).then(made => made.filter(Boolean));
  const span = spans(recipe, total), jobs = [];
  span.forEach((s, index) => {
    if (!s) return;
    const times = [s.shot, s.from + (s.to - s.from) * 0.35, s.from + (s.to - s.from) * 0.7].filter(finite).map(clamp);
    [...new Set(times)].slice(0, 3).forEach((t, n) => jobs.push({ t, label: `S${index + 1}-${'ABC'[n]}`, step: index + 1 }));
  });
  const coverTimes = [seconds(coverAt, total), total - 2, total * 0.9].filter(t => finite(t) && t > 0).map(clamp);
  [...new Set(coverTimes)].slice(0, 3).forEach((t, n) => jobs.push({ t, label: `C-${'ABC'[n]}`, step: null }));
  const made = await take(jobs);
  const chosen = new Map();
  const first = await reviewAll(recipe, made.filter(c => c.step), chosen, true, usage, made.filter(c => !c.step));
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
  return finish(chosen, first.coverPick?.bytes ?? null, 'frame');
}

/**
 * Drawn, reviewed step illustrations: for every step when the server cannot get the video (YouTube), or only for the
 * steps (0-based `only`) no frame shows, such as preparation the creator describes but does not film.
 */
export async function illustrationsFor(recipe, coverBytes, usage, only = null) {
  const names = new Map(recipe.ingredients.map(i => [i.id, i.name]));
  const draw = async (step, number, note = '') => {
    const ingredients = step.ingredientIds.map(id => names.get(id)).filter(Boolean).join(', ');
    const image = await generateImage(`Photorealistic photo of one step of the home-cooked vegetarian recipe "${recipe.title}".\nWhole method:\n${method(recipe)}\n\n`
      + `Draw step ${number} only: ${step.instruction}` + (ingredients ? ` Ingredients in this step: ${ingredients}.` : '')
      + ' Show exactly what is in the pan or on the board at this moment: what earlier steps put there plus this step, nothing the method adds later'
      + ' and nothing it cooks or serves separately. Right cookware, natural kitchen light, seen from above or at a slight angle.'
      + ' No faces, no readable text or labels on packaging, no logos, no meat or seafood.' + (note ? ` Avoid this mistake from a previous attempt: ${note}` : ''));
    usage.images = (usage.images ?? 0) + 1;
    if (!image) return null;
    const bytes = await photoJpeg(image.bytes);
    return bytes ? { label: `S${number}-A`, step: number, bytes, preview: await previewJpeg(bytes) } : null;
  };
  const indexes = (only ?? recipe.steps.map((_, index) => index)).slice(0, MAX_ILLUSTRATIONS);
  const chosen = new Map();
  const first = (await inPool(indexes, 3, index => draw(recipe.steps[index], index + 1))).filter(Boolean);
  const { misses } = await reviewAll(recipe, first, chosen, false, usage);
  const redo = (await inPool(misses, 3, m => draw(recipe.steps[m.number - 1], m.number, m.note || 'it did not match the step')))
    .filter(Boolean).map(c => ({ ...c, label: `S${c.step}-B` }));
  if (redo.length) await reviewAll(recipe, redo, chosen, false, usage);
  return finish(chosen, coverBytes, 'illustration');
}

/** Stored photos keyed by 0-based step index, with what each one is (a video frame or a drawn illustration). */
async function finish(chosen, coverBytes, kind) {
  const steps = new Map(), kinds = new Map();
  for (const [number, candidate] of chosen) {
    const bytes = await photoJpeg(candidate.bytes);
    if (bytes) { steps.set(number - 1, bytes); kinds.set(number - 1, kind); }
  }
  return { cover: coverBytes ? await photoJpeg(coverBytes) : null, steps, kinds };
}
