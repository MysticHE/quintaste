import express from 'express';
import { Buffer } from 'node:buffer';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { pool, logger } from '../config.mjs';
import { botKey } from './engine.mjs';
import { publicTask } from './bots.mjs';

/**
 * Routes the QT bots call (ops/qt-team/ai_recipes_bridge.py), signed like the editorial publisher: X-QT-Time and
 * X-QT-Signature = HMAC-SHA256(key, time \n METHOD \n full path \n sha256(body)), five-minute window. They claim a task,
 * fetch its video, and post the recipe JSON or a failure. Nothing here publishes; the worker finishes every answer.
 */
export const aiRecipeBots = express.Router();
const ID = /^[a-f0-9-]{36}$/;
/** Well under the 300,000-byte limit on ai_bot_task.result (jsonb text adds spaces), so an oversize answer gets 413 here, not a database error. */
const RESULT_LIMIT = 240000;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function signed(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    const key = botKey(), time = req.get('X-QT-Time') ?? '', signature = req.get('X-QT-Signature') ?? '';
    if (key.length < 48 || !/^\d{10}$/.test(time) || Math.abs(Date.now() / 1000 - Number(time)) > 300 || !/^[a-f0-9]{64}$/.test(signature)) return res.sendStatus(401);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const expected = createHmac('sha256', key).update(time + '\n' + req.method + '\n' + req.originalUrl.split('?')[0] + '\n' + sha(body)).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.sendStatus(401);
    next();
  } catch { res.sendStatus(401); }
}
const raw = limit => express.raw({ type: 'application/json', limit });
const json = req => { try { return JSON.parse(req.body.toString('utf8') || '{}'); } catch { return null; } };

/** The oldest waiting task (members before wanted recipes), or { task: null }. */
aiRecipeBots.post('/claim', raw('1kb'), signed, async (_req, res, next) => {
  try {
    await pool.query(`INSERT INTO recipes.ai_bot_bridge (id, seen_at) VALUES ('qt-videomaker', now())
      ON CONFLICT (id) DO UPDATE SET seen_at = now()`);
    const row = (await pool.query(`WITH next AS (
        SELECT t.job_id FROM recipes.ai_bot_task t JOIN recipes.ai_job j ON j.id = t.job_id AND j.status = 'working'
        WHERE t.status = 'queued' ORDER BY j.kind = 'demand', t.created_at LIMIT 1 FOR UPDATE OF t SKIP LOCKED)
      UPDATE recipes.ai_bot_task t SET status='claimed', claimed_at=now(), attempts=attempts+1 FROM next WHERE t.job_id = next.job_id
      RETURNING t.job_id, t.payload`)).rows[0];
    if (!row) return res.json({ task: null });
    await pool.query("UPDATE recipes.ai_job SET message=$2 WHERE id=$1 AND status='working'", [row.job_id, row.payload.kind === 'video' ? 'Reading the video…' : 'Finding rated recipes…']);
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
