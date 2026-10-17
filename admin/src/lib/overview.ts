import 'server-only';
import { query } from './db';
import { can } from './permissions';
import type { Session } from './session';

export async function overview(member: Session) {
  const avatarControl = (await query("SELECT enabled FROM ops.control WHERE key='avatars'")).rows[0];
  const queues = can(member.role, 'cases') ? (await query(`SELECT kind,count(*)::int AS count,
    count(*) FILTER(WHERE due_at<now())::int AS overdue FROM ops.case_record
    WHERE status NOT IN ('resolved','dismissed') AND ($1 IN ('owner','operator') OR assigned_to=$2) GROUP BY kind`, [member.role,member.id])).rows : [];
  const users = can(member.role,'accounts') ? (await query('SELECT count(*)::int AS count FROM public."user"')).rows[0].count : null;
  return { queues, users, capabilities: ['accounts','cases','content','sellers','operations','integrations','staff','audit','identity'].filter(c => can(member.role, c as Parameters<typeof can>[1])),
    readiness: [
      { title: 'Staff access', state: 'Google + security key required' },
      { title: 'Customer accounts', state: 'Username, password and recovery codes' },
      { title: 'Avatar generation', state: avatarControl?.enabled ? 'Enabled with account limits; provider availability applies' : 'Paused' },
      { title: 'Other AI features', state: 'Not enabled' },
      { title: 'Identity review', state: 'Intake disabled pending private storage and retention acceptance' },
      { title: 'Social', state: 'Live for signed-in, age-checked members' },
      { title: 'Market', state: 'Open to all members; reports and takedowns; see Feature controls' },
      { title: 'Games', state: 'Not enabled' },
    ] };
}
