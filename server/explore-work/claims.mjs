import { createHmac } from 'node:crypto';
import { CommunityError } from '../community/http.mjs';
import { listedPlaces } from '../catalogue-places.mjs';
import { capacity, digest, event, reference, wake } from './core.mjs';
import { publicSource } from './reports.mjs';

/**
 * An owner, manager or staff member shows they run a listed place (owner, 4 Nov 2026: Phase 3 of place suggestions). They put a
 * one-time code on the place's own website or social page; Pandan opens that page, the bridge confirms the code is in what was
 * actually fetched, and staff decide (identity stays with people). A confirmed owner's place reports are marked as from the owner,
 * and owners earn no correction credits for their own place. There is no public badge.
 */
const ROLES = ['owner', 'manager', 'staff'];
const secret = () => {
  const value = process.env.BETTER_AUTH_SECRET ?? '';
  if (value.length < 32) throw new CommunityError(503, 'Owner checks are unavailable.');
  return value;
};
/** The same code every time for this member and place, so it can be posted before the claim is sent. */
export function claimCode(user, placeId) {
  const raw = createHmac('sha256', secret()).update('place-claim\n' + user + '\n' + placeId).digest();
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'QT-' + [...raw.subarray(0, 8)].map(b => letters[b % letters.length]).join('');
}
/** The live listing being claimed, by its canonical id, or a 404. */
export async function claimedPlace(placeId) {
  const place = typeof placeId === 'string' ? (await listedPlaces()).find(p => p.id === placeId && p.state === 'live') : null;
  if (!place) throw new CommunityError(404, 'That place is unavailable.');
  return place;
}
export function claimInput(body) {
  const role = body.role, pageUrl = String(body.pageUrl ?? '').trim();
  if (!ROLES.includes(role)) throw new CommunityError(400, 'Choose your role.');
  if (!publicSource(pageUrl) || pageUrl.length > 1000) throw new CommunityError(400, 'Use the public HTTPS link of the page with your code.');
  return { placeId: String(body.placeId ?? ''), role, pageUrl };
}
export async function queueClaim(db, { user, key, input, place, count }) {
  await capacity(db);
  const issue = digest({ claim: place.id, user });
  await db.query('SELECT pg_advisory_xact_lock(1902915,hashtext($1))', ['explore-issue:' + issue]);
  if ((await db.query('SELECT 1 FROM ops.place_claim WHERE place_id=$1 AND user_id=$2 AND revoked_at IS NULL', [place.id, user])).rowCount)
    throw new CommunityError(409, 'You are already confirmed for this place.');
  if ((await db.query("SELECT 1 FROM ops.explore_work WHERE issue_key=$1 AND state IN ('queued','working','needs-input','staff')", [issue])).rowCount)
    throw new CommunityError(409, 'Your check for this place is already under way.');
  await count();
  const payload = { place: { id: place.id, name: place.name, branch: place.branch, address: place.address, postalCode: place.postalCode },
    role: input.role, pageUrl: input.pageUrl, code: claimCode(user, place.id) };
  const w = (await db.query(`INSERT INTO ops.explore_work(kind,target,issue_key,payload) VALUES('claim',$1,$2,$3) RETURNING *`, [place.id, issue, payload])).rows[0];
  await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id,details) VALUES($1,$2,$3,$4,$5)', [user, key, digest(input), w.id, input.role]);
  await event(db, w, 'received'); await wake(db);
  return { reference: reference(w.id), id: w.id, state: w.state };
}
/** Pandan's answer for an owner check: whether the page is the place's own, plus what the bridge found in the fetched page. */
export function claimFinding(p, payload) {
  if (!p || !['verified', 'not-found', 'staff'].includes(p.decision)) throw new CommunityError(400, 'Invalid owner check.');
  const reason = typeof p.reason === 'string' ? p.reason.trim().slice(0, 600) : '';
  if (p.decision === 'staff') return { decision: 'staff', reason: reason || 'Pandan could not check the page.' };
  if (p.pageUrl !== payload.pageUrl || typeof p.codeFound !== 'boolean' || typeof p.pageReadable !== 'boolean' || !/^[a-f0-9]{64}$/.test(p.captureHash ?? '') || typeof p.official !== 'boolean')
    throw new CommunityError(400, 'The page must have been fetched and checked for the code.');
  // A page the bridge could not read (common for social pages behind a login) is not evidence the code is missing.
  const decision = p.codeFound && p.official && p.decision === 'verified' ? 'verified' : !p.pageReadable ? 'unreadable' : 'not-found';
  return { decision, official: p.official, codeFound: p.codeFound, pageReadable: p.pageReadable, captureHash: p.captureHash, checkedAt: String(p.checkedAt ?? '').slice(0, 40), reason };
}
/** Whether this member is a confirmed owner, manager or staff member of the place. */
export const runsPlace = async (db, user, placeId) => !!(await db.query('SELECT 1 FROM ops.place_claim WHERE user_id=$1 AND place_id=$2 AND revoked_at IS NULL', [user, placeId])).rowCount;
