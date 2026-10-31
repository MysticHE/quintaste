import { existsSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pool, logger } from '../config.mjs';
import { GeminiError } from './gemini.mjs';
import { house, recipeSchema, searchSystem, videoPrompt, videoSystem, requestPrompt, demandPrompt } from './prompts.mjs';
import { obtain } from './video-job.mjs';
import { canDownload, downloadVideo } from './download.mjs';
import { clip, toRecipe } from './recipe.mjs';
import { failJob, finishJob, noPungentFor, progress } from './pipeline.mjs';
import { frameAt, framesAvailable, photoJpeg, shrinkVideo, videoSeconds } from './frames.mjs';
import { jobDir, jobPath, removeDir } from './work.mjs';

/**
 * The QT bots engine. The worker hands a job over (`handToBots`: the video is fetched and kept on the app's disk), the
 * bots claim it through the signed routes in bot-router.mjs, write the recipe JSON and post it back, and the worker
 * finishes it (`settleBotTasks`): the same checks as a Gemini result, step photos taken at the seconds the bots gave,
 * nutrition from the ingredient table, then live or staff review. No Gemini call is made on this path, and nothing
 * falls back to Gemini: a bot failure or silence fails the job.
 */
const ANSWER_MINUTES = 30, HERMES_MAX_BYTES = 30 * 1024 * 1024, BOT_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

/** A video the bots' model can take: the original when small and in a format Hermes reads, otherwise a 480p MP4. */
async function botVideo(file, dir) {
  const size = (await stat(file)).size, ext = path.extname(file).toLowerCase();
  if (size <= HERMES_MAX_BYTES && BOT_EXTENSIONS.has(ext)) return { path: file, size, mimeType: ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : 'video/quicktime' };
  if (!framesAvailable()) throw new GeminiError(413, 'That video is too large to read. Try a shorter clip.');
  const smaller = await shrinkVideo(file, path.join(dir, 'bot.mp4'));
  const smallerSize = smaller ? (await stat(smaller)).size : 0;
  if (!smaller || smallerSize > HERMES_MAX_BYTES) throw new GeminiError(413, 'That video is too large to read. Try a shorter clip.');
  return { path: smaller, size: smallerSize, mimeType: 'video/mp4' };
}

/**
 * Prepares the job for the bots; the job stays `working` until they answer or the wait runs out. A video job always
 * reaches the bots with a file: YouTube links are downloaded here as well, and a link that cannot be opened fails now
 * instead of costing the bots a run.
 */
export async function handToBots(job) {
  const usage = { calls: [], bytes: 0, engine: 'bots' };
  const dir = await jobDir(job.id);
  let upload = null;
  try {
    let payload;
    if (job.kind === 'video') {
      const got = await obtain(job, dir, undefined, progress(job));
      upload = got.upload ?? null;
      let original = got.local?.path ?? null, creator = got.creator, caption = got.caption;
      if (!original && got.link && canDownload(got.link)) {
        await progress(job)('Downloading the video…');
        const download = await downloadVideo(got.link, dir, undefined);
        original = download.path; creator = creator || download.creator; caption = caption || download.caption;
      }
      if (!original) throw new GeminiError(422, 'This video could not be opened. Save it on your phone, then tap Upload Video.');
      const video = await botVideo(original, dir);
      payload = { kind: 'video', link: got.link?.canonical ?? null, platform: got.link?.platform ?? 'upload', caption: clip(caption, 2000), creator: clip(creator, 80),
        video: { bytes: video.size, mimeType: video.mimeType },
        // Server-only: never sent to the bots.
        _file: video.path, _upload: upload };
    } else payload = { kind: job.kind, request: job.input, noPungent: await noPungentFor(job) };
    await pool.query(`INSERT INTO recipes.ai_bot_task (job_id, payload) VALUES ($1, $2)
      ON CONFLICT (job_id) DO UPDATE SET status='queued', payload=EXCLUDED.payload, result=NULL, error='', claimed_at=NULL, answered_at=NULL, settling_at=NULL, created_at=now()`, [job.id, payload]);
    await progress(job)('In line…');
    return 'working';
  } catch (error) {
    await removeDir(dir);
    if (upload) await rm(upload, { force: true }).catch(() => {});
    return failJob(job, error, usage);
  }
}

