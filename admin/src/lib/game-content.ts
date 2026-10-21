import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, pageSize, text } from './http';
import { search } from './content-members';

// Rush Hour recipe levels and pictures (server/game/levels.sql, docs/game/RECIPE_LEVELS_PLAN.md §8.5-8.6). Staff review a level before
// members can play it (GAME_PLAN: every game recipe has an editor and a cultural reviewer) and approve each QT Gamer picture before members
// see it (the artist's rule). Nothing here edits a pack: a level is approved, hidden or shown again as it is.
const missing = (error: unknown) => ['42P01', '3F000', '42703'].includes((error as { code?: string })?.code ?? '');
const notInstalled = () => new HttpError(503, 'Recipe levels are not installed on this server yet.');
const HASH = /^p[a-z0-9]{1,14}$/, SHA = /^[a-f0-9]{64}$/;
const guard = async <T>(work: () => Promise<T>) => {
  try { return await work(); } catch (error) { if (missing(error)) throw notInstalled(); throw error; }
};
/** Art keys the pack uses that have no approved picture yet (built-in art never gets a game.art row, so it never counts). */
const unpictured = `(SELECT count(*)::int FROM game.art a WHERE a.art_key IN (
    SELECT jsonb_array_elements(l.pack->'items')->>'art' UNION SELECT jsonb_array_elements(l.pack->'dishes')->>'art')
  AND NOT EXISTS (SELECT 1 FROM game.asset s WHERE s.sha256 = a.asset AND s.status = 'approved'))`;

/** Waiting for review, live, or hidden; newest first. The pack comes whole, so staff see every stage and ingredient. */
export async function gameLevelList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const view = choice(status || 'review', ['review', 'ready', 'hidden'] as const, 'status'), term = search(q);
  return guard(async () => (await query(`SELECT l.hash AS id, l.recipe_id, l.recipe_revision, l.status, l.created_at, l.reviewed_at, l.reviewed_by,
      u.username AS owner, l.pack, ${unpictured} AS unpictured,
      (SELECT count(*)::int FROM game.run r WHERE r.pack = l.hash AND r.status = 'settled') AS plays
    FROM game.recipe_level l LEFT JOIN public."user" u ON u.id = l.owner_id
    WHERE l.status = $1 AND ($2 = '' OR l.recipe_id ILIKE $2 OR l.pack->'dishes'->0->>'name' ILIKE $2 OR u.username ILIKE $2)
    ORDER BY l.created_at DESC, l.hash LIMIT ${pageSize} OFFSET $3`, [view, term, skip])).rows);
}

/** approve (review → live), hide (members can no longer start or settle it) or restore (hidden → live). Audited. */
export async function gameLevelAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['approve', 'hide', 'restore'] as const, 'action'), id = text(input.id, 'level', 15, 2);
  if (!HASH.test(id)) throw new HttpError(400, 'Check the level.');
  authorize(member, 'content');
  return guard(() => transaction(async db => {
    await lockPermission(db, member, 'content');
    const from = { approve: "status = 'review'", hide: "status <> 'hidden'", restore: "status = 'hidden'" }[act];
    const changed = await db.query(`UPDATE game.recipe_level SET status = $2, reviewed_at = now(), reviewed_by = $3 WHERE hash = $1 AND ${from}`,
      [id, act === 'hide' ? 'hidden' : 'ready', member.email.slice(0, 120)]);
    if (!changed.rowCount) throw new HttpError(409, 'This level changed since you opened it. Refresh the list.');
    await audit(db, member.id, 'content.game_level.' + act, 'game-level:' + id, reason, {});
    return { saved: true, note: { approve: 'Live: members can play it', hide: 'Hidden: no new plays, open ones are refused', restore: 'Live again' }[act] };
  }));
}

