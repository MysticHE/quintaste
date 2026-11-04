import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit, type Actor } from './audit';
import { HttpError, uuid } from './http';
import { foodSource, foodStamp, applyFoodVisibility } from './food-sources.mjs';
import { modeOf } from './chef-names';
import { FOOD_POLICY_VERSION } from './food-policy.mjs';
import { authorize,type Session } from './session';
import { foodAssessment } from './food-assessment';

export async function foodDetail(member:Session,raw:string,slot:string|null=null){
  authorize(member,'content');
  const id=uuid(raw,'food review');
  if(slot!==null){
    if(!/^(cover|step-\d{1,2}|item|detail|label|photo)$/.test(slot))throw new HttpError(400,'Check photo.');
    const bytes=(await query('SELECT bytes FROM ops.food_review_photo WHERE review_id=$1 AND slot=$2',[id,slot])).rows[0]?.bytes;
    if(!bytes)throw new HttpError(404,'Review photo unavailable.');
    return bytes as Buffer;
  }
  const row=(await query('SELECT id,kind,target,fingerprint,policy_version,payload,photos,state,message,created_at FROM ops.food_review WHERE id=$1',[id])).rows[0];
  if(!row)throw new HttpError(404,'Food review unavailable.');
  const paths:Record<string,string>={recipe:'/cook/recipe/member-',listing:'/market/listing/',class:'/market/class/',gathering:'/social/gathering/'};
  const current=row.state==='superseded'?(await query(`SELECT r.state,d.id AS issue FROM ops.food_review r
    LEFT JOIN ops.chef_decision d ON d.lane='food-checks' AND d.target=r.id::text AND d.outcome='asked'
    WHERE r.kind=$1 AND r.target=$2 AND r.payload->>'edition'=$3 AND r.state<>'superseded' ORDER BY r.created_at DESC LIMIT 1`,
    [row.kind,row.target,row.payload.edition])).rows[0]:null;
  return {...row,path:paths[row.kind]?paths[row.kind]+row.target:null,currentState:current?.state??null,currentIssue:current?.issue?'/console/chefs?id='+current.issue:null};
}

