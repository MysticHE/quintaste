'use client';
import { Icon } from '../Icon';
import { PlacePhotoEditor } from './PlacePhotoEditor';
import { today, type Detail, type Place } from './place-model';
export function PlaceDetails({p,set,disabled,uploading,creating,different,setDifferent}:{p:Place;set:(v:Partial<Place>)=>void;disabled:boolean;uploading:(v:boolean)=>void;creating:boolean;different:boolean;setDifferent:(v:boolean)=>void}) {
  return <div className="place-panel-body"><PlacePhotoEditor photo={p.photo} label="Cover" source={p.sourceUrl} disabled={disabled} onChange={photo=>set({photo})} onBusy={uploading}/>
    {p.photo&&<label>Credit<input value={p.photo.author} disabled={disabled} maxLength={180} onChange={e=>set({photo:{...p.photo!,author:e.target.value}})}/></label>}
    <div className="fields"><label>Branch<input value={p.branch} disabled={disabled} maxLength={300} onChange={e=>set({branch:e.target.value})}/></label><label>Postal code<input value={p.postalCode} disabled={disabled} maxLength={6} inputMode="numeric" onChange={e=>set({postalCode:e.target.value})}/></label></div>
    <label>Address<textarea rows={2} value={p.address} disabled={disabled} maxLength={500} onChange={e=>set({address:e.target.value})}/></label>
    <div className="fields"><label>Kitchen<select value={p.kitchen??''} disabled={disabled} onChange={e=>set(e.target.value==='options'?{kitchen:'options',alliumFreeClaim:false}:{kitchen:null,menuTotal:null})}><option value="">Veg Kitchen</option><option value="options">Mixed Kitchen</option></select></label><label>Vegan<select value={p.venueDiet} disabled={disabled} onChange={e=>set({venueDiet:e.target.value as Place['venueDiet']})}><option value="Vegetarian">Not declared</option><option value="Vegan">Venue declares</option></select></label></div>
    <label className="check"><input type="checkbox" disabled={disabled||p.kitchen==='options'} checked={p.alliumFreeClaim} onChange={e=>set({alliumFreeClaim:e.target.checked})}/>No five pungent · venue declares</label>
    {p.kitchen==='options'&&<label>Full menu size<input type="number" min="1" max="2000" value={p.menuTotal??''} disabled={disabled} onChange={e=>set({menuTotal:e.target.value?Number(e.target.value):null})}/></label>}
    <div className="divider"/><label>Other names<input value={p.aliases.join(',')} disabled={disabled} onChange={e=>set({aliases:e.target.value.split(',')})}/></label>
    <div className="fields"><label>Latitude<input type="number" step="any" value={p.point?.latitude??''} disabled={disabled} onChange={e=>set({point:e.target.value===''&&!p.point?.longitude?null:{latitude:e.target.value===''?0:Number(e.target.value),longitude:p.point?.longitude??0}})}/></label><label>Longitude<input type="number" step="any" value={p.point?.longitude??''} disabled={disabled} onChange={e=>set({point:e.target.value===''&&!p.point?.latitude?null:{latitude:p.point?.latitude??0,longitude:e.target.value===''?0:Number(e.target.value)}})}/></label></div>
    <label>Source<input type="url" value={p.sourceUrl??''} disabled={disabled} onChange={e=>set({sourceUrl:e.target.value})}/></label>{creating&&<label className="check"><input type="checkbox" checked={different} disabled={disabled} onChange={e=>setDifferent(e.target.checked)}/>Different place at this address</label>}
  </div>;
}
export function PlaceSources({p,set,disabled,detail}:{p:Place;set:(p:Partial<Place>)=>void;disabled:boolean;detail:Detail|null}) {
  const proof=p.dietProof;
  return <div className="panel stack place-sources"><label>Research links<textarea rows={5} value={p.research?.sourceUrls.join('\n')??''} disabled={disabled} onChange={e=>set({research:{...p.research,sourceUrls:e.target.value.split('\n')}})}/></label>
    <label>Checked<input type="date" max={today()} value={p.research?.checkedAt??''} disabled={disabled} onChange={e=>set({research:{sourceUrls:p.research?.sourceUrls??[],checkedAt:e.target.value||undefined}})}/></label>
    <div className="row spread"><h3>Kitchen evidence</h3>{!proof?<button type="button" disabled={disabled} onClick={()=>set({dietProof:{sourceUrl:'',quote:'',checkedAt:today()}})}>Add</button>:<button type="button" className="plain" disabled={disabled} onClick={()=>set({dietProof:null})}>Remove</button>}</div>
    {proof&&<><label>Venue statement<textarea rows={3} value={proof.quote} maxLength={2000} disabled={disabled} onChange={e=>set({dietProof:{...proof,quote:e.target.value}})}/></label><div className="fields"><label>Source<input type="url" value={proof.sourceUrl} disabled={disabled} onChange={e=>set({dietProof:{...proof,sourceUrl:e.target.value}})}/></label><label>Checked<input type="date" max={today()} value={proof.checkedAt} disabled={disabled} onChange={e=>set({dietProof:{...proof,checkedAt:e.target.value}})}/></label></div></>}
    {!!detail?.menu.base?.sections.length&&<><h3>Menu sources</h3>{detail.menu.base.sections.map(s=><div className="row spread" key={s.id}><a href={s.sourceUrl} target="_blank" rel="noreferrer">{s.title||s.sourceLabel} <Icon name="external" size={13}/></a><small>{s.checkedAt?.slice(0,10)}</small></div>)}</>}
  </div>;
}
