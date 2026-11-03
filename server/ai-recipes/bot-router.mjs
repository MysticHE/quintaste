import express from 'express';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { pool, logger } from '../config.mjs';
import { json, raw, signed } from '../bot-signature.mjs';
import { publicTask } from './bots.mjs';
import { CHOSEN_KINDS } from './snap.mjs';
import { answerDrawing, claimDrawing } from './drawings.mjs';

/**
 * Routes the QT bots call (ops/qt-team/ai_recipes_bridge.py), signed like the editorial publisher: X-QT-Time and
 * X-QT-Signature = HMAC-SHA256(key, time \n METHOD \n full path \n sha256(body)), five-minute window. They claim a task,
 * fetch its video, and post the recipe JSON or a failure. Nothing here publishes; the worker finishes every answer.
 */
export const aiRecipeBots = express.Router();
const ID = /^[a-f0-9-]{36}$/;
/** Well under the 300,000-byte limit on ai_bot_task.result (jsonb text adds spaces), so an oversize answer gets 413 here, not a database error. */
const RESULT_LIMIT = 240000;

const LANE_NAMES = ['quick', 'slow'];
const claimMessage = payload => payload.fix ? 'Balancing the nutrition…' : CHOSEN_KINDS.includes(payload.kind) ? 'Writing the recipe…'
  : payload.kind === 'video' ? 'Reading the video…' : 'Finding rated recipes…';

/**
 * The next task for a bridge, or { task: null }. Body `{ name, lanes }`: the bridge's name (its heartbeat, which tells the app the
 * lane is up) and the lanes it serves in its own order of preference; an older bridge sends nothing and serves both as
 * qt-videomaker. Inside the preferred lane: members with fewer tasks being written first (one member's burst never holds up
 * everyone else), wanted recipes after members', then oldest first.
 */
aiRecipeBots.post('/claim', raw('1kb'), signed, async (req, res, next) => {
  try {
    const body = json(req) ?? {};
    const name = typeof body.name === 'string' && /^[a-z0-9-]{1,40}$/.test(body.name) ? body.name : 'qt-videomaker';
    const lanes = Array.isArray(body.lanes) ? [...new Set(body.lanes.filter(lane => LANE_NAMES.includes(lane)))] : ['slow', 'quick'];
    if (!lanes.length) return res.status(400).json({ error: 'Name the lanes this bridge serves.' });
    await pool.query(`INSERT INTO recipes.ai_bot_bridge (id, seen_at) VALUES ($1, now()) ON CONFLICT (id) DO UPDATE SET seen_at = now()`, [name]);
    const row = (await pool.query(`WITH busy AS (
        SELECT cj.user_id, count(*) AS n FROM recipes.ai_bot_task c JOIN recipes.ai_job cj ON cj.id = c.job_id WHERE c.status = 'claimed' GROUP BY cj.user_id),
      next AS (
        SELECT t.job_id FROM recipes.ai_bot_task t JOIN recipes.ai_job j ON j.id = t.job_id AND j.status = 'working' LEFT JOIN busy b ON b.user_id = j.user_id
        WHERE t.status = 'queued' AND t.lane = ANY($1::text[])
        ORDER BY array_position($1::text[], t.lane), coalesce(b.n, 0), j.kind = 'demand', t.created_at
        LIMIT 1 FOR UPDATE OF t SKIP LOCKED)
      UPDATE recipes.ai_bot_task t SET status='claimed', claimed_at=now(), attempts=attempts+1 FROM next WHERE t.job_id = next.job_id
      RETURNING t.job_id, t.payload`, [lanes])).rows[0];
    if (!row) return res.json({ task: null });
    await pool.query("UPDATE recipes.ai_job SET message=$2 WHERE id=$1 AND status='working'", [row.job_id, claimMessage(row.payload)]);
    res.json({ task: publicTask(row.job_id, row.payload) });
  } catch (error) { next(error); }
});

/** The prepared video of a claimed task. */
aiRecipeBots.get('/tasks/:id/video', signed, async (req, res, next) => {
  try {
    if (!ID.test(req.params.id)) return res.sendStatus(404);
    const row = (await pool.query("SELECT payload FROM recipes.ai_bot_task WHERE job_id=$1 AND status='claimed'", [req.params.id])).rows[0];
    const file = row?.payload?._file;
    const info = file ? await stat(file).catch(() => null) : null;
    if (!info) return res.sendStatus(404);
    res.set({ 'Content-Type': row.payload.video?.mimeType ?? 'video/mp4', 'Content-Length': String(info.size) });
    // The job folder can be removed mid-transfer (timeout cleanup): end this response, never the process.
    await pipeline(createReadStream(file), res).catch(error => {
      logger.warn({ event: 'ai_recipe_bot_video_stream_failed', code: error?.code ?? 'unknown' });
      res.destroy();
    });
  } catch (error) { next(error); }
});

/** The bots' answer: { recipe, sources?, usage? } or { error }. Only a claimed task accepts one. */
aiRecipeBots.post('/tasks/:id/result', raw(RESULT_LIMIT), signed, async (req, res, next) => {
  try {
    if (!ID.test(req.params.id)) return res.sendStatus(404);
    const body = json(req);
    if (!body || (typeof body.error !== 'string' && (typeof body.recipe !== 'object' || body.recipe === null))) return res.status(400).json({ error: 'Send recipe or error.' });
    const failed = typeof body.error === 'string';
    const result = failed ? null : { recipe: body.recipe, sources: Array.isArray(body.sources) ? body.sources.slice(0, 20) : [], usage: body.usage ?? null };
    const updated = await pool.query(`UPDATE recipes.ai_bot_task SET status=$2, result=$3, error=$4, answered_at=now()
      WHERE job_id=$1 AND status='claimed' RETURNING job_id`, [req.params.id, failed ? 'failed' : 'done', result, failed ? String(body.error).slice(0, 300) : '']);
    if (!updated.rowCount) return res.status(409).json({ error: 'This task is not waiting for an answer.' });
    logger.info({ event: 'ai_recipe_bot_answer', failed });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

/** QT Gamer's drawing bridge: the oldest step drawing waiting, or { drawing: null }. */
aiRecipeBots.post('/drawings/claim', raw('1kb'), signed, async (_req, res, next) => {
  try { res.json({ drawing: await claimDrawing() }); } catch (error) { next(error); }
});

/** One drawing: { image: base64 JPEG/PNG/WebP } or { error }. Only a claimed drawing accepts one. */
aiRecipeBots.post('/drawings/:id/answer', raw('1mb'), signed, async (req, res, next) => {
  try {
    if (!ID.test(req.params.id)) return res.sendStatus(404);
    const body = json(req);
    const image = typeof body?.image === 'string' && body.image.length <= 1_000_000 ? Buffer.from(body.image, 'base64') : null;
    if (!image?.length && typeof body?.error !== 'string') return res.status(400).json({ error: 'Send image or error.' });
    const taken = await answerDrawing(req.params.id, image?.length ? { image } : { error: body.error });
    if (!taken) return res.status(409).json({ error: 'This drawing is not waiting for an answer.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
