import { createHash } from 'node:crypto';
import { pool, logger } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { engineReady } from '../ai-recipes/engine.mjs';
import { serverMatches } from './suggest.mjs';
import { dailyCap, jobsLastDay } from '../ai-recipes/limits.mjs';

/**
 * Wanted recipes (owner decision, 21 October 2026): a term at most 2 recipes match, searched by at least 3 different
 * members in the last 14 days, becomes a wanted recipe; the AI recipe worker writes up to 10 a day, each waiting for staff
 * review (Admin > Content > AI recipes > Wanted). A term that fails twice is skipped and never retried automatically.
 */
export const DEMAND = { searchers: 3, days: 14, maxResults: 2, daily: 10, failures: 2 };
const sgToday = "(now() AT TIME ZONE 'Asia/Singapore')::date";
const sha = value => createHash('sha256').update(value).digest('hex');

/** Forgets old searches, then adds or refreshes every term that qualifies. */
async function rollUp() {
  await pool.query(`DELETE FROM recipes.search_member WHERE last_day < ${sgToday} - ${DEMAND.days}`);
  await pool.query(`DELETE FROM recipes.search_term WHERE day < ${sgToday} - 90`);
  await pool.query(`INSERT INTO recipes.demand (term, searches, searchers, results, last_seen)
    SELECT t.term, sum(t.searches)::int, m.n, (array_agg(t.results ORDER BY t.day DESC))[1], now()
    FROM recipes.search_term t JOIN (SELECT term, count(*)::int AS n FROM recipes.search_member GROUP BY term) m ON m.term = t.term
    WHERE t.day > ${sgToday} - ${DEMAND.days} AND m.n >= $1
    GROUP BY t.term, m.n HAVING (array_agg(t.results ORDER BY t.day DESC))[1] <= $2
    ON CONFLICT (term) DO UPDATE SET searches = EXCLUDED.searches, searchers = EXCLUDED.searchers, results = EXCLUDED.results,
      last_seen = now(), updated_at = now()`, [DEMAND.searchers, DEMAND.maxResults]);
}

/** Moves each queued term along with its job and recipe: written, in review, published, declined or failed. */
async function follow() {
  const rows = (await pool.query(`SELECT d.term, d.status, d.failures, j.status AS job, j.message, j.recipe_id, r.live IS NOT NULL AS live,
      r.pending_state, r.hidden_at IS NOT NULL AS hidden
    FROM recipes.demand d LEFT JOIN recipes.ai_job j ON j.id = d.job_id LEFT JOIN recipes.recipe r ON r.id = j.recipe_id
    WHERE d.status IN ('queued','review')`)).rows;
  for (const row of rows) {
    const set = (status, extra = {}) => pool.query(`UPDATE recipes.demand SET status=$2, recipe_id=coalesce($3, recipe_id), note=coalesce($4, note),
      failures=coalesce($5, failures), job_id=CASE WHEN $2 = 'open' THEN NULL ELSE job_id END, updated_at=now() WHERE term=$1 AND status=$6`,
      [row.term, status, extra.recipe ?? null, extra.note ?? null, extra.failures ?? null, row.status]);
    // Jobs are purged after 90 days; a term already in review keeps its recipe link and status.
    if (row.job === null && row.status === 'review') continue;
    if (row.job === null || row.job === 'failed') {
      const failures = row.failures + 1;
      await set(failures >= DEMAND.failures ? 'skipped' : 'open', { failures, note: (row.message || 'The job did not finish.').slice(0, 300) });
    } else if (row.recipe_id && row.live && !row.hidden) await set('published', { recipe: 'member-' + row.recipe_id, note: '' });
    else if (row.recipe_id && row.pending_state === 'declined') await set('skipped', { note: 'Declined in review.' });
    else if (row.recipe_id && row.status === 'queued') await set('review', { recipe: 'member-' + row.recipe_id });
  }
}

/** Wanted-recipe jobs created today (Singapore day); staff see the same count in the admin console. */
export async function demandJobsToday() {
  return (await pool.query(`SELECT count(*)::int AS n FROM recipes.ai_job WHERE kind='demand'
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'`)).rows[0].n;
}
/**
 * Starts jobs for staff-requested terms at once and for open terms, within both today's 10 wanted recipes and the AI recipes
 * daily cap for everyone (so a cap of 0 pauses these too). Terms that now find recipes are skipped and the next one is tried.
 */
async function start({ includeOpen }) {
  if (!await allowed('recipe_demand') || !await allowed('ai_recipes') || !await allowed('recipes') || !await engineReady()) return;
  const [today, cap, all] = await Promise.all([demandJobsToday(), dailyCap(), jobsLastDay()]);
  const room = Math.min(DEMAND.daily - today, cap - all);
  if (room <= 0) return;
  const terms = (await pool.query(`SELECT term, status FROM recipes.demand WHERE status = 'requested' ${includeOpen ? "OR status = 'open'" : ''}
    ORDER BY status = 'requested' DESC, searchers DESC, first_seen LIMIT 50`)).rows;
  let started = 0;
  for (const { term, status } of terms) {
    if (started >= room) break;
    // Someone may have shared a recipe since; staff requests go ahead regardless.
    const found = status === 'open' ? await serverMatches(term) : 0;
    if (found > DEMAND.maxResults) {
      await pool.query(`UPDATE recipes.demand SET status='skipped', note=$2, updated_at=now() WHERE term=$1 AND status='open'`, [term, `Cook now finds ${found} recipes.`]);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const claimed = await client.query(`SELECT 1 FROM recipes.demand WHERE term=$1 AND status=$2 FOR UPDATE SKIP LOCKED`, [term, status]);
      if (claimed.rowCount) {
        const job = (await client.query(`INSERT INTO recipes.ai_job (user_id, kind, input, input_hash) VALUES (NULL, 'demand', $1, $2) RETURNING id`, [term, sha(term)])).rows[0];
        await client.query(`UPDATE recipes.demand SET status='queued', job_id=$2, note='', updated_at=now() WHERE term=$1`, [term, job.id]);
        started++;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }
}

/** Every minute: follow queued terms and start staff requests; every hour: roll up searches and start open terms. */
export function startDemandWorker() {
  let busy = false, lastHour = 0;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const hourly = Date.now() - lastHour >= 3600000;
      if (hourly) { await rollUp(); lastHour = Date.now(); }
      await follow();
      await start({ includeOpen: hourly });
    } catch (error) {
      // Tables missing until server/cook-search/schema.sql is applied; stay quiet about that.
      if (error?.code !== '42P01') logger.warn({ event: 'recipe_demand_error', detail: String(error?.message ?? error).slice(0, 200) });
    } finally { busy = false; }
  };
  const timer = setInterval(() => { void tick(); }, 60000).unref();
  const first = setTimeout(() => { void tick(); }, 30000).unref();
  return () => { clearInterval(timer); clearTimeout(first); };
}
