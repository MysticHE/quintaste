'use client';
import { Fragment, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { api, date, failure, useResource } from './client';
import { Empty, Feedback, IconButton, Segmented, Switch } from './Primitives';
import { Icon } from './Icon';
import { plainNote } from '../lib/chef-names';
import { AI_SETTINGS, FEATURES, GROUPS, NEEDS, featureName, isFeature } from '../lib/features';

export type Control = { key: string; enabled: boolean; notice: string; version: number; updated_at: string };
type Rows = Map<string, Control>;
/** Day and month, with the year when it is not this year (the full time is in the tooltip). */
const shortDate = (value: string) => {
  const day = new Date(value);
  return day.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(day.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) });
};
const list = (names: string[]) => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);

/**
 * Saves one switch and holds its open panel (a note, or a confirm step). Opening a panel starts from the switch's current note,
 * so a note someone else changed meanwhile is never saved back over theirs. Shared by Features and Kitchen › Chefs.
 */
export function useControl(row: Control, onSaved: () => void) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [panel, setPanel] = useState<string | null>(null); const [note, setNote] = useState('');
  const open = (next: string | null) => { setPanel(next); setNote(plainNote(row.notice)); setError(''); };
  async function save(change: { enabled: boolean } | { mode: string }, notice = plainNote(row.notice)) {
    if (busy) return;
    setBusy(true); setError('');
    try { await api('/api/manage/controls', { key: row.key, version: row.version, notice: notice.trim(), ...change }); setPanel(null); onSaved(); }
    catch (e) { setError(failure(e)); }
    finally { setBusy(false); }
  }
  return { busy, error, save, panel, open, note, setNote };
}

/** A switch's open panel: what is about to happen, the staff note, and its action. */
export function ControlPanel({ control, label, tone = 'primary', onConfirm, children }: {
  control: ReturnType<typeof useControl>; label: string; tone?: 'primary' | 'danger'; onConfirm: () => void; children?: ReactNode }) {
  return <div className="confirm">{children}
    <input aria-label="Note for staff" placeholder="Note for staff: why, and until when" maxLength={280} value={control.note} onChange={e => control.setNote(e.target.value)}/>
    <div className="form-actions"><button type="button" onClick={() => control.open(null)}>Cancel</button>
      <button type="button" className={tone} disabled={control.busy} onClick={onConfirm}>{label}</button></div>
  </div>;
}
export const ControlError = ({ error }: { error: string }) => error ? <div className="notice error" role="alert"><Icon name="warning"/>{error}</div> : null;

/** Service switches by area (lib/features.ts). Turning one on is immediate; turning one off asks first, since members lose it at once. */
export function Controls() {
  const resource = useResource<Control[]>('/api/manage/controls');
  const rows: Rows = new Map(resource.data?.map(r => [r.key, r]));
  const placed = new Set<string>([...GROUPS.flatMap(([, keys]) => keys), ...AI_SETTINGS]);
  const groups = [...GROUPS, ['Other', resource.data?.filter(r => isFeature(r.key) && !placed.has(r.key)).map(r => r.key) ?? []] as const]
    .map(([title, keys]) => [title, keys.filter(k => rows.has(k))] as const).filter(([, keys]) => keys.length);
  return <>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && !groups.length && <div className="panel"><Empty icon="controls">No features installed</Empty></div>}
    {resource.data && groups.map(([title, keys]) => <section className="stack compact" key={title} aria-labelledby={'g-' + title}>
      <h2 id={'g-' + title} className="section-title">{title}</h2>
      <ul className="list features">{keys.map(k => <Fragment key={k}>
        <FeatureRow row={rows.get(k)!} rows={rows} onSaved={resource.reload}/>
        {k === 'ai_recipes' && <AiSettings rows={rows} onSaved={resource.reload}/>}
      </Fragment>)}</ul>
    </section>)}
  </>;
}

function FeatureRow({ row, rows, onSaved, sub }: { row: Control; rows: Rows; onSaved: () => void; sub?: boolean }) {
  const control = useControl(row, onSaved), { busy, error, save, panel, open } = control;
  const name = featureName(row.key), effect = FEATURES[row.key]?.effect ?? '', current = plainNote(row.notice);
  const waiting = (NEEDS[row.key] ?? []).filter(k => rows.get(k)?.enabled === false);
  // Features that need this one and are on now: they stop with it (the server checks every switch they need).
  const stops = Object.entries(NEEDS).filter(([k, needs]) => needs.includes(row.key) && rows.get(k)?.enabled).map(([k]) => featureName(k));
  return <li className={['feature', sub && 'sub', panel && 'open'].filter(Boolean).join(' ')}>
    <div className="feature-row">
      <span className="label grow"><strong>{name}</strong><small>{effect}</small>{current && <small className="note">{current}</small>}</span>
      {row.enabled && waiting.length > 0 && <span className="badge warn">Waits for {list(waiting.map(featureName))}</span>}
      <time className="changed" dateTime={row.updated_at} title={'Changed ' + date(row.updated_at)}>{shortDate(row.updated_at)}</time>
      <IconButton icon="edit" label={'Note on ' + name} onClick={() => open(panel === 'note' ? null : 'note')}/>
      <Switch on={row.enabled} label={name} busy={busy} onChange={on => on ? save({ enabled: true }) : open('off')}/>
    </div>
    {panel === 'off' && <ControlPanel control={control} label="Turn off" tone="danger" onConfirm={() => save({ enabled: false }, control.note)}>
      <span className="label"><strong>Turn off {name}?</strong><small>{effect}. Members lose this at once.</small>
        {stops.length > 0 && <small className="tag">Also stops {list(stops)}.</small>}</span>
    </ControlPanel>}
    {panel === 'note' && <ControlPanel control={control} label="Save note" onConfirm={() => save({ enabled: row.enabled }, control.note)}/>}
    <ControlError error={error}/>
  </li>;
}

/** AI recipes' own settings, under it: which engine writes, Wanted recipes, and the daily limit kept on the AI recipes page. */
function AiSettings({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const engine = rows.get('ai_recipes_bots'), demand = rows.get('recipe_demand'), daily = /daily=(\d+)/.exec(rows.get('ai_recipes')?.notice ?? '')?.[1];
  return <>
    {engine && <EngineRow row={engine} onSaved={onSaved}/>}
    {demand && <FeatureRow row={demand} rows={rows} onSaved={onSaved} sub/>}
    <li className="feature sub"><div className="feature-row">
      <span className="label grow"><strong>Daily limit</strong><small>{daily ? `${daily} AI recipes a day across all members` : 'AI recipes a day across all members'}</small></span>
      <Link className="button plain" href="/console/ai-recipes">Change<Icon name="forward" size={14}/></Link>
    </div></li>
  </>;
}

function EngineRow({ row, onSaved }: { row: Control; onSaved: () => void }) {
  const { busy, error, save } = useControl(row, onSaved);
  return <li className="feature sub"><div className="feature-row">
    <span className="label grow"><strong>Written by</strong><small>No fallback: a failed recipe fails</small></span>
    <span aria-busy={busy || undefined}><Segmented label="Written by" value={row.enabled ? 'bots' : 'gemini'}
      options={[['gemini', 'Gemini'], ['bots', 'QT bots']]} onChange={v => { if ((v === 'bots') !== row.enabled) save({ enabled: v === 'bots' }); }}/></span>
  </div><ControlError error={error}/></li>;
}
