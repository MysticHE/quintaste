import 'server-only';
import { query } from './db';
import { can } from './permissions';
import type { Session } from './session';

export async function overview(member: Session) {
  const queues = can(member.role, 'cases') ? (await query<{ kind: string; count: number; overdue: number }>(`SELECT kind,count(*)::int AS count,
    count(*) FILTER(WHERE due_at<now())::int AS overdue FROM ops.case_record
    WHERE status NOT IN ('resolved','dismissed') AND ($1 IN ('owner','operator') OR assigned_to=$2) GROUP BY kind ORDER BY kind`, [member.role,member.id])).rows : null;
  const users = can(member.role, 'accounts') ? (await query<{ count: number }>('SELECT count(*)::int AS count FROM public."user"')).rows[0].count : null;
  const features = can(member.role, 'operations') ? (await query<{ key: string; enabled: boolean }>('SELECT key,enabled FROM ops.control ORDER BY key')).rows : null;
  return { users, queues, features };
}
