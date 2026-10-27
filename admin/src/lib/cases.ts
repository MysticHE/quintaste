import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit, type Actor } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, pageSize, text, uuid } from './http';
import { CHEFS } from './chef-names';

const kinds = ['report','harm','correction','incident','privacy'] as const;
const statuses = ['open','triaged','investigating','resolved','dismissed'] as const;
export async function caseList(member: Session, filter: string, skip = 0) {
  authorize(member, 'cases');
  return (await query(`SELECT c.*,m.email AS assignee FROM ops.case_record c LEFT JOIN staff.member m ON m.id=c.assigned_to
    WHERE ($1 IN ('owner','operator') OR c.assigned_to=$2) AND ($3='' OR c.status=$3)
    ORDER BY c.status IN ('resolved','dismissed'),c.due_at,c.id LIMIT ${pageSize} OFFSET $4`, [member.role, member.id, filter ? choice(filter, statuses, 'status') : '', skip])).rows;
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
    // Chefs' notes (admin/db/chefs.sql) show beside staff notes once that table is installed.
    const bots = (await db.query("SELECT to_regclass('ops.case_bot_note') IS NOT NULL AS installed")).rows[0].installed;
    const notes = (await db.query(`SELECT n.id,n.body,n.created_at,m.email AS author FROM ops.case_note n
      JOIN staff.member m ON m.id=n.author_id WHERE n.case_id=$1
      ${bots ? 'UNION ALL SELECT b.id,b.body,b.created_at,b.bot AS author FROM ops.case_bot_note b WHERE b.case_id=$1' : ''}
      ORDER BY created_at LIMIT 100`, [id])).rows.map(n => ({ ...n, author: CHEFS[n.author] ?? n.author }));
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

/**
 * Coco's place-report decisions (docs/ADMIN_CHEFS_PLAN.md step 5), or the owner's answer to one: triage marks an open member's
 * place report for Pandan's recheck with a note; dismiss closes an open one with a note for staff; resolve closes an open or
 * triaged one once the recheck is settled (a published fix, or nothing to change), with the closing note. Never the reporter.
 */
const REPORT = { triage: { to: 'triaged', from: ['open'] }, dismiss: { to: 'dismissed', from: ['open'] }, resolve: { to: 'resolved', from: ['open', 'triaged'] } };
export async function applyPlaceReport(db: PoolClient, actor: Actor, id: string, act: keyof typeof REPORT, note: string, reason: string) {
  const { to, from } = REPORT[act];
  const prior = (await db.query<{ status: string }>(`SELECT status FROM ops.case_record WHERE id=$1 AND status = ANY($2) AND kind='report'
    AND subject_id LIKE 'place:catalogue:%' FOR UPDATE`, [id, from])).rows[0];
  if (!prior) throw new HttpError(409, 'This report changed since it was read. Nothing was changed.');
  await db.query(`UPDATE ops.case_record SET status=$2, resolution=CASE WHEN $2 IN ('dismissed','resolved') THEN $3 ELSE resolution END, updated_at=now(),
    version=version+1 WHERE id=$1`, [id, to, note]);
  const chef = actor.bot ?? actor.proposedBy;
  if (chef) await db.query('INSERT INTO ops.case_bot_note(case_id,bot,body) VALUES($1,$2,$3)', [id, chef, note]);
  else await db.query('INSERT INTO ops.case_note(case_id,author_id,body) VALUES($1,$2,$3)', [id, actor.id, note]);
  await audit(db, actor.id, 'case.' + act, id, reason, { status: to }, actor.bot);
  return { note: act === 'triage' ? 'Sent for a recheck' : undefined, undo: { status: to, prior: prior.status } };
}
/** Puts a place report back as it was before a chef's decision (open, or triaged before a resolve), while nothing has moved it on. */
export async function undoPlaceReport(db: PoolClient, actor: Actor, id: string, undo: { status: string; prior?: string }, reason: string) {
  const back = undo.prior ?? 'open';
  const done = await db.query(`UPDATE ops.case_record SET status=$3, resolution=CASE WHEN $2 IN ('dismissed','resolved') THEN '' ELSE resolution END,
    updated_at=now(), version=version+1 WHERE id=$1 AND status=$2`, [id, undo.status, back]);
  if (!done.rowCount) throw new HttpError(409, 'This report moved on since the chef decided. Nothing was undone.');
  await audit(db, actor.id, 'case.reopened', id, reason, { from: undo.status, to: back }, actor.bot);
}

/**
 * Mint's recall match (docs/ADMIN_CHEFS_PLAN.md step 5): files a critical harm case on the Market item, which staff alerts send
 * to the owner at once. Mint never removes the item; staff do, in admin, where removing it cancels open orders and tells buyers.
 */
const BATCH_WORDS = { match: 'matches the notice', differs: 'differs from the notice', unknown: 'not compared' };
export async function fileRecallCase(db: PoolClient, actor: Actor, listing: string,
  notice: { title: string; url: string; details: string; batch: keyof typeof BATCH_WORDS }, item: { lot: string; date_mark: string | null }, reason: string) {
  const lines = ['SFA notice: ' + notice.url, notice.details && 'The notice lists: ' + notice.details,
    'This item: lot ' + (item.lot || 'not given') + ', date mark ' + (item.date_mark ?? 'not given') + ' (' + BATCH_WORDS[notice.batch] + ')'];
  const row = (await db.query<{ id: string }>(`INSERT INTO ops.case_record(kind,title,description,subject_id,severity)
    VALUES('harm',$1,$2,$3,'critical') RETURNING id`, ['Possible recall match · ' + notice.title.slice(0, 120),
    lines.filter(Boolean).join('\n') + '\n\n' + reason, 'market:listing:' + listing])).rows[0];
  if (actor.bot) await db.query('INSERT INTO ops.case_bot_note(case_id,bot,body) VALUES($1,$2,$3)', [row.id, actor.bot, reason.slice(0, 1000)]);
  await audit(db, actor.id, 'case.recall_filed', row.id, reason, { listing, notice: notice.url }, actor.bot);
  return { note: 'Case filed', undo: { case: row.id } };
}
/** Closes a recall case Mint filed, while nobody has picked it up. */
export async function undoRecallCase(db: PoolClient, actor: Actor, undo: { case: string }, reason: string) {
  const done = await db.query("UPDATE ops.case_record SET status='dismissed', resolution=$2, updated_at=now(), version=version+1 WHERE id=$1 AND status='open'",
    [undo.case, 'Undone: ' + reason.slice(0, 200)]);
  if (!done.rowCount) throw new HttpError(409, 'Staff are already working on this case. Nothing was undone.');
  await audit(db, actor.id, 'case.recall_undone', undo.case, reason, {}, actor.bot);
}
