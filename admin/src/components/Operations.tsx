'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation } from './Primitives';

type Control = { key:string;enabled:boolean;notice:string;version:number;updated_at:string };
export function Controls() {
  const resource = useResource<Control[]>('/api/manage/controls'); const [selected,setSelected] = useState<Control | null>(null);
  return <><div className="notice">Controls apply to the deployed server immediately. market_sellers lets members open shops and list food; market opens buying and orders; areas shows Home and Work area counts. Other AI features, games and identity intake stay locked until their production acceptance is complete.</div><Feedback {...resource} retry={resource.reload}/>
    {resource.data?.map(row => <div className="panel control" key={row.key}><div><h3>{row.key}</h3><p className="muted">{row.notice || 'No public notice'}</p><small>Updated {date(row.updated_at)}</small></div><div className="row"><span className={'badge ' + (row.enabled ? 'good' : 'warn')}>{row.enabled ? 'Enabled' : 'Disabled'}</span><button onClick={() => setSelected(row)}>Manage {row.key}</button></div></div>)}
    {selected && <section className="panel"><h2>Update {selected.key}</h2><Mutation key={selected.key+selected.version} endpoint="controls" onSaved={() => { setSelected(null); resource.reload(); }} values={f => ({ key:selected.key,version:selected.version,enabled:f.get('enabled')==='true',notice:f.get('notice') })}>
      <label>Feature status<select name="enabled" defaultValue={String(selected.enabled)}><option value="false">Disabled</option><option value="true">Enabled</option></select></label><label>Member notice<textarea name="notice" maxLength={300} defaultValue={selected.notice}/></label>
    </Mutation></section>}
  </>;
}