/** Gemini's schema dialect (upper-case types, `nullable`) as plain JSON Schema for the bots. */
function jsonSchema(node) {
  if (Array.isArray(node)) return node.map(jsonSchema);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'nullable') continue;
    out[key] = key === 'type' ? String(value).toLowerCase() : jsonSchema(value);
  }
  if (node.nullable && out.type) out.type = [out.type, 'null'];
  return out;
}
const botSchema = jsonSchema(recipeSchema);
const researchSystem = searchSystem.replace('Use Google Search to find', 'Use web_search to find, and web_extract to read,');

/** What the bots are asked to do: the same rules and schema the Gemini path uses. */
export function brief(payload) {
  if (payload.kind === 'video') {
    const context = (payload.caption ? "\n\nThe creator's caption (it may hold the written recipe; use it together with the video):\n" + payload.caption : '')
      + (payload.creator ? '\nCreator: ' + payload.creator : '');
    return { system: videoSystem, prompt: videoPrompt + context, schema: botSchema };
  }
  const ask = payload.kind === 'demand' ? demandPrompt(payload.request) : requestPrompt(payload.request, payload.noPungent === true);
  return { system: house + '\n' + researchSystem + '\nThen write the final recipe JSON from the version you propose. Set creator to the author of the page it mainly follows, and at and shotAt to null.',
    prompt: ask, schema: botSchema };
}

/** The task as the bots see it (no server paths). */
export function publicTask(jobId, payload) {
  const visible = Object.fromEntries(Object.entries(payload).filter(([key]) => !key.startsWith('_')));
  return { id: jobId, ...visible, video: payload.video ? { ...payload.video, path: `/api/ai-recipes/bot/tasks/${jobId}/video` } : null, brief: brief(payload) };
}

/** Step frames at the seconds the bots named (no second model review on this path), as references for QT Gamer. */
async function framesAtTimes(file, recipe) {
  const total = await videoSeconds(file);
  const clamp = t => Math.min(Math.max(0, t), Math.max(0, total - 0.5));
  const usable = t => Number.isFinite(t) && t >= 0 && (!total || t <= total);
  const steps = new Map();
  for (const [index, step] of recipe.steps.entries()) {
    const t = usable(step.shotAt) ? step.shotAt : usable(step.at) ? step.at + 2 : null;
    if (t === null) continue;
    const raw = await frameAt(file, clamp(t));
    const bytes = raw ? await photoJpeg(raw) : null;
    if (bytes) steps.set(index, bytes);
  }
  return { steps };
}

const isHttps = url => typeof url === 'string' && url.length <= 2000 && /^https:\/\//.test(url);
const memberMessage = error => error === 'timeout' ? 'Nothing answered in time. Try again later.' : 'This could not be read. Try again later.';

async function cleanup(jobId, payload) {
  await removeDir(jobPath(jobId));
  if (payload?._upload) await rm(payload._upload, { force: true }).catch(() => {});
}

