'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, date, failure, useResource } from '../client';
import { Empty, Feedback, IconButton, Pager, SearchField } from '../Primitives';
import { Icon } from '../Icon';
import { RecipeDialog } from './RecipeDialog';
import { useSelection } from './ContentConsole';

type Slot = { key: string; label: string; accepts: string[]; optional?: boolean };
type Stage = { slots: Slot[]; secs: number; hint: string; band?: [number, number]; scorchSecs?: number };
type Pack = { techniques: string[]; items: { id: string; name: string; tags?: string[] }[];
  dishes: { id: string; name: string; remember: string; parts: { id: string; name: string; station: string; stages: Stage[] }[] }[] };
type Level = { id: string; recipe_id: string; recipe_revision: number; status: string; created_at: string; reviewed_at: string | null; reviewed_by: string | null;
  owner: string | null; pack: Pack; unpictured: number; plays: number;
  ratings: { tier: string; rating: number; rd: number; start: number | null; players: number; clears: number; locked: boolean }[] };
type Picture = { id: string; width: number; height: number; status: string; created_at: string; reviewed_by: string | null; prompt: string | null; model: string | null;
  checks: Record<string, unknown> | null; art_key: string | null; kind: string | null; subject: string | null; current: boolean };
type MakeRecipe = { id: string; title: string; source: string; level: string | null; job: string | null };
type LevelJob = { id: string; recipe_id: string; title: string | null; cuisine: string | null; requested_by: string; status: string; attempts: number; message: string; pack: string | null;
  usage: { input?: number; output?: number }; created_at: string; finished_at: string | null };
