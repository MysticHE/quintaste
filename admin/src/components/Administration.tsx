'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, SearchField, Table, reveal } from './Primitives';
import { Icon } from './Icon';

type Staff = { id: string; email: string; role: string; active: boolean; created_at: string };
const roles = ['owner', 'operator', 'support', 'reviewer', 'auditor'];
export function Staff({ self }: { self: string }) {
  const resource = useResource<Staff[]>('/api/manage/staff'); const [selected, setSelected] = useState<Staff | null>(null); const [inviting, setInviting] = useState(false);
  return <>
    <div className="toolbar spread"><span/><button type="button" className="primary" aria-expanded={inviting} onClick={() => setInviting(!inviting)}>
      <Icon name={inviting ? 'close' : 'plus'} size={16}/>{inviting ? 'Cancel' : 'Invite'}</button></div>
    {inviting && <section className="panel"><h2>Invite</h2><Mutation endpoint="staff" label="Invite" reset onSaved={() => { setInviting(false); resource.reload(); }}
      values={f => ({ action: 'invite', email: f.get('email'), role: f.get('role') })}>
      <div className="fields"><label>Google email<input name="email" type="email" required maxLength={254} autoComplete="off"/></label>
        <label>Role<select name="role" defaultValue="reviewer">{roles.map(r => <option key={r}>{r}</option>)}</select></label></div>
    </Mutation></section>}
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Email', 'Role', 'Status', 'Added', '']} rows={resource.data.map(r => [<strong key="e">{r.email}</strong>,
      <span key="r" className="badge">{r.role}</span>, <span key="s" className={'badge ' + (r.active ? 'good' : '')}>{r.active ? 'Active' : 'Disabled'}</span>, date(r.created_at),
      <button type="button" key="m" aria-label={'Manage ' + r.email} onClick={() => setSelected(r)}>Manage</button>])}/></div>}
    {selected && <section className="panel" ref={reveal}><div className="row spread"><h2>{selected.email}</h2><IconButton icon="close" label="Close" onClick={() => setSelected(null)}/></div>
      <Mutation key={selected.id} endpoint="staff" onSaved={() => { setSelected(null); resource.reload(); }}
        values={f => ({ action: f.get('action'), id: selected.id, role: f.get('role') ?? selected.role, active: (f.get('active') ?? String(selected.active)) === 'true' })}>
        <div className="fields"><label>Action<select name="action"><option value="update">Update access</option><option value="revoke_sessions">Sign out everywhere</option></select></label>
          {selected.id !== self && <><label>Role<select name="role" defaultValue={selected.role}>{roles.map(r => <option key={r}>{r}</option>)}</select></label>
            <label>Status<select name="active" defaultValue={String(selected.active)}><option value="true">Active</option><option value="false">Disabled</option></select></label></>}</div>
      </Mutation></section>}
  </>;
}
type Event = { id: string; occurred_at: string; action: string; actor: string | null; target: string; reason: string; details: Record<string, unknown> };
export function Audit() {
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState(''); const [before, setBefore] = useState('');
  const resource = useResource<Event[]>('/api/manage/audit?q=' + encodeURIComponent(filter) + (before ? '&before=' + before : ''));
  return <>
    <form className="toolbar" onSubmit={e => { e.preventDefault(); setFilter(search.trim()); setBefore(''); }}>
      <SearchField label="Action" value={search} onChange={setSearch} maxLength={100}/><button>Search</button></form>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Time', 'Staff', 'Action', 'Target', 'Reason']} empty="No events"
      rows={resource.data.map(r => [date(r.occurred_at), r.actor || 'System', <span key="a" className="code">{r.action}</span>, <span key="t" className="code">{r.target}</span>,
        <div key="d">{r.reason}{Object.keys(r.details).length > 0 && <details><summary>Details</summary><div className="code">{JSON.stringify(r.details)}</div></details>}</div>])}/>
      <div className="form-actions"><button type="button" disabled={!before} onClick={() => setBefore('')}><Icon name="back" size={16}/>Latest</button>
        <button type="button" disabled={resource.data.length < 100} onClick={() => setBefore(resource.data?.at(-1)?.id || '')}>Older<Icon name="forward" size={16}/></button></div></div>}
  </>;
}
type Gateway = { account: string; gateway: string; alias: string; credentialConfigured: boolean; latest: null | { status: string; http_status: number | null; checked_at: string }; dashboard: string };
export function Integrations() {
  const resource = useResource<Gateway>('/api/manage/integrations'), data = resource.data;
  const passed = data?.latest?.status === 'connected_text_probe';
  return <><Feedback {...resource} retry={resource.reload}/>{data && <div className="stack">
    <ul className="list">
      <li><span>OpenAI via Cloudflare</span><span className="value"><span className={'badge ' + (passed ? 'good' : 'warn')}>{passed ? 'Connected' : 'Unverified'}</span></span></li>
      <li><span>Account</span><span className="value code">{data.account || '—'}</span></li>
      <li><span>Gateway</span><span className="value code">{data.gateway}</span></li>
      <li><span>Key alias</span><span className="value code">{data.alias}</span></li>
      <li><span>Run credential</span><span className="value">{data.credentialConfigured ? 'Present' : 'Missing'}</span></li>
      <li><span>Last check</span><span className="value">{data.latest ? data.latest.status.replaceAll('_', ' ') + ' · ' + date(data.latest.checked_at) : '—'}</span></li>
    </ul>
    <div><a className="button" href={data.dashboard} target="_blank" rel="noreferrer">Cloudflare<Icon name="external" size={16}/></a></div>
    <section className="panel"><h2>Connection check</h2>
      <div className="notice warn"><Icon name="warning"/>Sends one paid OpenAI request · 3 per day</div>
      <Mutation endpoint="integrations" label="Run check" onSaved={resource.reload} values={() => ({})}/></section>
  </div>}</>;
}
