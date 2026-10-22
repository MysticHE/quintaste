import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, pageSize, text } from './http';
import { openReports, search } from './content-members';
import { recipeList } from './content-recipes';

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
      (SELECT count(*)::int FROM game.run r WHERE r.pack = l.hash AND r.status = 'settled') AS plays,
      (SELECT coalesce(json_agg(json_build_object('tier', t.tier, 'rating', round(t.rating), 'rd', round(t.rd), 'start', round(t.start_rating), 'players', t.players,
        'clears', t.clears, 'locked', t.locked_at IS NOT NULL) ORDER BY array_position(ARRAY['learn','service','memory'], t.tier)), '[]')
        FROM game.level_rating t WHERE t.hash = l.hash) AS ratings
    FROM game.recipe_level l LEFT JOIN public."user" u ON u.id = l.owner_id
    WHERE l.status = $1 AND ($2 = '' OR l.recipe_id ILIKE $2 OR l.pack->'dishes'->0->>'name' ILIKE $2 OR u.username ILIKE $2)
    ORDER BY l.created_at DESC, l.hash LIMIT ${pageSize} OFFSET $3`, [view, term, skip])).rows);
}

/**
 * approve (review → live), hide (members can no longer start or settle it), restore (hidden → live) or public (a member's private
 * level, after review, opens to everyone; it stays playable for its author throughout). Audited.
 */
export async function gameLevelAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['approve', 'hide', 'restore', 'public'] as const, 'action'), id = text(input.id, 'level', 15, 2);
  if (!HASH.test(id)) throw new HttpError(400, 'Check the level.');
  authorize(member, 'content');
  return guard(() => transaction(async db => {
    await lockPermission(db, member, 'content');
    const from = { approve: "status = 'review'", hide: "status <> 'hidden'", restore: "status = 'hidden'", public: "status = 'ready' AND owner_id IS NOT NULL" }[act];
    const changed = act === 'public'
      ? await db.query(`UPDATE game.recipe_level SET owner_id = NULL, reviewed_at = now(), reviewed_by = $2 WHERE hash = $1 AND ${from}`, [id, member.email.slice(0, 120)])
      : await db.query(`UPDATE game.recipe_level SET status = $2, reviewed_at = now(), reviewed_by = $3 WHERE hash = $1 AND ${from}`,
        [id, act === 'hide' ? 'hidden' : 'ready', member.email.slice(0, 120)]);
    if (!changed.rowCount) throw new HttpError(409, 'This level changed since you opened it. Refresh the list.');
    await audit(db, member.id, 'content.game_level.' + act, 'game-level:' + id, reason, {});
    return { saved: true, note: { approve: 'Live: members can play it', hide: 'Hidden: no new plays, open ones are refused', restore: 'Live again', public: 'Public: everyone can play it' }[act] };
  }));
}

/**
 * Member cafés (GAME_CONTENT_PLAN §9): open, hidden by staff, or closed by their host; reported ones first. Each shows its name, host,
 * menu and this week's visits, so staff can act on a report.
 */
export async function gameCafeList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const view = choice(status || 'open', ['open', 'hidden', 'closed'] as const, 'status'), term = search(q);
  const where = { open: 'c.open AND c.hidden_at IS NULL', hidden: 'c.hidden_at IS NOT NULL', closed: 'NOT c.open AND c.hidden_at IS NULL' }[view];
  return guard(async () => (await query(`SELECT c.user_id AS id, c.name, c.open, c.hidden_at, c.hidden_reason, c.opened_at, u.username AS host,
      (SELECT coalesce(json_agg(l.pack->'dishes'->0->>'name' ORDER BY m.position), '[]') FROM game.cafe_menu m JOIN game.recipe_level l ON l.hash = m.hash WHERE m.user_id = c.user_id) AS dishes,
      (SELECT count(*)::int FROM game.cafe_visit v WHERE v.host_id = c.user_id AND v.created_at > now() - interval '7 days') AS week,
      ${openReports("'game:cafe:'||c.user_id")} AS reports
    FROM game.cafe c JOIN public."user" u ON u.id = c.user_id
    WHERE ${where} AND ($1 = '' OR c.name ILIKE $1 OR u.username ILIKE $1)
    ORDER BY reports DESC, c.updated_at DESC LIMIT ${pageSize} OFFSET $2`, [term, skip])).rows);
}

/** hide (the café closes and drops out of every list; its host cannot reopen it) or restore. Audited. */
export async function gameCafeAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['hide', 'restore'] as const, 'action'), id = text(input.id, 'café', 120, 1);
  authorize(member, 'content');
  return guard(() => transaction(async db => {
    await lockPermission(db, member, 'content');
    const changed = act === 'hide'
      ? await db.query(`UPDATE game.cafe SET hidden_at = now(), hidden_reason = $2, open = false, updated_at = now() WHERE user_id = $1 AND hidden_at IS NULL`, [id, reason.slice(0, 300)])
      : await db.query(`UPDATE game.cafe SET hidden_at = NULL, hidden_reason = NULL, updated_at = now() WHERE user_id = $1 AND hidden_at IS NOT NULL`, [id]);
    if (!changed.rowCount) throw new HttpError(409, 'This café changed since you opened it. Refresh the list.');
    await audit(db, member.id, 'content.game_cafe.' + act, 'game-cafe:' + id, reason, {});
    return { saved: true, note: act === 'hide' ? 'Hidden: closed and out of every list' : 'Restored: the host can open it again' };
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

const RECIPE = /^[a-z0-9][a-z0-9-]{2,150}$/;
/**
 * Recipes staff can turn into levels (QuinTaste's own and members' published ones), with each one's newest level and any open job,
 * and the latest level jobs. The level worker re-checks that a recipe is published, so this list only helps staff choose.
 */
export async function gameLevelRecipes(member: Session, q: string) {
  authorize(member, 'content');
  const term = q.trim().toLowerCase().slice(0, 80);
  // QuinTaste's own recipes come from the app service; when it can't be reached, members' recipes and the jobs still show.
  const listed = await recipeList(member).catch(error => { if (error instanceof HttpError && error.status === 503) return null; throw error; });
  const own = (listed ?? []).filter(r => !r.hidden && !r.withdrawn && (!term || r.title.toLowerCase().includes(term) || r.id.includes(term)))
    .slice(0, 20).map(r => ({ id: r.id, title: r.title, source: r.source === 'bundled' ? 'App' : r.source === 'bot' ? 'QT bots' : 'Staff' }));
  return guard(async () => {
    const members = (await query<{ id: string; title: string; username: string | null }>(`SELECT 'member-' || r.id AS id, r.live->>'title' AS title, u.username
      FROM recipes.recipe r LEFT JOIN public."user" u ON u.id = r.author_id
      WHERE r.live IS NOT NULL AND r.hidden_at IS NULL AND ($1 = '' OR r.live->>'title' ILIKE $1) ORDER BY r.published_at DESC LIMIT 20`, [search(q)])).rows
      .map(r => ({ id: r.id, title: r.title, source: r.username ? 'Member · ' + r.username : 'Wanted recipe' }));
    const recipes = [...own, ...members], ids = recipes.map(r => r.id);
    const state = (await query<{ recipe_id: string; level: string | null; job: string | null }>(`SELECT x.id AS recipe_id,
        (SELECT status FROM game.recipe_level l WHERE l.recipe_id = x.id ORDER BY created_at DESC LIMIT 1) AS level,
        (SELECT status FROM game.level_job j WHERE j.recipe_id = x.id AND status IN ('queued','waiting','claimed','answered') LIMIT 1) AS job
      FROM unnest($1::text[]) AS x(id)`, [ids])).rows;
    const byId = new Map(state.map(r => [r.recipe_id, r]));
    const titles = new Map((listed ?? []).map(r => [r.id, r.title]));
    const jobs = (await query<{ recipe_id: string; [key: string]: unknown }>(`SELECT j.id, j.recipe_id, j.cuisine, j.requested_by, j.status, j.attempts, coalesce(nullif(j.detail, ''), j.message) AS message, j.pack, j.usage,
        j.created_at, j.finished_at, m.live->>'title' AS member_title
      FROM game.level_job j LEFT JOIN recipes.recipe m ON j.recipe_id = 'member-' || m.id ORDER BY j.created_at DESC LIMIT 30`)).rows
      .map(({ member_title, ...j }) => ({ ...j, title: (member_title as string | null) ?? titles.get(j.recipe_id) ?? null }));
    const running = (await query<{ n: number }>(`SELECT count(*)::int AS n FROM ops.control WHERE key IN ('game_levels','games') AND enabled`)).rows[0].n === 2;
    return { recipes: recipes.map(r => ({ ...r, level: byId.get(r.id)?.level ?? null, job: byId.get(r.id)?.job ?? null })), jobs, ownMissing: !listed, running };
  });
}

/** Asks QT Gamer for a level from one recipe (one open job per recipe). Audited; says so when Game levels is switched off. */
export async function gameLevelMake(member: Session, input: Record<string, unknown>, reason: string) {
  const id = text(input.recipeId, 'recipe', 151, 3), cuisine = input.cuisine === undefined || input.cuisine === '' ? null : text(input.cuisine, 'cuisine', 40, 1);
  if (!RECIPE.test(id)) throw new HttpError(400, 'Check the recipe.');
  authorize(member, 'content');
  return guard(() => transaction(async db => {
    await lockPermission(db, member, 'content');
    try {
      await db.query(`INSERT INTO game.level_job(recipe_id, cuisine, requested_by) VALUES($1, $2, $3)`, [id, cuisine, member.email.slice(0, 120)]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new HttpError(409, 'A level for this recipe is already being made.');
      throw error;
    }
    await audit(db, member.id, 'content.game_level.make', 'recipe:' + id, reason, { cuisine });
    const on = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ops.control WHERE key IN ('game_levels','games') AND enabled`)).rows[0].n === 2;
    return { saved: true, note: on ? 'Asked QT Gamer for a level' : 'Asked. It starts once Game progress and Recipe levels are both on in Features' };
  }));
}

/** Sidebar count: levels and drafts waiting for a decision; null when not installed. */
export async function gameWaiting() {
  try {
    const row = (await query<{ levels: number; pictures: number }>(`SELECT (SELECT count(*)::int FROM game.recipe_level WHERE status = 'review') AS levels,
      (SELECT count(*)::int FROM game.asset WHERE status = 'draft') AS pictures`)).rows[0];
    return row;
  } catch (error) { if (missing(error)) return null; throw error; }
}
