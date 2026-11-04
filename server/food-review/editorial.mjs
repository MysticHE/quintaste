import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { enqueueFoodReview,foodReviewEnabled } from './core.mjs';
import { validateRecipe,validateEvent } from '../editorial/validation.mjs';
import { foodCandidate } from '../../admin/src/lib/food-sources.mjs';

/** Signed, already-reviewed editorial candidates remain unpublished until their exact food snapshot is cleared. */
export async function editorialFoodGate(db,root,batch){
  if(!await foodReviewEnabled(db))return;
  const waiting=[];
  const held=[];
  for(const record of batch.records??[]){
    if(!['recipe','event'].includes(record.kind))continue;
    if(!/^[a-z0-9][a-z0-9-]{2,150}$/.test(record.id)||record.data?.id!==record.id)throw Object.assign(new Error('Invalid food publication identity.'),{status:422});
    if(record.kind==='recipe')validateRecipe(record.data);else validateEvent(record.data);
    const photos=[];
    const refs=[['cover',record.data.image?.path],...(record.data.steps??[]).map((s,n)=>['step-'+n,s.photo])];
    for(const [slot,url] of refs){
      if(!url)continue;
      const digest=String(url).match(/^\/api\/editorial\/assets\/([a-f0-9]{64})\.jpg$/)?.[1];
      if(!digest)throw Object.assign(new Error('Invalid food image.'),{status:422});
      const offered=(batch.assets??[]).find(a=>a.sha256===digest);
      const bytes=offered?Buffer.from(offered.base64,'base64'):await fs.readFile(path.join(root,'assets',digest+'.jpg'));
      if(bytes.length>512*1024||createHash('sha256').update(bytes).digest('hex')!==digest)throw Object.assign(new Error('Food image changed.'),{status:422});
      await sharp(bytes,{limitInputPixels:1600*1600}).metadata();
      photos.push({slot,digest,bytes});
    }
    const data=foodCandidate(record.kind,record.data,record.sources);
    const result=await enqueueFoodReview(db,'editorial-'+record.kind,record.id,{data,edition:'candidate'},photos);
    if(result.state==='held')held.push(record.id);
    if(result.state!=='clear')waiting.push(result.id);
  }
  // The publisher's existing 422 isolation flow retires held candidates so unrelated approved work can continue.
  if(held.length)throw Object.assign(new Error('Food-content review held '+held.join(', ')+'. Correct the food-policy finding before resubmitting this candidate.'),{status:422});
  if(waiting.length)throw Object.assign(new Error('Food-content review is pending. The approved batch is retained for retry.'),{status:409});
}
