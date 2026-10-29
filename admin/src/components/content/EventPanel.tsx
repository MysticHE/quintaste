'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { api, failure, optionalNumber, useResource } from '../client';
import { Feedback, IconButton } from '../Primitives';
import { Badges, Edited, History, type Audit, type Staff } from './Parts';
import { RecipeDialog } from './RecipeDialog';

type Event = { title: string; organiser: string; startsAt: string; endsAt: string | null; location: string; address: string; feeAmount: number | null;
  feeNote: string; registrationUrl: string | null; registrationDeadline: string | null; dietEvidence: string; status: string; sources: string[] };
type Detail = { id: string; source: 'bot' | 'staff'; base: Event | null; staff: Staff | null; newer: boolean; history: Audit[] };
type Props = { id: string; onChanged: (id?: string | null) => void; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void };
const empty: Event = { title: '', organiser: '', startsAt: '', endsAt: null, location: '', address: '', feeAmount: null, feeNote: '', registrationUrl: null,
  registrationDeadline: null, dietEvidence: '', status: 'scheduled', sources: [] };
/** Preserve the source's Singapore wall-clock value. */
const local = (value: string | null) => value ? value.slice(0, 16) : '';
const panels = ['Details', 'Schedule', 'Registration'];
const tabs = ['Workspace', 'History'];