type Job = { id: string; art_key: string; kind: string; subject: string; details: string; status: string; attempts: number; error: string; created_at: string; drafts: number };
type Cafe = { id: string; name: string; host: string; open: boolean; hidden_at: string | null; hidden_reason: string | null; opened_at: string | null; dishes: string[]; week: number; reports: number };
type MakeData = { recipes: MakeRecipe[]; jobs: LevelJob[]; ownMissing: boolean; running: boolean };
type View = 'levels' | 'make' | 'pictures' | 'jobs' | 'cafes';
type Row = { id: string; title: string; meta: string; status: string; kind: 'level' | 'picture' | 'recipe' | 'level-job' | 'job' | 'cafe'; data: Level | Picture | MakeRecipe | LevelJob | Job | Cafe };
type Action = { action: string; label: string; danger?: boolean; confirm?: string };
type Guards = { onDirty: (v: boolean) => void; onBusy: (v: boolean) => void };
const views: [View, string][] = [['levels', 'Levels'], ['make', 'Make levels'], ['pictures', 'Pictures'], ['jobs', 'Picture jobs'], ['cafes', 'Cafés']];
const filters: Record<View, [string, string][]> = { levels: [['review', 'Needs review'], ['ready', 'Live'], ['hidden', 'Hidden']], make: [], pictures: [['draft', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Set aside']], jobs: [['jobs', 'Open and failed']], cafes: [['open', 'Open'], ['hidden', 'Hidden'], ['closed', 'Closed']] };
const resources: Record<View, string> = { levels: 'game-levels', make: 'game-level-jobs', pictures: 'game-pictures', jobs: 'game-pictures', cafes: 'game-cafes' };
const TIER: Record<string, string> = { learn: 'Learn', service: 'Service', memory: 'From memory' };
const LEVEL: Record<string, string> = { review: 'Level waiting for review', ready: 'Level live', hidden: 'Level hidden' };
const JOB: Record<string, string> = { queued: 'Compiling', waiting: 'Waiting for QT Gamer', claimed: 'QT Gamer is shaping it', answered: 'Checking', done: 'Made', failed: 'Failed' };
const STATION: Record<string, string> = { pan: 'Wok', pot: 'Soup pot', rice: 'Rice cooker', board: 'Assembly board', dessert: 'Dessert pot', blender: 'Blender', steamer: 'Steamer', oven: 'Oven', griddle: 'Griddle', fryer: 'Fryer', dough: 'Dough board', fridge: 'Fridge' };
const words = (id: string) => { const s = id.replace(/-[ab]$/, '').replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
const params = () => typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
function updateUrl(patch: Record<string, string | null>) { const url = new URL(window.location.href); for (const [key, value] of Object.entries(patch)) { if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value); } window.history.replaceState(null, '', url); }
const facts = (rows: [string, ReactNode][]) => <dl className="game-facts">{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? '—'}</dd></div>)}</dl>;

/** One workspace for immutable level review, compilation, art review and café moderation. */
export function GameLevels() {
  const [view, setView] = useState<View>(() => views.find(([id]) => id === params().get('view'))?.[0] ?? 'levels');
  const dirty = useRef(false), busy = useRef(false);
  const choose = (next: View) => { if (next === view || busy.current) return; if (dirty.current && !window.confirm('Discard changes?')) return; dirty.current = false; updateUrl({ view: next, id: null, status: null, page: null, q: null }); setView(next); };
  return <section className="game-screen"><div className="workspace-tabs" role="tablist" aria-label="Game sections">{views.map(([id, label], i) => <button type="button" role="tab" id={'game-tab-' + id} aria-controls="game-view" aria-selected={view === id} tabIndex={view === id ? 0 : -1} key={id} onClick={() => choose(id)} onKeyDown={e => {
    const at = e.key === 'Home' ? 0 : e.key === 'End' ? views.length - 1 : e.key === 'ArrowRight' ? (i + 1) % views.length : e.key === 'ArrowLeft' ? (i + views.length - 1) % views.length : -1;
    if (at >= 0) { e.preventDefault(); choose(views[at][0]); if (!busy.current) document.getElementById('game-tab-' + views[at][0])?.focus(); }
  }}>{label}</button>)}</div><div id="game-view" role="tabpanel" aria-labelledby={'game-tab-' + view} className="game-screen">
    <GameDirectory key={view} view={view} onDirty={v => { dirty.current = v; }} onBusy={v => { busy.current = v; }}/>
  </div></section>;
}
function toRows(view: View, data: Level[] | Picture[] | Job[] | Cafe[] | MakeData): Row[] {
  if (view === 'levels') return (data as Level[]).map(l => ({ id: l.id, title: l.pack.dishes[0]?.name ?? l.recipe_id, meta: l.recipe_id, status: l.status, kind: 'level', data: l }));
  if (view === 'pictures') return (data as Picture[]).map(p => ({ id: p.id, title: p.subject ?? 'Picture', meta: [p.kind, p.current ? 'In use' : ''].filter(Boolean).join(' · '), status: p.status, kind: 'picture', data: p }));
  if (view === 'jobs') return (data as Job[]).map(j => ({ id: j.id, title: j.subject, meta: j.art_key, status: j.status, kind: 'job', data: j }));
  if (view === 'cafes') return (data as Cafe[]).map(c => ({ id: c.id, title: c.name, meta: c.host, status: c.hidden_at ? 'hidden' : c.open ? 'open' : 'closed', kind: 'cafe', data: c }));
  const m = data as MakeData;
  return [...m.recipes.map(r => ({ id: 'recipe:' + r.id, title: r.title, meta: r.source, status: r.job ? JOB[r.job] ?? r.job : r.level ? LEVEL[r.level] ?? r.level : 'Recipe', kind: 'recipe' as const, data: r })),
    ...m.jobs.map(j => ({ id: 'job:' + j.id, title: j.title ?? j.recipe_id, meta: 'Level job', status: JOB[j.status] ?? j.status, kind: 'level-job' as const, data: j }))];
}
function GameDirectory({ view, onDirty, onBusy }: { view: View } & Guards) {
  const [selected, select] = useSelection(), [status, setStatus] = useState(() => filters[view].find(([id]) => id === params().get('status'))?.[0] ?? filters[view][0]?.[0] ?? '');
  const [q, setQ] = useState(() => params().get('q') ?? ''), [draft, setDraft] = useState(q), [page, setPage] = useState(() => Math.max(0, Number(params().get('page')) || 0)), [message, setMessage] = useState('');
  const dirty = useRef(false), busy = useRef(false), root = useRef<HTMLDivElement>(null), opened = useRef(false);
  const resource = useResource<Level[] | Picture[] | Job[] | Cafe[] | MakeData>('/api/content/' + resources[view] + '?status=' + status + '&q=' + encodeURIComponent(q) + '&page=' + page + (view === 'jobs' ? '&jobs=1' : ''), true);
  const rows = useMemo(() => resource.data ? toRows(view, resource.data) : [], [view, resource.data]), row = rows.find(r => r.id === selected);
  const make = view === 'make' ? resource.data as MakeData | null : null;
  const notices = [...(make && !make.running ? ['Jobs wait until Game progress and Recipe levels are both on in Features.'] : []), ...(make?.ownMissing ? ['QuinTaste recipes are unavailable right now. Members’ recipes are below.'] : [])];
  const canLeave = () => !busy.current && (!dirty.current || window.confirm('Discard changes?'));
  const clearChoice = () => { dirty.current = false; onDirty(false); select(null); };
  const choose = (id: string | null) => { if (id === selected || !canLeave()) return; dirty.current = false; onDirty(false); select(id); };
  const search = () => { if (!canLeave()) return; clearChoice(); setQ(draft.trim()); setPage(0); updateUrl({ q: draft.trim() || null, page: null }); };
  useEffect(() => {
    if (opened.current || !resource.data || !root.current) return; opened.current = true;
    if (!selected && rows[0] && getComputedStyle(root.current).getPropertyValue('--workspace-auto-open').trim() === '1') select(rows[0].id);
  }, [resource.data, rows, selected, select]);
  const done = (note: string) => { dirty.current = false; onDirty(false); select(null); setMessage(note); resource.reload(); };
  return <><div className="game-notice" role="status">{message}</div>
    <div ref={root} className={'content-split workspace-split game-split' + (selected ? ' has-selection' : '')}>
      <section className="panel content-list" aria-label="Game directory"><div className="stack compact list-tools">
        {!['pictures', 'jobs'].includes(view) && <form className="game-search" onSubmit={e => { e.preventDefault(); search(); }}><SearchField label={view === 'make' ? 'Find a recipe' : 'Search'} value={draft} onChange={setDraft} maxLength={60}/><IconButton icon="search" label="Search records" onClick={search}/></form>}
        {!!filters[view].length && <select aria-label="Status filter" value={status} onChange={e => { if (!canLeave()) return; clearChoice(); setStatus(e.target.value); setPage(0); updateUrl({ status: e.target.value, page: null }); }}>{filters[view].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>}
        {!!notices.length && <span className="badge warn">Service notice</span>}
      </div><Feedback {...resource} retry={resource.reload}/><ul className="items">{rows.map(r => <li key={r.id}><button type="button" className="item" aria-current={selected === r.id ? 'true' : undefined} onClick={() => choose(r.id)}><strong>{r.title}</strong><span className="muted">{r.meta}</span><span className={'badge ' + (r.status === 'failed' ? 'danger' : '')}>{r.status}</span></button></li>)}
        {resource.data && !rows.length && <li><Empty icon="content">{view === 'make' ? 'No recipes or level jobs' : 'Nothing here'}</Empty></li>}</ul>
        {resource.data && view !== 'make' && <Pager page={page} count={rows.length} setPage={next => { if (!canLeave()) return; clearChoice(); setPage(next); updateUrl({ page: String(next) }); }}/>}</section>
      <div className="content-detail">{selected ? <><button type="button" className="back plain" onClick={() => choose(null)}><Icon name="back"/>Back</button>{row ? <GameRecord key={row.id} row={row} notices={notices} refreshing={resource.refreshing} onDone={done} onDirty={v => { dirty.current = v; onDirty(v); }} onBusy={v => { busy.current = v; onBusy(v); }}/>
        : <div className="workspace-empty"><Empty icon="content">This item is not in this view.</Empty></div>}</> : <div className="workspace-empty"><Empty icon="content">Select an item</Empty></div>}</div>
    </div></>;
}
function GameRecord({ row, notices, refreshing, onDone, onDirty, onBusy }: { row: Row; notices: string[]; refreshing: boolean; onDone: (note: string) => void } & Guards) {
  const [panel, setPanel] = useState('Details'), [focus, setFocus] = useState(''), [directory, setDirectory] = useState(true);
  const sections: { name: string; body: ReactNode }[] = []; let actions: ReactNode = null;
  const mutation = (resource: string, payload: Record<string, unknown>, actions: Action[], field?: { key: string; label: string; max: number; initial?: string; placeholder?: string }) =>
    <GameMutation resource={resource} payload={payload} actions={actions} field={field} refreshing={refreshing} onDone={onDone} onDirty={onDirty} onBusy={onBusy}/>;
  if (row.kind === 'level') {
    const l = row.data as Level, name = (id: string) => l.pack.items.find(i => i.id === id)?.name ?? words(id);
    actions = mutation('game-levels', { id: l.id }, l.status === 'review' ? [{ action: 'approve', label: 'Approve' }, { action: 'hide', label: 'Hide', danger: true, confirm: 'Hide level?' }]
      : l.status === 'ready' ? [...(l.owner ? [{ action: 'public', label: 'Make public', confirm: 'Make level public?' }] : []), { action: 'hide', label: 'Hide', danger: true, confirm: 'Hide level?' }] : [{ action: 'restore', label: 'Show again' }]);
    sections.push({ name: 'Details', body: <>{facts([['Recipe', l.recipe_id], ['Revision', l.recipe_revision], ['Visibility', l.owner ? 'Private · ' + l.owner : 'Public'], ['Stations', l.pack.techniques.map(t => STATION[t] ?? t).join(', ')], ['Plays', l.plays], ['Created', date(l.created_at)], ['Reviewed', date(l.reviewed_at)], ['Reviewed by', l.reviewed_by]])}
      {l.unpictured > 0 && <span className="badge warn">{l.unpictured} without a picture</span>}{l.pack.dishes.map(d => <p key={d.id}>{d.remember}</p>)}{l.ratings.map(r => <div className="game-stage" key={r.tier}><strong>{TIER[r.tier] ?? r.tier}</strong><span>{r.rating} ±{r.rd}</span><small>{r.players ? r.clears + '/' + r.players + ' cleared' : r.start !== null ? 'Test player' : 'No players'}{r.locked ? ' · settled' : ''}</small></div>)}</> },
      { name: 'Stages', body: <>{l.pack.dishes.map(d => d.parts.map(p => <div className="game-stage" key={d.id + ':' + p.id}><h3>{p.name} · {STATION[p.station] ?? p.station}</h3><ol>{p.stages.map((s, n) => <li key={n}>{s.slots.map(x => <div key={x.key}>{x.label}{x.optional ? ' (optional)' : ''}: {x.accepts.map(name).join(' or ')}</div>)}<small>{s.secs} s{s.band ? ' · heat ' + Math.round(s.band[0] * 100) + '–' + Math.round(s.band[1] * 100) + '%' : ''}{s.scorchSecs ? ' · burns fast (' + s.scorchSecs + ' s)' : ''}</small>{s.hint && <p>{s.hint}</p>}</li>)}</ol></div>))}</> },
      { name: 'Ingredients', body: l.pack.items.length ? <ul>{l.pack.items.map(i => <li key={i.id}>{i.name}{i.tags?.length ? ' (' + i.tags.join(', ') + ')' : ''}</li>)}</ul> : <p>No new ingredients</p> });
  } else if (row.kind === 'picture') {
    const p = row.data as Picture;
    actions = p.status === 'draft' ? mutation('game-pictures', { id: p.id }, [{ action: 'approve', label: 'Approve' }, { action: 'reject', label: 'Set aside', danger: true }]) : null;
    sections.push({ name: 'Details', body: <>{facts([['Art key', p.art_key], ['Kind', p.kind], ['Size', p.width + ' × ' + p.height], ['Created', date(p.created_at)], ['Model', p.model], ['Reviewed by', p.reviewed_by]])}{p.current && <span className="badge good">In use</span>}{p.prompt && <><h3>Prompt</h3><p>{p.prompt}</p></>}
      {p.status !== 'draft' && p.art_key && mutation('game-pictures', { artKey: p.art_key }, [{ action: 'redo', label: 'Draw again' }], { key: 'details', label: 'Notes for QT Gamer', max: 400, placeholder: 'What to change' })}</> }, { name: 'Picture', body: <GamePicture id={p.id} subject={p.subject ?? 'Picture'}/> });
  } else if (row.kind === 'recipe') {
    const r = row.data as MakeRecipe;
    sections.push({ name: 'Details', body: facts([['Recipe', r.id], ['Source', r.source], ['Level', r.level ? LEVEL[r.level] ?? r.level : 'Not made'], ['Job', r.job ? JOB[r.job] ?? r.job : 'None']]) },
      { name: 'Make level', body: r.job ? <p>{JOB[r.job] ?? r.job}</p> : mutation('game-level-jobs', { recipeId: r.id }, [{ action: 'make', label: 'Make a level' }], { key: 'cuisine', label: 'Shelf', max: 40, placeholder: 'Cuisine, such as Malay' }) });
  } else if (row.kind === 'level-job') {
    const j = row.data as LevelJob;
    sections.push({ name: 'Details', body: <>{facts([['Recipe', j.recipe_id], ['Shelf', j.cuisine], ['Requested by', j.requested_by], ['Created', date(j.created_at)], ['Finished', date(j.finished_at)], ['Claims', j.attempts], ['Tokens', ((j.usage?.input ?? 0) + (j.usage?.output ?? 0)).toLocaleString()]])}{j.message && <p className={j.status === 'failed' ? 'notice error' : ''}>{j.message}</p>}</> });
    if (j.status === 'failed') sections.push({ name: 'Retry', body: mutation('game-level-jobs', { recipeId: j.recipe_id }, [{ action: 'make', label: 'Try again' }], { key: 'cuisine', label: 'Shelf', max: 40, initial: j.cuisine ?? '' }) });
  } else if (row.kind === 'job') {
    const j = row.data as Job;
    sections.push({ name: 'Details', body: <>{facts([['Art key', j.art_key], ['Kind', j.kind], ['Created', date(j.created_at)], ['Attempts', j.attempts], ['Drafts', j.drafts]])}{j.details && <p>{j.details}</p>}{j.error && <p className="notice error">{j.error}</p>}</> });
    if (j.status === 'failed') sections.push({ name: 'Draw again', body: mutation('game-pictures', { artKey: j.art_key }, [{ action: 'redo', label: 'Draw again' }], { key: 'details', label: 'Notes for QT Gamer', max: 400, placeholder: 'What to change' }) });
  } else {
    const c = row.data as Cafe;
    actions = mutation('game-cafes', { id: c.id }, c.hidden_at ? [{ action: 'restore', label: 'Restore' }] : [{ action: 'hide', label: 'Hide', danger: true, confirm: 'Hide café?' }]);
    sections.push({ name: 'Details', body: <>{facts([['Host', c.host], ['Visits this week', c.week], ['Opened', date(c.opened_at)], ['Open reports', c.reports]])}{c.hidden_reason && <p>Hidden: {c.hidden_reason}</p>}</> }, { name: 'Menu', body: c.dishes.length ? <ul>{c.dishes.map((d, i) => <li key={i}>{d}</li>)}</ul> : <p>No dishes on the menu</p> });
  }
  if (notices.length) sections[0].body = <>{notices.map(note => <p className="notice" key={note}>{note}</p>)}{sections[0].body}</>;
  const current = sections.some(s => s.name === panel) ? panel : sections[0].name;
  return <div className="workspace-editor game-editor" data-directory={directory ? 'shown' : 'hidden'}>
    <header className="workspace-editor-head"><div className="workspace-heading"><div className="grow"><h2 className="workspace-title">{row.title}</h2><div className="row workspace-meta"><span className="badge">{row.status}</span></div></div><div className="row workspace-actions">
      <IconButton icon="content" label="Toggle game list" onClick={() => { const split = document.querySelector('.game-split'); if (split && getComputedStyle(split).getPropertyValue('--workspace-directory-overlay').trim() === '1') document.querySelector<HTMLButtonElement>('.game-split .back')?.click(); else setDirectory(!directory); }}/>{actions}</div></div></header>
    <div className="workspace-page"><div className="workspace-mobile-tabs">{sections.map(s => <button type="button" key={s.name} aria-pressed={current === s.name} onClick={() => { setPanel(s.name); setFocus(''); }}>{s.name}</button>)}</div>
      <div className={'workspace-columns game-columns' + (sections.length === 2 ? ' is-pair' : sections.length === 1 ? ' is-single' : '') + (focus ? ' has-expanded' : '')}>{sections.map(s => <section key={s.name} className={'workspace-panel' + (current === s.name ? ' mobile-selected' : '') + (focus === s.name ? ' expanded' : '')} aria-label={s.name}><header><h3>{s.name}</h3><IconButton icon="external" label={(focus === s.name ? 'Restore ' : 'Expand ') + s.name.toLowerCase()} onClick={() => { setFocus(focus === s.name ? '' : s.name); setPanel(s.name); }}/></header><div className="workspace-panel-body" tabIndex={0}><div className="game-fields">{s.body}</div></div></section>)}</div>
    </div>
  </div>;
}
function GamePicture({ id, subject }: { id: string; subject: string }) {
  const [failed, setFailed] = useState(false), [version, setVersion] = useState(0), [preview, setPreview] = useState(false);
  // eslint-disable-next-line @next/next/no-img-element -- authenticated review asset
  const img = () => <img key={version} src={'/api/content/game-picture?id=' + encodeURIComponent(id)} alt={'Picture of ' + subject} onError={() => setFailed(true)}/>;
  return <div className="game-picture">{!failed && img()}{failed ? <div className="notice error" role="alert">Could not load picture.<button type="button" onClick={() => { setFailed(false); setVersion(v => v + 1); }}>Try again</button></div> : <button type="button" onClick={() => setPreview(true)}>Preview picture</button>}
    {preview && <RecipeDialog title={subject} onClose={() => setPreview(false)}><div className="game-picture">{img()}</div></RecipeDialog>}
  </div>;
}
function GameMutation({ resource, payload, actions, field, refreshing, onDone, onDirty, onBusy }: { resource: string; payload: Record<string, unknown>; actions: Action[]; field?: { key: string; label: string; max: number; initial?: string; placeholder?: string }; refreshing: boolean; onDone: (note: string) => void } & Guards) {
  const [value, setValue] = useState(field?.initial ?? ''), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState(''), [confirm, setConfirm] = useState<Action | null>(null);
  const locked = !!busy || refreshing, running = useRef(false);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => { onBusy(locked); return () => onBusy(false); }, [locked, onBusy]);
  useEffect(() => {
    if (!dirty && !locked) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const navigate = (e: MouseEvent) => { const target = e.target as Element, link = target.closest('a[href]'); if (((link && !link.hasAttribute('target')) || target.closest('button[aria-label="Sign out"]')) && (locked || !window.confirm('Discard changes?'))) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true); return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, locked]);
  async function run(item: Action) { if (locked || running.current) return; running.current = true; setBusy(item.action); setError(''); try { const result = await api<{ note?: string }>('/api/content/' + resource, { ...payload, action: item.action, ...(field ? { [field.key]: field.key === 'cuisine' ? value.trim() : value } : {}) }); setDirty(false); onDirty(false); setConfirm(null); onDone(result.note || 'Saved'); } catch (problem) { setError(failure(problem)); } finally { running.current = false; setBusy(''); } }
  const ask = (item: Action) => { if (item.confirm) setConfirm(item); else void run(item); };
  return <form className="game-fields" aria-busy={locked} onSubmit={e => { e.preventDefault(); ask(actions[0]); }}>{field && <label>{field.label}<input aria-label={field.label} value={value} maxLength={field.max} disabled={locked} placeholder={field.placeholder} onChange={e => { setValue(e.target.value); setDirty(true); }}/></label>}
    {dirty && <small role="status">Unsaved</small>}{error && !confirm && <div className="notice error" role="alert">{error}</div>}<div className="row">{actions.map(item => <button type="button" key={item.action} className={item.danger ? 'danger' : ''} disabled={locked} onClick={() => ask(item)}>{busy === item.action ? 'Saving…' : item.label}</button>)}</div>
    {confirm && <RecipeDialog title={confirm.confirm!} onClose={() => { if (!locked) setConfirm(null); }} actions={<><button type="button" disabled={locked} onClick={() => setConfirm(null)}>Cancel</button><button type="button" disabled={locked} className={confirm.danger ? 'danger' : 'primary'} onClick={() => void run(confirm)}>{confirm.label}</button></>}>
      {error && <div className="notice error" role="alert">{error}</div>}
    </RecipeDialog>}
  </form>;
}
