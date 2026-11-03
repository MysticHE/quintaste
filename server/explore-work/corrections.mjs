import { CommunityError } from '../community/http.mjs';
import { digest } from './core.mjs';
import { publicSource } from './reports.mjs';

const internal=()=> 'http://127.0.0.1:'+(process.env.PORT||3000);
export async function liveContext(id) {
  const response=await fetch(internal()+'/api/catalogue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id}),signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Place unavailable');
  const full=/** @type {any} */(await response.json());
  const {id:placeId,name,branch,address,postalCode,hours,contact,kitchen}=full;
  const venue={id:placeId,name,branch,address,postalCode,hours:hours??null,contact:contact??null,kitchen:kitchen??null};
  const menus=await fetch(internal()+'/api/menus?id='+encodeURIComponent(id),{signal:AbortSignal.timeout(12000)});
  if(!menus.ok && menus.status!==404) throw new Error('Menu unavailable');
  const data=/** @type {any} */(menus.ok?await menus.json():null);
  const menu=data?.venues?.[0]??null;
  return {venue,menu,hash:digest({venue,menu})};
}
export function validateProposal(p,before) {
  if(!p || p.decision!=='propose' || !before?.venue || p.beforeHash!==before.hash || !Array.isArray(p.changes)||!p.changes.length||p.changes.length>20)
    throw new CommunityError(400,'A version-bound correction is required.');
  const seen=new Set();
  for(const c of p.changes) {
    const key=c.field+':'+(c.sectionId??'')+':'+(c.itemId??'');
    if(seen.has(key)) throw new CommunityError(400,'Repeated field.'); seen.add(key);
    if(c.field==='hours') {
      const v=c.value;
      if(!v || typeof v.summary!=='string'||v.summary.length>500||!Array.isArray(v.schedule)||v.schedule.length>7||!v.schedule.length||
        v.schedule.some(s=>typeof s!=='string'||s.length>300)||v.timezone!=='Asia/Singapore'||!publicSource(v.sourceUrl)||!/^\d{4}-\d{2}-\d{2}/.test(v.checkedAt ?? '')||typeof v.notes!=='string'||v.notes.length>1000)
        throw new CommunityError(400,'Check the supported opening hours.');
    } else if(c.field==='contact') {
      const v=c.value;
      if(!v||typeof v.phone!=='string'||! /^(?:\+65[ -]?)?[3689]\d{3}[ -]?\d{4}$|^1800[ -]?\d{3}[ -]?\d{4}$/.test(v.phone)||!publicSource(v.sourceUrl)||!/^\d{4}-\d{2}-\d{2}/.test(v.checkedAt??''))
        throw new CommunityError(400,'Check the public contact number.');
      c.value={phone:v.phone,source:'research',sourceUrl:v.sourceUrl,checkedAt:v.checkedAt};
    } else if(c.field==='price') {
      const section=before.menu?.sections?.find(s=>s.id===c.sectionId), item=section?.items?.find(i=>i.id===c.itemId);
      const v=c.value;
      if(!item||section.id==='staff'||c.itemName!==item.name||c.channel!==section.scope||!v||v.currency!=='SGD'||v.amount===null||typeof v.amount!=='number'||!Number.isFinite(v.amount)||v.amount<0||v.amount>10000||typeof v.label!=='string'||v.label.length>120)
        throw new CommunityError(400,'Price must match the exact existing dish, currency and channel.');
      c.value={...item.price,amount:v.amount,currency:'SGD',label:v.label};
    } else throw new CommunityError(400,'This correction needs staff review.');
  }
  const changed=p.changes.some(c=>{
    if(c.field==='price') {
      const old=before.menu.sections.find(s=>s.id===c.sectionId).items.find(i=>i.id===c.itemId).price;
      return old.amount!==c.value.amount||old.currency!==c.value.currency;
    }
    if(c.field==='contact')return String(before.venue.contact?.phone??'').replace(/\D/g,'')!==c.value.phone.replace(/\D/g,'');
    const old=before.venue.hours;
    return !old||digest({summary:old.summary,schedule:old.schedule,notes:old.notes,timezone:old.timezone})!==digest({summary:c.value.summary,schedule:c.value.schedule,notes:c.value.notes,timezone:c.value.timezone});
  });
  if(!changed)throw new CommunityError(400,'No supported detail changed; a source date refresh alone cannot earn a correction reward.');
}
export function correctionPatches(proposal) {
  const place={},menu={items:{}};
  for(const c of proposal.changes) {
    if(c.field==='price') menu.items[c.sectionId+'/'+c.itemId]={price:c.value};
    else place[c.field]=c.value;
  }
  return {...(Object.keys(place).length?{place}:{}),...(Object.keys(menu.items).length?{menu}:{})};
}
export function correctionMatches(proposal,live) {
  return proposal.changes.every(c=>{
    const value=c.field==='price'?live.menu?.sections?.find(s=>s.id===c.sectionId)?.items?.find(i=>i.id===c.itemId)?.price:live.venue[c.field];
    return digest(value??null)===digest(c.value);
  });
}
