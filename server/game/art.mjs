import express from 'express';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { pool, logger } from '../config.mjs';
import { json, raw, signed } from '../bot-signature.mjs';
import { withDecodeSlot } from '../community/images.mjs';

/**
 * Game pictures at runtime (docs/game/RECIPE_LEVELS_PLAN.md §8.5): approved pictures are served by content hash, missing
 * art keys become picture jobs for QT Gamer, and its drafts wait for the artist's approval. Nothing here approves.
 */
const SHA = /^[a-f0-9]{64}$/, ID = /^[a-f0-9-]{36}$/;
/** Drafts are normalized to this many pixels on the longest side (QT Gamer style.json output.maxSide). */
const MAX_SIDE = 512;
const MAX_VARIANTS = 2, VARIANT_BYTES = 600000, CLAIM_MINUTES = 30, MAX_ATTEMPTS = 3;

export const pictureUrl = sha => `/api/game-art/${sha}.webp`;

/**
 * A QT Gamer sprite as stored: PNG or WebP with transparency, at most 512 px on its longest side, re-encoded to WebP with
 * no metadata. Throws an Error naming the problem when the picture cannot be used.
 */
export async function normalizePicture(input) {
  if (!Buffer.isBuffer(input) || input.length < 64 || input.length > VARIANT_BYTES) throw new Error('picture size');
  return withDecodeSlot(async () => {
    const image = sharp(input, { limitInputPixels: 2048 * 2048, failOn: 'error' }), meta = await image.metadata();
    if (!['png', 'webp'].includes(meta.format)) throw new Error('picture format');
    // An alpha channel alone is not enough: the cut-out must actually leave a transparent background.
    if (!meta.hasAlpha || (await image.clone().stats()).channels[3]?.min > 8) throw new Error('picture has no transparent background');
    if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 64) throw new Error('picture too small');
    const { data, info } = await image.rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 }).toBuffer({ resolveWithObject: true });
    return { bytes: data, width: info.width, height: info.height, sha256: createHash('sha256').update(data).digest('hex') };
  });
}

/** Art keys a pack uses, with the kind of picture each needs. */
const artOf = pack => [...pack.items.map(i => [i.art, 'ingredient']), ...pack.dishes.map(d => [d.art, 'dish'])];

/** Approved pictures for a pack's art keys, as URLs; keys without one play as Sketch cards. */
export async function picturesFor(db, pack) {
  const keys = [...new Set(artOf(pack).map(([k]) => k))];
  const rows = (await db.query(`SELECT a.art_key, a.asset FROM game.art a JOIN game.asset s ON s.sha256 = a.asset AND s.status = 'approved' WHERE a.art_key = ANY($1)`, [keys])).rows;
  return Object.fromEntries(rows.map(r => [r.art_key, pictureUrl(r.asset)]));
}

/**
 * Queues one picture job per art key the pack uses that has neither a built-in picture nor an approved one, and no job
 * already open. Called when a pack is stored for review. Returns the keys queued.
 */
export async function queueMissingArt(db, sim, pack) {
  const builtin = new Set([...Object.values(sim.BUILTIN.items).map(i => i.art), ...Object.values(sim.BUILTIN.dishes).map(d => d.art)]);
  const names = new Map([...pack.items.map(i => [i.art, i.name]), ...pack.dishes.map(d => [d.art, d.name])]);
  const queued = [];
  for (const [key, kind] of artOf(pack)) {
    if (builtin.has(key) || queued.includes(key)) continue;
    await db.query(`INSERT INTO game.art(art_key, kind) VALUES($1,$2) ON CONFLICT DO NOTHING`, [key, kind]);
    const made = await db.query(`INSERT INTO game.art_job(art_key, kind, subject) SELECT $1, $2, $3
      WHERE NOT EXISTS (SELECT 1 FROM game.art a JOIN game.asset s ON s.sha256 = a.asset AND s.status = 'approved' WHERE a.art_key = $1)
        AND NOT EXISTS (SELECT 1 FROM game.art_job WHERE art_key = $1 AND status IN ('queued','claimed'))
      ON CONFLICT DO NOTHING RETURNING id`, [key, kind, String(names.get(key)).slice(0, 120)]);
    if (made.rowCount) queued.push(key);
  }
  return queued;
}

/** Approves one draft: it becomes the picture for its job's art key. Staff only (the Admin grid); returns the art key. */
export async function approvePicture(db, sha, reviewer) {
  if (!SHA.test(sha)) throw new Error('bad picture');
  const job = (await db.query(`SELECT art_key, kind FROM game.art_job WHERE $1 = ANY(variants) ORDER BY answered_at DESC LIMIT 1`, [sha])).rows[0];
  if (!job) throw new Error('no job for this picture');
  const done = await db.query(`UPDATE game.asset SET status='approved', reviewed_at=now(), reviewed_by=$2 WHERE sha256=$1 AND status <> 'rejected'`, [sha, String(reviewer).slice(0, 120)]);
  if (!done.rowCount) throw new Error('picture unavailable');
  await db.query(`INSERT INTO game.art(art_key, kind, asset) VALUES($1,$2,$3) ON CONFLICT (art_key) DO UPDATE SET asset=$3, updated_at=now()`, [job.art_key, job.kind, sha]);
  return job.art_key;
}

