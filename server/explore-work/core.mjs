import { createHash, randomUUID } from 'node:crypto';
import { pool } from '../config.mjs';
import { CommunityError, throttle, transaction } from '../community/http.mjs';
import { operationsEnabled } from '../operations.mjs';

export const digest = value => createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export const reference = id => 'QT-' + id.replaceAll('-', '').slice(0, 10).toUpperCase();
export const workLink = id => '/explore-contributions/' + id;
/** Each kind's Kitchen › Chefs lane: Place reports, Place suggestions (its own lane, so it can watch while corrections publish), Reviews. */
const laneOf=kind=>({report:'chef_place_reports',suggestion:'chef_place_suggestions',claim:'chef_place_claims'})[kind]??'chef_reviews';
export async function exploreMode(db,kind){
  if(!operationsEnabled)return 'on';
  const row=(await db.query('SELECT enabled,notice FROM ops.control WHERE key=$1',[laneOf(kind)])).rows[0];
  return !row?.enabled?'off':/(^|\s)mode=on(\s|$)/.test(row.notice??'')?'on':'watch';
}
export const placeLink = id => '/place/catalogue-' + encodeURIComponent(id);
export const event = (db, work, what, data = {}) => db.query(`INSERT INTO ops.explore_event(work_id,revision,what,data) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [work.id, work.revision, what, data]);
export async function wake(db) { await db.query("SELECT pg_notify('qt_explore_work','ready')"); }
export function submissionKey(raw) {
  if (raw === undefined) return randomUUID(); // old clients still receive a durable job
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(raw)) throw new CommunityError(400, 'Reopen this form and try again.');
  return raw;
}
export async function priorSubmission(db, user, key, hash) {
  const prior = (await db.query(`SELECT s.*,w.state FROM ops.explore_submission s JOIN ops.explore_work w ON w.id=s.work_id WHERE s.user_id=$1 AND s.submission_key=$2`, [user,key])).rows[0];
  if (prior && prior.input_hash !== hash) throw new CommunityError(409, 'This submission changed. Send it as a new update.');
  return prior;
}
const receipt = row => ({ reference: reference(row.work_id), id: row.work_id, state: row.state });
/**
 * Sends a member's contribution once: a retry with the same key returns the first receipt (before any work), then `prepare` runs
 * (photo decoding), then `queue` runs under the member's lock. `queue` calls `count()` only after its own refusals, so a refused
 * or retried submission never uses up the member's daily allowance (`limit` a day under `scope`).
 */
export async function submitOnce(user, rawKey, input, { scope, limit = 3, message, prepare = async () => null, queue }) {
  const key = submissionKey(rawKey), hash = digest(input);
  const known = await priorSubmission(pool, user, key, hash);
  if (known) return receipt(known);
  const prepared = await prepare();
  return transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(1902915,hashtext($1))', ['explore-submit:' + user]);
    const prior = await priorSubmission(db, user, key, hash);
    if (prior) return receipt(prior);
    return queue(db, { key, prepared, count: () => throttle(scope + ':' + user, limit, 86400, message) });
  });
}
export async function capacity(db) {
  const n = (await db.query("SELECT count(*)::int AS n FROM ops.explore_work WHERE state IN ('queued','working')")).rows[0].n;
  if (n >= 2000) throw new CommunityError(503, 'The checking queue is busy. Your draft is kept; try again shortly.');
}
export async function attachPhotos(db, id, photos,owner,start=0) {
  for (let position=0;position<photos.length;position++) {
    const p=photos[position];
    await db.query('INSERT INTO ops.explore_photo(id,work_id,position,bytes,digest,owner_id) VALUES($1,$2,$3,$4,$5,$6)',[p.id ?? randomUUID(),id,position+start,p.bytes,p.digest,owner]);
  }
}
export async function queueReview(db, { user, review, target, rating, body, photos, key, hash }) {
  await capacity(db);
  await db.query(`UPDATE ops.explore_work SET state='superseded',token=NULL,lease_until=NULL,updated_at=now() WHERE review_id=$1 AND kind='review' AND state NOT IN ('published','cancelled','superseded')`,[review]);
  const version=(await db.query('SELECT coalesce(max(revision),0)+1 AS n FROM ops.explore_work WHERE review_id=$1',[review])).rows[0].n;
  const payload={rating,body,photos:photos.map(p=>p.digest),policy:'explore-v1'};
  const w=(await db.query(`INSERT INTO ops.explore_work(kind,target,review_id,revision,payload) VALUES('review',$1,$2,$3,$4) RETURNING *`,[target,review,version,payload])).rows[0];
  await attachPhotos(db,w.id,photos,user);
  await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id) VALUES($1,$2,$3,$4)',[user,key,hash,w.id]);
  await event(db,w,'received'); await wake(db);
  return w;
}
export async function claim(worker, lane='quick') {
  return transaction(async db=>{
    // Serializes only the claim: the model runs outside the transaction.
    await db.query("SELECT pg_advisory_xact_lock(1902915,hashtext('explore-claims'))");
    await db.query(`UPDATE ops.explore_work SET state=CASE WHEN attempts>=3 THEN 'staff' ELSE 'queued' END,
      message=CASE WHEN attempts>=3 THEN 'Checking needs a staff review.' ELSE message END,token=NULL,lease_until=NULL,updated_at=now()
      WHERE state='working' AND lease_until<now()`);
    if ((await db.query("SELECT count(*)::int AS n FROM ops.explore_work WHERE state='working' AND lease_until>now() AND stage IN ('coco','pandan','kaya')")).rows[0].n>=2) return null;
    const stages=lane==='research'?['pandan']:['coco','kaya'];
    const row=(await db.query(`SELECT w.* FROM ops.explore_work w WHERE w.state='queued' AND w.stage=ANY($1) AND w.due_at<=now()
      AND ($2::boolean OR EXISTS(SELECT 1 FROM ops.control c WHERE c.key=CASE w.kind WHEN 'report' THEN 'chef_place_reports' WHEN 'suggestion' THEN 'chef_place_suggestions' WHEN 'claim' THEN 'chef_place_claims' ELSE 'chef_reviews' END AND c.enabled))
      ORDER BY w.stage='kaya' DESC,
      (SELECT count(*) FROM ops.explore_work active JOIN ops.explore_submission a ON a.work_id=active.id
       WHERE active.state='working' AND a.user_id=(SELECT s.user_id FROM ops.explore_submission s WHERE s.work_id=w.id ORDER BY s.created_at LIMIT 1)),w.created_at
      LIMIT 1 FOR UPDATE SKIP LOCKED`,[stages,!operationsEnabled])).rows[0];
    if(!row) return null;
    const token=randomUUID();
    const updated=(await db.query(`UPDATE ops.explore_work SET state='working',worker=$2,token=$3,lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now() WHERE id=$1 RETURNING *`,[row.id,worker,token])).rows[0];
    await event(db,updated,'started:'+updated.stage+':'+updated.attempts);
    return updated;
  });
}
export async function guardedWork(db,id,token) {
  const row=(await db.query("SELECT * FROM ops.explore_work WHERE id=$1 AND token=$2 AND state='working' AND lease_until>now() FOR UPDATE",[id,token])).rows[0];
  if(!row) throw new CommunityError(409,'This job is no longer waiting for this answer.');
  return row;
}
export async function advance(db,w,stage,state='queued',result=w.result,message='') {
  await db.query(`UPDATE ops.explore_work SET stage=$2,state=$3,result=$4,message=$5,attempts=0,token=NULL,lease_until=NULL,due_at=now(),updated_at=now() WHERE id=$1`,[w.id,stage,state,result,message]);
  await event(db,w,stage+':'+state,{message}); await wake(db);
  // A place suggestion waiting for staff is its normal path, not a problem: members see it in My contributions, without an alert.
  const suggestion=w.kind==='suggestion'||w.kind==='claim';
  if(['needs-input','needs-changes','staff'].includes(state)&&!(suggestion&&state==='staff')) {
    const {queueAlert}=await import('../community/push.mjs');
    const members=(await db.query('SELECT DISTINCT user_id FROM ops.explore_submission WHERE work_id=$1',[w.id])).rows;
    for(const {user_id} of members) await queueAlert(db,user_id,state==='staff'?'exploreStaff':state==='needs-input'?(w.kind==='claim'?'exploreClaimNeedsInfo':suggestion?'exploreSuggestionNeedsInfo':'exploreNeedsInfo'):'exploreNeedsChanges',
      {url:'/explore-contributions/'+w.id,once:'explore:'+w.id+':'+w.revision+':'+state+':'+user_id});
  }
}
export async function finishDelivery(db,w,what,payload) {
  await db.query(`INSERT INTO ops.explore_delivery(work_id,revision,what,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[w.id,w.revision,what,payload]);
}
export async function retry(db,w) {
  const maximum=w.stage==='pandan'?2:3, staff=w.attempts>=maximum;
  await db.query(`UPDATE ops.explore_work SET state=$2,token=NULL,lease_until=NULL,due_at=now()+make_interval(secs=>$3),message=$4,updated_at=now() WHERE id=$1`,[w.id,staff?'staff':'queued',w.attempts<2?15:60,staff?'Checking needs a staff review.':'Checking is taking longer than usual.']);
  await event(db,w,'retry:'+w.stage+':'+w.attempts,{staff});
}
export const photosFor = async id => (await pool.query('SELECT id,digest,position FROM ops.explore_photo WHERE work_id=$1 ORDER BY position',[id])).rows;