export async function foodClaim(caller: string) {
  if (!['safety','head'].includes(caller)) throw new HttpError(403,'Not this worker.');
  return transaction(async db => {
    const control=(await db.query("SELECT enabled,notice FROM ops.control WHERE key='chef_food_checks'")).rows[0];
    if(modeOf(control)!=='on')return {job:null};
    const phase=caller==='safety'?'mint':'kaya';
    const job=(await db.query(`SELECT * FROM ops.food_review WHERE phase=$1 AND policy_version=$2 AND due_at<=now()
      AND (state='queued' OR state='working' AND lease_until<now()) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,[phase,FOOD_POLICY_VERSION])).rows[0];
    if(!job)return {job:null};
    if(!job.kind.startsWith('editorial-')){
      const current=await foodSource(db,job.kind,job.target,job.payload.edition,false);
      if(!current||foodStamp(current)!==job.fingerprint){
        await db.query("UPDATE ops.food_review SET state='superseded',token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",[job.id]);
        return {job:null};
      }
    }
    const token=randomUUID();
    await db.query("UPDATE ops.food_review SET state='working',token=$2,lease_until=now()+interval '90 seconds',attempts=least(20,attempts+1),updated_at=now() WHERE id=$1",[job.id,token]);
    return {job:{id:job.id,kind:job.kind,phase:job.phase,target:job.target,fingerprint:job.fingerprint,payload:job.payload,photos:job.photos,
      prior:job.decision,token,exhausted:job.attempts>=4}};
  });
}

export async function foodHeartbeat(caller:string,input:Record<string,unknown>){
  const id=uuid(input.id,'review'),token=uuid(input.token,'lease');
  const phase=caller==='safety'?'mint':caller==='head'?'kaya':'';
  if(input.defer===true){
    const released=await query(`UPDATE ops.food_review SET state='queued',due_at=now()+interval '30 seconds',token=NULL,lease_until=NULL,attempts=greatest(attempts-1,0)
      WHERE id=$1 AND token=$2 AND phase=$3 AND state='working' AND lease_until>now()`,[id,token,phase]);
    if(!released.rowCount)throw new HttpError(409,'Review lease expired.');
    return {ok:true,deferred:true};
  }
  const r=await query(`UPDATE ops.food_review SET lease_until=now()+interval '90 seconds' WHERE id=$1 AND token=$2 AND phase=$3
    AND state='working' AND lease_until>now() AND updated_at>now()-interval '20 minutes'`,[id,token,phase]);
  if(!r.rowCount)throw new HttpError(409,'Review lease expired.');
  return {ok:true};
}

/** One bounded Lychee evidence check, attached to this exact public event revision before an owner is asked. */
export async function foodEvidence(caller:string,input:Record<string,unknown>){
  if(caller!=='head')throw new HttpError(403,'Only Kaya can request this evidence handoff.');
  const id=uuid(input.id,'review'),token=uuid(input.token,'lease');
  if(!Array.isArray(input.sources)||input.sources.length>3)throw new HttpError(400,'Check source evidence.');
  return transaction(async db=>{
    const job=(await db.query("SELECT * FROM ops.food_review WHERE id=$1 AND token=$2 AND phase='kaya' AND state='working' AND lease_until>now() FOR UPDATE",[id,token])).rows[0];
    if(!job||job.policy_version!==FOOD_POLICY_VERSION||job.kind!=='editorial-event'||job.decision.evidenceAttempted||job.decision.mint?.decision!=='uncertain')throw new HttpError(409,'This revision has no pending evidence handoff.');
    const host=(value:unknown)=>{try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.internal')?u.hostname.replace(/^www\./,''):null;}catch{return null;}};
    const data=job.payload.data,allowed=new Set([data.registrationUrl,...(data.sources??[]),...(data.sourceEvidence??[]).map((s:{url?:string})=>s.url)].map(host).filter(Boolean));
    const sources=(input.sources as Record<string,unknown>[]).map(s=>{
      if(!s||typeof s!=='object'||Array.isArray(s))throw new HttpError(400,'Check source evidence.');
      const sourceHost=host(s.url),fetched=Date.parse(String(s.fetchedAt));
      if(!sourceHost||!allowed.has(sourceHost)||typeof s.url!=='string'||s.url.length>600||typeof s.evidence!=='string'||s.evidence.trim().length<30||s.evidence.length>1000
        ||typeof s.contentSha256!=='string'||!/^[a-f0-9]{64}$/.test(s.contentSha256)||!Number.isFinite(fetched)||fetched>Date.now()+60000||fetched<Date.now()-3600000
        ||s.checkedAt!==new Date(fetched).toISOString().slice(0,10))throw new HttpError(400,'Evidence must be a fresh excerpt read from a supplied official source host.');
      return {url:s.url,evidence:s.evidence,contentSha256:s.contentSha256,fetchedAt:s.fetchedAt,checkedAt:s.checkedAt};
    });
    const sourceRecheck={status:sources.length?'checked':'unavailable',sources};
    const decision={...job.decision,evidenceAttempted:true,sourceRecheck};
    if(sources.length)await db.query("UPDATE ops.food_review SET decision=$2,phase='mint',state='queued',attempts=0,token=NULL,lease_until=NULL,due_at=now(),updated_at=now() WHERE id=$1",[id,JSON.stringify(decision)]);
    else await db.query('UPDATE ops.food_review SET decision=$2 WHERE id=$1',[id,JSON.stringify(decision)]);
    await audit(db,null,'food.evidence',job.kind+':'+job.target,'Lychee checked the supplied official sources for this exact event revision',{review:id,sources:sources.length},'head');
    return {requeued:sources.length>0,sourceRecheck};
  });
}

export async function foodPhoto(caller:string,id:string,slot:string,token:string){
  uuid(id,'review');uuid(token,'lease');
  if(!/^(cover|step-\d{1,2}|item|detail|label|photo)$/.test(slot))throw new HttpError(400,'Check photo.');
  const phase=caller==='safety'?'mint':caller==='head'?'kaya':'';
  return (await query(`SELECT p.bytes FROM ops.food_review_photo p JOIN ops.food_review r ON r.id=p.review_id
    WHERE r.id=$1 AND p.slot=$2 AND r.token=$3 AND r.phase=$4 AND r.state='working' AND r.lease_until>now()`,[id,slot,token,phase])).rows[0]?.bytes ?? null;
}

export async function foodApply(db:PoolClient,actor:Actor,target:string,input:Record<string,unknown>,reason:string,verdict:'clear'|'held'){
  const id=uuid(target,'food review');
  const before=(await db.query('SELECT * FROM ops.food_review WHERE id=$1',[id])).rows[0];
  const current=before&&!before.kind.startsWith('editorial-')?await foodSource(db,before.kind,before.target,before.payload.edition,true):null;
  const job=(await db.query('SELECT * FROM ops.food_review WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!job||job.policy_version!==FOOD_POLICY_VERSION||job.fingerprint!==input.fingerprint||['superseded','clear','held'].includes(job.state))throw new HttpError(409,'This food revision changed or was already decided.');
  if(!job.kind.startsWith('editorial-')){
    if(!current||foodStamp(current)!==job.fingerprint)throw new HttpError(409,'The content or images changed. Review the latest revision.');
    await applyFoodVisibility(db,current,verdict);
  }
  await db.query("UPDATE ops.food_review SET state=$2,phase='done',token=NULL,lease_until=NULL,message=$3,updated_at=now() WHERE id=$1",[id,verdict,reason.slice(0,600)]);
  await audit(db,actor.id,'food.'+verdict,job.kind+':'+job.target,reason,{review:id,fingerprint:job.fingerprint},actor.bot);
  return {note:verdict==='clear'?'Food eligibility cleared for this exact revision.':'Content held for a food-policy correction.'};
}

export async function foodQueue(){
  return (await query("SELECT id,kind,target,fingerprint,payload,photos,phase,state,message FROM ops.food_review WHERE state IN ('queued','working','asked','held') ORDER BY created_at LIMIT 100")).rows;
}

export async function recipeFoodClear(db:{query:typeof query},id:string,lock=false){
  const control=(await db.query<{enabled:boolean;notice:string}>("SELECT enabled,notice FROM ops.control WHERE key='chef_food_checks'")).rows[0];
  if(modeOf(control)!=='on')return true;
  const source=await foodSource(db,'recipe',id,'pending',lock);
  if(!source){
    return Boolean((await db.query('SELECT 1 FROM recipes.recipe WHERE id=$1 AND private',[id])).rowCount);
  }
  return Boolean((await db.query("SELECT 1 FROM ops.food_review WHERE kind='recipe' AND target=$1 AND fingerprint=$2 AND policy_version=$3 AND state='clear'",[id,foodStamp(source),FOOD_POLICY_VERSION])).rowCount);
}

export async function foodGuard(db:PoolClient,target:string,input:Record<string,unknown>){
  const before=(await db.query('SELECT kind,target,payload FROM ops.food_review WHERE id=$1',[uuid(target,'review')])).rows[0];
  if(before&&!before.kind.startsWith('editorial-'))await foodSource(db,before.kind,before.target,before.payload.edition,true);
  const job=(await db.query("SELECT 1 FROM ops.food_review WHERE id=$1 AND token=$2 AND fingerprint=$3 AND phase='kaya' AND state='working' AND lease_until>now() FOR UPDATE",
    [uuid(target,'review'),uuid(input.token,'lease'),input.fingerprint])).rowCount;
  if(!job)throw new HttpError(409,'Food review lease or revision changed.');
}

export async function foodRecorded(db:PoolClient,target:string,outcome:string){
  if(outcome==='asked')await db.query("UPDATE ops.food_review SET state='asked',token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",[target]);
}

export async function foodResult(caller:string,input:Record<string,unknown>,decide:(chef:string,value:Record<string,unknown>)=>Promise<unknown>){
  const id=uuid(input.id,'review'),token=uuid(input.token,'lease'),phase=caller==='safety'?'mint':caller==='head'?'kaya':'';
  const job=(await query("SELECT * FROM ops.food_review WHERE id=$1 AND token=$2 AND phase=$3 AND state='working' AND lease_until>now()",[id,token,phase])).rows[0];
  if(!job)throw new HttpError(409,'Food review lease expired.');
  if(!job.kind.startsWith('editorial-')){
    const current=await foodSource({query},job.kind,job.target,job.payload.edition,false);
    if(!current||foodStamp(current)!==job.fingerprint){
      await query("UPDATE ops.food_review SET state='superseded',token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND token=$2",[id,token]);
      return {ok:true,stale:true};
    }
  }
  const failed=input.error===true;
  const value=input.result as {decision?:string;reason?:string;confidence?:number;photosReviewed?:string[]} | undefined;
  if(!failed&&(!value||!['clear','hold','uncertain'].includes(value.decision??'')||typeof value.reason!=='string'||value.reason.length<5||value.reason.length>500
    ||typeof value.confidence!=='number'||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1
    ||!Array.isArray(value.photosReviewed)||JSON.stringify([...value.photosReviewed].sort())!==JSON.stringify(job.photos.map((p:{digest:string})=>p.digest).sort())))throw new HttpError(400,'Every exact food field and image needs a valid review.');
  const result=failed?{decision:'uncertain',reason:'The worker could not finish this review. Staff attention is needed.',confidence:0,photosReviewed:[],failed:true}:value!;
  if(phase==='mint'){
    const r=await query(`UPDATE ops.food_review SET phase='kaya',state='queued',decision=$3,token=NULL,lease_until=NULL,attempts=0,updated_at=now()
      WHERE id=$1 AND token=$2 AND phase='mint' AND state='working' AND lease_until>now()`,[id,token,JSON.stringify({...job.decision,mint:result})]);
    if(!r.rowCount)throw new HttpError(409,'Food review lease expired.');
    return {ok:true};
  }
  const mint=job.decision.mint,status=foodAssessment({mint,kaya:result},Math.min(mint?.confidence??0,result.confidence??0));
  return decide('safety',{lane:'food-checks',target:id,action:result.decision==='clear'?'clear':'hold',input:{fingerprint:job.fingerprint,token},
    reason:result.reason,evidence:{foodReview:id,mint,kaya:result,photos:job.photos,sourceRecheck:job.decision.sourceRecheck??null},confidence:Math.min(mint?.confidence??0,result.confidence??0),review:status.agreement?'agree':'disagree',idem:'food:'+id+':'+job.fingerprint});
}