/** Drafts waiting for the artist, approved or rejected pictures (with the art key each was drawn for), or the picture jobs themselves. */
export async function gamePictureList(member: Session, status: string, skip = 0) {
  authorize(member, 'content');
  const view = choice(status || 'draft', ['draft', 'approved', 'rejected', 'jobs'] as const, 'status');
  if (view === 'jobs') return guard(async () => (await query(`SELECT id, art_key, kind, subject, details, status, attempts, error, created_at, answered_at,
      cardinality(variants) AS drafts FROM game.art_job WHERE status IN ('queued','claimed','failed') ORDER BY created_at DESC LIMIT ${pageSize} OFFSET $1`, [skip])).rows);
  return guard(async () => (await query(`SELECT s.sha256 AS id, s.width, s.height, s.status, s.created_at, s.reviewed_at, s.reviewed_by,
      s.provenance->>'prompt' AS prompt, s.provenance->>'model' AS model, s.provenance->'checks' AS checks, j.art_key, j.kind, j.subject,
      coalesce(a.asset = s.sha256, false) AS current
    FROM game.asset s
    LEFT JOIN LATERAL (SELECT art_key, kind, subject FROM game.art_job WHERE s.sha256 = ANY(variants) ORDER BY answered_at DESC NULLS LAST LIMIT 1) j ON true
    LEFT JOIN game.art a ON a.art_key = j.art_key
    WHERE s.status = $1 ORDER BY s.created_at DESC LIMIT ${pageSize} OFFSET $2`, [view, skip])).rows);
}

/**
 * approve: the draft becomes the picture its art key shows, everywhere it is used. reject: the draft is set aside. redo: a new job
 * for the art key, with optional notes for QT Gamer (when no job is open). Audited.
 */
export async function gamePictureAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['approve', 'reject', 'redo'] as const, 'action');
  authorize(member, 'content');
  return guard(() => transaction(async db => {
    await lockPermission(db, member, 'content');
    if (act === 'redo') {
      const key = text(input.artKey, 'art key', 60), details = input.details === undefined ? '' : text(input.details, 'notes', 400, 0);
      const last = (await db.query<{ kind: string; subject: string }>('SELECT kind, subject FROM game.art_job WHERE art_key = $1 ORDER BY created_at DESC LIMIT 1', [key])).rows[0];
      if (!last) throw new HttpError(404, 'No picture job has used this art key.');
      const made = await db.query(`INSERT INTO game.art_job(art_key, kind, subject, details) SELECT $1, $2, $3, $4
        WHERE NOT EXISTS (SELECT 1 FROM game.art_job WHERE art_key = $1 AND status IN ('queued','claimed'))`, [key, last.kind, last.subject, details]);
      if (!made.rowCount) throw new HttpError(409, 'QT Gamer already has a job open for this picture.');
      await audit(db, member.id, 'content.game_picture.redo', 'game-art:' + key, reason, { details });
      return { saved: true, note: 'Asked QT Gamer to draw it again' };
    }
    const id = text(input.id, 'picture', 64, 64);
    if (!SHA.test(id)) throw new HttpError(400, 'Check the picture.');
    const job = (await db.query<{ art_key: string; kind: string }>(`SELECT art_key, kind FROM game.art_job WHERE $1 = ANY(variants) ORDER BY answered_at DESC NULLS LAST LIMIT 1`, [id])).rows[0];
    if (!job) throw new HttpError(404, 'This picture is not from a picture job.');
    const changed = await db.query(`UPDATE game.asset SET status = $2, reviewed_at = now(), reviewed_by = $3 WHERE sha256 = $1 AND status = 'draft'`,
      [id, act === 'approve' ? 'approved' : 'rejected', member.email.slice(0, 120)]);
    if (!changed.rowCount) throw new HttpError(409, 'This picture changed since you opened it. Refresh the list.');
    if (act === 'approve') await db.query(`INSERT INTO game.art(art_key, kind, asset) VALUES($1, $2, $3)
      ON CONFLICT (art_key) DO UPDATE SET asset = $3, updated_at = now()`, [job.art_key, job.kind, id]);
    await audit(db, member.id, 'content.game_picture.' + act, 'game-art:' + job.art_key, reason, { picture: id });
    return { saved: true, note: act === 'approve' ? 'Approved: shown wherever ' + job.art_key + ' is used' : 'Set aside' };
  }));
}

/** One stored picture for the grid, whatever its status (members only ever get approved ones, from the app). */
export async function gamePicture(member: Session, id: string) {
  authorize(member, 'content');
  if (!SHA.test(id)) throw new HttpError(400, 'Check the picture.');
  return guard(async () => (await query<{ bytes: Buffer }>('SELECT bytes FROM game.asset WHERE sha256 = $1', [id])).rows[0]?.bytes ?? null);
}

/** Sidebar count: levels and drafts waiting for a decision; null when not installed. */
export async function gameWaiting() {
  try {
    const row = (await query<{ levels: number; pictures: number }>(`SELECT (SELECT count(*)::int FROM game.recipe_level WHERE status = 'review') AS levels,
      (SELECT count(*)::int FROM game.asset WHERE status = 'draft') AS pictures`)).rows[0];
    return row;
  } catch (error) { if (missing(error)) return null; throw error; }
}
