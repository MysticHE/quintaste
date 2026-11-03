import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { pool } from '../config.mjs';
import { raw,json } from '../bot-signature.mjs';
import { errors,CommunityError,transaction,uuid } from '../community/http.mjs';
import { allowed,restricted } from '../operations.mjs';
import { signedExplore } from './auth.mjs';
import { advance,claim,digest,exploreMode,guardedWork,photosFor,retry } from './core.mjs';
import { publicSource } from './reports.mjs';
import { liveContext,validateProposal } from './corrections.mjs';

export const exploreBots=express.Router();
exploreBots.use(rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-8',legacyHeaders:false}));
exploreBots.use((req,res,next)=>{
  if(!/^\d{10}$/.test(req.get('X-QT-Time')??'')||! /^[a-f0-9]{64}$/.test(req.get('X-QT-Signature')??''))return res.sendStatus(401);
  next();
});
exploreBots.post('/claim',raw('2kb'),signedExplore,async(req,res)=>{
  if(!await allowed('menus'))return res.json({job:null});
  const b=json(req) ?? {}, name=String(b.name ?? 'explore');
  if(!/^[a-z0-9-]{1,50}$/.test(name)) throw new CommunityError(400,'Invalid worker.');
  const w=await claim(name,b.lane==='research'?'research':'quick');
  if(!w) return res.json({job:null});
  if(w.stage==='pandan') {
    try {
      const before=await liveContext(w.target);
      const versions=(await pool.query("SELECT kind,version FROM content.item WHERE id=$1 AND kind IN ('place','menu')",[w.target])).rows;
      const patches=(await pool.query('SELECT kind,work_id,updated_at FROM ops.explore_patch WHERE id=$1 AND NOT disabled',[w.target])).rows;
      if(patches.some(p=>Date.now()-new Date(p.updated_at).getTime()<11000)) throw new Error('Waiting for current public revision');
      w.payload={...w.payload,before,staffVersions:Object.fromEntries(versions.map(r=>[r.kind,r.version])),patchVersions:Object.fromEntries(patches.map(p=>[p.kind,p.work_id+':'+new Date(p.updated_at).toISOString()]))};
      const updated=await pool.query("UPDATE ops.explore_work SET payload=$3 WHERE id=$1 AND token=$2 AND state='working'",[w.id,w.token,w.payload]);
      if(!updated.rowCount) return res.json({job:null});
    } catch {
      await transaction(async db=>retry(db,await guardedWork(db,w.id,w.token)));
      return res.json({job:null});
    }
  }
  const photos=await photosFor(w.id);
  res.json({job:{id:w.id,token:w.token,revision:w.revision,stage:w.stage,kind:w.kind,target:w.target,payload:w.payload,result:w.result,
    photos:photos.map(p=>({id:p.id,digest:p.digest,path:'/api/explore-work/bot/jobs/'+w.id+'/photos/'+p.id}))}});
});
exploreBots.post('/jobs/:id/heartbeat',raw('1kb'),signedExplore,async(req,res)=>{
  const b=json(req) ?? {};
  if(!uuid(req.params.id)||!uuid(b.token)) throw new CommunityError(400,'Invalid claim.');
  const r=await pool.query(`UPDATE ops.explore_work SET lease_until=now()+interval '90 seconds' WHERE id=$1 AND token=$2 AND state='working' AND lease_until>now() AND updated_at>now()-interval '25 minutes'`,[req.params.id,b.token]);
  if(!r.rowCount) throw new CommunityError(409,'Claim expired.');
  res.json({ok:true});
});
exploreBots.get('/jobs/:id/photos/:photo',signedExplore,async(req,res)=>{
  if(!uuid(req.params.id)||!uuid(req.params.photo)||!uuid(req.get('X-QT-Lease'))) return res.sendStatus(404);
  const row=(await pool.query(`SELECT p.bytes FROM ops.explore_photo p JOIN ops.explore_work w ON w.id=p.work_id
    WHERE p.work_id=$1 AND p.id=$2 AND w.token=$3 AND w.state='working' AND w.lease_until>now()`,[req.params.id,req.params.photo,req.get('X-QT-Lease')])).rows[0];
  if(!row) return res.sendStatus(404);
  res.type('image/jpeg').send(row.bytes);
});
function moderation(value,photos) {
  if(!value || !['approve','needs-changes','staff','investigate'].includes(value.decision) || typeof value.reason!=='string' || value.reason.length<5 || value.reason.length>600)
    throw new CommunityError(400,'Invalid review decision.');
  if(!Array.isArray(value.photosReviewed) || JSON.stringify([...value.photosReviewed].sort())!==JSON.stringify(photos.map(p=>p.digest).sort()))
    throw new CommunityError(400,'Every exact image must be checked.');
  return {decision:value.decision,reason:value.reason,photosReviewed:value.photosReviewed,categories:Array.isArray(value.categories)?value.categories.filter(c=>typeof c==='string').slice(0,12):[]};
}
exploreBots.post('/jobs/:id/result',raw('500kb'),signedExplore,async(req,res)=>{
  const b=json(req) ?? {};
  if(!uuid(req.params.id)||!uuid(b.token)) throw new CommunityError(400,'Invalid claim.');
  await transaction(async db=>{
    const w=await guardedWork(db,req.params.id,b.token);
    if(b.revision!==w.revision) throw new CommunityError(409,'Input changed.');
    const owner=(await db.query('SELECT user_id FROM ops.explore_submission WHERE work_id=$1 ORDER BY created_at LIMIT 1',[w.id])).rows[0]?.user_id;
    if(!owner || await restricted(owner)) return advance(db,w,'done','cancelled',w.result,'Contribution unavailable.');
    if(b.error) return retry(db,w);
    const photos=(await db.query('SELECT digest FROM ops.explore_photo WHERE work_id=$1 ORDER BY position',[w.id])).rows;
    if(w.stage==='coco') {
      const decision=moderation(b.result,photos),result={...w.result,coco:decision};
      if(w.kind==='report') {
        if(decision.decision!=='investigate') return advance(db,w,'done',decision.decision==='needs-changes'?'needs-input':'staff',result,decision.reason);
        if((w.payload.reports ?? []).some(r=>['Closed or moved','Not meat-free','Address or location'].includes(r.reason))) return advance(db,w,'done','staff',result,'This change needs a staff check.');
        return advance(db,w,'pandan','queued',result);
      }
      if(decision.decision!=='approve') return advance(db,w,'done',w.kind==='review'&&decision.decision==='needs-changes'?'needs-changes':'staff',result,decision.reason);
      return advance(db,w,'kaya','queued',result);
    }
    if(w.stage==='pandan') {
      const proposal=b.result;
      if(proposal?.decision!=='propose') return advance(db,w,'done','staff',{...w.result,pandan:proposal},'We need more evidence to confirm this update.');
      validateProposal(proposal,w.payload.before);
      if(!Array.isArray(proposal.sources)||!proposal.sources.length||proposal.sources.some(s=>!publicSource(s.url)||typeof s.quote!=='string'||s.quote.length<8||!/^\d{4}-\d{2}-\d{2}/.test(s.checkedAt ?? '')))
        throw new CommunityError(400,'Captured source evidence is required.');
      if(proposal.sources.some(s=>!s.captureHash || !/^[a-f0-9]{64}$/.test(s.captureHash))) throw new CommunityError(400,'Source captures must be retained.');
      if(proposal.sources.length>8)throw new CommunityError(400,'Use up to eight focused sources.');
      if(proposal.sources.some(s=>s.url.length>1000||s.quote.length>4000||(s.excerpt??'').length>24000))throw new CommunityError(400,'Use bounded source evidence.');
      for(const change of proposal.changes){
        const source=proposal.sources.find(s=>s.url===(change.field==='price'?(change.sourceUrl??proposal.sources[0].url):change.value.sourceUrl));
        if(!source)throw new CommunityError(400,'Every field needs captured source evidence.');
        if(change.field!=='price')change.value.checkedAt=source.checkedAt;
      }
      return advance(db,w,'kaya','queued',{...w.result,pandan:proposal});
    }
    if(w.stage==='kaya') {
      const decision=moderation(b.result,photos),result={...w.result,kaya:decision};
      if(decision.decision!=='approve') return advance(db,w,'done','staff',result,'A staff check is needed before publication.');
      if(w.kind==='review-report') {
        await advance(db,w,'done','resolved',result,'The reported review was checked.');
        await db.query('SELECT ops.resolve_explore_cases($1)',[w.id]);return;
      }
      if(w.kind==='report') validateProposal(w.result.pandan,w.payload.before);
      if(await exploreMode(db,w.kind)!=='on')return advance(db,w,'done','staff',result,'This lane is watching; publication needs staff approval.');
      return advance(db,w,'publish','queued',result);
    }
    throw new CommunityError(409,'Unexpected stage.');
  });
  res.json({ok:true});
});
// Completion delivery is claimed independently of model/research work; no digest or timer batching.
exploreBots.post('/deliveries/claim',raw('1kb'),signedExplore,async(_req,res)=>{
  if(!await allowed('menus'))return res.json({delivery:null});
  const delivery=await transaction(async db=>{
    await db.query("UPDATE ops.explore_delivery SET state='unknown' WHERE state='sending' AND updated_at<now()-interval '2 minutes'");
    const row=(await db.query(`SELECT d.*,w.kind,w.target,w.review_id,w.revision AS current_revision,w.state AS work_state,w.result FROM ops.explore_delivery d JOIN ops.explore_work w ON w.id=d.work_id
      WHERE d.state='pending' AND d.due_at<=now() AND w.verified_at IS NOT NULL ORDER BY d.due_at LIMIT 1 FOR UPDATE OF d SKIP LOCKED`)).rows[0];
    if(!row) return null;
    let current=row.current_revision===row.revision && ['published','resolved'].includes(row.work_state);
    if(current&&row.kind==='review') {
      const review=(await db.query(`SELECT r.published,r.live_revision,r.hidden_at,
        EXISTS(SELECT 1 FROM ops.restriction x WHERE x.user_id=r.user_id AND x.active) AS restricted
        FROM community.place_review r WHERE r.id=$1`,[row.review_id])).rows[0];
      current=review?.published&&!review.hidden_at&&!review.restricted&&review.live_revision===row.revision;
    }
    if(current&&row.kind==='report'&&row.what==='live') {
      const patches=(await db.query(`SELECT p.kind,p.data FROM ops.explore_patch p LEFT JOIN content.item c ON c.kind=p.kind AND c.id=p.id
        WHERE p.id=$1 AND NOT p.disabled AND p.staff_version=coalesce(c.version,0)`,[row.target])).rows;
      const kinds=Object.fromEntries(patches.map(p=>[p.kind,p.data]));
      current=row.result.pandan.changes.every(c=>digest(c.field==='price'?kinds.menu?.items?.[c.sectionId+'/'+c.itemId]?.price:kinds.place?.[c.field])===digest(c.value));
    }
    if(!current){await db.query("UPDATE ops.explore_delivery SET state='superseded',updated_at=now() WHERE id=$1",[row.id]);return null;}
    const token=randomUUID();
    await db.query("UPDATE ops.explore_delivery SET state='sending',token=$2,attempts=attempts+1,updated_at=now() WHERE id=$1",[row.id,token]);
    return {id:row.id,token,payload:row.payload,what:row.what};
  }); res.json({delivery});
});
exploreBots.post('/deliveries/:id/result',raw('2kb'),signedExplore,async(req,res)=>{
  const b=json(req) ?? {};
  if(!uuid(req.params.id)||!uuid(b.token)) throw new CommunityError(400,'Invalid delivery.');
  const status=b.messageId?'sent':b.unknown?'unknown':'pending',delay=Math.max(2,Math.min(3600,Number(b.retryAfter)||30));
  const r=await pool.query(`UPDATE ops.explore_delivery SET state=$3,message_id=$4,due_at=now()+make_interval(secs=>$5),updated_at=now()
    WHERE id=$1 AND token=$2 AND (state='sending' OR (state='unknown' AND $4::text IS NOT NULL))`,[req.params.id,b.token,status,b.messageId?String(b.messageId).slice(0,40):null,delay]);
  if(!r.rowCount) throw new CommunityError(409,'Delivery claim changed.');
  res.json({ok:true});
});
exploreBots.post('/export',raw('1kb'),signedExplore,async(req,res)=>{
  const b=json(req)??{},after=String(b.after??'0');if(!/^\d{1,18}$/.test(after))throw new CommunityError(400,'Invalid cursor.');
  const page=(await pool.query(`SELECT e.id AS event_id,w.id AS work_id,w.target,e.revision,v.created_at AS verified_at,
      e.data,e.data->'before' AS before FROM ops.explore_event e JOIN ops.explore_work w ON w.id=e.work_id
      JOIN ops.explore_event v ON v.work_id=e.work_id AND v.revision=e.revision AND v.what='verified-live'
    WHERE e.id>$1 AND e.what='correction-applied'
    ORDER BY e.id LIMIT 25`,[after])).rows;
  // The signed reader is bounded to 1 MB. Stop between whole receipts and advance only over included events.
  const rows=[];let bytes=0;
  for(const row of page){
    const size=Buffer.byteLength(JSON.stringify(row),'utf8');
    if(bytes+size>850000)break;
    rows.push(row);bytes+=size;
  }
  if(page.length&&!rows.length)throw new CommunityError(503,'One correction export needs staff attention.');
  res.json({rows,next:rows.at(-1)?.event_id??after});
});
exploreBots.use(errors);
exploreBots.use((_req,res)=>res.sendStatus(404));
