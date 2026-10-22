import express from 'express';
import { pool, logger } from '../config.mjs';
import { json, raw, signed } from '../bot-signature.mjs';
import { SHAPE_SCHEMA, SHAPE_SYSTEM } from './levels-worker.mjs';

/**
 * Level shaping by QT Gamer (ops/qt-team/game_level_bridge.py, on the ChatGPT plan): the bridge claims a compiled draft, asks
 * its model for the shape and answers here. These routes only hand work out and take answers in; every check runs in the
 * level worker afterwards, so a bad answer can never become a level.
 */
const ID = /^[a-f0-9-]{36}$/;
const brief = draft => JSON.stringify({ recipe: { name: draft.recipe.name, categories: draft.recipe.categories }, steps: draft.stages,
  ...(draft.problem ? { previousAnswerRefused: draft.problem } : {}) });

export const gameLevelBots = express.Router();
gameLevelBots.post('/claim', raw('1kb'), signed, async (_req, res, next) => {
  try {
    const job = (await pool.query(`WITH next AS (SELECT id FROM game.level_job WHERE status='waiting' ORDER BY priority DESC, created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      UPDATE game.level_job j SET status='claimed', claimed_at=now(), started_at=coalesce(started_at, now()), attempts=attempts+1 FROM next WHERE j.id = next.id
      RETURNING j.id, j.draft`)).rows[0];
    res.json({ job: job ? { id: job.id, system: SHAPE_SYSTEM, context: brief(job.draft), schema: SHAPE_SCHEMA } : null });
  } catch (error) { next(error); }
});

gameLevelBots.post('/jobs/:id/answer', raw('30kb'), signed, async (req, res, next) => {
  try {
    const id = req.params.id, body = json(req);
    if (!ID.test(id) || !body) return res.sendStatus(400);
    const usage = body.usage && typeof body.usage === 'object' && !Array.isArray(body.usage) ? JSON.stringify(body.usage).slice(0, 2000) : '{}';
    const safeUsage = usage.endsWith('}') ? usage : '{}';
    if (typeof body.error === 'string') {
      const done = await pool.query(`UPDATE game.level_job SET status='failed', message=$2, usage=$3::jsonb, answered_at=now(), finished_at=now() WHERE id=$1 AND status='claimed'`,
        [id, ('QT Gamer: ' + body.error).slice(0, 300), safeUsage]);
      return done.rowCount ? res.json({ status: 'failed' }) : res.status(409).json({ error: 'job not claimed' });
    }
    if (!body.shape || typeof body.shape !== 'object' || Array.isArray(body.shape)) return res.status(422).json({ error: 'shape missing' });
    const done = await pool.query(`UPDATE game.level_job SET status='answered', answer=$2::jsonb, usage=$3::jsonb, answered_at=now() WHERE id=$1 AND status='claimed'`,
      [id, JSON.stringify({ shape: body.shape }), safeUsage]);
    if (!done.rowCount) return res.status(409).json({ error: 'job not claimed' });
    logger.info({ event: 'game_level_answered', job: id });
    res.json({ status: 'answered' });
  } catch (error) { next(error); }
});
