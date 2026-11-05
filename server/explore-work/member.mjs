import { randomUUID } from 'node:crypto';
import { pool } from '../config.mjs';
import { CommunityError,communityRouter,errors,requireId,text,throttle,transaction } from '../community/http.mjs';
import { digest,event,reference,submitOnce,wake } from './core.mjs';
import { memberStatus } from './reports.mjs';
import { placeMatches, unitText } from './suggestions.mjs';
import { claimCode, claimedPlace, claimInput, queueClaim } from './claims.mjs';
import { contributionNewsSql } from './attention.mjs';

export const exploreWork=communityRouter();
const publicWork=w=>({id:w.id,reference:reference(w.id),kind:w.kind,target:w.target,reviewId:w.review_id,state:w.state,stage:w.stage,
  name:w.name??w.payload?.place?.name??null,outcome:w.outcome??w.result?.outcome?.kind??null,
  // A duplicate of a hidden or removed place has no page to open.
  placeId:(w.place_live??w.result?.outcome?.live)===false||w.place_live==='false'?null:w.place_id??w.result?.outcome?.placeId??null,
  unread:!!w.unread,message:w.message,createdAt:w.created_at,updatedAt:w.updated_at,verifiedAt:w.verified_at,reward:w.reward_state?{state:w.reward_state,credits:w.credits}:null});
