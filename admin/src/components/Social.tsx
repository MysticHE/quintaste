'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, Segmented, Table, reveal } from './Primitives';

type CheckRow = { id: string; name: string; username: string; gender: string; age: number | null; area: string; pose: string; submitted_at: string; decided_at: string | null; reason: string; reports: number };
type Check = CheckRow & { status: string; account_created: string; has_selfie: boolean; decided_by: string | null; photos: { id: string; position: number; digest: string }[]; mainChanged: boolean };
type TeacherRow = { id: string; display_name: string; area: string; status: string; applied_at: string; decided_at: string | null; username: string; reports: number; classes: number };
type Teacher = { teacher: Record<string, string | number | null> & { status: string; display_name: string; experience: string; teaches: string };
  classes: { id: string; title: string; starts: string; status: string; seats: number; taken: number; hidden_at: string | null; hidden_reason: string | null }[] };
const checkStatuses = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Declined']] as const;
const teacherStatuses = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Declined'], ['suspended', 'Suspended']] as const;
/** Pose keys from server/social/verify.mjs, in the words the member saw. */
const poses: Record<string, string> = { 'thumbs-up': 'Thumbs up', 'peace-sign': 'Peace sign', 'hand-on-chin': 'Hand on chin', 'point-up': 'Pointing up', wave: 'Waving',
  'touch-ear': 'Touching an ear', 'three-fingers': 'Three fingers up', 'hand-on-head': 'Hand on head' };
const declineReasons = ['The selfie does not show the same person as the main photo.', 'The pose was not copied.', 'The face is not clear in the selfie.',
  'The main photo does not clearly show a face.', 'The person does not look 21 to 45.'];
const badge = (status: string) => 'badge ' + (status === 'approved' ? 'good' : ['rejected', 'suspended'].includes(status) ? 'warn' : '');
const who = (r: { gender: string; age: number | null; area: string }) => [r.gender === 'woman' ? 'Woman' : r.gender === 'man' ? 'Man' : '', r.age ? `${r.age}` : '', r.area].filter(Boolean).join(' · ');
const image = (id: string, which: string | number) => `/api/manage/photo-check-image?id=${encodeURIComponent(id)}&which=${which}`;

