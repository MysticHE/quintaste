import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, pageSize } from './http';
import { search } from './content-members';

// AI recipe jobs (server/ai-recipes): members ask for a dish or paste a video; the app's worker reads it with Gemini and publishes it,
// or files it for staff review when confidence is low. Staff read jobs here; the review itself happens in Member recipes.
const statuses = ['all', 'review', 'failed', 'published', 'queued', 'working'] as const;
/** The daily cap across all members lives in the ai_recipes control's note as "daily=N" (server/ai-recipes/router.mjs reads it); 500 when unset. */
export const DEFAULT_DAILY_CAP = 500;
const capOf = (note: string) => Number(/daily=(\d+)/.exec(note)?.[1] ?? DEFAULT_DAILY_CAP);
const missing = (error: unknown) => (error as { code?: string })?.code === '42P01';

/** Today's counts in Singapore time, the queue right now and the daily cap; null when the AI recipes schema is not installed. */
export async function aiSummary(member: Session) {
  authorize(member, 'content');
  try {
    const [counts, control] = await Promise.all([
      query<{ status: string; count: number }>(`SELECT status, count(*)::int AS count FROM recipes.ai_job
        WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' OR status IN ('queued','working')
        GROUP BY status`),
      query<{ enabled: boolean; notice: string; version: number }>("SELECT enabled, notice, version FROM ops.control WHERE key='ai_recipes'")]);
    const by = Object.fromEntries(counts.rows.map(row => [row.status, row.count])) as Record<string, number>;
    // A job keeps status "review" after staff decide, so the waiting count comes from the recipe itself (AI drafts are keyed "ai-<job>").
    const waiting = (await query<{ count: number }>("SELECT count(*)::int AS count FROM recipes.recipe WHERE pending_state='review' AND draft_key LIKE 'ai-%'")).rows[0].count;
    const today = (await query<{ count: number }>(`SELECT count(*)::int AS count FROM recipes.ai_job
      WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'`)).rows[0].count;
    return { installed: true, enabled: control.rows[0]?.enabled ?? false, version: control.rows[0]?.version ?? 0, dailyCap: capOf(control.rows[0]?.notice ?? ''), today,
      queued: by.queued ?? 0, working: by.working ?? 0, waiting, failedToday: by.failed ?? 0, publishedToday: by.published ?? 0, reviewToday: by.review ?? 0 };
  } catch (error) {
    if (missing(error)) return { installed: false };
    throw error;
  }
}

export async function aiJobs(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const filter = choice(status || 'all', statuses, 'status'), term = search(q);
  try {
    return (await query(`SELECT j.id, j.kind, j.status, j.attempts, j.message, j.recipe_id, j.created_at, j.started_at, j.finished_at,
        CASE WHEN j.input LIKE 'upload %' THEN 'Uploaded video' ELSE j.input END AS input,
        coalesce(jsonb_array_length(j.usage->'calls'), 0) AS calls, (j.usage->>'bytes')::bigint AS bytes, u.username,
        coalesce(r.live, r.pending)->>'title' AS title, (coalesce(r.live, r.pending)->'source'->>'confidence')::float AS confidence
      FROM recipes.ai_job j JOIN public."user" u ON u.id=j.user_id LEFT JOIN recipes.recipe r ON r.id=j.recipe_id
      WHERE ($1='all' OR j.status=$1) AND ($2='' OR j.input ILIKE $2 OR u.username ILIKE $2 OR coalesce(r.live, r.pending)->>'title' ILIKE $2)
      ORDER BY j.created_at DESC, j.id LIMIT ${pageSize} OFFSET $3`, [filter, term, skip])).rows;
  } catch (error) {
    if (missing(error)) throw new HttpError(503, 'AI recipes are not installed on this server yet.');
    throw error;
  }
}

/** Sets the daily job cap across all members, keeping any other words in the control's note. */
export async function setDailyCap(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'operations');
  const cap = integer(input.dailyCap, 'daily limit', 0, 10000), version = integer(input.version, 'control version', 1);
  return transaction(async db => {
    await lockPermission(db, member, 'operations');
    const row = (await db.query<{ notice: string; version: number }>("SELECT notice, version FROM ops.control WHERE key='ai_recipes' FOR UPDATE")).rows[0];
    if (!row) throw new HttpError(404, 'AI recipes are not installed on this server yet.');
    if (row.version !== version) throw new HttpError(409, 'This setting changed. Refresh before saving.');
    const rest = row.notice.replace(/\s*daily=\d+\s*/g, ' ').trim(), notice = (rest ? rest + ' ' : '') + 'daily=' + cap;
    if (notice.length > 300) throw new HttpError(400, 'Shorten the note first.');
    await db.query("UPDATE ops.control SET notice=$1, version=version+1, updated_at=now() WHERE key='ai_recipes'", [notice]);
    await audit(db, member.id, 'control.ai_daily_cap', 'ai_recipes', reason, { dailyCap: cap });
    return { saved: true, note: cap ? `Up to ${cap} AI recipes a day` : 'AI recipes paused for everyone (limit 0)' };
  });
}
