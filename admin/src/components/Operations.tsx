'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation, Table } from './Primitives';

type Control = { key:string;enabled:boolean;notice:string;version:number;updated_at:string };
export function Controls() {
  const resource = useResource<Control[]>('/api/manage/controls'); const [selected,setSelected] = useState<Control | null>(null);
  return <><div className="notice">Controls apply to the deployed server immediately. market_sellers lets members open shops and list food; market opens buying and orders. Other AI features, games and identity intake stay locked until their production acceptance is complete.</div><Feedback {...resource} retry={resource.reload}/>
    {resource.data?.map(row => <div className="panel control" key={row.key}><div><h3>{row.key}</h3><p className="muted">{row.notice || 'No public notice'}</p><small>Updated {date(row.updated_at)}</small></div><div className="row"><span className={'badge ' + (row.enabled ? 'good' : 'warn')}>{row.enabled ? 'Enabled' : 'Disabled'}</span><button onClick={() => setSelected(row)}>Manage {row.key}</button></div></div>)}
    {selected && <section className="panel"><h2>Update {selected.key}</h2><Mutation key={selected.key+selected.version} endpoint="controls" onSaved={() => { setSelected(null); resource.reload(); }} values={f => ({ key:selected.key,version:selected.version,enabled:f.get('enabled')==='true',notice:f.get('notice') })}>
      <label>Feature status<select name="enabled" defaultValue={String(selected.enabled)}><option value="false">Disabled</option><option value="true">Enabled</option></select></label><label>Member notice<textarea name="notice" maxLength={300} defaultValue={selected.notice}/></label>
    </Mutation></section>}
  </>;
}
export function Content() {
  const resource = useResource<{ id:string;content_id:string;revision:string;decision:string;reason:string;reviewer:string;created_at:string }[]>('/api/manage/content');
  const catalog = useResource<{id:string;name:string;branch:string;fingerprint:string;checkedAt:string}[]>('/api/manage/catalog');
  const [selected,setSelected] = useState('');
  const menu = catalog.data?.find(m => m.id===selected);
  return <><div className="panel"><h2>Record an editorial decision</h2><p className="muted">Record the exact source revision reviewed. Withdrawal removes a menu from server delivery; reconnecting clients refresh their cached copy. A review decision alone does not publish or restore content.</p>
    <Feedback {...catalog} retry={catalog.reload}/>{catalog.data && <><label>Published menu<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Choose a menu branch</option>{catalog.data.map(m => <option key={m.id} value={m.id}>{m.name} · {m.branch}</option>)}</select></label>
    {menu && <><p className="muted">Source checked {date(menu.checkedAt)} · <a href={'https://quintaste.srv1902914.hstgr.cloud/menu/'+encodeURIComponent(menu.id)} target="_blank" rel="noreferrer">Open published menu ↗</a></p><Mutation key={menu.id+menu.fingerprint} endpoint="content" onSaved={() => {resource.reload();catalog.reload();}} label="Record decision" values={f => ({ contentId:menu.id,revision:menu.fingerprint,decision:f.get('decision') })}>
      <label>Source revision<input readOnly value={menu.fingerprint}/></label><label>Decision<select name="decision"><option value="reviewed">Reviewed</option><option value="changes_requested">Changes requested</option><option value="withdrawn">Withdraw from delivery</option></select></label>
    </Mutation></>}</>}</div><Feedback {...resource} retry={resource.reload}/>{resource.data && <div className="panel"><h2>Decision history</h2><Table headings={['Menu','Revision','Decision','Reviewer','Reason','Date']} rows={resource.data.map(r => [r.content_id,r.revision,r.decision,r.reviewer,r.reason,date(r.created_at)])}/></div>}</>;
}
