import express from 'express';
import { pool, logger } from '../config.mjs';
import { json, raw, signed } from '../bot-signature.mjs';
import { STALE_MINUTES, readAnswer } from './ai.mjs';

/**
 * Routes the QT bots call for swap AI options (ops/qt-team/ai_recipes_bridge.py), signed like the other bot routes: claim the
 * oldest waiting ask, post the picks or a failure. Nothing here is shown to members until code builds the options (ai.mjs).
 */
export const swapBots = express.Router();
const ID = /^[a-f0-9-]{36}$/;

/** The oldest waiting ask, or { task: null }. Asks older than STALE_MINUTES fail first: nobody waits for them any more. */
swapBots.post('/claim', raw('1kb'), signed, async (_req, res, next) => {
  try {
    await pool.query(`INSERT INTO recipes.ai_bot_bridge (id, seen_at) VALUES ('qt-swaps', now()) ON CONFLICT (id) DO UPDATE SET seen_at = now()`);
    await pool.query(`UPDATE recipes.swap_ai SET status='failed', error='timeout', answered_at=now()
      WHERE status='queued' AND created_at < now() - make_interval(mins => $1)`, [STALE_MINUTES]);
    const row = (await pool.query(`WITH next AS (SELECT id FROM recipes.swap_ai WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      UPDATE recipes.swap_ai s SET status='claimed', claimed_at=now(), attempts=attempts+1 FROM next WHERE s.id = next.id RETURNING s.id, s.payload`)).rows[0];
    res.json({ task: row ? { id: row.id, ...row.payload } : null });
  } catch (error) { next(error); }
});

/** The bots' answer: { picks, newItems? } or { error }. Only a claimed ask accepts one. */
swapBots.post('/tasks/:id/result', raw('12kb'), signed, async (req, res, next) => {
  try {
    if (!ID.test(req.params.id)) return res.sendStatus(404);
    const body = json(req);
    if (!body || (typeof body.error !== 'string' && !Array.isArray(body.picks))) return res.status(400).json({ error: 'Send picks or error.' });
    const task = (await pool.query("SELECT payload FROM recipes.swap_ai WHERE id=$1 AND status='claimed'", [req.params.id])).rows[0];
    if (!task) return res.status(409).json({ error: 'This task is not waiting for an answer.' });
    const failed = typeof body.error === 'string', result = failed ? null : readAnswer(body, task.payload.candidates ?? []);
    await pool.query(`UPDATE recipes.swap_ai SET status=$2, result=$3, error=$4, answered_at=now() WHERE id=$1 AND status='claimed'`,
      [req.params.id, failed ? 'failed' : 'done', result, failed ? String(body.error).slice(0, 300) : '']);
    logger.info({ event: 'swap_ai_answer', failed, picks: result?.picks.length ?? 0 });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
