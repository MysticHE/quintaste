import { pool } from '../config.mjs';
import { CommunityError } from '../community/http.mjs';
import { attachPhotos, capacity, digest, event, priorSubmission, reference, submissionKey, wake } from './core.mjs';

/** Called in the same transaction as the staff case; retries cannot consume the report limit twice. */
export async function queueReport(db,{user,key,input,caseId,photos=[],fromOwner=false}) {
  await capacity(db);
  const issue=digest({target:input.target,reason:input.reason});
  await db.query('SELECT pg_advisory_xact_lock(1902915,hashtext($1))',['explore-issue:'+issue]);
  let w=(await db.query("SELECT * FROM ops.explore_work WHERE issue_key=$1 AND state IN ('queued','working','needs-input','staff') FOR UPDATE",[issue])).rows[0];
  const report={reason:input.reason,details:input.details,proposed:input.proposed ?? '',sourceUrl:input.sourceUrl ?? '',...(fromOwner?{fromOwner:true}:{})};
  if(w) {
    if((w.payload.reports??[]).length>=20)throw new CommunityError(503,'This issue has enough reports queued. Please try again after its check.');
    const reports=[...(w.payload.reports ?? []),report];
    w=(await db.query(`UPDATE ops.explore_work SET revision=revision+1,payload=jsonb_set(payload,'{reports}',$2),state='queued',stage='coco',token=NULL,lease_until=NULL,attempts=0,updated_at=now() WHERE id=$1 RETURNING *`,[w.id,JSON.stringify(reports)])).rows[0];
    // Additional evidence is retained even when it arrives during a model call.
    const existing=(await db.query('SELECT count(*)::int n FROM ops.explore_photo WHERE work_id=$1',[w.id])).rows[0].n;
    if(existing+photos.length>60) throw new CommunityError(503,'This issue has enough evidence queued. Please try again after its check.');
    await attachPhotos(db,w.id,photos,user,existing);
  } else {
    w=(await db.query(`INSERT INTO ops.explore_work(kind,target,issue_key,payload) VALUES('report',$1,$2,$3) RETURNING *`,[input.target,issue,{reports:[report]}])).rows[0];
    await attachPhotos(db,w.id,photos,user);
  }
  // works_here: a confirmed owner when they sent it, who earns no credits for correcting their own place.
  await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id,case_id,details,works_here) VALUES($1,$2,$3,$4,$5,$6,$7)',[user,key,digest(input),w.id,caseId,input.details,fromOwner]);
  await event(db,w,'received'); await wake(db);
  return {reference:reference(w.id),id:w.id,caseReference:caseId,state:w.state};
}
export async function existingReport(db,user,raw,input) {
  const key=submissionKey(raw), prior=await priorSubmission(db,user,key,digest(input));
  return {key, prior:prior?{reference:reference(prior.work_id),id:prior.work_id,caseReference:prior.case_id,state:prior.state}:null};
}
export function reportInput(body,target) {
  const reason=String(body.reason ?? '').trim(), details=String(body.details ?? '').trim();
  if(!['Hours','Address or location','Menu or prices','Closed or moved','Not meat-free','Other'].includes(reason)) throw new CommunityError(400,'Choose what needs correcting.');
  const proposed=String(body.proposed ?? '').trim(),sourceUrl=String(body.sourceUrl ?? '').trim();
  if(details.length>1000 || proposed.length>1000 || sourceUrl.length>1000) throw new CommunityError(400,'Use shorter details.');
  if(sourceUrl && !publicSource(sourceUrl)) throw new CommunityError(400,'Use a public HTTPS source link.');
  return {target,reason,details,proposed,sourceUrl,photos:body.photos ?? []};
}
export function publicSource(raw) {
  try { const u=new URL(raw); return u.protocol==='https:' && !u.username && !u.password && !u.port &&
    !/^(localhost|.*\.local|.*\.internal|\d[\d.]*|\[.*\])$/i.test(u.hostname) && u.hostname.includes('.'); } catch { return false; }
}
export async function memberStatus(id,user) {
  const w=(await pool.query(`SELECT w.*,w.updated_at::text AS read_version,r.state AS reward_state,r.credits FROM ops.explore_work w
    JOIN ops.explore_submission s ON s.work_id=w.id LEFT JOIN ops.explore_reward r ON r.work_id=w.id AND r.user_id=$2
    WHERE w.id=$1 AND s.user_id=$2 LIMIT 1`,[id,user])).rows[0];
  if(!w) throw new CommunityError(404,'This contribution is unavailable.');
  return w;
}
