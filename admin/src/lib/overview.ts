import 'server-only';
import { query } from './db';
import { can } from './permissions';
import type { Session } from './session';
import { packagedPlaces } from './content-base';
import { aiSummary } from './ai-recipes';
import { gameWaiting } from './game-content';
import { socialWaiting } from './social';

const count = async (sql: string, values: unknown[] = []) => {
  try { return (await query<{ count: number }>(sql, values)).rows[0]?.count ?? 0; }
  catch (error) { if ((error as { code?: string })?.code === '42P01') return null; throw error; }
};
const openReport = (prefix: string) => `SELECT count(*)::int AS count FROM ops.case_record WHERE kind='report' AND status NOT IN ('resolved','dismissed') AND subject_id LIKE '${prefix}%'`;

/** What needs a staff decision now, plus the shape of the catalogue; each part only for roles that can act on it. */
export async function overview(member: Session) {
  const cases = can(member.role, 'cases'), content = can(member.role, 'content'), sellers = can(member.role, 'sellers');
  const [queues, users, features, memberRecipes, reviews, listings, places, ai, game, social] = await Promise.all([
    cases ? query<{ kind: string; count: number; overdue: number }>(`SELECT kind,count(*)::int AS count,
      count(*) FILTER(WHERE due_at<now())::int AS overdue FROM ops.case_record
      WHERE status NOT IN ('resolved','dismissed') AND ($1 IN ('owner','operator') OR assigned_to=$2) GROUP BY kind ORDER BY kind`, [member.role, member.id]).then(r => r.rows) : null,
    can(member.role, 'accounts') ? count('SELECT count(*)::int AS count FROM public."user"') : null,
    can(member.role, 'operations') ? query<{ key: string; enabled: boolean }>("SELECT key,enabled FROM ops.control WHERE key NOT IN ('ai','identity') ORDER BY key").then(r => r.rows) : null,
    content ? count("SELECT count(*)::int AS count FROM recipes.recipe WHERE pending_state='review' AND draft_key NOT LIKE 'ai-%'") : null,
    content ? count(openReport('place:review:')) : null,
    sellers ? count(openReport('market:listing:')) : null,
    content ? packagedPlaces().then(rows => ({ total: rows.length, explorer: rows.filter(r => r.source === 'bot').length,
      mixed: rows.filter(r => r.data.kitchen === 'options').length })).catch(() => null) : null,
    content ? aiSummary(member) : null,
    content ? gameWaiting() : null,
    socialWaiting(member)]);
  return { users, queues, features, memberRecipes, reviews, listings, places, ai, game, social };
}