/** Public: an approved picture by its hash. Immutable, cacheable for a year, and drawable by the game's WebGL canvas. */
export const gameArt = express.Router();
gameArt.get('/:file', async (req, res, next) => {
  try {
    const sha = /^([a-f0-9]{64})\.webp$/.exec(req.params.file)?.[1];
    if (!sha) return res.sendStatus(404);
    const row = (await pool.query(`SELECT bytes FROM game.asset WHERE sha256=$1 AND status='approved'`, [sha])).rows[0];
    if (!row) return res.sendStatus(404);
    res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin' }).send(row.bytes);
  } catch (error) { next(error); }
});

/**
 * Routes QT Gamer calls (ops/qt-team/game_art_bridge.py), signed like the other QT bots (server/bot-signature.mjs). It claims
 * the oldest picture job and answers with up to two drafts or a failure. A claim left unanswered for 30 minutes goes back
 * in line; after three attempts the job fails.
 */
export const gameArtBots = express.Router();
gameArtBots.post('/claim', raw('1kb'), signed, async (_req, res, next) => {
  try {
    await pool.query(`UPDATE game.art_job SET status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'queued' END,
      error = CASE WHEN attempts >= $2 THEN 'no answer after ' || attempts || ' attempts' ELSE error END
      WHERE status='claimed' AND claimed_at < now() - make_interval(mins => $1)`, [CLAIM_MINUTES, MAX_ATTEMPTS]);
    const job = (await pool.query(`WITH next AS (SELECT id FROM game.art_job WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      UPDATE game.art_job j SET status='claimed', claimed_at=now(), attempts=attempts+1 FROM next WHERE j.id = next.id
      RETURNING j.id, j.art_key, j.kind, j.subject, j.details`)).rows[0];
    res.json({ job: job ? { id: job.id, artKey: job.art_key, kind: job.kind, subject: job.subject, details: job.details } : null });
  } catch (error) { next(error); }
});

gameArtBots.post('/jobs/:id/answer', raw('1600kb'), signed, async (req, res, next) => {
  try {
    const id = req.params.id, body = json(req);
    if (!ID.test(id) || !body) return res.sendStatus(400);
    const job = (await pool.query(`SELECT id FROM game.art_job WHERE id=$1 AND status='claimed'`, [id])).rows[0];
    if (!job) return res.status(409).json({ error: 'job not claimed' });
    if (typeof body.error === 'string') {
      await pool.query(`UPDATE game.art_job SET status='failed', error=$2, answered_at=now() WHERE id=$1 AND status='claimed'`, [id, body.error.slice(0, 300)]);
      return res.json({ status: 'failed' });
    }
    const variants = Array.isArray(body.variants) ? body.variants.slice(0, MAX_VARIANTS) : [];
    const provenance = body.provenance && typeof body.provenance === 'object' && !Array.isArray(body.provenance) ? body.provenance : {};
    const kept = [], refused = [];
    for (const v of variants) {
      try {
        const picture = await normalizePicture(typeof v === 'string' && v.length < VARIANT_BYTES * 1.4 ? Buffer.from(v, 'base64') : null);
        const meta = JSON.stringify({ ...provenance, normalized: { width: picture.width, height: picture.height } }).slice(0, 8000);
        await pool.query(`INSERT INTO game.asset(sha256, bytes, width, height, provenance) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING`,
          [picture.sha256, picture.bytes, picture.width, picture.height, JSON.parse(meta.endsWith('}') ? meta : '{}')]);
        kept.push(picture.sha256);
      } catch (error) { refused.push(String(error.message).slice(0, 80)); }
    }
    if (!kept.length) {
      await pool.query(`UPDATE game.art_job SET status='failed', error=$2, answered_at=now() WHERE id=$1 AND status='claimed'`, [id, ('no usable picture: ' + refused.join('; ')).slice(0, 300)]);
      return res.status(422).json({ status: 'failed', refused });
    }
    await pool.query(`UPDATE game.art_job SET status='done', variants=$2, error='', answered_at=now() WHERE id=$1 AND status='claimed'`, [id, kept]);
    logger.info({ event: 'game_art_drafts', job: id, kept: kept.length, refused: refused.length });
    res.json({ status: 'done', variants: kept, refused });
  } catch (error) { next(error); }
});
