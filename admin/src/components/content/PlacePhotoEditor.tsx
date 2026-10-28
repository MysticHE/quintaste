'use client';
import { useState } from 'react';
import { RecipePhotoEditor } from './RecipePhotoEditor';
import { RecipeDialog } from './RecipeDialog';
import { Icon } from '../Icon';
import { photoSrc } from './Parts';
import { today, type Photo } from './place-model';
export function PlacePhotoEditor({photo,label,source,disabled,onChange,onBusy,compact=false}:{photo?:Photo|null;label:string;source?:string;disabled:boolean;onChange:(photo:Photo|null)=>void;onBusy:(active:boolean)=>void;compact?:boolean}) {
  const [metadata,setMetadata]=useState(false);
  if(compact)return <><button type="button" className="place-dish-photo" disabled={disabled} aria-label={'Edit photo: '+label} onClick={()=>setMetadata(true)}>
    {/* eslint-disable-next-line @next/next/no-img-element -- authenticated dish preview */}
    {photo?<img src={photoSrc(photo.path)} alt={label}/>:<Icon name="photo" size={15}/>}</button>{metadata&&<PhotoMetadata photo={photo??null} label={label} source={source} disabled={disabled} onBusy={onBusy} onClose={()=>setMetadata(false)} onChange={onChange}/>}</>;
  return <div className={'place-photo'+(compact?' compact':'')}><RecipePhotoEditor path={photo?.path} label={label} disabled={disabled} compact={compact} onBusy={onBusy}
    onChange={up=>onChange(up?{path:up.path,width:up.width,height:up.height,author:'',sourceUrl:source??'',license:'Used with permission',licenseUrl:null,capturedAt:null,checkedAt:today(),changes:'Resized for display.'}:null)}/>
    {photo&&<button type="button" className="plain place-photo-details" disabled={disabled} onClick={()=>setMetadata(true)} aria-label={'Photo details: '+label}>{compact?'Credit':'Photo details'}</button>}
    {metadata&&photo&&<PhotoMetadata photo={photo} label={label} source={source} disabled={disabled} onBusy={onBusy} onClose={()=>setMetadata(false)} onChange={onChange}/>}
  </div>;
}
function PhotoMetadata({photo,label,source,disabled,onBusy,onClose,onChange}:{photo:Photo|null;label:string;source?:string;disabled:boolean;onBusy:(v:boolean)=>void;onClose:()=>void;onChange:(p:Photo|null)=>void}) {
  const [value,setValue]=useState(photo), set=(patch:Partial<Photo>)=>setValue(v=>v?({...v,...patch}):null);
  return <RecipeDialog title={label+' · photo'} onClose={()=>{if(!disabled)onClose();}} actions={<><button type="button" disabled={disabled} onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={disabled} onClick={()=>{onChange(value);onClose();}}>Apply</button></>}>
    <RecipePhotoEditor path={value?.path} label={label} disabled={disabled} onBusy={onBusy} onChange={up=>setValue(up?{path:up.path,width:up.width,height:up.height,author:'',sourceUrl:source??'',license:'Used with permission',licenseUrl:null,capturedAt:null,checkedAt:today(),changes:'Resized for display.'}:null)}/>
    {value&&<>
    <label>Credit<input value={value.author} onChange={e=>set({author:e.target.value})} maxLength={180}/></label>
    <div className="fields"><label>Licence<input value={value.license} onChange={e=>set({license:e.target.value})} maxLength={80}/></label><label>Checked<input type="date" max={today()} value={value.checkedAt} onChange={e=>set({checkedAt:e.target.value})}/></label></div>
    <label>Source<input type="url" value={value.sourceUrl} onChange={e=>set({sourceUrl:e.target.value})}/></label>
    <label>Licence URL<input type="url" value={value.licenseUrl??''} onChange={e=>set({licenseUrl:e.target.value||null})}/></label>
    <div className="fields"><label>Captured<input type="date" max={today()} value={value.capturedAt??''} onChange={e=>set({capturedAt:e.target.value||null})}/></label><label>Changes<input value={value.changes} onChange={e=>set({changes:e.target.value})} maxLength={300}/></label></div>
    </>}
  </RecipeDialog>;
}