/** Finishes one answered task: the bots' recipe through the usual checks, or their failure as the job's failure. */
async function settle(row) {
  const job = (await pool.query('SELECT * FROM recipes.ai_job WHERE id=$1', [row.job_id])).rows[0];
  const usage = { calls: [], bytes: row.payload?.video?.bytes ?? 0, engine: 'bots' };
  try {
    if (!job || job.status !== 'working') return;
    if (row.answered === 'failed') {
      usage.botError = clip(row.error, 300);
      await failJob(job, new GeminiError(502, memberMessage(row.error)), usage);
      return;
    }
    const result = row.result ?? {};
    if (result.usage && typeof result.usage === 'object') usage.calls.push({ model: clip(result.usage.model, 60) || 'qt-bots', input: Number(result.usage.input) || 0, output: Number(result.usage.output) || 0 });
    const payload = row.payload;
    if (payload.kind !== 'video') job.noPungent = payload.noPungent === true;  // the decision the bots wrote under, not today's choice
    const source = payload.kind === 'video'
      ? { kind: 'video', platform: payload.platform ?? 'upload', ...(payload.link ? { url: payload.link } : {}), creator: clip(payload.creator || result.recipe?.creator, 80) }
      : { kind: 'request', request: clip(job.input, 200), urls: [...new Set((result.sources ?? []).filter(isHttps))].slice(0, 6) };
    const recipe = toRecipe(result.recipe ?? {}, { source });
    await progress(job)('Choosing a photo for each step…');
    let photos = null;
    const file = payload._file && existsSync(payload._file) ? payload._file : null;
    try {
      if (file && framesAvailable()) photos = await framesAtTimes(file, recipe);
    } catch (error) { logger.warn({ event: 'ai_recipes_bot_frames_failed', detail: String(error?.message ?? error).slice(0, 160) }); }
    await finishJob(job, recipe, photos, usage, { aiNutrition: false });
  } catch (error) {
    await failJob(job, error, usage);
  } finally {
    await cleanup(row.job_id, row.payload);
    await pool.query("UPDATE recipes.ai_bot_task SET status='finished' WHERE job_id=$1", [row.job_id]).catch(() => {});
  }
}

let tableSeen = false, tableCheckedAt = 0;
/** True once schema v3 (recipes.ai_bot_task) is applied, so an older database keeps the Gemini path running. */
export async function botTableReady() {
  if (tableSeen || Date.now() - tableCheckedAt < 60000) return tableSeen;
  tableCheckedAt = Date.now();
  tableSeen = Boolean((await pool.query("SELECT to_regclass('recipes.ai_bot_task') AS t")).rows[0]?.t);
  return tableSeen;
}

/**
 * One worker pass over the bot queue. A queued task fails after 10 minutes when no bridge has asked for work in that
 * time (the bots are down), otherwise after 3 hours in line; a claimed task gets 30 minutes to answer. A task left
 * `settling` for 15 minutes (the process stopped mid-way) releases its job to the stale sweep. Then one answered task is
 * finished; it stays `settling`, which keeps the stale sweep away, until its job has its final status.
 */
export async function settleBotTasks() {
  if (!await botTableReady()) return;
  await pool.query(`UPDATE recipes.ai_bot_task SET status='failed', error='timeout', answered_at=now()
    WHERE (status='queued' AND (created_at < now() - interval '3 hours' OR (created_at < now() - interval '10 minutes'
        AND NOT EXISTS (SELECT 1 FROM recipes.ai_bot_bridge WHERE seen_at > now() - interval '10 minutes'))))
      OR (status='claimed' AND claimed_at < now() - make_interval(mins => $1))`, [ANSWER_MINUTES]);
  await pool.query("UPDATE recipes.ai_bot_task SET status='finished' WHERE status='settling' AND settling_at < now() - interval '15 minutes'");
  const row = (await pool.query(`WITH picked AS (
      SELECT job_id, status FROM recipes.ai_bot_task WHERE status IN ('done','failed') ORDER BY answered_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    UPDATE recipes.ai_bot_task t SET status='settling', settling_at=now() FROM picked WHERE t.job_id = picked.job_id
    RETURNING t.job_id, picked.status AS answered, t.payload, t.result, t.error`)).rows[0];
  if (row) await settle(row);
}

/** SQL fragment: a working job the bots still hold, which the 20-minute stale sweep must leave alone. */
export const HELD_BY_BOTS = `EXISTS (SELECT 1 FROM recipes.ai_bot_task t WHERE t.job_id = recipes.ai_job.id AND t.status <> 'finished')`;
