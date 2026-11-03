import { randomUUID } from 'node:crypto';
import { pool } from '../config.mjs';
import { CommunityError,communityRouter,errors,requireId,text,throttle,transaction } from '../community/http.mjs';
import { digest,event,reference,wake } from './core.mjs';
import { memberStatus } from './reports.mjs';

export const exploreWork=communityRouter();
const publicWork=w=>({id:w.id,reference:reference(w.id),kind:w.kind,target:w.target,reviewId:w.review_id,state:w.state,stage:w.stage,
  message:w.message,createdAt:w.created_at,updatedAt:w.updated_at,verifiedAt:w.verified_at,reward:w.reward_state?{state:w.reward_state,credits:w.credits}:null});
exploreWork.get('/',async(_req,res)=>{
  const rows=(await pool.query(`SELECT DISTINCT w.id,w.kind,w.target,w.review_id,w.state,w.stage,w.message,w.created_at,w.updated_at,w.verified_at,
      r.state AS reward_state,r.credits FROM ops.explore_work w JOIN ops.explore_submission s ON s.work_id=w.id
      LEFT JOIN ops.explore_reward r ON r.work_id=w.id AND r.user_id=$1 WHERE s.user_id=$1 ORDER BY w.created_at DESC LIMIT 100`,[res.locals.user.id])).rows;
  res.json({items:rows.map(publicWork)});
});
exploreWork.get('/:id',async(req,res)=>{
  const w=await memberStatus(requireId(req.params.id),res.locals.user.id);
  await pool.query('UPDATE ops.explore_submission SET seen_at=$3 WHERE work_id=$1 AND user_id=$2',[w.id,res.locals.user.id,w.updated_at]);
  const own=(await pool.query('SELECT details FROM ops.explore_submission WHERE work_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1',[w.id,res.locals.user.id])).rows[0];
  const timeline=(await pool.query('SELECT what,created_at AS at FROM ops.explore_event WHERE work_id=$1 ORDER BY id LIMIT 100',[w.id])).rows;
  const photos=(await pool.query('SELECT id FROM ops.explore_photo WHERE work_id=$1 AND owner_id=$2 ORDER BY position',[w.id,res.locals.user.id])).rows.map(p=>'/api/explore-work/'+w.id+'/photos/'+p.id);
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
    if(w.kind==='review') {
      // An appeal preserves the member's words; staff decide it, never an automatic rejection loop.
      await db.query("UPDATE ops.explore_work SET state='staff',revision=revision+1,message='Your appeal is waiting for staff.',updated_at=now() WHERE id=$1",[id]);
      await db.query('SELECT ops.appeal_explore_case($1,$2)',[id,details]);
    } else {
      if((w.payload.reports??[]).length>=20)throw new CommunityError(429,'This case needs staff follow-up before more information can be added.');
      const reports=[...(w.payload.reports ?? []),{reason:'Additional information',details}];
      await db.query(`UPDATE ops.explore_work SET payload=jsonb_set(payload,'{reports}',$2),revision=revision+1,stage='coco',state='queued',attempts=0,token=NULL,lease_until=NULL,message='',due_at=now(),updated_at=now() WHERE id=$1`,[id,JSON.stringify(reports)]);
    }
    await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id,details) VALUES($1,$2,$3,$4,$5)',[user,randomUUID(),hash,id,details]);
    await event(db,{...w,revision:w.revision+1},'additional-information'); await wake(db);
  }); res.json({ok:true});
});
exploreWork.use(errors);
