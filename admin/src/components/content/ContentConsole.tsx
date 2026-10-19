'use client';
import { useState, type ReactNode } from 'react';
import { date, useResource } from '../client';
import { Empty, Feedback } from '../Primitives';
import { Icon } from '../Icon';
import { Badges, ListTools, matches } from './Parts';
import PlacePanel from './PlacePanel';
import RecipePanel from './RecipePanel';
import EventPanel from './EventPanel';
import { Gatherings, Market, Reviews } from './MemberContent';
import { MemberRecipes } from './MemberRecipes';

const tabs = [['places', 'Places'], ['recipes', 'Recipes'], ['member-recipes', 'Member recipes'], ['events', 'Events'], ['reviews', 'Reviews'], ['gatherings', 'Gatherings'], ['market', 'Market']] as const;
type Tab = typeof tabs[number][0];
type Row = { id: string; hidden: boolean; edited: boolean; newer?: boolean; updatedAt: string | null; reports?: number; [key: string]: unknown };

/** Staff view of everything members see: open any post, edit QuinTaste content, hide or restore anything. */
export default function ContentConsole() {
  // The console renders only after the client confirms the staff session, so the address bar is available here.
  const initial = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
  const [tab, setTab] = useState<Tab>(() => tabs.find(([id]) => id === initial?.get('tab'))?.[0] ?? 'places');
  const [selected, setSelected] = useState<string | null>(() => initial?.get('id') ?? null);
  function go(next: Tab, id: string | null) {
    setTab(next); setSelected(id);
    const url = new URL(window.location.href); url.searchParams.set('tab', next);
    if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
    window.history.replaceState(null, '', url);
  }
  const select = (id: string | null) => go(tab, id);
  return <>
    <div className="tabs" role="tablist" aria-label="Content type">{tabs.map(([id, label]) =>
      <button type="button" key={id} role="tab" aria-selected={tab === id} onClick={() => go(id, null)}>{label}</button>)}</div>
    {tab === 'places' && <ContentList key="places" path="/api/content/places" noun="places" selected={selected} select={select} add="Place"
      filters={[['all', 'All'], ['edited', 'Edited'], ['hidden', 'Hidden'], ['staff', 'Staff'], ['newer', 'Newer'], ['reported', 'Reported']]}
      describe={r => ({ title: String(r.name ?? r.id), meta: [r.branch, `${r.dishes} ${r.dishes === 1 ? 'dish' : 'dishes'}`].filter(Boolean).join(' · '), search: [r.name, r.branch, r.address], staff: r.origin === 'staff' })}
      detail={(id, changed) => <PlacePanel key={id} id={id} onChanged={changed}/>}/>}
    {tab === 'recipes' && <ContentList key="recipes" path="/api/content/recipes" noun="recipes" selected={selected} select={select} add="Recipe"
      filters={[['all', 'All'], ['bundled', 'App'], ['bot', 'QT Manager'], ['staff', 'Staff'], ['edited', 'Edited'], ['hidden', 'Hidden'], ['newer', 'Newer']]}
      describe={r => ({ title: String(r.title), meta: [sourceLabel(r.source), (r.categories as string[]).join(', '), r.withdrawn ? 'Withdrawn' : ''].filter(Boolean).join(' · '), search: [r.title, r.categories], staff: r.source === 'staff' })}
      detail={(id, changed) => <RecipePanel key={id} id={id} onChanged={changed}/>}/>}
    {tab === 'events' && <ContentList key="events" path="/api/content/events" noun="events" selected={selected} select={select} add="Event"
      filters={[['all', 'All'], ['upcoming', 'Upcoming'], ['bot', 'QT Manager'], ['staff', 'Staff'], ['edited', 'Edited'], ['hidden', 'Hidden']]}
      describe={r => ({ title: String(r.title), meta: [r.startsAt ? date(r.startsAt) : '', sourceLabel(r.source), r.status !== 'scheduled' ? r.status : ''].filter(Boolean).join(' · '), search: [r.title], staff: r.source === 'staff' })}
      detail={(id, changed) => <EventPanel key={id} id={id} onChanged={changed}/>}/>}
    {tab === 'member-recipes' && <MemberRecipes/>}
    {tab === 'reviews' && <Reviews/>}
    {tab === 'gatherings' && <Gatherings/>}
    {tab === 'market' && <Market/>}
  </>;
}
const sourceLabel = (source: unknown) => ({ bundled: 'App', bot: 'QT Manager', staff: 'Staff' } as Record<string, string>)[String(source)] ?? '';
const passes = (filter: string, row: Row) => ({ all: true, edited: row.edited, hidden: row.hidden, newer: !!row.newer, reported: (row.reports ?? 0) > 0,
  staff: row.origin === 'staff' || row.source === 'staff', bundled: row.source === 'bundled', bot: row.source === 'bot',
  upcoming: typeof row.startsAt === 'string' && Date.parse(row.startsAt) > Date.now() } as Record<string, boolean>)[filter] ?? true;

function ContentList({ path, noun, filters, describe, detail, selected, select, add }: {
  path: string; noun: string; filters: [string, string][]; selected: string | null; select: (id: string | null) => void; add: string;
  describe: (row: Row) => { title: string; meta: string; search: unknown[]; staff: boolean };
  detail: (id: string, changed: (id?: string | null) => void) => ReactNode;
}) {
  const resource = useResource<Row[]>(path), [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const rows = (resource.data ?? []).filter(row => passes(filter, row) && matches(query, row.id, ...describe(row).search));
  // null after a delete closes the detail; an id after a create opens it.
  const changed = (id?: string | null) => { resource.reload(); if (id === null) select(null); else if (id) select(id); };
  return <div className={'content-split' + (selected ? ' has-selection' : '')}>
    <section className="panel content-list" aria-label={'All ' + noun}>
      <ListTools query={query} setQuery={setQuery} filters={filters} filter={filter} setFilter={setFilter}><button type="button" className="primary" aria-label={'New ' + add.toLowerCase()} onClick={() => select('new')}><Icon name="plus" size={16}/>{add}</button></ListTools>
      <Feedback {...resource} retry={resource.reload}/>
      {resource.data && <small aria-live="polite">{rows.length > 400 ? `400 of ${rows.length}` : rows.length} {noun}</small>}
      <ul className="items">{rows.slice(0, 400).map(row => { const d = describe(row);
        return <li key={row.id}><button type="button" className="item" aria-current={selected === row.id ? 'true' : undefined} onClick={() => select(row.id)}>
          <strong>{d.title}</strong><span className="muted">{d.meta}</span>
          <Badges hidden={row.hidden} edited={row.edited} staff={d.staff} newer={!!row.newer} reports={row.reports ?? 0}/></button></li>; })}</ul>
    </section>
    <div className="content-detail">{selected ? <><button type="button" className="back plain" onClick={() => select(null)}><Icon name="back" size={16}/>{noun[0].toUpperCase() + noun.slice(1)}</button>{detail(selected, changed)}</>
      : <div className="panel"><Empty icon="content">No selection</Empty></div>}</div>
  </div>;
}
