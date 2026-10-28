'use client';
import { useState } from 'react';
import { Icon } from '../Icon';
import { IconButton } from '../Primitives';
import { PlacePhotoEditor } from './PlacePhotoEditor';
import { RecipeDialog } from './RecipeDialog';
import { newDish, type Row, type Dish } from './place-model';
export function PlaceMenu({rows,set,disabled,source,uploading}:{rows:Row[];set:(rows:Row[])=>void;disabled:boolean;source?:string;uploading:(v:boolean)=>void}) {
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[hidden,setHidden]=useState(false),[limit,setLimit]=useState(100),[editing,setEditing]=useState<string|null>(null);
  const update=(key:string,patch:Partial<Dish>)=>set(rows.map(row=>row.key===key?{...row,...patch}:row));
  const shown=rows.filter(row=>!row.removed&&(hidden||!row.hidden)&&(!category||row.category===category)&&[row.name,row.category,row.source].join(' ').toLowerCase().includes(query.toLowerCase()));
  const edit=rows.find(row=>row.key===editing);
  return <><div className="place-menu-tools"><div className="search"><Icon name="search" size={15}/><input type="search" aria-label="Search dishes" placeholder="Search dishes" value={query} onChange={e=>{setQuery(e.target.value);setLimit(100);}}/></div>
    <select aria-label="Dish category" value={category} onChange={e=>{setCategory(e.target.value);setLimit(100);}}><option value="">All categories</option>{[...new Set(rows.map(r=>r.category).filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select></div>
    <div className="place-table-scroll"><table className="place-dishes"><thead><tr><th><span className="sr-only">Photo</span></th><th>Dish / category</th><th>Diet</th><th>Price</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.slice(0,limit).map(row=><tr key={row.key} className={row.hidden?'place-hidden-dish':''}>
      <td><PlacePhotoEditor photo={row.photo} label={row.name||'New dish'} source={source} compact disabled={disabled} onBusy={uploading} onChange={photo=>update(row.key,{photo})}/></td>
      <td><input aria-label={'Dish name: '+row.name} value={row.name} disabled={disabled} maxLength={300} onChange={e=>update(row.key,{name:e.target.value})}/><input className="place-category" aria-label={'Category: '+row.name} value={row.category??''} disabled={disabled} maxLength={100} onChange={e=>update(row.key,{category:e.target.value})}/>{row.hidden&&<small>Hidden</small>}</td>
      <td><select aria-label={'Diet: '+row.name} value={row.diet??''} disabled={disabled} onChange={e=>update(row.key,{diet:(e.target.value||undefined) as Dish['diet']})}><option value="" disabled={row.keepLabel}>—</option><option>V</option><option>VG</option></select></td>
      <td><input type="number" step="0.01" min="0" aria-label={'Price: '+row.name} value={row.price.amount??''} disabled={disabled} onChange={e=>update(row.key,{price:{...row.price,amount:e.target.value===''?null:Number(e.target.value),currency:row.price.amount===null?'SGD':row.price.currency}})}/><small>{row.price.currency==='unknown'?'Unverified':row.price.type==='from'?'From S$':'S$'}{row.price.maxAmount!==undefined?'–'+row.price.maxAmount.toFixed(2):''}</small></td>
      <td><IconButton icon="edit" label={'Edit '+(row.name||'new dish')} disabled={disabled} onClick={()=>setEditing(row.key)}/></td>
    </tr>)}</tbody></table>{!shown.length&&<p className="place-empty">No dishes</p>}{shown.length>limit&&<button type="button" className="plain" onClick={()=>setLimit(n=>n+100)}>Show more ({shown.length-limit})</button>}</div>
    <footer><button type="button" className="plain" disabled={disabled} onClick={()=>{const row=newDish();set([...rows,row]);setQuery('');setCategory('');setEditing(row.key);}}><Icon name="plus" size={15}/>Dish</button><button type="button" className="plain" aria-pressed={hidden} onClick={()=>setHidden(!hidden)}>{hidden?'Hide hidden':'Show hidden'}</button></footer>
    {edit&&<DishDialog key={edit.key} row={edit} disabled={disabled} onClose={()=>setEditing(null)} onSave={patch=>{update(edit.key,patch);setEditing(null);}} onRemove={()=>{set(rows.map(row=>row.key===edit.key?{...row,removed:true}:row));setEditing(null);}}/>}</>;
}
function DishDialog({row,disabled,onClose,onSave,onRemove}:{row:Row;disabled:boolean;onClose:()=>void;onSave:(p:Partial<Dish>)=>void;onRemove:()=>void}) {
  const [d,setD]=useState<Dish>(row),[remove,setRemove]=useState(false);const set=(patch:Partial<Dish>)=>setD(v=>({...v,...patch}));
  if(remove)return <RecipeDialog title="Remove dish?" onClose={()=>setRemove(false)} actions={<><button type="button" onClick={()=>setRemove(false)}>Cancel</button><button type="button" className="danger" onClick={onRemove}>Remove</button></>}><strong>{row.name}</strong></RecipeDialog>;
  return <RecipeDialog title="Edit dish" onClose={onClose} actions={<><button type="button" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={disabled||!d.name.trim()} onClick={()=>onSave(d)}>Apply</button></>}>
    <label>Name<input value={d.name} onChange={e=>set({name:e.target.value})} maxLength={300}/></label><div className="fields"><label>Category<input value={d.category??''} onChange={e=>set({category:e.target.value})}/></label><label>Diet<select value={d.diet??''} onChange={e=>set({diet:(e.target.value||undefined) as Dish['diet']})}><option value="" disabled={row.keepLabel}>None</option><option>V</option><option>VG</option></select></label></div>
    <div className="fields"><label>Price<input type="number" min="0" step="0.01" value={d.price.amount??''} onChange={e=>set({price:{...d.price,amount:e.target.value===''?null:Number(e.target.value),currency:d.price.amount===null?'SGD':d.price.currency}})}/></label><label>Up to<input type="number" min="0" step="0.01" value={d.price.maxAmount??''} onChange={e=>set({price:{...d.price,maxAmount:e.target.value===''?undefined:Number(e.target.value)}})}/></label></div>
    <div className="fields"><label>Price type<select value={d.price.type} onChange={e=>set({price:{...d.price,type:e.target.value as Dish['price']['type']}})}><option value="displayed">Exact</option><option value="from">From</option></select></label><label>Currency<select value={d.price.currency} onChange={e=>set({price:{...d.price,currency:e.target.value as Dish['price']['currency']}})}><option value="SGD">SGD</option><option value="unknown">Unverified</option></select></label></div>
    <label>Price conditions<textarea rows={2} value={d.qualifier??''} maxLength={4000} onChange={e=>set({qualifier:e.target.value})}/></label><label>Availability<input value={d.availability??''} maxLength={1000} onChange={e=>set({availability:e.target.value})}/></label>
    <div className="row spread"><label className="check"><input type="checkbox" checked={!!d.hidden} onChange={e=>set({hidden:e.target.checked})}/>Hidden</label>{row.kind!=='base'&&<button type="button" className="danger plain" onClick={()=>setRemove(true)}>Remove dish</button>}</div>
  </RecipeDialog>;
}
