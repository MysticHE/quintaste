import { pool, logger } from '../config.mjs';
import { estimateNutrition } from '../nutrition/estimate.mjs';
import { categories as recipeCategories, veganConflict } from '../recipes/rules.mjs';
import { containsMeat } from '../market/rules.mjs';
import { GeminiError, generate } from './gemini.mjs';
import { recipeSchema, requestPrompt, searchSystem, structureSystem, videoPrompt, videoSystem } from './prompts.mjs';
import { loadVideo, parseLink } from './video.mjs';
import { deleteFile } from './files.mjs';
import { downloadToGemini, downloaderAvailable } from './download.mjs';
import { geminiConfig } from './gemini.mjs';

/** Confidence below this goes to staff review instead of straight to the feed. */
export const REVIEW_BELOW = 0.6;
const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
const clip = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** The model's JSON as a member recipe the app can render; throws GeminiError when it cannot be published. */
export function toRecipe(draft, { source }) {
  if (draft.isRecipe === false) throw new GeminiError(422, 'That does not look like a cooking recipe.');
  if (draft.diet === 'NotVegetarian') throw new GeminiError(422, 'QuinTaste recipes are vegetarian; this one uses meat or seafood.');
  const ids = new Map();
  const ingredients = (draft.ingredients ?? []).slice(0, 40).map(item => {
    const name = clip(item.name, 120);
    if (!name) return null;
    let id = slug(name), n = 1;
    while (ids.has(id)) id = slug(name) + '-' + ++n;
    ids.set(id, name.toLowerCase());
    const amount = typeof item.amount === 'number' && item.amount > 0 && item.amount <= 100000 ? Math.round(item.amount * 1000) / 1000 : null;
    return { id, name, amount, unit: amount === null ? '' : clip(item.unit, 24) || 'piece' };
  }).filter(Boolean);
  if (!ingredients.length) throw new GeminiError(422, 'No ingredients could be read from this source.');
  if (containsMeat(ingredients.map(i => i.name).join(', '))) throw new GeminiError(422, 'QuinTaste recipes are vegetarian; this one uses meat or seafood.');
  const diet = draft.diet === 'Vegan' && !ingredients.some(i => veganConflict(i.name)) ? 'Vegan' : 'Vegetarian';
  const byName = name => {
    const wanted = String(name ?? '').toLowerCase();
    return [...ids.entries()].find(([, n]) => n === wanted || n.includes(wanted) || wanted.includes(n))?.[0];
  };
  const steps = (draft.steps ?? []).slice(0, 30).map((step, index) => ({
    title: clip(step.title, 120) || 'Step ' + (index + 1),
    instruction: clip(step.instruction, 3000),
    minutes: Number.isInteger(step.timerMinutes) && step.timerMinutes >= 1 && step.timerMinutes <= 180 ? step.timerMinutes : null,
    ingredientIds: [...new Set((step.ingredientNames ?? []).map(byName).filter(Boolean))].slice(0, 40),
    ...(Number.isInteger(step.at) && step.at >= 0 && source.kind === 'video' ? { at: step.at } : {}),
  })).filter(step => step.instruction);
  if (!steps.length) throw new GeminiError(422, 'No steps could be read from this source.');
  const servings = Number.isInteger(draft.servings) ? Math.min(Math.max(draft.servings, 1), 8) : 2;
  const minutes = Number.isInteger(draft.minutes) ? Math.min(Math.max(draft.minutes, 1), 1440) : 30;
  const category = recipeCategories.includes(draft.category) ? draft.category : 'With rice';
  const author = clip(source.creator, 80) || clip(draft.creator, 80) || (source.kind === 'video' ? 'Video creator' : 'Sourced recipes');
  const recipe = {
    title: clip(draft.title, 100) || 'Untitled recipe', description: clip(draft.description, 2000), author, language: clip(draft.language, 40) || 'English',
    servings, minutes, diet, categories: [category], sponsorship: 'None', ingredients, steps, revision: 1,
    source: { ...source, notes: clip(draft.notes, 500), confidence: Math.min(Math.max(Number(draft.confidence) || 0, 0), 1) },
  };
  const nutrition = estimateNutrition({ servings, ingredients });
  if (nutrition) recipe.nutrition = nutrition;
  return recipe;
}

/** An uploaded video's job input: "upload <files/id> <mime type> [original link]". */
export function parseUpload(input) {
  const match = /^upload (files\/[a-z0-9-]{1,64}) (video\/[a-z0-9.+-]{1,40})(?: (https:\/\/\S{1,400}))?$/.exec(String(input));
  return match ? { name: match[1], mimeType: match[2], link: match[3] ?? null } : null;
}
const fileUri = name => 'https://generativelanguage.googleapis.com/v1beta/' + name;

