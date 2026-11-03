import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, pageSize, text } from './http';
import { search } from './content-members';

// Library gaps (server/gaps, docs/AI_FOOD_LIBRARY_PLAN.md Phase E): dishes, foods and swap lines members hit that the reviewed library
// lacks. At 3 members (or Draft now) the QT bots draft an addition from sources; staff approve or reject it here. Approved dish cards
// and swap rules reach the app within five minutes; approved foods wait for the next library release.
const views = {
  review: "('drafted')", drafting: "('queued','claimed')", collecting: "('open')", approved: "('approved')", shipped: "('shipped')", rejected: "('rejected')", failed: "('failed')",
} as const;
const missing = (error: unknown) => (error as { code?: string })?.code === '42P01';

export async function gapList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const view = choice(status || 'review', Object.keys(views) as (keyof typeof views)[], 'status'), term = search(q);
  try {
    return (await query(`SELECT id, kind, key, label, context, hits, members, status, draft, error, note, attempts, first_seen, last_seen, drafted_at, decided_at
      FROM recipes.library_gap WHERE status IN ${views[view]} AND ($1 = '' OR label ILIKE $1 OR key ILIKE $1)
      ORDER BY members DESC, last_seen DESC LIMIT ${pageSize} OFFSET $2`, [term, skip])).rows;
  } catch (error) {
    if (missing(error)) throw new HttpError(503, 'Library gaps are not installed on this server yet.');
    throw error;
  }
}

const ACTIONS = {
  approve: { from: ['drafted'], to: 'approved' },
  ship: { from: ['approved'], to: 'shipped' },
  reject: { from: ['drafted', 'failed', 'open', 'queued'], to: 'rejected' },
  draft: { from: ['open', 'rejected', 'failed'], to: 'queued' },
  withdraw: { from: ['approved'], to: 'rejected' },
} as const;

/**
 * The approved foods not yet in the library, as one JSON file for the library release (scripts/library: each needs a recipe-table key,
 * a match pattern and its figures' source added by hand, then export_tables.py). Staff mark each one added afterwards.
 */
export async function approvedFoods(member: Session) {
  authorize(member, 'content');
  const rows = (await query<{ id: string; label: string; members: number; draft: unknown; decided_at: string }>(
    "SELECT id, label, members, draft, decided_at FROM recipes.library_gap WHERE kind = 'food' AND status = 'approved' ORDER BY decided_at")).rows;
  return { exported: new Date().toISOString(), foods: rows };
}

/**
 * ship: an approved food is in a library release; approve: the draft joins the library (dish cards and swap rules within five minutes; foods with the next release); reject: never
 * drafted again unless staff press Draft now; draft: the bots draft it now; withdraw: an approved addition stops being used.
 */
export async function gapAction(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'content');
  const act = choice(input.action, Object.keys(ACTIONS) as (keyof typeof ACTIONS)[], 'action'), id = text(input.id, 'gap', 36, 36);
  const note = act === 'reject' || act === 'withdraw' ? text(input.note ?? '', 'note', 300, 0) : '';
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    const row = (await db.query<{ status: string; draft: { skip?: string } | null; kind: string; label: string }>(
      'SELECT status, draft, kind, label FROM recipes.library_gap WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!row || !(ACTIONS[act].from as readonly string[]).includes(row.status)) throw new HttpError(409, 'This changed since you opened it. Refresh the list.');
    if (act === 'approve' && (!row.draft || row.draft.skip)) throw new HttpError(400, 'There is no addition to approve. Reject it, or press Draft now.');
    if (act === 'ship' && row.kind !== 'food') throw new HttpError(400, 'Only foods are added to the library by a release.');
    await db.query(`UPDATE recipes.library_gap SET status=$2, note=CASE WHEN $3 <> '' THEN $3 ELSE note END,
        decided_at=CASE WHEN $2 IN ('approved','rejected') THEN now() ELSE decided_at END, decided_by=CASE WHEN $2 IN ('approved','rejected') THEN $4 ELSE decided_by END,
        queued_at=CASE WHEN $2 = 'queued' THEN now() ELSE queued_at END, attempts=CASE WHEN $2 = 'queued' THEN 0 ELSE attempts END,
        error=CASE WHEN $2 = 'queued' THEN '' ELSE error END
      WHERE id=$1`, [id, ACTIONS[act].to, note, member.id]);
    await audit(db, member.id, 'content.library-gap.' + act, 'library-gap:' + id, reason, { kind: row.kind, label: row.label });
    const saved = { approve: row.kind === 'food' ? 'Approved. Download approved foods for the next library release, then mark it added.' : 'Approved. The app uses it within five minutes.',
      ship: 'Marked as added to the library',
      reject: 'Rejected', draft: 'The QT bots will draft it shortly.', withdraw: 'Withdrawn. The app stops using it within five minutes.' }[act];
    return { saved: true, note: saved };
  });
}
