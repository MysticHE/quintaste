'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { date, useResource } from '../client';
import { Empty, Feedback, Segmented } from '../Primitives';
import { Icon } from '../Icon';
import { Badges, Chips, matches } from './Parts';
import PlacePanel from './PlacePanel';
import RecipePanel from './RecipePanel';
import EventPanel from './EventPanel';

type Row = { id: string; hidden: boolean; edited: boolean; newer?: boolean; updatedAt: string | null; reports?: number; [key: string]: unknown };
const STEP = 400;

/** The open item lives in the address (?id=), so a link or a reload lands on the same place, recipe or event. */
export function useSelection() {
  const [selected, setSelected] = useState<string | null>(() => typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('id'));
  const select = (id: string | null) => {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
    window.history.replaceState(null, '', url);
  };
  return [selected, select] as const;
}

export function Places() {
  const [selected, select] = useSelection(), [kitchen, setKitchen] = useState('all');
  const dirty = useRef(false), busy = useRef(false);
  const choose = (id: string | null) => { if (id === selected || busy.current) return; if (dirty.current && !window.confirm('Discard changes?')) return; dirty.current = false; select(id); };
  return <ContentList path="/api/content/places" noun="places" selected={selected} select={choose} add="Place"
    scope={<Segmented label="Kitchen" value={kitchen} onChange={setKitchen} options={[['all', 'All'], ['veg', 'Veg Kitchen'], ['mixed', 'Mixed Kitchen']]}/>}
    keep={row => kitchen === 'all' || row.kitchen === kitchen}
    filters={[['all', 'All'], ['explorer', 'QT Explorer'], ['staff', 'Staff'], ['edited', 'Edited'], ['newer', 'Newer source'], ['reported', 'Reported'], ['hidden', 'Hidden']]}
    describe={r => ({ title: String(r.name ?? r.id), meta: [r.branch, `${r.dishes} ${r.dishes === 1 ? 'dish' : 'dishes'}`].filter(Boolean).join(' · '),
      search: [r.name, r.branch, r.address], staff: r.origin === 'staff', tags: [r.kitchen === 'mixed' ? 'Mixed Kitchen' : '', r.origin === 'explorer' ? 'QT Explorer' : ''] })}
    detail={(id, changed) => <PlacePanel key={id} id={id} onChanged={changed} onDirty={v => { dirty.current = v; }} onBusy={v => { busy.current = v; }}/>}/>;
}
export function Recipes() {
  const [selected, select] = useSelection();
  const dirty = useRef(false), busy = useRef(false);
  const choose = (id: string | null) => { if (id === selected || busy.current) return; if (dirty.current && !window.confirm('Discard changes?')) return; dirty.current = false; select(id); };
  return <ContentList path="/api/content/recipes" noun="recipes" selected={selected} select={choose} add="Recipe"
    filters={[['all', 'All'], ['bundled', 'App'], ['bot', 'QT Manager'], ['staff', 'Staff'], ['member', 'Members'], ['ai', 'AI'], ['edited', 'Edited'], ['newer', 'Newer source'], ['hidden', 'Hidden'], ['deleted', 'Deleted']]}
    describe={r => ({ title: String(r.title), meta: [sourceLabel(r.source), (r.categories as string[]).join(', '), r.withdrawn ? 'Withdrawn' : '', r.restricted ? 'Author restricted' : ''].filter(Boolean).join(' · '), search: [r.title, r.categories, r.author], staff: r.source === 'staff' })}
    detail={(id, changed) => <RecipePanel key={id} id={id} onChanged={changed} onDirty={value => { dirty.current = value; }} onBusy={value => { busy.current = value; }}/>}/>;
}
export function Events() {
  const [selected, select] = useSelection();
  const dirty = useRef(false), busy = useRef(false);
  const choose = (id: string | null) => { if (id === selected || busy.current) return; if (dirty.current && !window.confirm('Discard changes?')) return; dirty.current = false; select(id); };
  return <ContentList path="/api/content/events" noun="events" selected={selected} select={choose} add="Event"
    filters={[['all', 'All'], ['upcoming', 'Upcoming'], ['bot', 'QT Manager'], ['staff', 'Staff'], ['edited', 'Edited'], ['hidden', 'Hidden']]}
    describe={r => ({ title: String(r.title), meta: [r.startsAt ? date(r.startsAt) : '', sourceLabel(r.source), r.status !== 'scheduled' ? r.status : ''].filter(Boolean).join(' · '), search: [r.title], staff: r.source === 'staff' })}
    detail={(id, changed) => <EventPanel key={id} id={id} onChanged={changed} onDirty={v => { dirty.current = v; }} onBusy={v => { busy.current = v; }}/>}/>;
}
const sourceLabel = (source: unknown) => ({ bundled: 'App', bot: 'QT Manager', staff: 'Staff', member: 'Member', ai: 'AI' } as Record<string, string>)[String(source)] ?? '';
const passes = (filter: string, row: Row) => row.deleted ? filter === 'deleted' : filter === 'deleted' ? false : ({ all: true, edited: row.edited, hidden: row.hidden, newer: !!row.newer, reported: (row.reports ?? 0) > 0,
  staff: row.origin === 'staff' || row.source === 'staff', bundled: row.source === 'bundled', bot: row.source === 'bot', member: row.source === 'member', ai: row.source === 'ai', explorer: row.origin === 'explorer',
  upcoming: typeof row.startsAt === 'string' && Date.parse(row.startsAt) > Date.now() } as Record<string, boolean>)[filter] ?? true;