/** Live places that are the same listing as the place being suggested, so the form can open them instead (never hidden ones). */
exploreWork.get('/places/match',async(req,res)=>{
  const postalCode=String(req.query.postalCode??''),name=String(req.query.name??'').slice(0,200),address=String(req.query.address??'').slice(0,300);
  if(!/^\d{6}$/.test(postalCode))return res.json({items:[]});
  let unit='';try{unit=unitText(req.query.unit);}catch{/* An unfinished unit matches by name. */}
  await throttle('explore-match:'+res.locals.user.id,120,3600);
  const items=(await placeMatches({name,address,unit,postalCode})).filter(p=>p.state==='live').slice(0,5).map(({id,name,branch,address})=>({id,name,branch,address}));
  res.json({items});
});
/** The code a member puts on the place's own page to show they run it; the same code every time. */
exploreWork.get('/claims/code',async(req,res)=>{
  const place=await claimedPlace(req.query.placeId);
  res.json({code:claimCode(res.locals.user.id,place.id),place:{id:place.id,name:place.name,branch:place.branch}});
});
exploreWork.post('/claims',async(req,res)=>{
  const user=res.locals.user.id,input=claimInput(req.body??{}),place=await claimedPlace(input.placeId);
  res.status(201).json(await submitOnce(user,req.body?.submissionKey,input,{scope:'explore-claim',message:'You can send three owner checks a day.',
    queue:(db,{key,count})=>queueClaim(db,{user,key,input,place,count})}));
});
exploreWork.get('/',async(_req,res)=>{
  const rows=(await pool.query(`SELECT DISTINCT w.id,w.kind,w.target,w.review_id,w.state,w.stage,w.message,w.created_at,w.updated_at,w.verified_at,${contributionNewsSql} AS unread,
      w.payload->'place'->>'name' AS name,w.result->'outcome'->>'placeId' AS place_id,w.result->'outcome'->>'kind' AS outcome,w.result->'outcome'->>'live' AS place_live,
      r.state AS reward_state,r.credits FROM ops.explore_work w JOIN ops.explore_submission s ON s.work_id=w.id
      LEFT JOIN ops.explore_reward r ON r.work_id=w.id AND r.user_id=$1 WHERE s.user_id=$1 ORDER BY unread DESC,w.updated_at DESC,w.id LIMIT 100`,[res.locals.user.id])).rows;
  res.json({items:rows.map(publicWork)});
});
exploreWork.get('/:id',async(req,res)=>{
  const w=await memberStatus(requireId(req.params.id),res.locals.user.id);
  const own=(await pool.query('SELECT details FROM ops.explore_submission WHERE work_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1',[w.id,res.locals.user.id])).rows[0];
  const timeline=(await pool.query('SELECT what,created_at AS at FROM ops.explore_event WHERE work_id=$1 ORDER BY id LIMIT 100',[w.id])).rows;
  const photos=(await pool.query('SELECT id FROM ops.explore_photo WHERE work_id=$1 AND owner_id=$2 ORDER BY position',[w.id,res.locals.user.id])).rows.map(p=>'/api/explore-work/'+w.id+'/photos/'+p.id);
  // A failed detail load must not consume the update; never move the read watermark backwards.
  await pool.query('UPDATE ops.explore_submission SET seen_at=GREATEST(seen_at,$3::timestamptz) WHERE work_id=$1 AND user_id=$2',[w.id,res.locals.user.id,w.read_version]);
  res.json({...publicWork(w),details:w.kind==='review'?w.payload.body:own?.details??'',rating:w.kind==='review'?w.payload.rating:null,photos,timeline});
});
exploreWork.get('/:id/photos/:photo',async(req,res)=>{
  const id=requireId(req.params.id),photo=requireId(req.params.photo);
  await memberStatus(id,res.locals.user.id);
  const row=(await pool.query('SELECT bytes FROM ops.explore_photo WHERE work_id=$1 AND id=$2 AND owner_id=$3',[id,photo,res.locals.user.id])).rows[0];
  if(!row) throw new CommunityError(404,'Photo unavailable.');
  res.type('image/jpeg').set('X-Content-Type-Options','nosniff').send(row.bytes);
});
exploreWork.post('/:id/reply',async(req,res)=>{
  const id=requireId(req.params.id),details=text(req.body.details,1000,{min:3,field:'Additional information'});
  const hash=digest({id,details}),user=res.locals.user.id;
  const duplicate=(await pool.query('SELECT 1 FROM ops.explore_submission WHERE work_id=$1 AND user_id=$2 AND input_hash=$3',[id,user,hash])).rowCount;
  if(duplicate)return res.json({ok:true});
  await throttle('explore-reply:'+user,5,3600);
  await transaction(async db=>{
    let w=await memberStatus(id,user);
    w={...w,...(await db.query('SELECT * FROM ops.explore_work WHERE id=$1 FOR UPDATE',[id])).rows[0]};
    if((await db.query('SELECT 1 FROM ops.explore_submission WHERE work_id=$1 AND user_id=$2 AND input_hash=$3',[id,user,hash])).rowCount)return;
    if(!['staff','needs-input','needs-changes','resolved','published'].includes(w.state)) throw new CommunityError(409,'This contribution is already being checked.');
    if(w.kind==='suggestion'&&(w.state==='published'||w.result?.outcome?.kind==='added')) throw new CommunityError(409,'This place is already on Explore. Use Report A Problem on its page.');
    if(w.kind==='claim'&&w.result?.outcome?.kind==='approved') throw new CommunityError(409,'You are already confirmed for this place.');
    if(w.kind==='review') {
      // An appeal preserves the member's words; staff decide it, never an automatic rejection loop.
      await db.query("UPDATE ops.explore_work SET state='staff',revision=revision+1,message='Your appeal is waiting for staff.',updated_at=now() WHERE id=$1",[id]);
      await db.query('SELECT ops.appeal_explore_case($1,$2)',[id,details]);
    } else {
      const list=w.kind==='suggestion'||w.kind==='claim'?'notes':'reports';
      if((w.payload[list]??[]).length>=20)throw new CommunityError(429,'This case needs staff follow-up before more information can be added.');
      const reports=[...(w.payload[list] ?? []),{reason:'Additional information',details}];
      // Reopening a declined or duplicate suggestion clears that outcome; Coco and Pandan look again.
      await db.query(`UPDATE ops.explore_work SET payload=jsonb_set(payload,'{${list}}',$2),${list==='notes'?"result=result-'outcome',":''}revision=revision+1,stage='coco',state='queued',attempts=0,token=NULL,lease_until=NULL,message='',due_at=now(),updated_at=now() WHERE id=$1`,[id,JSON.stringify(reports)]);
    }
    await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id,details) VALUES($1,$2,$3,$4,$5)',[user,randomUUID(),hash,id,details]);
    await event(db,{...w,revision:w.revision+1},'additional-information'); await wake(db);
  }); res.json({ok:true});
});
exploreWork.use(errors);
