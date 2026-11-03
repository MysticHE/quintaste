import express from 'express';
import { pool, logger } from '../config.mjs';
import { json, raw, signed } from '../bot-signature.mjs';
import { gapBrief, readDraft } from './drafts.mjs';
import { gapsReady } from './record.mjs';

/**
 * Routes the QT bots call to draft library additions (ops/qt-team/ai_recipes_bridge.py, slow lane), signed like the other bot
 * routes. A claimed gap gets 30 minutes; three tries, then it waits for staff as failed. An answer that fails the checks goes back in
 * line with the reason (the bots see it in the next brief) until the tries are used.
 */
export const gapBots = express.Router();
const ID = /^[a-f0-9-]{36}$/, CLAIM_MINUTES = 30, TRIES = 3;

/** The oldest queued gap, or { task: null }. Gaps whose claim ran out go back in line first (or fail after three tries). */
gapBots.post('/claim', raw('1kb'), signed, async (_req, res, next) => {
  try {
    if (!await gapsReady()) return res.json({ task: null });
    await pool.query(`INSERT INTO recipes.ai_bot_bridge (id, seen_at) VALUES ('qt-gaps', now()) ON CONFLICT (id) DO UPDATE SET seen_at = now()`);
    await pool.query(`UPDATE recipes.library_gap SET status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'queued' END, error = 'timeout'
      WHERE status = 'claimed' AND claimed_at < now() - make_interval(mins => $1)`, [CLAIM_MINUTES, TRIES]);
    const gap = (await pool.query(`WITH next AS (SELECT id FROM recipes.library_gap WHERE status = 'queued' ORDER BY queued_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      UPDATE recipes.library_gap g SET status = 'claimed', claimed_at = now(), attempts = attempts + 1 FROM next WHERE g.id = next.id
      RETURNING g.id, g.kind, g.key, g.label, g.context, g.error`)).rows[0];
    if (!gap) return res.json({ task: null });
    const brief = gapBrief(gap);
    if (gap.error && gap.error !== 'timeout') brief.prompt += `\n\nAn earlier draft was refused: ${gap.error}. Fix that.`;
    res.json({ task: { id: gap.id, kind: gap.kind, brief } });
  } catch (error) { next(error); }
});

/** The bots' draft, `{ skip }` when it is not a real dish or food, or `{ error }`. Only a claimed gap accepts one. */
// The edge's default body limit is 16 KB on this path (deploy/compose.yml), so the app takes the same.
gapBots.post('/tasks/:id/result', raw('16kb'), signed, async (req, res, next) => {
  try {
    if (!ID.test(req.params.id)) return res.sendStatus(404);
    const body = json(req);
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Send a draft, skip or error.' });
    const gap = (await pool.query("SELECT id, kind, key, label, context, attempts FROM recipes.library_gap WHERE id=$1 AND status='claimed'", [req.params.id])).rows[0];
    if (!gap) return res.status(409).json({ error: 'This gap is not waiting for a draft.' });
    let draft = null, problem = typeof body.error === 'string' ? body.error.slice(0, 300) : '';
    if (!problem) {
      try { draft = readDraft(gap, body); } catch (error) { problem = String(error.message).slice(0, 300); }
    }
    if (draft) await pool.query("UPDATE recipes.library_gap SET status='drafted', draft=$2, error='', drafted_at=now() WHERE id=$1", [gap.id, draft]);
    else await pool.query("UPDATE recipes.library_gap SET status = CASE WHEN attempts >= $3 THEN 'failed' ELSE 'queued' END, error=$2, queued_at=now() WHERE id=$1",
      [gap.id, problem || 'no draft', TRIES]);
    logger.info({ event: 'library_gap_draft', kind: gap.kind, drafted: !!draft, skip: !!draft?.skip });
    res.json({ ok: true, accepted: !!draft, ...(draft ? {} : { problem }) });
  } catch (error) { next(error); }
});
