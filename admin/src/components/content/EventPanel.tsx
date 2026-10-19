'use client';
import { useState } from 'react';
import { optionalNumber, useResource } from '../client';
import { Feedback } from '../Primitives';
import { ActionBar, Badges, Edited, History, type Audit, type Staff } from './Parts';

type Event = { title: string; organiser: string; startsAt: string; endsAt: string | null; location: string; address: string; feeAmount: number | null;
  feeNote: string; registrationUrl: string | null; registrationDeadline: string | null; dietEvidence: string; status: string; sources: string[] };
type Detail = { id: string; source: 'bot' | 'staff'; base: Event | null; staff: Staff | null; newer: boolean; history: Audit[] };
const empty: Event = { title: '', organiser: '', startsAt: '', endsAt: null, location: '', address: '', feeAmount: null, feeNote: '', registrationUrl: null,
  registrationDeadline: null, dietEvidence: '', status: 'scheduled', sources: [] };
/** "2026-10-25T19:00:00+08:00" to the Singapore wall-clock value a datetime-local input shows. */
const local = (value: string | null) => value ? value.slice(0, 16) : '';

export default function EventPanel({ id, onChanged }: { id: string; onChanged: (id?: string | null) => void }) {
  const resource = useResource<Detail>(id === 'new' ? null : '/api/content/events?id=' + encodeURIComponent(id)), d = resource.data;
  if (id === 'new') return <EventForm detail={null} onSaved={onChanged}/>;
  return <><Feedback {...resource} retry={resource.reload}/>{d && <EventForm key={d.staff?.version ?? 0} detail={d} onSaved={next => { resource.reload(); onChanged(next); }}/>}</>;
}
function EventForm({ detail, onSaved }: { detail: Detail | null; onSaved: (id?: string | null) => void }) {
  const edited = !!detail?.staff && Object.keys(detail.staff.data).length > 1, staffMade = !detail || detail.source === 'staff';
  const start = (edited ? detail!.staff!.data : detail?.base ?? empty) as Event;
  const [e, setE] = useState({ ...start, startsAt: local(start.startsAt), endsAt: local(start.endsAt), registrationDeadline: local(start.registrationDeadline),
    fee: start.feeAmount === null ? '' : String(start.feeAmount), registrationUrl: start.registrationUrl ?? '', sources: start.sources.join('\n') });
  const set = (patch: Partial<typeof e>) => setE(v => ({ ...v, ...patch }));
  const payload = () => ({ id: detail?.id, version: detail?.staff?.version ?? 0, fields: { ...e, feeAmount: optionalNumber(e.fee, 'the fee'),
    endsAt: e.endsAt || null, registrationDeadline: e.registrationDeadline || null, registrationUrl: e.registrationUrl.trim() || null,
    sources: e.sources.split('\n').map(s => s.trim()).filter(Boolean) } });
  const actions = !detail ? [{ action: 'create', label: 'Create event', tone: 'primary' as const }] : [
    { action: 'save', label: 'Save', tone: 'primary' as const },
    detail.staff?.hidden ? { action: 'restore', label: 'Show' } : { action: 'hide', label: 'Hide', tone: 'danger' as const },
    ...(edited && !staffMade ? [{ action: 'clear', label: 'Revert', confirm: 'Revert to the original event?' }] : []),
    ...(staffMade ? [{ action: 'delete', label: 'Delete', tone: 'danger' as const, confirm: 'Delete this event?' }] : [])];
  const text = (key: 'title' | 'organiser' | 'location' | 'address' | 'feeNote', label: string, max: number) =>
    <label>{label}<input value={e[key]} maxLength={max} onChange={x => set({ [key]: x.target.value })}/></label>;
  return <div className="stack">
    <section className="panel stack">
      <div className="row spread"><div className="stack compact"><h2>{detail ? start.title : 'New event'}</h2>{detail && <span className="code">{detail.id} · {detail.source === 'bot' ? 'QT Manager' : 'Staff'}</span>}</div>
        {detail && <Badges hidden={detail.staff?.hidden} edited={edited} staff={staffMade} newer={detail.newer} extra={start.status !== 'scheduled' ? start.status : undefined}/>}</div>
      {detail && <Edited staff={detail.staff}/>}
      <div className="fields">{text('title', 'Title', 180)}{text('organiser', 'Organiser', 160)}
        <label>Starts (SGT)<input type="datetime-local" value={e.startsAt} onChange={x => set({ startsAt: x.target.value })}/></label>
        <label>Ends<input type="datetime-local" value={e.endsAt} onChange={x => set({ endsAt: x.target.value })}/></label>
        {text('location', 'Venue', 180)}{text('address', 'Address', 300)}
        <label>Fee (S$)<input value={e.fee} inputMode="decimal" onChange={x => set({ fee: x.target.value })}/></label>{text('feeNote', 'Fee note', 300)}
        <label>Registration<input value={e.registrationUrl} onChange={x => set({ registrationUrl: x.target.value })} placeholder="https://"/></label>
        <label>Closes<input type="datetime-local" value={e.registrationDeadline} onChange={x => set({ registrationDeadline: x.target.value })}/></label>
        <label>Status<select value={e.status} onChange={x => set({ status: x.target.value })}><option value="scheduled">Scheduled</option><option value="rescheduled">Rescheduled</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      <label>Diet evidence<textarea rows={2} maxLength={600} value={e.dietEvidence} onChange={x => set({ dietEvidence: x.target.value })}/></label>
      <label>Sources<textarea rows={2} value={e.sources} onChange={x => set({ sources: x.target.value })} placeholder="https://"/></label>
    </section>
    <section className="panel"><ActionBar resource="events" actions={actions} payload={payload} onDone={(result, action) => onSaved(action === 'delete' ? null : result.id)}/></section>
    {detail && <section className="panel stack"><h3>History</h3><History rows={detail.history}/></section>}
  </div>;
}
