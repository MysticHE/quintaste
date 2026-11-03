import { Buffer } from 'node:buffer';
import { pool,logger } from '../config.mjs';
import { transaction } from '../community/http.mjs';
import { allowed } from '../operations.mjs';
import { publishedPlaceId } from '../catalogue-places.mjs';
import { lockProfile,postCredits } from '../game/ledger.mjs';
import { queueAlert } from '../community/push.mjs';
import { correctionMatches,correctionPatches,liveContext,validateProposal } from './corrections.mjs';
import { advance,event,exploreMode,finishDelivery,placeLink,reference } from './core.mjs';

async function publishReview(db,w) {
  const review=(await db.query(`SELECT r.* FROM community.place_review r WHERE r.id=$1 FOR UPDATE`,[w.review_id])).rows[0];
  const restricted=review && (await db.query('SELECT 1 FROM ops.restriction WHERE user_id=$1 AND active',[review.user_id])).rowCount;
  if(!review||review.hidden_at||restricted||review.live_revision>=w.revision) return advance(db,w,'done','cancelled',w.result,'This review is no longer awaiting publication.');
  const p=w.payload;
  if(w.result.coco?.decision!=='approve'||w.result.kaya?.decision!=='approve') return advance(db,w,'done','staff',w.result,'Publication needs a review.');
  await db.query(`UPDATE community.place_review SET rating=$2,body=$3,published=true,live_revision=$4,published_at=coalesce(published_at,now()),updated_at=now() WHERE id=$1`,[review.id,p.rating,p.body,w.revision]);
  await db.query('DELETE FROM community.place_review_photo WHERE review_id=$1',[review.id]);
  await db.query(`INSERT INTO community.place_review_photo(id,review_id,position,bytes,digest)
    SELECT id,$2,position,bytes,digest FROM ops.explore_photo WHERE work_id=$1`,[w.id,review.id]);
  await advance(db,w,'verify','queued',w.result);
}
async function publishCorrection(db,w) {
  const proposal=w.result.pandan; validateProposal(proposal,w.payload.before);
  if(w.result.kaya?.decision!=='approve') return advance(db,w,'done','staff',w.result,'The correction needs approval.');
  // The app can read staff content, never lock or write it. Version guards and the invalidation trigger protect staff edits.
  const existing=(await db.query("SELECT kind,version FROM content.item WHERE id=$1 AND kind IN ('place','menu')",[w.target])).rows;
  const versions=Object.fromEntries(existing.map(r=>[r.kind,r.version]));
  for(const kind of ['place','menu']) if((versions[kind]??0)!==(w.payload.staffVersions?.[kind]??0)) return advance(db,w,'pandan','queued',w.result,'The listing changed; checking the latest version.');
  const patchRows=(await db.query('SELECT kind,work_id,updated_at FROM ops.explore_patch WHERE id=$1 AND NOT disabled FOR UPDATE',[w.target])).rows;
  const patchVersions=Object.fromEntries(patchRows.map(p=>[p.kind,p.work_id+':'+new Date(p.updated_at).toISOString()]));
  for(const kind of ['place','menu']) if((patchVersions[kind]??null)!==(w.payload.patchVersions?.[kind]??null)) return advance(db,w,'pandan','queued',w.result,'A verified correction arrived; checking the newest version.');
    for(const [kind,rawData] of Object.entries(correctionPatches(proposal))) {
    const data=/** @type {any} */(rawData);
    const prior=(await db.query('SELECT * FROM ops.explore_patch WHERE kind=$1 AND id=$2 FOR UPDATE',[kind,w.target])).rows[0];
    const base=prior&&!prior.disabled&&prior.staff_version===(versions[kind]??0)?prior.data:{};
    const merged={...base,...data};
    if(kind==='menu') {
      merged.items={...base.items};
      for(const [key,value] of Object.entries(data.items)) merged.items[key]={...merged.items[key],...value};
    }
    await db.query(`INSERT INTO ops.explore_patch(kind,id,data,staff_version,work_id) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data,staff_version=excluded.staff_version,work_id=excluded.work_id,disabled=false,updated_at=now()`,[kind,w.target,merged,versions[kind]??0,w.id]);
  }
  await event(db,w,'correction-applied',{changes:proposal.changes,sources:proposal.sources,beforeHash:proposal.beforeHash,before:w.payload.before.venue});
  await advance(db,w,'verify','queued',w.result);
  // Staff-content readers share a bounded cache. Verify only after it can refresh.
  await db.query("UPDATE ops.explore_work SET due_at=now()+interval '11 seconds' WHERE id=$1",[w.id]);
}
async function verify(w) {
  if(w.kind==='review') {
    const response=await fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/place-reviews/'+encodeURIComponent(w.target)+'?reviewId='+w.review_id,{signal:AbortSignal.timeout(12000)});
    if(!response.ok) return false;
    const page=/** @type {any} */(await response.json()),review=page.items?.find(r=>r.id===w.review_id);
    if(!review||review.rating!==w.payload.rating||review.body!==w.payload.body||review.photos?.length!==w.payload.photos.length) return false;
    const matches=(review.photos??[]).every(url=>w.payload.photos.some(hash=>url.endsWith('?v='+hash.slice(0,12))));
    if(!matches) return false;
    for(const photo of review.photos??[]) {
      const image=await fetch('http://127.0.0.1:'+(process.env.PORT||3000)+photo,{signal:AbortSignal.timeout(12000)});
      if(!image.ok) return false;
      const {createHash}=await import('node:crypto');
      const hash=createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex');
      if(!w.payload.photos.includes(hash)) return false;
    }
    return true;
  }
  return correctionMatches(w.result.pandan,await liveContext(w.target));
}
async function complete(db,w,name) {
  const review=w.kind==='review';
  await db.query(`UPDATE ops.explore_work SET state=$2,stage='done',verified_at=now(),message=$3,token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1`,[w.id,review?'published':'resolved',review?'Your review is live.':'The reported details have been updated.']);
  await event(db,w,'verified-live');
  const members=(await db.query('SELECT DISTINCT user_id FROM ops.explore_submission WHERE work_id=$1',[w.id])).rows;
  for(const {user_id} of members)await queueAlert(db,user_id,review?'explorePublished':'exploreUpdated',{url:'/explore-contributions/'+w.id,once:'explore:'+w.id+':'+w.revision+':live'});
  if(!review) {
    // One entitlement per canonical correction; the profile cap serializes across different issues.
    const owner=(await db.query(`SELECT user_id FROM ops.explore_submission WHERE work_id=$1 ORDER BY created_at,id LIMIT 1`,[w.id])).rows[0]?.user_id;
    if(owner) {
      await db.query('SELECT pg_advisory_xact_lock(1902915,hashtext($1))',['explore-rewards:'+owner]);
      const used=(await db.query(`SELECT count(*)::int n FROM ops.explore_reward r JOIN ops.explore_work w ON w.id=r.work_id
        WHERE r.user_id=$1 AND r.state IN ('pending','paid') AND (w.verified_at AT TIME ZONE 'Asia/Singapore')::date=(now() AT TIME ZONE 'Asia/Singapore')::date`,[owner])).rows[0].n;
      await db.query(`INSERT INTO ops.explore_reward(work_id,user_id,state,due_at) VALUES($1,$2,$3,now()+interval '24 hours') ON CONFLICT DO NOTHING`,[w.id,owner,used>=3?'ineligible':'pending']);
    }
  }
  const reward=(await db.query('SELECT state,credits FROM ops.explore_reward WHERE work_id=$1',[w.id])).rows[0];
  await db.query('SELECT ops.resolve_explore_cases($1)',[w.id]);
  await finishDelivery(db,w,'live',{title:review?'Explore review published':'Explore updated',target:w.target,name,
    path:placeLink(w.target)+(review?'?reviewId='+w.review_id:''),reference:reference(w.id),
    detail:review?'Rating, comment and attached photos checked.':w.result.pandan.changes.map(c=>c.field==='contact'?'public phone':c.field).join(', ')+' corrected.',
    reward:reward?.state==='pending'?20:0,verifiedAt:new Date().toISOString()});
}
async function settleRewards() {
  if(!await allowed('games')||!await allowed('collection')) return;
  const rows=(await pool.query("SELECT r.*,w.result,w.target FROM ops.explore_reward r JOIN ops.explore_work w ON w.id=r.work_id WHERE r.state='pending' AND r.due_at<=now() LIMIT 10")).rows;
  for(const r of rows) {
    const live=await liveContext(r.target).catch(()=>null);
    if(!live)continue; // A transient public-read failure delays settlement; it is not evidence of a reversal.
    const good=correctionMatches(r.result.pandan,live);
    if(!good) {
      await transaction(async db=>{
        const held=await db.query("UPDATE ops.explore_reward SET state='held' WHERE work_id=$1 AND state='pending' RETURNING work_id",[r.work_id]);
        if(!held.rowCount)return;
        await db.query("UPDATE ops.explore_work SET message='The correction changed before credit settlement. Staff will check the reward.',updated_at=now() WHERE id=$1",[r.work_id]);
        await queueAlert(db,r.user_id,'exploreStaff',{url:'/explore-contributions/'+r.work_id,once:'explore:'+r.work_id+':reward-held'});
      });continue;
    }
    await transaction(async db=>{
      const row=(await db.query("SELECT * FROM ops.explore_reward WHERE work_id=$1 AND state='pending' FOR UPDATE",[r.work_id])).rows[0];
      if(!row||(await db.query('SELECT 1 FROM ops.restriction WHERE user_id=$1 AND active',[r.user_id])).rowCount) return;
      await lockProfile(db,r.user_id);
      await postCredits(db,r.user_id,20,'explore_fix','correction:'+r.work_id);
      await db.query("UPDATE ops.explore_reward SET state='paid',paid_at=now() WHERE work_id=$1",[r.work_id]);
      await db.query('UPDATE ops.explore_work SET updated_at=now() WHERE id=$1',[r.work_id]);
      await queueAlert(db,r.user_id,'exploreCredits',{url:'/explore-contributions/'+r.work_id,once:'explore:'+r.work_id+':credits'});
      const w=(await db.query('SELECT * FROM ops.explore_work WHERE id=$1',[r.work_id])).rows[0];
      await finishDelivery(db,w,'reward',{title:'Explore contribution rewarded',target:w.target,path:placeLink(w.target),reference:reference(w.id),detail:'20 credits awarded.',verifiedAt:new Date().toISOString()});
    });
  }
}
async function attention() {
  // Reuses the staff case queue: failed jobs cannot disappear in an unattended dead-letter queue.
  await pool.query(`INSERT INTO ops.case_record(kind,title,description,subject_id)
    SELECT 'incident','Explore contribution needs staff',left(w.message,1000),'explore:work:'||w.id FROM ops.explore_work w
    WHERE (w.state='staff' OR (w.state IN ('queued','working') AND w.created_at<now()-interval '24 hours'))
    AND NOT EXISTS(SELECT 1 FROM ops.case_record c WHERE c.subject_id='explore:work:'||w.id)`);
  await pool.query(`INSERT INTO ops.case_record(kind,title,description,subject_id)
    SELECT 'incident','Explore Telegram delivery needs attention','A verified update is live but its Telegram delivery needs checking.','explore:delivery:'||d.id
    FROM ops.explore_delivery d WHERE (d.state='unknown' OR (d.state='pending' AND d.attempts>5))
    AND NOT EXISTS(SELECT 1 FROM ops.case_record c WHERE c.subject_id='explore:delivery:'||d.id)`);
  await pool.query(`INSERT INTO ops.case_record(kind,title,description,subject_id)
    SELECT 'incident','Explore reward needs attention','A correction reward needs review before settlement.','explore:work:'||r.work_id
    FROM ops.explore_reward r WHERE (r.state='held' OR (r.state='pending' AND r.due_at<now()-interval '24 hours'))
    AND NOT EXISTS(SELECT 1 FROM ops.case_record c WHERE c.subject_id='explore:work:'||r.work_id)`);
}
export function startExploreWorker() {
  let busy=false,stopped=false,ticks=0;
  const tick=async()=>{
    if(busy||stopped) return; busy=true;
    let active=null;
    try {
      if(!await allowed('menus'))return;
      const w=(await pool.query(`UPDATE ops.explore_work SET state='working',token=gen_random_uuid(),lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now()
        WHERE id=(SELECT id FROM ops.explore_work WHERE state='queued' AND stage IN ('publish','verify') AND due_at<=now() ORDER BY due_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`)).rows[0];
      active=w;
      if(w) {
        if(!await publishedPlaceId(w.target)) await transaction(db=>advance(db,w,'done','staff',w.result,'The place is no longer available.'));
        else if(w.stage==='publish') {
          if(!w.result.kaya?.staff && await exploreMode(pool,w.kind)!=='on') {
            await transaction(db=>advance(db,w,'done','staff',w.result,'Publication is paused for staff review.'));return;
          }
          const live=await liveContext(w.target);
          if(w.kind==='report') {
            if(live.hash!==w.payload.before.hash) { await transaction(db=>advance(db,w,'pandan','queued',w.result,'Checking the latest listing version.')); return; }
          }
          await transaction(async db=>{
            const current=(await db.query("SELECT * FROM ops.explore_work WHERE id=$1 AND token=$2 AND state='working' FOR UPDATE",[w.id,w.token])).rows[0];
            if(!current) return;
            if(w.kind==='review') await publishReview(db,current); else await publishCorrection(db,current);
          },'explore-publish:'+w.target);
        } else {
          const good=await verify(w),name=good?(await liveContext(w.target)).venue.name:null;
          await transaction(async db=>{
            const current=(await db.query("SELECT * FROM ops.explore_work WHERE id=$1 AND token=$2 AND state='working' FOR UPDATE",[w.id,w.token])).rows[0];
            if(!current) return;
            if(good) await complete(db,current,name);
            else {
              await db.query("UPDATE ops.explore_work SET state=CASE WHEN attempts>=10 THEN 'staff' ELSE 'queued' END,attempts=attempts+1,due_at=now()+interval '10 seconds',token=NULL,lease_until=NULL,message='Confirming the live update.',updated_at=now() WHERE id=$1",[w.id]);
            }
          });
        }
      }
      if(ticks++%15===0) { await settleRewards(); await attention(); }
    } catch(error) {
      logger.warn({event:'explore_work_tick_failed',code:error?.code??error?.name});
      if(active)await pool.query(`UPDATE ops.explore_work SET state=CASE WHEN attempts>=3 THEN 'staff' ELSE 'queued' END,
        token=NULL,lease_until=NULL,due_at=now()+interval '15 seconds',message='Checking needs another attempt.',updated_at=now()
        WHERE id=$1 AND token=$2 AND state='working'`,[active.id,active.token]).catch(()=>{});
    }
    finally { busy=false; }
  };
  const timer=setInterval(tick,2000).unref(); void tick();
  return ()=>{stopped=true;clearInterval(timer);};
}