export default function EventPanel({ id, onChanged, onDirty, onBusy }: Props) {
  const resource = useResource<Detail>(id === 'new' ? null : '/api/content/events?id=' + encodeURIComponent(id));
  const [tab, setTab] = useState('Workspace');
  const detail = resource.data;
  return <><Feedback {...resource} retry={resource.reload}/>{(id === 'new' || detail) &&
    <EventForm key={id + ':' + (detail?.staff?.version ?? 0)} detail={id === 'new' ? null : detail} refreshing={resource.refreshing}
      tab={tab} setTab={setTab} onDirty={onDirty} onBusy={onBusy} onSaved={next => { resource.reload(); onChanged(next); }}/>}</>;
}
function EventForm({ detail, refreshing, tab, setTab, onDirty, onBusy, onSaved }: {
  detail: Detail | null; refreshing: boolean; tab: string; setTab: (value: string) => void;
  onDirty: Props['onDirty']; onBusy: Props['onBusy']; onSaved: Props['onChanged'];
}) {
  const edited = !!detail?.staff && Object.keys(detail.staff.data).length > 1, staffMade = !detail || detail.source === 'staff';
  const start = (edited ? detail!.staff!.data : detail?.base ?? empty) as Event;
  const [e, setE] = useState({ ...start, startsAt: local(start.startsAt), endsAt: local(start.endsAt), registrationDeadline: local(start.registrationDeadline),
    fee: start.feeAmount === null ? '' : String(start.feeAmount), registrationUrl: start.registrationUrl ?? '', sources: start.sources.join('\n') });
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(''), [panel, setPanel] = useState('Details'), [focus, setFocus] = useState(''), [directory, setDirectory] = useState(true);
  const locked = refreshing || !!busy;
  const set = (patch: Partial<typeof e>) => { setE(v => ({ ...v, ...patch })); setDirty(true); onDirty(true); setMessage(''); };
  useEffect(() => { onBusy(locked); return () => onBusy(false); }, [locked, onBusy]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !document.querySelector('dialog[open]')) {
        event.preventDefault(); document.getElementById('event-save')?.click();
      }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!dirty && !locked) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const target = event.target as Element, link = target.closest('a[href]'), signOut = target.closest('button[aria-label="Sign out"]');
      if (((link && !link.hasAttribute('target')) || signOut) && (locked || !window.confirm('Discard changes?'))) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, locked]);
  async function run(action: string) {
    if (locked) return;
    setBusy(action); onBusy(true); setError(''); setMessage('');
    try {
      const saving = action === 'save' || action === 'create';
      const result = await api<{ id?: string; note?: string }>('/api/content/events', {
        id: detail?.id, version: detail?.staff?.version ?? 0, action,
        ...(saving ? { fields: { ...e, feeAmount: optionalNumber(e.fee, 'the fee'), endsAt: e.endsAt || null,
          registrationDeadline: e.registrationDeadline || null, registrationUrl: e.registrationUrl.trim() || null,
          sources: e.sources.split('\n').map(s => s.trim()).filter(Boolean) } } : {}),
      });
      setDirty(false); onDirty(false); onBusy(false); setConfirm(''); setMessage(result.note || 'Saved');
      onSaved(action === 'delete' ? null : result.id);
    } catch (problem) { setError(failure(problem)); }
    finally { setBusy(''); }
  }
  const ask = (action: string) => { if (!dirty || window.confirm('Discard changes?')) { setError(''); setConfirm(action); } };
  const actions: Record<string, [string, string]> = { hide: ['Hide event?', 'Hide'], restore: ['Show event?', 'Show'], clear: ['Revert to the original event?', 'Revert'], delete: ['Delete this event?', 'Delete'] };
  const toggleDirectory = () => {
    const split = document.querySelector('.workspace-split');
    if (split && getComputedStyle(split).getPropertyValue('--workspace-directory-overlay').trim() === '1') document.querySelector<HTMLButtonElement>('.content-detail>.back')?.click();
    else setDirectory(!directory);
  };
  const text = (key: 'organiser' | 'location' | 'address' | 'feeNote', label: string, max: number) =>
    <label>{label}<input value={e[key]} maxLength={max} disabled={locked} onChange={x => set({ [key]: x.target.value })}/></label>;
  const column = (name: string, children: ReactNode) => <section className={'workspace-panel' + (panel === name ? ' mobile-selected' : '') + (focus === name ? ' expanded' : '')} aria-label={name}>
    <header><h2>{name}</h2><IconButton icon="external" label={(focus === name ? 'Restore ' : 'Expand ') + name.toLowerCase()} onClick={() => { setFocus(focus === name ? '' : name); setPanel(name); }}/></header>
    <div className="workspace-panel-body"><div className="event-fields">{children}</div></div>
  </section>;
  return <div className="workspace-editor event-editor" data-directory={directory ? 'shown' : 'hidden'} aria-busy={locked}>
    <header className="workspace-editor-head"><div className="workspace-heading"><div className="grow">
      <input className="workspace-title" aria-label="Event title" placeholder="New event" maxLength={180} value={e.title} disabled={locked} onChange={x => set({ title: x.target.value })}/>
      <div className="row workspace-meta"><small>{staffMade ? 'Staff' : 'QT Manager'}</small>{detail && <Badges hidden={detail.staff?.hidden} edited={edited} newer={detail.newer}/>}</div>
    </div><div className="row workspace-actions event-actions">
      <IconButton icon="content" label="Toggle events list" onClick={toggleDirectory}/>
      {detail && <button type="button" disabled={locked} onClick={() => ask(detail.staff?.hidden ? 'restore' : 'hide')}>{detail.staff?.hidden ? 'Show' : 'Hide'}</button>}
      {edited && !staffMade && <button type="button" disabled={locked} onClick={() => ask('clear')}>Revert</button>}
      {detail && staffMade && <button type="button" className="danger" disabled={locked} onClick={() => ask('delete')}>Delete</button>}
      <button type="button" id="event-save" className="primary" disabled={locked || (!!detail && !dirty)} onClick={() => void run(detail ? 'save' : 'create')}>{busy ? 'Saving…' : detail ? 'Save' : 'Create event'}</button>
    </div></div>
    <div className="workspace-tabs" role="tablist" aria-label="Event sections">{tabs.map((name, i) => <button type="button" role="tab" key={name} id={'event-tab-' + name} aria-controls={'event-page-' + name} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1}
      onClick={() => setTab(name)} onKeyDown={event => { const at = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : ['ArrowRight', 'ArrowLeft'].includes(event.key) ? (i + 1) % tabs.length : -1; if (at >= 0) { event.preventDefault(); setTab(tabs[at]); document.getElementById('event-tab-' + tabs[at])?.focus(); } }}>{name}</button>)}</div>
    </header>
    <div className="event-save-state" role="status">{locked ? 'Saving…' : dirty ? 'Unsaved' : message}</div>
    {error && !confirm && <div role="alert" className="notice error">{error}</div>}
    <div id="event-page-Workspace" role="tabpanel" aria-labelledby="event-tab-Workspace" className="workspace-page" hidden={tab !== 'Workspace'}>
      <div className="workspace-mobile-tabs">{panels.map(name => <button type="button" key={name} aria-pressed={panel === name} onClick={() => { setPanel(name); setFocus(''); }}>{name}</button>)}</div>
      <div className={'workspace-columns event-columns' + (focus ? ' has-expanded' : '')}>
        {column('Details', <>{text('organiser', 'Organiser', 160)}{text('location', 'Venue', 180)}{text('address', 'Address', 300)}
          <label>Diet evidence<textarea aria-label="Diet evidence" rows={3} maxLength={600} disabled={locked} value={e.dietEvidence} onChange={x => set({ dietEvidence: x.target.value })}/></label>
          <label>Sources<textarea aria-label="Sources" rows={3} disabled={locked} value={e.sources} onChange={x => set({ sources: x.target.value })} placeholder="https://"/></label></>)}
        {column('Schedule', <><label>Starts (SGT)<input type="datetime-local" disabled={locked} value={e.startsAt} onChange={x => set({ startsAt: x.target.value })}/></label>
          <label>Ends (SGT)<input type="datetime-local" disabled={locked} value={e.endsAt} onChange={x => set({ endsAt: x.target.value })}/></label>
          <label>Status<select disabled={locked} value={e.status} onChange={x => set({ status: x.target.value })}><option value="scheduled">Scheduled</option><option value="rescheduled">Rescheduled</option><option value="cancelled">Cancelled</option></select></label></>)}
        {column('Registration', <><label>Fee (S$)<input disabled={locked} value={e.fee} inputMode="decimal" onChange={x => set({ fee: x.target.value })}/></label>{text('feeNote', 'Fee note', 300)}
          <label>Registration URL<input disabled={locked} value={e.registrationUrl} onChange={x => set({ registrationUrl: x.target.value })} placeholder="https://"/></label>
          <label>Closes (SGT)<input type="datetime-local" disabled={locked} value={e.registrationDeadline} onChange={x => set({ registrationDeadline: x.target.value })}/></label></>)}
      </div>
    </div>
    <div id="event-page-History" role="tabpanel" aria-labelledby="event-tab-History" className="event-history" hidden={tab !== 'History'}>
      {detail && <div className="event-history-meta"><span>{detail.id}</span><Edited staff={detail.staff}/></div>}<History rows={detail?.history ?? []}/>
    </div>
    {confirm && <RecipeDialog title={actions[confirm][0]} onClose={() => { if (!locked) setConfirm(''); }} actions={<><button type="button" disabled={locked} onClick={() => setConfirm('')}>Cancel</button><button type="button" className={confirm === 'delete' ? 'danger' : 'primary'} disabled={locked} onClick={() => void run(confirm)}>{actions[confirm][1]}</button></>}>
      <strong>{e.title}</strong>{error && <div role="alert" className="notice error">{error}</div>}
    </RecipeDialog>}
  </div>;
}
