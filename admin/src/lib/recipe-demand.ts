import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, pageSize, text } from './http';
import { search } from './content-members';
import { capOf } from './ai-recipes';

// Wanted recipes (server/cook-search): Cook searches at most 2 recipes match, made by at least 3 members in 14 days. The app's
// worker writes up to 10 a day with AI and files each for review in Member recipes; staff can start one now, skip it, or link it
// to a recipe that already exists under another name (that name then suggests the recipe in Cook).
const views = { waiting: "('open','requested','queued')", review: "('review')", published: "('published')", linked: "('linked')", skipped: "('skipped')" } as const;
const missing = (error: unknown) => (error as { code?: string })?.code === '42P01';
/** Wanted recipes a day; the same number as DEMAND.daily in server/cook-search/demand.mjs. */
const DEMAND_DAILY = 10;

/** What happens after Make With AI: it starts within a minute only when the switches are on and today's limits have room. */
async function makeNote(db: PoolClient) {
  const controls = (await db.query<{ key: string; enabled: boolean; notice: string }>("SELECT key, enabled, notice FROM ops.control WHERE key IN ('ai_recipes','recipes','recipe_demand')")).rows;
  const on = (key: string) => controls.some(row => row.key === key && row.enabled);
  if (!on('ai_recipes') || !on('recipes') || !on('recipe_demand')) return 'Saved. It starts once AI recipes, Member recipes and Wanted recipes are all turned on in Features.';
  const counts = (await db.query<{ wanted: number; all: number }>(`SELECT
      count(*) FILTER (WHERE kind='demand' AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore')::int AS wanted,
      count(*) FILTER (WHERE created_at > now() - interval '1 day' AND (started_at IS NOT NULL OR status IN ('queued','working')))::int AS "all"
    FROM recipes.ai_job`)).rows[0];
  if (counts.wanted >= DEMAND_DAILY) return `Saved. Today's ${DEMAND_DAILY} wanted recipes are used, so it starts after midnight.`;
  if (counts.all >= capOf(controls.find(row => row.key === 'ai_recipes')?.notice ?? '')) return "Saved. AI recipes are at today's daily limit, so it starts when there is room.";
  return 'Starting within a minute. It will wait in review.';
}

export async function demandList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const view = choice(status || 'waiting', Object.keys(views) as (keyof typeof views)[], 'status'), term = search(q);
  try {
    return (await query(`SELECT d.term AS id, d.term, d.status, d.searches, d.searchers, d.results, d.failures, d.recipe_id, d.note,
        d.first_seen, d.last_seen, d.updated_at, coalesce(r.live, r.pending)->>'title' AS title
      FROM recipes.demand d LEFT JOIN recipes.ai_job j ON j.id = d.job_id LEFT JOIN recipes.recipe r ON r.id = j.recipe_id
      WHERE d.status IN ${views[view]} AND ($1 = '' OR d.term ILIKE $1)
      ORDER BY d.status = 'requested' DESC, d.searchers DESC, d.last_seen DESC LIMIT ${pageSize} OFFSET $2`, [term, skip])).rows;
  } catch (error) {
    if (missing(error)) throw new HttpError(503, 'Wanted recipes are not installed on this server yet.');
    throw error;
  }
}

/** make: the worker starts it within a minute; skip: never made automatically; link: an existing recipe answers it; reopen: back to waiting. */
export async function demandAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['make', 'skip', 'link', 'reopen'] as const, 'action'), term = text(input.id, 'term', 60, 3);
  authorize(member, 'content');
  const from = { make: ['open', 'skipped'], skip: ['open', 'requested'], link: ['open', 'requested', 'skipped', 'review'], reopen: ['skipped', 'linked'] }[act];
  const recipe = act === 'link' ? text(input.recipe, 'recipe id', 120, 3) : null;
  if (recipe && !/^[a-z0-9][a-z0-9-]{2,119}$/.test(recipe)) throw new HttpError(400, 'Use the recipe id from its Cook link, for example member-… or a QuinTaste recipe id.');
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    const result = await db.query(`UPDATE recipes.demand SET status=$2, note=$3, recipe_id=CASE WHEN $2 = 'linked' THEN $4 WHEN $2 = 'open' THEN NULL ELSE recipe_id END,
        failures=CASE WHEN $2 IN ('requested','open') THEN 0 ELSE failures END, updated_at=now()
      WHERE term=$1 AND status = ANY($5::text[])`,
      [term, { make: 'requested', skip: 'skipped', link: 'linked', reopen: 'open' }[act], act === 'skip' ? text(input.note, 'note', 300, 0) : '', recipe, from]);
    if (!result.rowCount) throw new HttpError(409, 'This changed since you opened it. Refresh the list.');
    await audit(db, member.id, 'content.recipe-demand.' + act, 'recipe-demand:' + term, reason, { recipe });
    if (act === 'make') return { saved: true, note: await makeNote(db) };
    return { saved: true, note: { skip: 'Skipped', link: 'Linked. Cook suggests that recipe for this name within five minutes.', reopen: 'Back in the waiting list' }[act] };
  });
}