function ContentList({ path, noun, filters, describe, detail, selected, select, add, scope, keep = () => true }: {
  path: string; noun: string; filters: [string, string][]; selected: string | null; select: (id: string | null) => void; add: string;
  describe: (row: Row) => { title: string; meta: string; search: unknown[]; staff: boolean; tags?: string[] };
  detail: (id: string, changed: (id?: string | null) => void) => ReactNode; scope?: ReactNode; keep?: (row: Row) => boolean;
}) {
  const resource = useResource<Row[]>(path), [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [limit, setLimit] = useState(STEP);
  const workspace = ['recipes', 'places', 'events'].includes(noun);
  const root = useRef<HTMLDivElement>(null), opened = useRef(false);
  const rows = (resource.data ?? []).filter(row => keep(row) && passes(filter, row) && matches(query, row.id, ...describe(row).search));
  useEffect(() => {
    if (!workspace || opened.current || !resource.data || !root.current) return;
    opened.current = true;
    // Open once on wide workspaces. Back, deep links and mobile selection stay explicit.
    if (!selected && rows[0] && getComputedStyle(root.current).getPropertyValue('--workspace-auto-open').trim() === '1') select(rows[0].id);
  }, [workspace, resource.data, rows, selected, select]);
  // null after a delete closes the detail; an id after a create opens it.
  const changed = (id?: string | null) => { resource.reload(); if (id === null) select(null); else if (id) select(id); };
  const counts = (resource.data ?? []).filter(keep).reduce<Record<string, number>>((n, row) => {
    for (const [id] of filters) if (passes(id, row)) n[id] = (n[id] ?? 0) + 1;
    return n;
  }, {});
  return <div ref={root} className={'content-split' + (workspace ? ' workspace-split recipe-split' : '') + (noun === 'places' ? ' place-split' : '') + (selected ? ' has-selection' : '')}>
    <section className="panel content-list" aria-label={'All ' + noun}>
      <div className="stack compact list-tools">
        <div className="row nowrap"><div className="search"><Icon name="search" size={16}/><input type="search" aria-label={'Search ' + noun} placeholder={'Search ' + noun}
          value={query} maxLength={100} onChange={e => { setQuery(e.target.value); setLimit(STEP); }}/></div>
          <button type="button" className="primary" aria-label={'New ' + add.toLowerCase()} title={'New ' + add.toLowerCase()} onClick={() => select('new')}><Icon name="plus" size={16}/>{!workspace && add}</button></div>
        {scope}
        {workspace ? <select aria-label={add + ' filter'} value={filter} onChange={e => { setFilter(e.target.value); setLimit(STEP); }}>{filters.map(([id,text]) => <option key={id} value={id}>{text}{counts[id] ? ' · '+counts[id] : ''}</option>)}</select>
          : <Chips label="Filter" value={filter} onChange={v => { setFilter(v); setLimit(STEP); }} options={filters.filter(([id]) => id === 'all' || counts[id]).map(([id, text]) => [id, text, id === 'all' ? undefined : counts[id]])}/>}
      </div>
      <Feedback {...resource} retry={resource.reload}/>
      {resource.data && <small aria-live="polite">{rows.length.toLocaleString()} {noun}</small>}
      <ul className="items">{rows.slice(0, limit).map(row => { const d = describe(row);
        return <li key={row.id}><button type="button" className="item" aria-current={selected === row.id ? 'true' : undefined} onClick={() => select(row.id)}>
          <strong>{d.title}</strong>{d.meta && <span className="muted">{d.meta}</span>}
          {row.deleted ? <span className="badge danger">Deleted</span> : <Badges hidden={row.hidden} edited={row.edited} staff={d.staff} newer={!!row.newer} reports={row.reports ?? 0} tags={d.tags}/>}</button></li>; })}
        {rows.length > limit && <li><button type="button" className="plain more" onClick={() => setLimit(limit + STEP)}>Show {Math.min(STEP, rows.length - limit)} more</button></li>}
        {resource.data && !rows.length && <li><Empty icon="search">{query ? `No ${noun} match “${query}”` : `No ${noun} in this filter`}</Empty></li>}</ul>
    </section>
    <div className="content-detail">{selected ? <><button type="button" className="back plain" onClick={() => select(null)}><Icon name="back" size={16}/>{noun[0].toUpperCase() + noun.slice(1)}</button>{detail(selected, changed)}</>
      : <div className={workspace ? 'workspace-empty' : 'panel'}><Empty icon="content">{workspace ? (noun === 'events' ? 'Select an ' : 'Select a ') + add.toLowerCase() : `Choose one of the ${noun} to see and edit what members see`}</Empty></div>}</div>
  </div>;
}
