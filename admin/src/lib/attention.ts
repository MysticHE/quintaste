import 'server-only';
import { query } from './db';
import { chefSummary } from './chefs';
import { controlKey, modeOf } from './chef-names';

type Queue = { count: number; latest: string | null };
const queues = ['urgent', 'people', 'market', 'places', 'posts', 'other'] as const;
const iso = (value: Date | null) => value ? value.toISOString() : null;

/** Which staff-alert queue an open case belongs to (docs/ADMIN_CHEFS_PLAN.md §5); subjects come from server/community/router.mjs. */
const bucket = `CASE WHEN kind IN ('harm','privacy') OR severity='critical' THEN 'urgent'
  WHEN subject_id LIKE 'community:user:%' THEN 'people' WHEN subject_id LIKE 'market:%' THEN 'market'
  WHEN subject_id LIKE 'place:catalogue:%' THEN 'places' WHEN subject_id ~ '^(place:review|recipe|game|avatar):' THEN 'posts' ELSE 'other' END`;

/**
 * What waits for a person in admin, for the staff alerts on Telegram: per queue, the count and when the latest one arrived
 * (for overdue cases, when the latest fell due). Never names, report text, photos or ids, so nothing about a member leaves admin.
 * Place reports in the chefs' hands are left out: triaged ones (Pandan rechecks them, Coco asks before closing) and, while Coco's
 * lane is On, new ones for their first two hours, so a report reaches the owner only when Coco has not taken it.
 */
export async function attention() {
  const coco = modeOf((await query<{ enabled: boolean; notice: string }>('SELECT enabled, notice FROM ops.control WHERE key=$1',
    [controlKey('place-reports')])).rows[0]) === 'on';
  const rows = (await query<{ bucket: string; count: number; latest: Date; overdue: number; due: Date | null }>(
    `SELECT ${bucket} AS bucket, count(*)::int AS count, max(created_at) AS latest, count(*) FILTER (WHERE due_at<now())::int AS overdue,
      max(due_at) FILTER (WHERE due_at<now()) AS due FROM ops.case_record WHERE status NOT IN ('resolved','dismissed')
      AND NOT (kind = 'report' AND subject_id LIKE 'place:catalogue:%' AND (status = 'triaged' OR ($1 AND status = 'open' AND created_at > now() - interval '2 hours')))
      GROUP BY 1`, [coco])).rows;
  const cases = Object.fromEntries(queues.map(name => {
    const row = rows.find(r => r.bucket === name);
    return [name, { count: row?.count ?? 0, latest: iso(row?.latest ?? null) }];
  })) as Record<typeof queues[number], Queue>;
  const due = rows.map(r => r.due).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { at: new Date().toISOString(), cases, overdue: { count: rows.reduce((sum, r) => sum + r.overdue, 0), latest: iso(due) }, ...await social(),
    chefs: await chefSummary() };
}

/** Dining photo checks and class teacher applications waiting; both null before the Social schema is installed. */
async function social(): Promise<{ photoChecks: Queue | null; teachers: Queue | null }> {
  try {
    const row = (await query<{ checks: number; checked: Date | null; teachers: number; applied: Date | null }>(
      `SELECT (SELECT count(*)::int FROM social.verification WHERE status='pending') AS checks,
        (SELECT max(submitted_at) FROM social.verification WHERE status='pending') AS checked,
        (SELECT count(*)::int FROM social.host WHERE status='pending') AS teachers,
        (SELECT max(updated_at) FROM social.host WHERE status='pending') AS applied`)).rows[0];
    return { photoChecks: { count: row.checks, latest: iso(row.checked) }, teachers: { count: row.teachers, latest: iso(row.applied) } };
  } catch (error) {
    if ((error as { code?: string })?.code === '42P01') return { photoChecks: null, teachers: null };
    throw error;
  }
}
