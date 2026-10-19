import { frameAt, photoJpeg, previewJpeg, videoSeconds } from './frames.mjs';
import { generate, generateImage } from './gemini.mjs';
import { photoReviewSchema, photoReviewSystem } from './prompts.mjs';

/**
 * Step photos and a cover for an AI recipe. With the video file: three candidate frames per step (around the moment
 * the model named and across the step), reviewed by the model against each step's text; steps with no fitting frame
 * get a second look at a moment the reviewer names. Without a file (YouTube blocks servers): one illustration per
 * step, reviewed the same way and redrawn once if it does not match. Unmatched steps simply have no photo.
 */
const BATCH = 8, MAX_ILLUSTRATIONS = 16;
const finite = value => typeof value === 'number' && Number.isFinite(value);

async function inPool(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await work(items[index], index); }
  }));
  return results;
}

/** One review call for a batch of steps; returns { stepNumber: { choice, betterAt } } and the cover label. */
async function review(title, steps, candidates, hasVideo, usage) {
  /** @type {Array<Record<string, unknown>>} */
  const parts = [{ text: `Recipe: ${title}\nSteps to check:\n` + steps.map(s => `${s.number}. ${s.title}: ${s.instruction}`).join('\n')
    + '\nPhotos follow, each after its label.' + (hasVideo ? '' : ' There is no video, so betterAt must be null.') }];
  for (const candidate of candidates) {
    parts.push({ text: 'Photo ' + candidate.label + (candidate.step ? ' (taken for step ' + candidate.step + ')' : ' (cover candidate)') });
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: candidate.preview.toString('base64') } });
  }
  const result = await generate({ parts, schema: photoReviewSchema, system: photoReviewSystem });
  usage.calls.push(result.usage);
  const picks = {};
  for (const row of result.data.steps ?? []) if (steps.some(s => s.number === row.step)) picks[row.step] = row;
  return { picks, cover: result.data.cover ?? null };
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
    const { picks, cover: coverLabel } = await review(recipe.title, steps, pool, hasVideo, usage);
    for (const number of batch) {
      const pick = picks[number], candidate = pool.find(c => c.label === pick?.choice && c.step === number);
      if (candidate && !used.has(candidate.label)) { chosen.set(number, candidate); used.add(candidate.label); }
      else misses.push({ number, betterAt: finite(pick?.betterAt) ? pick.betterAt : null });
    }
    if (last && coverLabel) coverPick = pool.find(c => c.label === coverLabel) ?? null;
  }
  return { misses, coverPick };
}

async function candidate(file, seconds, label, step) {
  const bytes = await frameAt(file, seconds);
  return bytes ? { label, step, bytes, preview: await previewJpeg(bytes) } : null;
}

/** Real frames from the downloaded or uploaded video. */
export async function framesFor(file, recipe, { coverAt = null } = {}, usage) {
  const total = await videoSeconds(file);
  const clamp = t => Math.round(Math.min(Math.max(0, t), Math.max(0, total - 0.5)) * 2) / 2;
  const jobs = [];
  recipe.steps.forEach((step, index) => {
    const start = finite(step.at) ? step.at : null, next = recipe.steps.slice(index + 1).find(s => finite(s.at))?.at;
    if (start === null && !finite(step.shotAt)) return;
    const from = start ?? step.shotAt, to = finite(next) && next > from ? next : Math.min(from + 15, total || from + 15);
    const times = [step.shotAt, from + (to - from) * 0.35, from + (to - from) * 0.7].filter(finite).map(clamp);
    [...new Set(times)].slice(0, 3).forEach((t, n) => jobs.push({ t, label: `S${index + 1}-${'ABC'[n]}`, step: index + 1 }));
  });
  const coverTimes = [coverAt, total - 2, total * 0.9].filter(t => finite(t) && t > 0).map(clamp);
  [...new Set(coverTimes)].slice(0, 3).forEach((t, n) => jobs.push({ t, label: `C-${'ABC'[n]}`, step: null }));
  const made = (await inPool(jobs, 3, job => candidate(file, job.t, job.label, job.step))).filter(Boolean);
  const chosen = new Map();
  const steps = made.filter(c => c.step), cover = made.filter(c => !c.step);
  const first = await reviewAll(recipe, steps, chosen, true, usage, cover);
  const retry = first.misses.filter(m => finite(m.betterAt));
  if (retry.length) {
    const second = (await inPool(retry.flatMap(m => [0, 1.5].map((offset, n) => ({ t: clamp(m.betterAt + offset), label: `S${m.number}-R${n}`, step: m.number }))), 3,
      job => candidate(file, job.t, job.label, job.step))).filter(Boolean);
    if (second.length) await reviewAll(recipe, second, chosen, true, usage);
  }
  return finish(chosen, first.coverPick?.bytes ?? null, 'frame');
}

/** Drawn step illustrations for videos the server cannot download; the cover is the video's own thumbnail. */
export async function illustrationsFor(recipe, coverBytes, usage) {
  const names = new Map(recipe.ingredients.map(i => [i.id, i.name]));
  const draw = async (step, number, note = '') => {
    const ingredients = step.ingredientIds.map(id => names.get(id)).filter(Boolean).join(', ');
    const image = await generateImage(`Photorealistic photo of one step of the home-cooked vegetarian recipe "${recipe.title}". Step ${number}: ${step.instruction}`
      + (ingredients ? ` Ingredients in this step: ${ingredients}.` : '') + ' Show exactly this stage with the right ingredients and cookware, natural kitchen light,'
      + ' seen from above or at a slight angle. No faces, no text, no logos, no meat or seafood.' + (note ? ` Avoid this mistake from a previous attempt: ${note}` : ''));
    usage.images = (usage.images ?? 0) + 1;
    if (!image) return null;
    const bytes = await photoJpeg(image.bytes);
    return bytes ? { label: `S${number}-A`, step: number, bytes, preview: await previewJpeg(bytes) } : null;
  };
  const steps = recipe.steps.slice(0, MAX_ILLUSTRATIONS);
  const chosen = new Map();
  const first = (await inPool(steps, 3, (step, index) => draw(step, index + 1))).filter(Boolean);
  const { misses } = await reviewAll(recipe, first, chosen, false, usage);
  const redo = (await inPool(misses.filter(m => m.number <= steps.length), 3, m => draw(recipe.steps[m.number - 1], m.number, 'it did not match the step')))
    .filter(Boolean).map(c => ({ ...c, label: `S${c.step}-B` }));
  if (redo.length) await reviewAll(recipe, redo, chosen, false, usage);
  return finish(chosen, coverBytes, 'illustration');
}

async function finish(chosen, coverBytes, kind) {
  const steps = new Map();
  for (const [number, candidate] of chosen) {
    const bytes = await photoJpeg(candidate.bytes);
    if (bytes) steps.set(number - 1, bytes);
  }
  return { cover: coverBytes ? await photoJpeg(coverBytes) : null, steps, kind };
}
