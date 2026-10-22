'use client';
import { useState } from 'react';
import Link from 'next/link';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, Pager, Segmented, Table, reveal } from './Primitives';
import { Icon } from './Icon';

type Case = { id: string; kind: string; title: string; description: string; subject_id: string; status: string; severity: string; assignee: string | null; assigned_to: string | null; due_at: string; version: number; resolution: string };
const statuses = ['open', 'triaged', 'investigating', 'resolved', 'dismissed'];
const closed = ['resolved', 'dismissed'];
const tone = (status: string) => 'badge ' + (closed.includes(status) ? '' : status === 'open' ? 'warn' : 'good');
const overdue = (c: Case) => !closed.includes(c.status) && Date.parse(c.due_at) < Date.now();
/** Member reports carry "<kind>:<id>|by:<reporter>"; this opens the reported item where staff can act on it. */
const subjects: [RegExp, string, (id: string) => string][] = [
  [/^place:catalogue:(.+)$/, 'Open place', id => '/console/places?id=' + encodeURIComponent(id)],
  [/^place:review:/, 'Place reviews', () => '/console/reviews'], [/^recipe:member:/, 'Member recipes', () => '/console/member-recipes'],
  [/^market:listing:/, 'Listings', () => '/console/listings'], [/^market:order:/, 'Shops', () => '/console/shops'], [/^community:user:/, 'Accounts', () => '/console/accounts'],
  [/^game:level:/, 'Game levels', () => '/console/game-levels'], [/^game:cafe:/, 'Game cafés', () => '/console/game-levels']];
function Subject({ value }: { value: string }) {
  const [subject, by] = value.split('|by:'), match = subjects.map(([re, label, href]) => { const m = re.exec(subject); return m && { label, href: href(m[1] ?? '') }; }).find(Boolean);
  return <span className="row">{match ? <Link className="row" href={match.href}>{match.label}<Icon name="forward" size={14}/></Link> : null}
    <span className="code">{subject}</span>{by && <small>reported by a member</small>}</span>;
}

export default function Cases({ canAssign }: { canAssign: boolean }) {
  const [status, setStatus] = useState(''); const [selected, setSelected] = useState<string | null>(null); const [creating, setCreating] = useState(false); const [page, setPage] = useState(0);
  const resource = useResource<Case[]>(`/api/manage/cases?status=${status}&page=${page}`);
  return <>
    <div className="toolbar spread">
      <Segmented label="Status" value={status} onChange={v => { setStatus(v); setPage(0); }} options={[['', 'All'], ...statuses.map(s => [s, s[0].toUpperCase() + s.slice(1)] as const)]}/>
      <div className="row"><IconButton icon="refresh" label="Refresh" onClick={resource.reload}/>
        <button type="button" className="primary" aria-expanded={creating} onClick={() => setCreating(!creating)}><Icon name={creating ? 'close' : 'plus'} size={16}/>{creating ? 'Cancel' : 'New case'}</button></div>
    </div>
    {creating && <section className="panel"><h2>New case</h2>
      <Mutation endpoint="cases" label="Create" reset onSaved={() => { setCreating(false); resource.reload(); }}
        values={f => ({ kind: f.get('kind'), title: f.get('title'), description: f.get('description'), subjectId: f.get('subjectId'), severity: f.get('severity') })}>
        <div className="fields"><label>Type<select name="kind">{['report', 'harm', 'correction', 'incident', 'privacy'].map(k => <option key={k}>{k}</option>)}</select></label>
          <label>Severity<select name="severity">{['normal', 'high', 'critical'].map(k => <option key={k}>{k}</option>)}</select></label></div>
        <label>Title<input name="title" required maxLength={150}/></label>
        <label>Reference<input name="subjectId" maxLength={200}/></label>
        <label>Details<textarea name="description" required maxLength={4000} rows={4}/></label>
      </Mutation></section>}
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Case', 'Type', 'Status', 'Owner', 'Due']} empty="No cases"
      rows={resource.data.map(c => [<button type="button" className="link" key="open" onClick={() => setSelected(c.id)}>{c.title}</button>, c.kind,
        <span key="state" className={tone(c.status)}>{c.status}</span>, c.assignee || '—',
        overdue(c) ? <span key="due" className="badge warn">{date(c.due_at)}</span> : date(c.due_at)])}/>
      <Pager page={page} setPage={setPage} count={resource.data.length}/></div>}
    {selected && <CaseDetail key={selected} id={selected} canAssign={canAssign} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function CaseDetail({ id, onSaved, onClose, canAssign }: { id: string; onSaved: () => void; onClose: () => void; canAssign: boolean }) {
  const resource = useResource<{ record: Case; notes: { id: string; body: string; created_at: string; author: string }[] }>('/api/manage/cases?id=' + id);
  const assignees = useResource<{ id: string; email: string }[]>(canAssign ? '/api/manage/assignees' : null);
  const row = resource.data?.record;
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{row?.title ?? 'Case'}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {row && <>
      <div className="row badges"><span className={tone(row.status)}>{row.status}</span><span className="badge">{row.kind}</span>
        <span className={'badge ' + (row.severity === 'normal' ? '' : 'warn')}>{row.severity}</span></div>
      {row.subject_id && <Subject value={row.subject_id}/>}
      <p className="detail">{row.description}</p>
      <div className="divider"/>
      <CaseForm key={row.version} id={id} row={row} canAssign={canAssign} assignees={assignees} onSaved={() => { resource.reload(); onSaved(); }}/>
      {!!resource.data?.notes.length && <><h3>Notes</h3><ul className="history">{resource.data.notes.map(note =>
        <li key={note.id}><small>{note.author} · {date(note.created_at)}</small><p className="detail">{note.body}</p></li>)}</ul></>}
    </>}
  </section>;
}
function CaseForm({ id, row, canAssign, assignees, onSaved }: { id: string; row: Case; canAssign: boolean; onSaved: () => void;
  assignees: { data: { id: string; email: string }[] | null; error: string; loading: boolean; reload: () => void } }) {
  const [status, setStatus] = useState(row.status);
  return <Mutation endpoint="cases" onSaved={onSaved}
    values={f => ({ id, version: row.version, status: f.get('status'), resolution: f.get('resolution'), note: f.get('note'), ...(f.get('assignedTo') ? { assignedTo: f.get('assignedTo') } : {}) })}>
    <div className="fields"><label>Status<select name="status" value={status} onChange={e => setStatus(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      {canAssign && assignees.data && <label>Owner<select name="assignedTo" defaultValue={row.assigned_to || ''}><option value="">{row.assignee ?? 'Unassigned'}</option>
        {assignees.data.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}</select></label>}</div>
    {canAssign && <Feedback {...assignees} retry={assignees.reload}/>}
    <label>Resolution<textarea name="resolution" maxLength={4000} rows={3} defaultValue={row.resolution}
      required={closed.includes(status)} minLength={closed.includes(status) ? 10 : undefined}/></label>
    <label>Note<textarea name="note" maxLength={4000} rows={2}/></label>
  </Mutation>;
}
