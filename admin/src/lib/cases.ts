import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, text, uuid } from './http';

const kinds = ['report','harm','correction','incident','privacy'] as const;
const statuses = ['open','triaged','investigating','resolved','dismissed'] as const;
export async function caseList(member: Session, filter: string) {
  authorize(member, 'cases');
  return (await query(`SELECT c.*,m.email AS assignee FROM ops.case_record c LEFT JOIN staff.member m ON m.id=c.assigned_to
    WHERE ($1 IN ('owner','operator') OR c.assigned_to=$2) AND ($3='' OR c.status=$3)
    ORDER BY c.due_at,c.id LIMIT 100`, [member.role, member.id, filter ? choice(filter, statuses, 'status') : ''])).rows;
}
async function lockedCase(db: PoolClient, member: Session, id: string) {
  const result = await db.query('SELECT * FROM ops.case_record WHERE id=$1 FOR UPDATE', [id]);
  const row = result.rows[0];
  if (!row || (!['owner','operator'].includes(member.role) && row.assigned_to !== member.id)) throw new HttpError(404, 'Case not found.');
  return row;
}
export async function caseDetails(member: Session, id: string) {
  authorize(member, 'cases');
  uuid(id, 'case id');
  return transaction(async db => {
    const record = await lockedCase(db, member, id);
    await audit(db, member.id, 'case.viewed', id, 'Viewed assigned review case');
    const notes = (await db.query(`SELECT n.id,n.body,n.created_at,m.email AS author FROM ops.case_note n
      JOIN staff.member m ON m.id=n.author_id WHERE n.case_id=$1 ORDER BY n.created_at LIMIT 100`, [id])).rows;
    return { record, notes };
  });
}
export async function createCase(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'cases');
  const kind = choice(input.kind, kinds, 'case kind');
  const title = text(input.title, 'title', 150); const description = text(input.description, 'description', 4000);
  const subject = text(input.subjectId || '', 'subject reference', 200, 0);
  const severity = choice(input.severity, ['normal','high','critical'] as const, 'severity');
  return transaction(async db => {
    await lockPermission(db, member, 'cases');
    const result = await db.query(`INSERT INTO ops.case_record(kind,title,description,subject_id,severity,assigned_to,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING id`, [kind,title,description,subject,severity,member.id]);
    await audit(db, member.id, 'case.created', result.rows[0].id, reason, { kind, severity });
    return result.rows[0];
  });
}
export async function updateCase(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'cases');
  const id = uuid(input.id, 'case id'); const version = integer(input.version, 'case version', 1);
  return transaction(async db => {
    await lockPermission(db, member, 'cases');
    const row = await lockedCase(db, member, id);
    if (row.version !== version) throw new HttpError(409, 'This case changed. Refresh before saving.');
    const status = choice(input.status, statuses, 'status');
    const resolution = text(input.resolution || '', 'resolution', 4000, ['resolved','dismissed'].includes(status) ? 10 : 0);
    let assignee = row.assigned_to;
    if (input.assignedTo !== undefined && input.assignedTo !== assignee) {
      authorize(member, 'operations');
      await lockPermission(db, member, 'operations');
      assignee = uuid(input.assignedTo, 'assigned staff id');
      const valid = await db.query("SELECT id FROM staff.member WHERE id=$1 AND active AND role<>'auditor'", [assignee]);
      if (!valid.rowCount) throw new HttpError(400, 'Select an active reviewer.');
    }
    await db.query(`UPDATE ops.case_record SET status=$1,resolution=$2,assigned_to=$3,version=version+1,updated_at=now() WHERE id=$4`, [status,resolution,assignee,id]);
    if (input.note) await db.query('INSERT INTO ops.case_note(case_id,author_id,body) VALUES($1,$2,$3)', [id,member.id,text(input.note,'note',4000)]);
    await audit(db, member.id, 'case.updated', id, reason, { status, assignedTo: assignee, version: version + 1 });
    return { saved: true };
  });
}
