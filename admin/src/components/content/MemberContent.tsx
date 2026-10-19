'use client';
import { useState, type ReactNode } from 'react';
import { date, useResource } from '../client';
import { Empty, Feedback, Pager, SearchField, Segmented } from '../Primitives';
import { Icon } from '../Icon';
import { ActionBar } from './Parts';

type Review = { id: string; place: string; rating: number; body: string; created_at: string; hidden_reason: string | null; username: string; photos: string[]; reports: number };
type Gathering = { id: string; title: string; area: string; venue: string; starts: string | null; seats: number; joined: number; diet: string; food: string; pay: string;
  state: string; hidden_reason: string | null; organiser: string; reports: number };
type Item = { id: string; name: string; kind: string; category: string; price_cents: number; portion: string; description: string; ingredients: string; contains: string[];
  may_contain: string[]; date_mark: string | null; status: string; removed_reason: string; updated_at: string; trading_name: string; username: string; shop_status: string; photos: string[]; reports: number };
type ShopReview = { id: string; rating: number; review: string; diet_matched: boolean | null; completed_at: string; buyer_name: string; shop: string };
const Rating = ({ value }: { value: number }) => <span className="row rating" aria-label={value + ' out of 5'}><Icon name="star" size={14} filled/>{value}</span>;

/** Status chips, a search box and a list of member posts, each with its own audited hide or restore. */
export function Moderation<T extends { id: string }>({ path, statuses, search = true, render, act }: {
  path: string; statuses: [string, string][]; search?: boolean; render: (row: T) => ReactNode; act: (row: T, status: string, done: () => void) => ReactNode;
}) {
  const [status, setStatus] = useState(statuses[0][0]), [draft, setDraft] = useState(''), [q, setQ] = useState(''), [page, setPage] = useState(0);
  const resource = useResource<T[]>(`${path}${path.includes('?') ? '&' : '?'}status=${status}&q=${encodeURIComponent(q)}&page=${page}`);
  return <section className="panel stack">
    <div className="toolbar spread"><Segmented label="Status" options={statuses} value={status} onChange={v => { setStatus(v); setPage(0); }}/>
      {search && <form className="row grow" style={{ justifyContent: 'flex-end' }} onSubmit={e => { e.preventDefault(); setQ(draft.trim()); setPage(0); }}>
        <SearchField label="Search" value={draft} onChange={setDraft} maxLength={60}/><button>Search</button></form>}</div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && (resource.data.length ? <ul className="cards">{resource.data.map(row => <li key={row.id} className="card stack">{render(row)}{act(row, status, resource.reload)}</li>)}</ul>
      : <Empty icon="content">Nothing here</Empty>)}
    {resource.data && <Pager page={page} setPage={setPage} count={resource.data.length}/>}
  </section>;
}
export const toggle = (resource: string, id: string, hidden: boolean, done: () => void, hideLabel = 'Hide', extra?: ReactNode) =>
  <details><summary>{hidden ? 'Show again' : hideLabel}</summary>
    <ActionBar resource={resource} payload={() => ({ id })} onDone={done} actions={[hidden ? { action: 'restore', label: 'Show again' } : { action: 'hide', label: hideLabel, tone: 'danger' }]}>{extra}</ActionBar></details>;