export function PhotoChecks() {
  const [status, setStatus] = useState('pending'); const [selected, setSelected] = useState<string | null>(null);
  const resource = useResource<CheckRow[]>('/api/manage/photo-checks?status=' + status);
  return <>
    <div className="toolbar spread"><Segmented label="Status" value={status} onChange={v => { setStatus(v); setSelected(null); }} options={checkStatuses}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Member', 'Gender · age · area', status === 'pending' ? 'Sent' : 'Decided', 'Reports']} empty="No photo checks"
      rows={resource.data.map(r => [<button type="button" className="link" key="open" onClick={() => setSelected(r.id)}>{r.name || r.username}</button>, who(r) || '—',
        date(status === 'pending' ? r.submitted_at : r.decided_at), r.reports ? <span key="r" className="badge warn">{r.reports}</span> : '0'])}/></div>}
    {selected && <CheckDetail key={selected} id={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function CheckDetail({ id, onSaved, onClose }: { id: string; onSaved: () => void; onClose: () => void }) {
  const resource = useResource<Check>('/api/manage/photo-checks?id=' + encodeURIComponent(id)), d = resource.data;
  const saved = () => { resource.reload(); onSaved(); };
  const main = d?.photos[0];
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{d?.name || 'Photo check'}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {d && <div className="stack">
      <div className="row badges"><span className={badge(d.status)}>{d.status === 'rejected' ? 'declined' : d.status}</span>
        {d.mainChanged && <span className="badge warn">Main photo changed since the selfie</span>}{!!d.reports && <span className="badge warn">{d.reports} open reports</span>}</div>
      <ul className="list inset">{([['Account', d.username], ['Gender · age · area', who(d)], ['Pose asked for', poses[d.pose] ?? d.pose], ['Sent', date(d.submitted_at)],
        ['Account created', date(d.account_created)], ['Decision', d.decided_at ? `${date(d.decided_at)}${d.decided_by ? ' · ' + d.decided_by : ''}` : '—'], ['Reason given', d.reason || '—']] as const)
        .map(([k, v]) => <li key={k}><span>{k}</span><span className="value">{v || '—'}</span></li>)}</ul>
      <div className="compare">
        <figure>{/* eslint-disable-next-line @next/next/no-img-element -- private staff view of member photos */}
          {d.has_selfie ? <img src={image(id, 'selfie')} alt={'Live selfie, ' + (poses[d.pose] ?? d.pose).toLowerCase()}/> : <div className="empty">Selfie erased</div>}
          <figcaption>Live selfie · should show: {poses[d.pose] ?? d.pose}</figcaption></figure>
        <figure>{/* eslint-disable-next-line @next/next/no-img-element -- private staff view of member photos */}
          {main ? <img src={image(id, 0)} alt="Main photo"/> : <div className="empty">No main photo</div>}<figcaption>Main photo (shown first on People)</figcaption></figure>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- private staff view of member photos */}
      {d.photos.length > 1 && <div className="row thumbs">{d.photos.slice(1).map(p => <img key={p.id} src={image(id, p.position)} alt={'Photo ' + (p.position + 1)} width={88} height={88}/>)}</div>}
      {d.status === 'pending' && main && <div className="row action-bar">
        <Mutation key={'approve' + main.digest} endpoint="photo-checks" onSaved={saved} label="Approve" values={() => ({ id, action: 'approve', digest: main.digest })}/></div>}
      {(d.status === 'pending' || d.status === 'approved') && <details><summary>{d.status === 'pending' ? 'Decline' : 'Remove the ✓'}</summary><div className="editor">
        <Mutation key={'decline' + d.status} endpoint="photo-checks" onSaved={saved} label={d.status === 'pending' ? 'Decline' : 'Remove the ✓'} tone="danger"
          values={f => ({ id, action: d.status === 'pending' ? 'reject' : 'revoke', note: f.get('note') })}>
          <label>Reason the member sees<select name="note">{declineReasons.map(r => <option key={r} value={r}>{r}</option>)}</select></label></Mutation></div></details>}
    </div>}
  </section>;
}

export function Teachers() {
  const [status, setStatus] = useState('pending'); const [selected, setSelected] = useState<string | null>(null);
  const resource = useResource<TeacherRow[]>('/api/manage/teachers?status=' + status);
  return <>
    <div className="toolbar spread"><Segmented label="Status" value={status} onChange={v => { setStatus(v); setSelected(null); }} options={teacherStatuses}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Teacher', 'Area', status === 'pending' ? 'Applied' : 'Decided', 'Classes', 'Reports']} empty="No teachers"
      rows={resource.data.map(r => [<button type="button" className="link" key="open" onClick={() => setSelected(r.id)}>{r.display_name || r.username}</button>, r.area || '—',
        date(status === 'pending' ? r.applied_at : r.decided_at), String(r.classes), r.reports ? <span key="r" className="badge warn">{r.reports}</span> : '0'])}/></div>}
    {selected && <TeacherDetail key={selected} id={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function TeacherDetail({ id, onSaved, onClose }: { id: string; onSaved: () => void; onClose: () => void }) {
  const resource = useResource<Teacher>('/api/manage/teachers?id=' + encodeURIComponent(id)), d = resource.data;
  const saved = () => { resource.reload(); onSaved(); };
  const t = d?.teacher, decisions = !t ? [] : t.status === 'pending' ? [['approve', 'Approve'], ['reject', 'Decline']] : t.status === 'rejected' ? [['approve', 'Approve']]
    : t.status === 'approved' ? [['suspend', 'Suspend']] : [['reinstate', 'Reinstate']];
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{t?.display_name || 'Teacher'}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {d && t && <div className="stack">
      <div className="row badges"><span className={badge(t.status)}>{t.status === 'rejected' ? 'declined' : t.status}</span>{!!t.reports && <span className="badge warn">{t.reports} open reports</span>}</div>
      <ul className="list inset">{([['Account', `${t.username} · ${t.account_name}`], ['Area', t.area], ['Experience', t.experience], ['Teaches', t.teaches], ['Applied', date(t.applied_at)],
        ['Decision', t.decided_at ? `${date(t.decided_at)}${t.decided_email ? ' · ' + t.decided_email : ''}` : '—'], ['Reason given', t.reason]] as const)
        .map(([k, v]) => <li key={k}><span>{k}</span><span className="value">{String(v || '—')}</span></li>)}</ul>
      <div className="editor"><Mutation key={'decide' + t.status} endpoint="teachers" onSaved={saved} label="Apply" tone={['suspend', 'reject'].includes(decisions[0]?.[0] ?? '') ? 'danger' : 'primary'}
        values={f => ({ id, action: f.get('action'), note: f.get('note') })}>
        <label>Decision<select name="action">{decisions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Reason the teacher sees (needed to decline or suspend)<textarea name="note" rows={2} maxLength={300}/></label></Mutation></div>
      <h3>Classes</h3><Table headings={['When', 'Class', 'Seats', 'Status', '']} empty="No classes" rows={d.classes.map(c => [date(c.starts), c.title, `${c.taken} of ${c.seats}`,
        <span key="s" className={badge(c.hidden_at ? 'suspended' : c.status === 'posted' ? 'approved' : '')}>{c.hidden_at ? 'hidden' : c.status}</span>,
        <details key="a"><summary>{c.hidden_at ? 'Restore' : 'Hide'}</summary><Mutation endpoint="teachers" onSaved={saved} label={c.hidden_at ? 'Restore' : 'Hide'} tone={c.hidden_at ? 'primary' : 'danger'}
          values={f => ({ id, action: c.hidden_at ? 'restore_class' : 'hide_class', classId: c.id, note: f.get('note') })}>
          {!c.hidden_at && <label>Reason<textarea name="note" rows={2} maxLength={300}/></label>}</Mutation></details>])}/>
    </div>}
  </section>;
}
