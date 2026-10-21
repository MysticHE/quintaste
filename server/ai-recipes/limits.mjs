import { pool } from '../config.mjs';

/**
 * AI recipe limits shared by members' jobs (router.mjs) and wanted recipes (../cook-search/demand.mjs).
 * A job that reused an existing recipe ("We already have this recipe.") never reached the worker: it has no
 * started_at and was never queued, cost nothing, and counts toward no limit or monthly total.
 */
export const DAILY_PER_MEMBER = 3;
/** AI recipes one member may have queued or working at once. */
export const AT_ONCE = 2;
/** Longest video the downloader accepts (yt-dlp match filter). The 60 MB file limit is MAX_FILE_BYTES in files.mjs. */
export const MAX_VIDEO_SECONDS = 20 * 60;
export const RAN = `(started_at IS NOT NULL OR status IN ('queued','working'))`;
const DEFAULT_DAILY_CAP = 500;

/** Jobs a day across everyone, from the ai_recipes control's note ("daily=N"); 0 pauses new jobs. */
export async function dailyCap() {
  const row = (await pool.query("SELECT notice FROM ops.control WHERE key='ai_recipes'")).rows[0];
  const cap = /daily=(\d+)/.exec(row?.notice ?? '')?.[1];
  return cap ? Number(cap) : DEFAULT_DAILY_CAP;
}
/** Jobs that ran or are waiting to run in the last 24 hours, for everyone (the daily cap counts these). */
export async function jobsLastDay() {
  return (await pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE created_at > now() - interval '1 day' AND ${RAN}`)).rows[0].n;
}
/** A member's jobs that count toward the 3 a day: started in the last 24 hours, not failed, not a reused recipe. */
export async function usedLastDay(userId) {
  return (await pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE user_id=$1 AND created_at > now() - interval '1 day'
    AND status <> 'failed' AND ${RAN}`, [userId])).rows[0].n;
}
