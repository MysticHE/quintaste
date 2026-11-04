import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, text, uuid } from './http';
import { queueAlert } from './push-alerts';

/**
 * Owner checks (server/explore-work/claims.mjs): a member says they run a listed place and posted a code on its own page. Pandan
 * judged whether the page is the place's own; the bridge recorded whether the code was in what it fetched. Staff always decide.
 * Confirming lets the member's place reports show they come from the owner; there is no public badge.
 */
type Claim = { id: string; revision: number; state: string; message: string; created_at: string; payload: { place: { id: string; name: string; branch: string; address: string };
  role: string; pageUrl: string; code: string }; result: { coco?: { decision: string; reason: string }; pandan?: { decision: string; official?: boolean; codeFound?: boolean; reason: string; checkedAt?: string };
  outcome?: { kind: string } } };

export async function claimList(member: Session, view: string) {
  authorize(member, 'content');
  const all = choice(view || 'waiting', ['waiting', 'all'] as const, 'view') === 'all';
  return (await query(`SELECT w.id,w.state,w.created_at,w.payload->'place'->>'name' AS place,w.payload->>'role' AS role,
      w.result->'pandan'->>'decision' AS finding,w.result->'outcome'->>'kind' AS outcome
    FROM ops.explore_work w WHERE w.kind='claim' AND ($1 OR w.state IN ('queued','working','staff','needs-input')) ORDER BY w.state='staff' DESC,w.created_at LIMIT 100`, [all])).rows;
}
export async function claimDetail(member: Session, raw: string) {
  authorize(member, 'content');
  const w = (await query<Claim>(`SELECT id,revision,state,message,created_at,payload,result FROM ops.explore_work WHERE id=$1 AND kind='claim'`, [uuid(raw, 'owner check')])).rows[0];
  if (!w) throw new HttpError(404, 'Owner check not found.');
  // Staff decide who runs a place, so they see the account, and anyone already confirmed for it.
  const account = (await query(`SELECT u.username,u.name,u."createdAt" AS created FROM ops.explore_submission s JOIN public."user" u ON u.id=s.user_id
    WHERE s.work_id=$1 ORDER BY s.created_at LIMIT 1`, [w.id])).rows[0] ?? null;
  const confirmed = (await query(`SELECT c.role,c.created_at,u.username FROM ops.place_claim c JOIN public."user" u ON u.id=c.user_id
    WHERE c.place_id=$1 AND c.revoked_at IS NULL ORDER BY c.created_at`, [w.payload.place.id])).rows;
  return { ...w, account, confirmed };
}
export async function decideClaim(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'content');
  const id = uuid(input.id, 'owner check'), revision = integer(input.revision, 'revision', 1);
  const act = choice(input.action, ['approve', 'ask', 'decline', 'recheck', 'revoke'] as const, 'decision');
  const message = act === 'ask' || act === 'decline' ? text(input.message, 'message to the member', 600, 5) : '';
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    const w = (await db.query<Claim>(`SELECT * FROM ops.explore_work WHERE id=$1 AND kind='claim' FOR UPDATE`, [id])).rows[0];
    const confirmed = w?.result.outcome?.kind === 'approved';
    if (!w || w.revision !== revision || (act === 'revoke' ? !confirmed : !['staff', 'needs-input', ...(act === 'recheck' && !confirmed ? ['resolved'] : [])].includes(w.state)))
      throw new HttpError(409, 'This owner check changed. Refresh before deciding.');
    if (act === 'approve' && !(w.result.pandan?.decision === 'verified' || input.override === true)) throw new HttpError(409, 'The code was not confirmed on the place\'s own page. Tick the override only after checking it yourself.');
    const user = (await db.query<{ user_id: string }>('SELECT user_id FROM ops.explore_submission WHERE work_id=$1 ORDER BY created_at LIMIT 1', [id])).rows[0]?.user_id;
    if (!user) throw new HttpError(409, 'This member account is gone.');
    // Removing a confirmation keeps its record; the member's later reports are no longer marked as from the owner.
    if (act === 'revoke') await db.query('UPDATE ops.place_claim SET revoked_at=now() WHERE work_id=$1 AND revoked_at IS NULL', [id]);
    if (act === 'approve') await db.query(`INSERT INTO ops.place_claim(place_id,user_id,role,page_url,work_id,approved_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [w.payload.place.id, user, w.payload.role, w.payload.pageUrl, id, member.id]);
    const kinds = { approve: 'approved', decline: 'declined', revoke: 'removed' } as const;
    const result = act === 'recheck' ? { ...w.result, outcome: undefined } : act in kinds ? { ...w.result, outcome: { kind: kinds[act as keyof typeof kinds], by: member.id } } : w.result;
    const [stage, state, note] = act === 'approve' ? ['done', 'resolved', 'Confirmed.'] : act === 'decline' ? ['done', 'resolved', message] : act === 'revoke' ? ['done', 'resolved', 'Confirmation removed.']
      : act === 'ask' ? ['done', 'needs-input', message] : ['coco', 'queued', ''];
    await db.query(`UPDATE ops.explore_work SET stage=$2,state=$3,result=$4,message=$5,attempts=0,token=NULL,lease_until=NULL,due_at=now(),updated_at=now() WHERE id=$1`, [id, stage, state, result, note]);
    await audit(db, member.id, 'explore.claim.' + act, 'explore:work:' + id, reason, { revision, place: w.payload.place.id, ...(input.override === true ? { override: true } : {}) });
    if (act !== 'recheck') await queueAlert(db, user, act === 'approve' ? 'exploreClaimApproved' : act === 'ask' ? 'exploreClaimNeedsInfo' : 'exploreClaimDeclined', '/explore-contributions/' + id, w.payload.place.name);
    return { saved: true };
  });
}
/** Owner checks waiting for staff, for the Overview's attention count. */
export const waitingClaims = async () => (await query(`SELECT count(*)::int AS n FROM ops.explore_work WHERE kind='claim' AND state='staff'`)).rows[0].n as number;
