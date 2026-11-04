import 'server-only';
import { createHash } from 'node:crypto';
import { query } from './db';
import { recipePhoto } from './content-assets';
import { enqueueFoodReview,foodReviewEnabled } from './food-enqueue.mjs';
import { foodCandidate,foodStamp } from './food-sources.mjs';
import { HttpError } from './http';
import type { Session } from './session';

/** Keeps the existing published revision intact while a staff save awaits its exact food verdict. */
export async function staffFoodGate(member:Session,kind:'recipe'|'event',id:string,data:Record<string,unknown>){
  const db={query};
  if(!await foodReviewEnabled(db))return;
  const photos:{slot:string;digest:string;bytes:Buffer}[]=[];
  const image=data.image as {path?:string}|undefined;
  const steps=(Array.isArray(data.steps)?data.steps:[]) as {photo?:string}[];
  const refs:[string,string|undefined][]=[['cover',image?.path],...steps.map((s,n):[string,string|undefined]=>['step-'+n,s.photo])];
  for(const [slot,path] of refs){
    if(!path)continue;
    const bytes=await recipePhoto(member,path);
    if(!bytes||bytes.length>700000)throw new HttpError(422,'A recipe photo is unavailable for food review. Replace it before saving.');
    photos.push({slot,digest:createHash('sha256').update(bytes).digest('hex'),bytes});
  }
  const payload={data:foodCandidate(kind,data),edition:'candidate'};
  const target=id==='staff-draft'?'staff-create-'+foodStamp({data:payload.data,photos}).slice(0,40):id;
  const result=await enqueueFoodReview(db,'editorial-'+kind,target,payload,photos);
  if(result.state!=='clear')throw new HttpError(409,result.state==='held'?'Food review requires a correction. Open Chef decisions for the finding, then edit and save again.':'Food review is queued. Your current published version is unchanged. Retry this save after the review; uncertain cases appear in Chef decisions.');
}
