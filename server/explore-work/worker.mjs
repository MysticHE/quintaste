import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { origin,pool,logger } from '../config.mjs';
import { consentedCovers,coverImage,coverPhoto,COVER_CONSENT,MEMBER_COVER } from '../../admin/src/lib/member-cover.mjs';
import { transaction } from '../community/http.mjs';
import { allowed } from '../operations.mjs';
import { publishedPlaceId } from '../catalogue-places.mjs';
import { lockProfile,postCredits } from '../game/ledger.mjs';
import { queueAlert } from '../community/push.mjs';
import { CORRECTION_REWARD, SUGGESTION_REWARD } from '../collection/catalog.mjs';
import { editorialStore } from '../editorial/router.mjs';
import { publish, readSnapshot } from '../editorial/store.mjs';
import { hash } from '../editorial/validation.mjs';
import { editorialFoodGate } from '../food-review/editorial.mjs';
import { placeMatches } from './suggestions.mjs';
import { correctionProgress } from './rewards.mjs';
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
/** The live place a job is about: a suggestion's is the place staff added, once they have. */
const placeOf=w=>w.kind==='suggestion'?w.result.outcome?.placeId:w.target;
async function verify(w) {
  // A place staff just added reaches the app's staff-content cache within about 10 seconds; until then this retries.
  if(w.kind==='suggestion') return !!await publishedPlaceId(placeOf(w)) && (await liveContext(placeOf(w)).catch(()=>null))?.venue?.id===placeOf(w);
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
/** The member's consented photo as the place's cover and its reviewed asset, or null when the photo is too small to be a cover. */
async function memberCover(w,placeId,verdict) {
  const row=(await pool.query('SELECT bytes FROM ops.explore_photo WHERE work_id=$1 AND digest=$2 LIMIT 1',[w.id,verdict.digest])).rows[0];
  // A photo that cannot be processed leaves the cover out; it never holds up the listing itself.
  const image=row&&await coverImage(Buffer.from(row.bytes)).catch(()=>null);
  if(!image) return null;
  const today=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  return {photo:coverPhoto(image,origin+placeLink(placeId),today),asset:{sha256:image.sha256,base64:image.bytes.toString('base64'),
    provenance:{kind:MEMBER_COVER.kind,placeId,workId:w.id,photoDigest:verdict.digest,subject:verdict.subject},
    review:{decision:'approved',sha256:image.sha256,reviewedBy:'QT Manager',reason:verdict.reason}}};
}
/** Publishes the exact listing Kaya approved as a QT Explorer place, once: after a crash the retry finds it already published. */
async function publishSuggestion(w) {
  const draft=w.result.pandan,listing=draft?.listing,kaya=w.result.kaya;
  const toStaff=(extra={})=>transaction(db=>advance(db,w,'done','staff',{...w.result,...extra},'A staff member will check this place.'));
  if(draft?.decision!=='propose'||!listing||kaya?.decision!=='approve') return toStaff();
  // A cover Kaya approved, from a photo its member agreed to share: resized only, published with the listing.
  const cover=kaya.cover?.decision==='approve'&&consentedCovers(w.payload).has(kaya.cover.digest)?await memberCover(w,listing.id,kaya.cover):null;
  const data=cover?{...listing,photo:cover.photo}:listing;
  const {root,baseline}=editorialStore,snapshot=await readSnapshot(root),existing=snapshot.records['place:'+listing.id];
  if(!existing||hash(existing.data)!==hash(data)) {
    // Another place took this id, or a matching place appeared since Pandan looked: staff decide.
    if(existing||(await placeMatches(listing)).length) return toStaff({publishError:'A matching place is already listed.'});
    const batch={version:1,id:'suggest-'+w.id+'-'+w.revision,parent:snapshot.revision,assets:cover?[cover.asset]:[],records:[{kind:'place',id:listing.id,data,sources:draft.editorialSources,expectedHash:null,
      review:{decision:'approved',reviewedBy:'QT Manager',dataHash:hash(data),reason:('Member suggestion checked by Kaya: '+kaya.reason).slice(0,1800)}}]};
    try { await publish(root,baseline,batch,()=>editorialFoodGate(pool,root,batch)); }
    catch(error) {
      if(error?.status!==422) throw error; // the store moved on or is busy: the tick retries against its new revision
      return toStaff({publishError:/stale source capture/i.test(error.message)?'The research is too old to publish; use Check again.':String(error.message).slice(0,300)});
    }
  }
  // The store's own receipt (also after a crash between publishing and this update) goes to the Telegram reporter.
  const receipt=await readFile(path.join(root,'receipts','suggest-'+w.id+'-'+w.revision+'.json'),'utf8').then(JSON.parse).catch(()=>null);
  await transaction(async db=>{
    const current=(await db.query("SELECT * FROM ops.explore_work WHERE id=$1 AND token=$2 AND state='working' FOR UPDATE",[w.id,w.token])).rows[0];
    if(current) await advance(db,current,'verify','queued',{...current.result,outcome:{kind:'added',placeId:listing.id,by:'kaya'},...(receipt?{publication:receipt}:{})});
  });
}
async function addedPlace(db,w,venue) {
  const placeId=placeOf(w),draft=w.result.pandan??{},kaya=w.result.outcome?.by==='kaya',name=venue.name;
  // A member cover's provenance for the workbook's cover record: the image, what it shows, the consent and who inspected it.
  const stored=kaya?(await readSnapshot(editorialStore.root)).records['place:'+placeId]?.data?.photo:(await db.query("SELECT data->'photo' AS photo FROM content.item WHERE kind='place' AND id=$1",[placeId])).rows[0]?.photo;
  const photo=stored?.author===MEMBER_COVER.author?stored:null,verdict=w.result.kaya?.cover;
  const cover=photo&&{url:origin+photo.path,checkedAt:photo.checkedAt,captureHash:photo.path.slice(22,86),
    quote:'Cover: '+(kaya&&verdict?.decision==='approve'?verdict.subject+' photo, inspected by Kaya ('+verdict.reason+')':'member photo chosen and inspected by staff')
      +'; taken by the suggesting member, who agreed on the suggestion form ('+COVER_CONSENT+') that it may be the cover; '+photo.license+'.'};
  await db.query(`UPDATE ops.explore_work SET state='published',stage='done',verified_at=now(),message='Added to Explore.',token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1`,[w.id]);
  await event(db,w,'verified-live');
  // The public receipt the Excel sync appends (scripts/sync-explore-contributions.py): the listing and its captured sources, no members.
  // The place exactly as it went live (staff may have edited Pandan's draft before adding it).
  await event(db,w,'place-added',{changes:[{field:'place',value:{id:placeId,name,branch:venue.branch??'',address:venue.address,postalCode:venue.postalCode,
    kitchen:venue.kitchen==='options'?'Mixed Kitchen':'Veg Kitchen',approvedBy:kaya?'Kaya':'staff'}}],
    sources:[...(draft.sources??[]),...Object.entries(draft.checks??{}).map(([k,c])=>({url:c.url,checkedAt:c.checkedAt,quote:(k==='googleSearch'?'Google Search: ':'Google Maps: ')+c.status,captureHash:c.captureHash})),
      ...(cover?[cover]:[])]});
  // Pandan's captured public phone reaches the new place through the same overlay corrections use; a staff edit later replaces it.
  if(draft.contact&&!venue.contact) {
    const version=(await db.query("SELECT version FROM content.item WHERE kind='place' AND id=$1",[placeId])).rows[0]?.version??0;
    await db.query(`INSERT INTO ops.explore_patch(kind,id,data,staff_version,work_id) VALUES('place',$1,$2,$3,$4) ON CONFLICT DO NOTHING`,[placeId,{contact:draft.contact},version,w.id]);
  }
  const members=(await db.query('SELECT DISTINCT user_id FROM ops.explore_submission WHERE work_id=$1',[w.id])).rows;
  for(const {user_id} of members)await queueAlert(db,user_id,'explorePlaceAdded',{url:'/explore-contributions/'+w.id,detail:name,once:'explore:'+w.id+':'+w.revision+':live:'+user_id});
  // The first member who suggested it earns the credits, never someone who said they work there.
  const owner=(await db.query(`SELECT user_id FROM ops.explore_submission WHERE work_id=$1 GROUP BY user_id HAVING NOT bool_or(works_here) ORDER BY min(created_at) LIMIT 1`,[w.id])).rows[0]?.user_id;
  if(owner) await db.query(`INSERT INTO ops.explore_reward(work_id,user_id,credits,state,due_at) VALUES($1,$2,$3,'pending',now()+make_interval(hours=>$4)) ON CONFLICT DO NOTHING`,
    [w.id,owner,SUGGESTION_REWARD.credits,SUGGESTION_REWARD.hours]);
  await finishDelivery(db,w,'live',{title:'Explore place added',target:placeId,name,path:placeLink(placeId),reference:reference(w.id),
    detail:kaya?'Member suggestion checked by Kaya and added.':'Member suggestion added after staff review.',reward:owner?SUGGESTION_REWARD.credits:0,verifiedAt:new Date().toISOString(),
    ...(kaya&&w.result.publication?{editorialReceipt:w.result.publication}:{})});
}
async function complete(db,w,name,venue) {
  if(w.kind==='suggestion') return addedPlace(db,w,venue);
  const review=w.kind==='review';
  await db.query(`UPDATE ops.explore_work SET state=$2,stage='done',verified_at=now(),message=$3,token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1`,[w.id,review?'published':'resolved',review?'Your review is live.':'The reported details have been updated.']);
  await event(db,w,'verified-live');
  const members=(await db.query('SELECT DISTINCT user_id FROM ops.explore_submission WHERE work_id=$1',[w.id])).rows;
  for(const {user_id} of members)await queueAlert(db,user_id,review?'explorePublished':'exploreUpdated',{url:'/explore-contributions/'+w.id,once:'explore:'+w.id+':'+w.revision+':live:'+user_id});
  if(!review) {
    // One entitlement per canonical correction; the profile cap serializes across different issues.
    // The first reporter earns it, unless they were a confirmed owner, manager or staff member of the place when they reported.
    const owner=(await db.query(`SELECT user_id FROM ops.explore_submission WHERE work_id=$1 GROUP BY user_id HAVING NOT bool_or(works_here) ORDER BY min(created_at) LIMIT 1`,[w.id])).rows[0]?.user_id;
    if(owner) {
      await db.query('SELECT pg_advisory_xact_lock(1902915,hashtext($1))',['explore-rewards:'+owner]);
      const {used}=await correctionProgress(db,owner);
      await db.query(`INSERT INTO ops.explore_reward(work_id,user_id,state,due_at) VALUES($1,$2,$3,now()+make_interval(hours=>$4)) ON CONFLICT DO NOTHING`,[w.id,owner,used>=CORRECTION_REWARD.limit?'ineligible':'pending',CORRECTION_REWARD.hours]);
    }
  }
  const reward=(await db.query('SELECT state,credits FROM ops.explore_reward WHERE work_id=$1',[w.id])).rows[0];
  await db.query('SELECT ops.resolve_explore_cases($1)',[w.id]);
  await finishDelivery(db,w,'live',{title:review?'Explore review published':'Explore updated',target:w.target,name,
    path:placeLink(w.target)+(review?'?reviewId='+w.review_id:''),reference:reference(w.id),
    detail:review?'Rating, comment and attached photos checked.':w.result.pandan.changes.map(c=>c.field==='contact'?'public phone':c.field).join(', ')+' corrected.',
    reward:reward?.state==='pending'?CORRECTION_REWARD.credits:0,verifiedAt:new Date().toISOString()});
}
async function settleRewards() {
  if(!await allowed('games')||!await allowed('collection')) return;
  const rows=(await pool.query("SELECT r.*,w.result,w.target,w.kind AS work_kind FROM ops.explore_reward r JOIN ops.explore_work w ON w.id=r.work_id WHERE r.state='pending' AND r.due_at<=now() LIMIT 10")).rows;
  for(const r of rows) {
    const suggestion=r.work_kind==='suggestion',rule=suggestion?SUGGESTION_REWARD:CORRECTION_REWARD,placeId=suggestion?r.result.outcome?.placeId:r.target;
    const live=suggestion?null:await liveContext(placeId).catch(()=>null);
    if(!live&&!suggestion)continue; // A transient public-read failure delays settlement; it is not evidence of a reversal.
    // A suggested place must still be listed (a removed or hidden place holds the reward for staff); a correction must still match.
    const good=suggestion?(await publishedPlaceId(placeId).catch(()=>undefined)):correctionMatches(r.result.pandan,live);
    if(good===undefined)continue;
    if(!good) {
      await transaction(async db=>{
        const held=await db.query("UPDATE ops.explore_reward SET state='held' WHERE work_id=$1 AND state='pending' RETURNING work_id",[r.work_id]);
        if(!held.rowCount)return;
        await db.query("UPDATE ops.explore_work SET message=$2,updated_at=now() WHERE id=$1",[r.work_id,suggestion?'The place changed before credit settlement. Staff will check the reward.':'The correction changed before credit settlement. Staff will check the reward.']);
        await queueAlert(db,r.user_id,'exploreStaff',{url:'/explore-contributions/'+r.work_id,once:'explore:'+r.work_id+':reward-held'});
      });continue;
    }
    await transaction(async db=>{
      const row=(await db.query("SELECT * FROM ops.explore_reward WHERE work_id=$1 AND state='pending' FOR UPDATE",[r.work_id])).rows[0];
      if(!row||(await db.query('SELECT 1 FROM ops.restriction WHERE user_id=$1 AND active',[r.user_id])).rowCount) return;
      await lockProfile(db,r.user_id);
      await postCredits(db,r.user_id,row.credits,rule.kind,(suggestion?'suggestion:':'correction:')+r.work_id);
      await db.query("UPDATE ops.explore_reward SET state='paid',paid_at=now() WHERE work_id=$1",[r.work_id]);
      await db.query('UPDATE ops.explore_work SET updated_at=now() WHERE id=$1',[r.work_id]);
      await queueAlert(db,r.user_id,suggestion?'explorePlaceCredits':'exploreCredits',{url:'/explore-contributions/'+r.work_id,detail:String(row.credits),once:'explore:'+r.work_id+':credits'});
      const w=(await db.query('SELECT * FROM ops.explore_work WHERE id=$1',[r.work_id])).rows[0];
      await finishDelivery(db,w,'reward',{title:'Explore contribution rewarded',target:placeId,path:placeLink(placeId),reference:reference(w.id),detail:row.credits+' credits awarded.',verifiedAt:new Date().toISOString()});
    });
  }
}
async function attention() {
  // Reuses the staff case queue: failed jobs cannot disappear in an unattended dead-letter queue. A suggestion waiting for staff is
  // its normal path (Place suggestions); one whose added place failed its live check is a failure.
  await pool.query(`INSERT INTO ops.case_record(kind,title,description,subject_id)
    SELECT 'incident','Explore contribution needs staff',left(w.message,1000),'explore:work:'||w.id FROM ops.explore_work w
    WHERE ((w.state='staff' AND w.kind<>'claim' AND (w.kind<>'suggestion' OR w.result->'outcome'->>'kind'='added')) OR (w.state IN ('queued','working') AND w.created_at<now()-interval '24 hours'))
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
        if(w.kind!=='suggestion'&&!await publishedPlaceId(placeOf(w))) await transaction(db=>advance(db,w,'done','staff',w.result,'The place is no longer available.'));
        else if(w.stage==='publish') {
          if(!w.result.kaya?.staff && await exploreMode(pool,w.kind)!=='on') {
            await transaction(db=>advance(db,w,'done','staff',w.result,'Publication is paused for staff review.'));return;
          }
          if(w.kind==='suggestion') { await publishSuggestion(w); return; }
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
          const good=await verify(w),venue=good?(await liveContext(placeOf(w))).venue:null,name=venue?.name??null;
          await transaction(async db=>{
            const current=(await db.query("SELECT * FROM ops.explore_work WHERE id=$1 AND token=$2 AND state='working' FOR UPDATE",[w.id,w.token])).rows[0];
            if(!current) return;
            if(good) await complete(db,current,name,venue);
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
