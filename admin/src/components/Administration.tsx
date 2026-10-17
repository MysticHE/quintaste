'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation, Table } from './Primitives';

type Staff = { id:string;email:string;role:string;active:boolean;keys:number;created_at:string };
const roles = ['owner','operator','support','reviewer','auditor'];
export function Staff() {
  const resource = useResource<Staff[]>('/api/manage/staff'); const [selected,setSelected] = useState<Staff | null>(null);
  return <><div className="panel"><details><summary>Invite a staff member</summary><p className="muted">The invited Google account can sign in and register its first security key. No email is sent.</p><Mutation endpoint="staff" label="Add invitation" onSaved={resource.reload} values={f => ({ action:'invite',email:f.get('email'),role:f.get('role') })}>
    <div className="fields"><label>Google account email<input name="email" type="email" required maxLength={254}/></label><label>Role<select name="role" defaultValue="reviewer">{roles.map(r => <option key={r}>{r}</option>)}</select></label></div>
  </Mutation></details></div><Feedback {...resource} retry={resource.reload}/>{resource.data && <div className="panel"><Table headings={['Staff member','Role','Status','Security keys','Action']} rows={resource.data.map(r => [r.email,r.role,r.active?'Active':'Disabled',r.keys,<button key="manage" onClick={() => setSelected(r)}>Manage {r.email}</button>])}/></div>}
    {selected && <div className="panel"><h2>{selected.email}</h2><Mutation key={selected.id} endpoint="staff" onSaved={() => { setSelected(null); resource.reload(); }} values={f => ({ action:f.get('action'),id:selected.id,role:f.get('role'),active:f.get('active')==='true' })}>
      <div className="fields"><label>Action<select name="action"><option value="update">Update access and revoke sessions</option><option value="revoke_sessions">Revoke sessions only</option></select></label><label>Role<select name="role" defaultValue={selected.role}>{roles.map(r => <option key={r}>{r}</option>)}</select></label><label>Status<select name="active" defaultValue={String(selected.active)}><option value="true">Active</option><option value="false">Disabled</option></select></label></div>
    </Mutation></div>}<div className="panel"><h2>Role boundaries</h2><Table headings={['Role','Access']} rows={[
      ['Owner','All console areas and staff invitations'],['Operator','Assigned/all operational cases, editorial decisions and feature controls'],['Support','Customer accounts and assigned cases'],['Reviewer','Assigned cases and editorial decisions'],['Auditor','Audit history only'],
    ]}/></div></>;
}
type Event = { id:string;occurred_at:string;action:string;actor:string | null;target:string;reason:string;details:Record<string,unknown> };
export function Audit() {
  const [search,setSearch] = useState(''); const [filter,setFilter] = useState(''); const [before,setBefore] = useState('');
  const resource = useResource<Event[]>('/api/manage/audit?q='+encodeURIComponent(filter)+(before?'&before='+before:''));
  return <><form className="search" onSubmit={e => { e.preventDefault(); setFilter(search); setBefore(''); }}><label>Filter action<input value={search} onChange={e => setSearch(e.target.value)} maxLength={100} placeholder="For example: account.suspend"/></label><button>Search audit</button></form>
    <Feedback {...resource} retry={resource.reload}/>{resource.data && <div className="panel"><Table headings={['Time','Staff','Action','Target','Reason / details']} rows={resource.data.map(r => [date(r.occurred_at),r.actor || 'System',r.action,r.target,<div key="details">{r.reason}{Object.keys(r.details).length>0 && <details><summary>Details</summary><div className="code">{JSON.stringify(r.details)}</div></details>}</div>])}/><div className="form-actions"><button disabled={!before} onClick={() => setBefore('')}>Latest events</button><button disabled={resource.data.length<100} onClick={() => setBefore(resource.data?.at(-1)?.id || '')}>Older events</button></div></div>}
    <p className="muted">Application access is append-only. Database administrators remain trusted operators.</p></>;
}
type Gateway = { account:string;gateway:string;alias:string;credentialConfigured:boolean;latest:null|{ status:string;http_status:number|null;checked_at:string };dashboard:string;note:string };
export function Integrations() {
  const resource = useResource<Gateway>('/api/manage/integrations'); const data = resource.data;
  return <><Feedback {...resource} retry={resource.reload}/>{data && <><div className="panel"><div className="row spread"><h2>OpenAI via Cloudflare</h2><span className={'badge '+(data.latest?.status==='connected_text_probe'?'good':'warn')}>{data.latest?.status==='connected_text_probe'?'Text check passed':'Connection unverified'}</span></div>
    <Table headings={['Setting','Value']} rows={[
      ['Cloudflare account',data.account||'Not configured'],['Gateway',data.gateway],['Provider key alias',data.alias],['Server Run credential',data.credentialConfigured?'Present (not proof of validity)':'Not configured'],['Last check',data.latest?data.latest.status.replaceAll('_',' ')+' · '+date(data.latest.checked_at):'No check recorded'],
    ]}/><div className="form-actions"><a className="button" href={data.dashboard} target="_blank" rel="noreferrer">Manage keys in Cloudflare ↗</a></div>
    <div className="divider"/><p className="muted">Enter or rotate the OpenAI key directly in Cloudflare Provider Keys. The console does not receive or retrieve that key. The VPS Run credential can make paid requests through gateways in its Cloudflare account.</p>
    <p className="notice">{data.note} This check sends a tiny fixed text request and can incur OpenAI API charges. It does not test image generation. Maximum three checks per UTC day.</p>
    <Mutation endpoint="integrations" label="Run connection check" onSaved={resource.reload} values={() => ({})}/>
    </div></>}</>;
}
