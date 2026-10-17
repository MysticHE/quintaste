'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation, Table } from './Primitives';

type Account = { id: string; username: string; name: string; created_at: string; restricted: boolean };
export default function Accounts() {
  const [search,setSearch] = useState(''); const [query,setQuery] = useState(''); const [selected,setSelected] = useState<Account | null>(null);
  const resource = useResource<Account[]>(query ? '/api/manage/accounts?q=' + encodeURIComponent(query) : null);
  return <><form className="search" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setSelected(null); }}>
    <label>Find a customer by username<input value={search} onChange={e => setSearch(e.target.value)} minLength={2} maxLength={30} required placeholder="At least two characters"/></label><button className="primary">Search accounts</button></form>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Username','Display name','Created','Access','Action']} rows={resource.data.map(row => [row.username,row.name,date(row.created_at),<span className={'badge ' + (row.restricted ? 'warn' : 'good')} key="status">{row.restricted ? 'Restricted' : 'Active'}</span>,<button key="select" onClick={() => setSelected(row)}>Manage {row.username}</button>])}/><small>Up to 50 matching accounts. Refine your search for more precise results.</small></div>}
    {selected && <section className="panel"><h2>Manage {selected.username}</h2><p className="muted">Suspending access revokes sessions and blocks new sign-ins. Restoring access requires the customer to sign in again.</p>
      <Mutation key={selected.id} endpoint="accounts" onSaved={resource.reload} values={f => ({ id:selected.id,action:f.get('action') })}>
        <label>Action<select name="action"><option value="revoke_sessions">Sign out all devices</option><option value="suspend">Suspend account access</option><option value="restore">Restore account access</option></select></label>
      </Mutation></section>}
    <p className="muted">Password and recovery-code values are never available in this workspace.</p>
  </>;
}
