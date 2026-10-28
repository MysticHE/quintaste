'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { api, date, failure, useResource } from '../client';
import { Feedback, IconButton } from '../Primitives';
import { CaseDetail } from '../Cases';
import { Badges, History, photoSrc } from './Parts';
import { RecipeDialog } from './RecipeDialog';
import { PlacePhotoEditor } from './PlacePhotoEditor';
import { PlaceDetails, PlaceSources } from './PlaceDetails';
import { PlaceHours } from './PlaceHours';
import { PlaceMenu } from './PlaceMenu';
import { dishChanges, initialDishes, initialPlace, type Detail, type Place, type Row } from './place-model';
type Props={id:string;onChanged:(id?:string|null)=>void;onDirty:(v:boolean)=>void;onBusy:(v:boolean)=>void};
export default function PlacePanel({id,onChanged,onDirty,onBusy}:Props) {
  const resource=useResource<Detail>(id==='new'?null:'/api/content/places?id='+encodeURIComponent(id)),[tab,setTab]=useState('workspace');
  const detail=resource.data;
  return <><Feedback {...resource} retry={resource.reload}/>{(id==='new'||detail)&&<PlaceForm key={id+':'+(detail?.staff?.version??0)+':'+(detail?.menu.staff?.version??0)} detail={id==='new'?null:detail} refreshing={resource.refreshing} tab={tab} setTab={setTab} onDirty={onDirty} onBusy={onBusy} onSaved={next=>{resource.reload();onChanged(next);}}/>}</>;
}
function PlaceForm({detail,refreshing,tab,setTab,onDirty,onBusy,onSaved}:{detail:Detail|null;refreshing:boolean;tab:string;setTab:(v:string)=>void;onDirty:(v:boolean)=>void;onBusy:(v:boolean)=>void;onSaved:(id?:string|null)=>void}) {
  const [p,setP]=useState(()=>initialPlace(detail)),[rows,setRows]=useState(()=>initialDishes(detail)),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(''),[uploads,setUploads]=useState(0),[error,setError]=useState('');
  const [confirm,setConfirm]=useState(''),[reason,setReason]=useState(''),[preview,setPreview]=useState(false),[report,setReport]=useState<string|null>(null),[more,setMore]=useState(false),[different,setDifferent]=useState(false);
  const [panel,setPanel]=useState('menu'),[focus,setFocus]=useState(''),[directory,setDirectory]=useState(true),[photoLimit,setPhotoLimit]=useState(60);
  const locked=refreshing||!!busy||uploads>0, staff=!detail||detail.origin==='staff';
  const mark=()=>{setDirty(true);onDirty(true);},set=(patch:Partial<Place>)=>{setP(old=>({...old,...patch}));mark();},setDishes=(value:Row[])=>{setRows(value);mark();};
  const uploading=(active:boolean)=>{setUploads(n=>n+(active?1:-1));if(active)mark();};
  useEffect(()=>{onBusy(locked);return()=>onBusy(false);},[locked,onBusy]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&!document.querySelector('dialog[open]')){e.preventDefault();document.getElementById('place-save')?.click();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
  useEffect(()=>{
    if(!dirty&&!locked)return;
    const unload=(event:BeforeUnloadEvent)=>event.preventDefault();
    const navigate=(event:MouseEvent)=>{const link=(event.target as Element).closest('a[href]');if(link&&!link.hasAttribute('target')&&(locked||!window.confirm('Discard changes?')))event.preventDefault();};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};
  },[dirty,locked]);
  async function run(action:string) {
    if(locked)return;setBusy(action);setError('');
    try {
      const saving=action==='save-workspace'||action==='create-workspace';
      const payload={id:detail?.id,version:detail?.staff?.version??0,action,reason,...(saving?{baseHash:detail?.baseHash??null,menuBaseHash:detail?.menu.baseHash??null,menuVersion:detail?.menu.staff?.version??0,allowDuplicate:different,
        fields:{...p,aliases:p.aliases.join(','),research:p.research?{...p.research,sourceUrls:p.research.sourceUrls.filter(s=>s.trim())}:undefined,hours:p.hours?{...p.hours,schedule:p.hours.schedule.filter(line=>line.trim())}:null},dishes:dishChanges(rows)}:{})};
      const result=await api<{id?:string}>(action==='clear-menu'?'/api/content/menus':'/api/content/places',action==='clear-menu'?{id:detail?.id,version:detail?.menu.staff?.version??0,action:'clear',reason}:payload);
      onDirty(false);setDirty(false);setConfirm('');setReason('');onSaved(action==='delete'?null:result.id);
    }catch(problem){setError(failure(problem));}finally{setBusy('');}
  }
  const ask=(action:string)=>{setMore(false);if(!dirty||window.confirm('Discard changes?'))setConfirm(action);};
  const toggleDirectory=()=>{if(window.matchMedia('(max-width:1250px)').matches)document.querySelector<HTMLButtonElement>('.place-split .content-detail>.back')?.click();else setDirectory(!directory);};
  const actions:Record<string,[string,string]>={hide:['Hide place?','Hide'],restore:['Show place?','Show'],delete:['Delete place?','Delete'],clear:['Revert edits?','Revert'],'clear-menu':['Revert menu?','Revert']};
  const tabs=['workspace','photos','sources','reports','history'],openReports=detail?.reports.filter(r=>!['resolved','dismissed'].includes(r.status)).length??0;
  const column=(id:string,title:string,children:ReactNode)=><section className={'place-column '+(focus===id?'place-focused':'')} data-panel={id}><header><h2>{title}</h2><IconButton icon="external" label={(focus===id?'Restore ':'Expand ')+id} onClick={()=>setFocus(focus===id?'':id)}/></header>{children}</section>;
  return <div className="place-editor recipe-editor" data-directory={directory?'shown':'hidden'} aria-busy={locked}>
    <header className="recipe-editor-head"><div className="recipe-heading"><div className="grow"><input className="recipe-title" aria-label="Place name" placeholder="New place" value={p.name} disabled={locked} onChange={e=>set({name:e.target.value})} maxLength={300}/>
      <div className="row recipe-meta"><small>{detail?({packaged:'App',explorer:'QT Explorer',staff:'Staff'})[detail.origin]:'Staff'}</small>{p.branch&&<small>{p.branch}</small>}<Badges hidden={detail?.staff?.hidden} newer={detail?.newer||detail?.menu.newer}/></div></div>
      <div className="row recipe-actions"><span role="status" className="place-save-state">{uploads?'Uploading…':dirty?'Unsaved':''}</span><IconButton icon="content" label="Toggle places list" onClick={toggleDirectory}/><IconButton icon="show" label="Preview place" onClick={()=>setPreview(true)}/>
        {detail&&<button type="button" disabled={locked} onClick={()=>ask(detail.staff?.hidden?'restore':'hide')}>{detail.staff?.hidden?'Show':'Hide'}</button>}
        {detail&&<div className="place-more"><IconButton icon="controls" label="More actions" disabled={locked} onClick={()=>setMore(!more)}/>{more&&<div className="place-action-menu">{detail.staff&&!staff&&<button type="button" onClick={()=>ask('clear')}>Revert edits</button>}{detail.menu.staff&&<button type="button" onClick={()=>ask('clear-menu')}>Revert menu</button>}{staff&&<button type="button" className="danger" onClick={()=>ask('delete')}>Delete place</button>}{!detail.staff&&!detail.menu.staff&&!staff&&<small>No staff edits</small>}</div>}</div>}
        <button type="button" id="place-save" className="primary" disabled={locked||(!dirty&&!!detail)} onClick={()=>void run(detail?'save-workspace':'create-workspace')}>{busy?'Saving…':detail?'Save':'Create'}</button>
      </div></div>
      <div className="recipe-tabs" role="tablist" aria-label="Place sections">{tabs.map((name,i)=><button type="button" role="tab" key={name} id={'place-tab-'+name} aria-controls={'place-page-'+name} aria-selected={tab===name} tabIndex={tab===name?0:-1} disabled={uploads>0} onClick={()=>setTab(name)} onKeyDown={e=>{const at=e.key==='Home'?0:e.key==='End'?4:e.key==='ArrowRight'?(i+1)%5:e.key==='ArrowLeft'?(i+4)%5:-1;if(at>=0){e.preventDefault();setTab(tabs[at]);document.getElementById('place-tab-'+tabs[at])?.focus();}}}>{name[0].toUpperCase()+name.slice(1)}{name==='reports'&&openReports>0&&<span className="badge warn">{openReports}</span>}</button>)}</div>
    </header>
    {error&&!confirm&&<div role="alert" className="notice error">{error}</div>}
    <div id="place-page-workspace" role="tabpanel" aria-labelledby="place-tab-workspace" className="place-page" hidden={tab!=='workspace'}>
      <div className="place-mobile-panels">{['details','menu','hours'].map(id=><button type="button" key={id} aria-pressed={panel===id} onClick={()=>{setPanel(id);setFocus('');}}>{id[0].toUpperCase()+id.slice(1)}</button>)}</div>
      <div className={'place-columns'+(focus?' is-focused':'')} data-current={panel}>
        {column('details','Details',<PlaceDetails p={p} set={set} disabled={locked} uploading={uploading} creating={!detail} different={different} setDifferent={v=>{setDifferent(v);mark();}}/>)}
        {column('menu','Menu · '+rows.filter(r=>!r.hidden&&!r.removed).length,<PlaceMenu rows={rows} set={setDishes} disabled={locked} source={p.sourceUrl||detail?.menu.base?.sections[0]?.sourceUrl} uploading={uploading}/>)}
        {column('hours','Opening hours',<PlaceHours hours={p.hours} set={hours=>set({hours})} disabled={locked}/>)}
      </div>
    </div>
    <div id="place-page-photos" role="tabpanel" aria-labelledby="place-tab-photos" className="place-secondary" hidden={tab!=='photos'}>{tab==='photos'&&<div className="place-photo-grid"><section><h3>Cover</h3><PlacePhotoEditor photo={p.photo} label="Cover" disabled={locked} source={p.sourceUrl} onChange={photo=>set({photo})} onBusy={uploading}/></section>{rows.filter(r=>!r.removed).slice(0,photoLimit).map(row=><section key={row.key}><h3>{row.name||'New dish'}</h3><PlacePhotoEditor photo={row.photo} label={row.name||'New dish'} disabled={locked} source={p.sourceUrl||detail?.menu.base?.sections[0]?.sourceUrl} onChange={photo=>setDishes(rows.map(r=>r.key===row.key?{...r,photo}:r))} onBusy={uploading}/></section>)}{rows.length>photoLimit&&<button type="button" onClick={()=>setPhotoLimit(n=>n+60)}>Show more</button>}</div>}</div>
    <div id="place-page-sources" role="tabpanel" aria-labelledby="place-tab-sources" className="place-secondary" hidden={tab!=='sources'}><PlaceSources p={p} set={set} disabled={locked} detail={detail}/></div>
    <div id="place-page-reports" role="tabpanel" aria-labelledby="place-tab-reports" className="place-secondary" hidden={tab!=='reports'}><section className="panel stack">{detail?.reports.length?detail.reports.map(r=><div className="row spread place-report" key={r.id}><div><strong>{r.title}</strong><small>{date(r.created_at)}</small></div><span className="badge">{r.status}</span><button type="button" disabled={locked} onClick={()=>setReport(r.id)}>View case</button></div>):<p className="muted">No reports</p>}</section></div>
    <div id="place-page-history" role="tabpanel" aria-labelledby="place-tab-history" className="place-secondary" hidden={tab!=='history'}><section className="panel"><History rows={detail?.history??[]}/></section></div>
    {confirm&&<RecipeDialog title={actions[confirm][0]} onClose={()=>{if(!locked)setConfirm('');}} actions={<><button type="button" disabled={locked} onClick={()=>setConfirm('')}>Cancel</button><button type="button" className={confirm==='delete'?'danger':'primary'} disabled={locked} onClick={()=>void run(confirm)}>{actions[confirm][1]}</button></>}><strong>{p.name}</strong><label>Reason<textarea rows={2} maxLength={1000} value={reason} disabled={locked} onChange={e=>setReason(e.target.value)}/></label>{error&&<div role="alert" className="notice error">{error}</div>}</RecipeDialog>}
    {preview&&<RecipeDialog title={p.name||'Preview'} onClose={()=>setPreview(false)}><div className="stack">
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated cover preview */}
      {p.photo&&<img className="recipe-full-photo" src={photoSrc(p.photo.path)} alt={p.name}/>}<span>{p.branch}</span><span>{p.address}</span>{p.hours&&<span>{p.hours.summary}</span>}{rows.filter(r=>!r.hidden&&!r.removed).map(r=><div className="row spread" key={r.key}><span>{r.name}</span><span>{r.price.currency==='SGD'&&r.price.amount!==null?'S$'+r.price.amount.toFixed(2):'—'}</span></div>)}{detail?.app&&<a href={detail.app+'/place/catalogue-'+detail.id} target="_blank" rel="noreferrer">Open in app</a>}</div></RecipeDialog>}
    {report&&<RecipeDialog title="Report" onClose={()=>setReport(null)}><CaseDetail id={report} canAssign={false} onSaved={()=>{if(!dirty)onSaved();}} onClose={()=>setReport(null)}/></RecipeDialog>}
  </div>;
}