async function fromVideo(job, signal, usage) {
  const upload = parseUpload(job.input);
  let stored = upload ? { name: upload.name, uri: fileUri(upload.name), mimeType: upload.mimeType } : null;
  try {
    let link = null, part, caption = '', creator = '';
    if (upload) {
      try { link = upload.link ? parseLink(upload.link) : null; } catch { link = null; }
      part = { file_data: { file_uri: stored.uri, mime_type: stored.mimeType } };
    } else {
      link = parseLink(job.input);
      if (link.platform === 'youtube') {
        part = { file_data: { file_uri: link.fileUri } };
        // The channel name for the credit and the title as context, from YouTube's public oEmbed (no key, no download).
        try {
          const response = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(link.canonical), { redirect: 'error', signal: AbortSignal.timeout(10000) });
          const info = /** @type {{ author_name?: string, title?: string }} */ (response.ok ? await response.json() : {});
          creator = clip(info.author_name, 80); caption = clip(info.title, 300);
        } catch { /* The model may still read the name from the video. */ }
      }
      else if (downloaderAvailable() && (await geminiConfig()).mode === 'direct') {
        const download = await downloadToGemini(link, signal);
        stored = download.file; usage.bytes = download.bytes; caption = download.caption; creator = download.creator;
        part = { file_data: { file_uri: stored.uri, mime_type: stored.mimeType } };
      } else {
        const video = await loadVideo(link, signal);
        part = video.part; usage.bytes = video.bytes;
      }
    }
    const context = (caption ? "\n\nThe creator's caption (it may hold the written recipe; use it together with the video):\n" + caption : '')
      + (creator ? '\nCreator: ' + creator : '');
    const result = await generate({ parts: [part, { text: videoPrompt + context }], schema: recipeSchema, system: videoSystem, signal });
    usage.calls.push(result.usage);
    return toRecipe(result.data, { source: { kind: 'video', platform: link?.platform ?? 'upload', ...(link ? { url: link.canonical } : {}),
      // The platform's own channel or uploader name wins over the model's reading of the video.
      creator: clip(creator || result.data.creator, 80) } });
  } finally {
    if (stored) await deleteFile(stored.name);
  }
}

async function fromRequest(job, signal, usage) {
  const research = await generate({ parts: [{ text: requestPrompt(job.input) }], system: searchSystem, tools: [{ google_search: {} }], signal, maxOutputTokens: 6000 });
  usage.calls.push(research.usage);
  const structured = await generate({ parts: [{ text: 'Research notes and proposed version:\n\n' + research.data }], schema: recipeSchema, system: structureSystem, signal });
  usage.calls.push(structured.usage);
  const sources = [...new Set(research.sources)].slice(0, 6);
  return toRecipe(structured.data, { source: { kind: 'request', request: clip(job.input, 200), urls: sources } });
}

/** Runs one job end to end and stores the result; returns the new job status. */
export async function runJob(job, signal) {
  const usage = { calls: [], bytes: 0 };
  try {
    const recipe = job.kind === 'video' ? await fromVideo(job, signal, usage) : await fromRequest(job, signal, usage);
    const review = recipe.source.confidence < REVIEW_BELOW;
    const row = (await pool.query(`INSERT INTO recipes.recipe (author_id, draft_key, live, live_revision, pending, pending_revision, pending_state, submitted_at, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8) RETURNING id`,
      [job.user_id, 'ai-' + job.id, review ? null : recipe, review ? null : 1, review ? recipe : null, review ? 1 : null, review ? 'review' : null, review ? null : new Date()])).rows[0];
    const status = review ? 'review' : 'published';
    await pool.query(`UPDATE recipes.ai_job SET status=$2, recipe_id=$3, message=$4, usage=$5, finished_at=now() WHERE id=$1`,
      [job.id, status, row.id, review ? 'Some quantities or steps were unclear, so staff will check it before it goes public.' : '', usage]);
    logger.info({ event: 'ai_recipe_job_done', kind: job.kind, status, calls: usage.calls.length });
    return status;
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'Something went wrong reading this. Try again later.';
    await pool.query(`UPDATE recipes.ai_job SET status='failed', message=$2, usage=$3, finished_at=now() WHERE id=$1`, [job.id, message.slice(0, 500), usage]);
    logger.warn({ event: 'ai_recipe_job_failed', kind: job.kind, status: error instanceof GeminiError ? error.status : 'internal', detail: error instanceof GeminiError ? undefined : String(error?.message ?? error).slice(0, 200) });
    return 'failed';
  }
}
