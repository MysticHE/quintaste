'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation, Table } from './Primitives';

type Case = { id: string; kind: string; title: string; description: string; subject_id: string; status: string; severity: string; assignee: string | null; assigned_to: string | null; due_at: string; version: number; resolution: string };
const statuses = ['open','triaged','investigating','resolved','dismissed'];
export default function Cases({ canAssign }: { canAssign: boolean }) {
  const [status,setStatus] = useState(''); const [selected,setSelected] = useState<string | null>(null);
  const resource = useResource<Case[]>('/api/manage/cases?status=' + status);
  return <><div className="panel"><details><summary>Open a review case</summary><Mutation endpoint="cases" onSaved={resource.reload} label="Create case" values={f => ({ kind:f.get('kind'),title:f.get('title'),description:f.get('description'),subjectId:f.get('subjectId'),severity:f.get('severity') })}>
    <div className="fields"><label>Case type<select name="kind">{['report','harm','correction','incident','privacy'].map(k => <option key={k}>{k}</option>)}</select></label><label>Severity<select name="severity">{['normal','high','critical'].map(k => <option key={k}>{k}</option>)}</select></label></div>
    <label>Title<input name="title" required maxLength={150}/></label><label>Account or content reference<input name="subjectId" maxLength={200}/></label><label>Details<textarea name="description" required maxLength={4000}/></label>
    <p className="muted">Use necessary case facts only. Do not paste passwords, API keys or identity-document images.</p>
  </Mutation></details></div>
    <div className="row spread"><label>Case status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><button onClick={resource.reload}>Refresh queue</button></div>
    <Feedback {...resource} retry={resource.reload}/>{resource.data && <div className="panel"><Table headings={['Case','Type','Status','Owner','Response target']} rows={resource.data.map(c => [<button key="open" onClick={() => setSelected(c.id)}>{c.title}</button>,c.kind,<span key="state" className="badge">{c.status}</span>,c.assignee || 'Unassigned',date(c.due_at)])}/><small>Up to 100 cases ordered by response target. Filters apply your access permissions.</small></div>}
    {selected && <CaseDetail key={selected} id={selected} canAssign={canAssign} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function CaseDetail({ id,onSaved,onClose,canAssign }: { id:string;onSaved:()=>void;onClose:()=>void;canAssign:boolean }) {
  const resource = useResource<{ record:Case; notes:{ id:string;body:string;created_at:string;author:string }[] }>('/api/manage/cases?id='+id);
  const assignees = useResource<{id:string;email:string}[]>(canAssign ? '/api/manage/assignees' : null);
  const row = resource.data?.record;
  return <section className="panel"><div className="row spread"><h2>Case details</h2><button onClick={onClose}>Close details</button></div><Feedback {...resource} retry={resource.reload}/>
    {row && <><h3>{row.title}</h3><p className="detail">{row.description}</p><p className="muted">Subject: {row.subject_id || 'No reference'} · Severity: {row.severity}</p>
      <Mutation key={row.version} endpoint="cases" onSaved={() => { resource.reload(); onSaved(); }} values={f => ({ id,version:row.version,status:f.get('status'),resolution:f.get('resolution'),note:f.get('note'),...(f.get('assignedTo') ? {assignedTo:f.get('assignedTo')} : {}) })}>
        <label>Status<select name="status" defaultValue={row.status}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
        {canAssign && <><Feedback {...assignees} retry={assignees.reload}/>{assignees.data && <label>Case owner<select name="assignedTo" defaultValue={row.assigned_to || ''}><option value="">Keep current owner</option>{assignees.data.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}</select></label>}</>}
        <label>Resolution / right-of-reply outcome<textarea name="resolution" maxLength={4000} defaultValue={row.resolution}/></label><label>Add a case note<textarea name="note" maxLength={4000}/></label>
      </Mutation><div className="divider"/><h3>Case notes</h3>{resource.data?.notes.map(note => <div className="notice" key={note.id}><small>{note.author} · {date(note.created_at)}</small><p className="detail compact">{note.body}</p></div>)}
    </>}
  </section>;
}