export function Reviews() {
  return <><Moderation<Review> path="/api/content/reviews" statuses={[['visible', 'Visible'], ['hidden', 'Hidden']]} render={r => <>
      <div className="row spread"><strong>{r.place}</strong>{!!r.reports && <span className="badge warn">{r.reports} {r.reports === 1 ? 'report' : 'reports'}</span>}</div>
      <div className="row"><Rating value={r.rating}/><small>{r.username} · {date(r.created_at)}</small></div>
      {r.body && <p className="detail">{r.body}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- staff view of member photos */}
      {!!r.photos.length && <div className="row thumbs">{r.photos.map(p => <img key={p} src={'/api/content/review-photo?id=' + p} alt="Review photo" width={96} height={96}/>)}</div>}
      {r.hidden_reason && <p className="muted">Hidden: {r.hidden_reason}</p>}</>}
      act={(r, status, done) => toggle('reviews', r.id, status === 'hidden', done, 'Hide review')}/></>;
}
export function Gatherings() {
  return <><Moderation<Gathering> path="/api/content/gatherings" statuses={[['upcoming', 'Upcoming'], ['past', 'Past'], ['hidden', 'Hidden']]} render={g => <>
      <div className="row spread"><strong>{g.title}</strong><span className="badge">{g.state}</span></div>
      <small>{g.starts ? date(g.starts) : '—'} · {[g.venue, g.area].filter(Boolean).join(', ')} · {g.organiser}</small>
      <div>{g.joined} of {g.seats} seats · {g.diet} · {g.food} · {g.pay}</div>
      {!!g.reports && <span className="badge warn">{g.reports} {g.reports === 1 ? 'report' : 'reports'}</span>}
      {g.hidden_reason && <p className="muted">Hidden: {g.hidden_reason}</p>}</>}
      act={(g, status, done) => toggle('gatherings', g.id, status === 'hidden', done, 'Hide gathering')}/></>;
}
export function Listings() {
  const [view, setView] = useState<'items' | 'reviews'>('items');
  return <><Segmented label="Market" options={[['items', 'Items'], ['reviews', 'Shop reviews']]} value={view} onChange={v => setView(v as 'items' | 'reviews')}/>
    {view === 'items' ? <MarketItems/> : <Moderation<ShopReview> path="/api/content/market-reviews" search={false} statuses={[['visible', 'Visible'], ['hidden', 'Hidden']]} render={r => <>
      <strong>{r.shop}</strong><div className="row"><Rating value={r.rating}/><small>{r.buyer_name} · {date(r.completed_at)}</small>{r.diet_matched === false && <span className="badge warn">Diet mismatch</span>}</div>
      <p className="detail">{r.review}</p></>} act={(r, status, done) => toggle('market-reviews', r.id, status === 'hidden', done, 'Hide review text')}/>}</>;
}
function MarketItems() {
  return <><Moderation<Item> path="/api/content/market" statuses={[['active', 'Active'], ['paused', 'Paused'], ['draft', 'Draft'], ['removed', 'Removed']]} render={i => <>
      <div className="row spread"><strong>{i.name || 'Untitled'}</strong><span>S${(i.price_cents / 100).toFixed(2)}{i.portion ? ' · ' + i.portion : ''}</span></div>
      <small>{i.trading_name || i.username} ({i.shop_status}) · {i.kind === 'prepacked' ? 'Sealed pack' : 'Home-cooked'} · {i.category} · {date(i.updated_at)}</small>
      {/* eslint-disable-next-line @next/next/no-img-element -- staff view of listing photos */}
      {!!i.photos.length && <div className="row thumbs">{i.photos.map(slot => <img key={slot} src={`/api/content/market-photo?id=${i.id}&slot=${slot}`} alt={slot + ' photo'} width={96} height={96}/>)}</div>}
      {i.description && <p className="detail">{i.description}</p>}
      <details><summary>Ingredients</summary><p className="detail">{i.ingredients || '—'}</p>
        <small>Contains: {i.contains.join(', ') || '—'} · May contain: {i.may_contain.join(', ') || '—'}{i.date_mark ? ' · ' + i.date_mark : ''}</small></details>
      {!!i.reports && <span className="badge warn">{i.reports} {i.reports === 1 ? 'report' : 'reports'}</span>}
      {i.removed_reason && <p className="muted">Removed: {i.removed_reason}</p>}</>}
      act={(i, status, done) => status === 'removed' ? toggle('market', i.id, true, done)
        : <RemoveItem id={i.id} done={done}/>}/></>;
}
function RemoveItem({ id, done }: { id: string; done: () => void }) {
  const [note, setNote] = useState('');
  return <details><summary>Remove item</summary><ActionBar resource="market" onDone={done} payload={() => ({ id, note })}
    actions={[{ action: 'remove', label: 'Remove', tone: 'danger' }]}>
    <label>Note to seller<textarea value={note} onChange={e => setNote(e.target.value)} minLength={5} maxLength={300} rows={2}/></label></ActionBar></details>;
}
