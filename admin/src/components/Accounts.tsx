'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Empty, Feedback, Mutation, SearchField, Table, reveal } from './Primitives';
import { Icon } from './Icon';
import Collection from './Collection';

type Account = { id: string; username: string; name: string; handle: string | null; created_at: string; restricted: boolean };
export default function Accounts() {
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState<string | null>(null);
  const resource = useResource<Account[]>(query ? '/api/manage/accounts?q=' + encodeURIComponent(query) : null);
  const selected = resource.data?.find(row => row.id === selectedId) ?? null;
  function submit() {
    const term = search.trim(); if (term.length < 2) return;
    if (term === query) resource.reload(); else setQuery(term);
    setSelectedId(null);
  }
  return <>
    <form className="toolbar" onSubmit={e => { e.preventDefault(); submit(); }}>
      <SearchField label="Username or handle" value={search} onChange={setSearch} maxLength={30} autoFocus/>
      <button disabled={search.trim().length < 2}>Search</button>
    </form>
    <Feedback {...resource} retry={resource.reload}/>
    {!query && <div className="panel"><Empty icon="accounts">Search by username or handle</Empty></div>}
    {query && resource.data && <div className="panel"><Table headings={['Username', 'Handle', 'Name', 'Joined', 'Status', '']} empty="No matches"
      rows={resource.data.map(row => [<strong key="u">{row.username}</strong>, row.handle ? '@' + row.handle : '—', row.name, date(row.created_at),
        <span className={'badge ' + (row.restricted ? 'warn' : 'good')} key="s">{row.restricted ? 'Suspended' : 'Active'}</span>,
        <button type="button" key="m" aria-label={'Manage ' + row.username} onClick={() => setSelectedId(row.id)}>Manage</button>])}/></div>}
    {selected && <section className="panel" ref={reveal}><div className="row spread"><h2>{selected.username}</h2>
      <button type="button" className="icon-button" aria-label="Close" onClick={() => setSelectedId(null)}><Icon name="close"/></button></div>
      <Mutation key={selected.id + selected.restricted} endpoint="accounts" onSaved={resource.reload} label="Apply" values={f => ({ id: selected.id, action: f.get('action') })}>
        <label>Action<select name="action" defaultValue={selected.restricted ? 'restore' : 'revoke_sessions'}>
          <option value="revoke_sessions">Sign out all devices</option><option value="suspend">Suspend</option><option value="restore">Restore</option>
          {selected.handle && <option value="reset_handle">Reset handle (@{selected.handle})</option>}</select></label>
      </Mutation>
      <Collection key={'c' + selected.id} id={selected.id}/></section>}
  </>;
}
