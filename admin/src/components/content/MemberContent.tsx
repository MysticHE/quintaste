'use client';
import { useState, type ReactNode } from 'react';
import { date, useResource } from '../client';
import { Feedback } from '../Primitives';
import { ActionBar } from './Parts';

type Review = { id: string; place: string; rating: number; body: string; created_at: string; hidden_reason: string | null; username: string; photos: string[]; reports: number };
type Gathering = { id: string; title: string; area: string; venue: string; starts: string | null; seats: number; joined: number; diet: string; food: string; pay: string;
  state: string; hidden_reason: string | null; organiser: string; reports: number };
type Item = { id: string; name: string; kind: string; category: string; price_cents: number; portion: string; description: string; ingredients: string; contains: string[];
  may_contain: string[]; date_mark: string | null; status: string; removed_reason: string; updated_at: string; trading_name: string; username: string; shop_status: string; photos: string[]; reports: number };
type ShopReview = { id: string; rating: number; review: string; diet_matched: boolean | null; completed_at: string; buyer_name: string; shop: string };
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Status chips, a search box and a list of member posts, each with its own audited hide or restore. */
function Moderation<T extends { id: string }>({ path, statuses, search = true, render, act }: {
  path: string; statuses: [string, string][]; search?: boolean; render: (row: T) => ReactNode; act: (row: T, status: string, done: () => void) => ReactNode;
}) {
  const [status, setStatus] = useState(statuses[0][0]), [draft, setDraft] = useState(''), [q, setQ] = useState('');
  const resource = useResource<T[]>(`${path}?status=${status}&q=${encodeURIComponent(q)}`);
  return <section className="panel stack">
    <div className="row spread"><div className="chips" role="group" aria-label="Status">{statuses.map(([value, label]) =>
      <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div>
      {search && <form className="row" onSubmit={e => { e.preventDefault(); setQ(draft); }}><label className="grow">Search<input type="search" value={draft} onChange={e => setDraft(e.target.value)}/></label><button>Search</button></form>}</div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && (resource.data.length ? <ul className="cards">{resource.data.map(row => <li key={row.id} className="card stack">{render(row)}{act(row, status, resource.reload)}</li>)}</ul>
      : <div className="empty">Nothing here.</div>)}
  </section>;
}
const toggle = (resource: string, id: string, hidden: boolean, done: () => void, hideLabel = 'Hide', extra?: ReactNode) =>
  <details><summary>{hidden ? 'Show to members again' : hideLabel}</summary>
    <ActionBar resource={resource} payload={() => ({ id })} onDone={done} actions={[hidden ? { action: 'restore', label: 'Show again' } : { action: 'hide', label: hideLabel, tone: 'danger' }]}>{extra}</ActionBar></details>;

export function Reviews() {
  return <><div className="notice">Hide a review that breaks the rules; its author still sees it. Member reviews are never edited by staff.</div>
    <Moderation<Review> path="/api/content/reviews" statuses={[['visible', 'Visible'], ['hidden', 'Hidden']]} render={r => <>
      <div className="row spread"><strong>{r.place}</strong>{!!r.reports && <span className="badge warn">{r.reports} open {r.reports === 1 ? 'report' : 'reports'}</span>}</div>
      <div><span aria-label={r.rating + ' out of 5'}>{stars(r.rating)}</span> <span className="muted">{r.username} · {date(r.created_at)}</span></div>
      {r.body && <p className="detail">{r.body}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- staff view of member photos */}
      {!!r.photos.length && <div className="row thumbs">{r.photos.map(p => <img key={p} src={'/api/content/review-photo?id=' + p} alt="Review photo" width={96} height={96}/>)}</div>}
      {r.hidden_reason && <p className="muted">Hidden: {r.hidden_reason}</p>}</>}
      act={(r, status, done) => toggle('reviews', r.id, status === 'hidden', done, 'Hide review')}/></>;
}
export function Gatherings() {
  return <><div className="notice">Hiding a gathering takes it out of Events and stops new people joining. Its organiser still sees it.</div>
    <Moderation<Gathering> path="/api/content/gatherings" statuses={[['upcoming', 'Upcoming'], ['past', 'Past or cancelled'], ['hidden', 'Hidden']]} render={g => <>
      <div className="row spread"><strong>{g.title}</strong><span className="badge">{g.state}</span></div>
      <div className="muted">{g.starts ? date(g.starts) : 'No time set'} · {[g.venue, g.area].filter(Boolean).join(', ')} · by {g.organiser}</div>
      <div>{g.joined} of {g.seats} seats · {g.diet} · {g.food} · {g.pay}</div>
      {!!g.reports && <span className="badge warn">{g.reports} open reports about the organiser</span>}
      {g.hidden_reason && <p className="muted">Hidden: {g.hidden_reason}</p>}</>}
      act={(g, status, done) => toggle('gatherings', g.id, status === 'hidden', done, 'Hide gathering')}/></>;
}
export function Market() {
  const [view, setView] = useState<'items' | 'reviews'>('items');
  return <><div className="chips" role="group" aria-label="Market content">{(['items', 'reviews'] as const).map(v =>
    <button type="button" key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'items' ? 'Items' : 'Shop reviews'}</button>)}</div>
    {view === 'items' ? <MarketItems/> : <Moderation<ShopReview> path="/api/content/market-reviews" search={false} statuses={[['visible', 'Visible'], ['hidden', 'Hidden']]} render={r => <>
      <strong>{r.shop}</strong><div><span aria-label={r.rating + ' out of 5'}>{stars(r.rating)}</span> <span className="muted">{r.buyer_name} · {date(r.completed_at)}{r.diet_matched === false ? ' · Said the diet label did not match' : ''}</span></div>
      <p className="detail">{r.review}</p></>} act={(r, status, done) => toggle('market-reviews', r.id, status === 'hidden', done, 'Hide review text')}/>}</>;
}
function MarketItems() {
  return <><div className="notice">Removing an item cancels its open orders and tells those buyers. A restored item returns paused so its seller can check it and resume it. Shops are managed in Market sellers.</div>
    <Moderation<Item> path="/api/content/market" statuses={[['active', 'Active'], ['paused', 'Paused'], ['draft', 'Drafts'], ['removed', 'Removed']]} render={i => <>
      <div className="row spread"><strong>{i.name || 'Untitled'}</strong><span>S${(i.price_cents / 100).toFixed(2)}{i.portion ? ' · ' + i.portion : ''}</span></div>
      <div className="muted">{i.trading_name || i.username} ({i.shop_status}) · {i.kind === 'prepacked' ? 'Sealed pack' : 'Home-cooked'} · {i.category} · updated {date(i.updated_at)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element -- staff view of listing photos */}
      {!!i.photos.length && <div className="row thumbs">{i.photos.map(slot => <img key={slot} src={`/api/content/market-photo?id=${i.id}&slot=${slot}`} alt={slot + ' photo'} width={96} height={96}/>)}</div>}
      {i.description && <p className="detail">{i.description}</p>}
      <details><summary>Ingredients and labels</summary><p className="detail">{i.ingredients || 'Not given'}</p>
        <p className="muted">Contains: {i.contains.join(', ') || 'none declared'} · May contain: {i.may_contain.join(', ') || 'none declared'}{i.date_mark ? ' · Date mark ' + i.date_mark : ''}</p></details>
      {!!i.reports && <span className="badge warn">{i.reports} open reports</span>}
      {i.removed_reason && <p className="muted">Removed: {i.removed_reason}</p>}</>}
      act={(i, status, done) => status === 'removed' ? toggle('market', i.id, true, done)
        : <RemoveItem id={i.id} done={done}/>}/></>;
}
function RemoveItem({ id, done }: { id: string; done: () => void }) {
  const [note, setNote] = useState('');
  return <details><summary>Remove item</summary><ActionBar resource="market" onDone={done} payload={() => ({ id, note })}
    actions={[{ action: 'remove', label: 'Remove and notify buyers', tone: 'danger' }]}>
    <label>Reason shown to the seller<textarea value={note} onChange={e => setNote(e.target.value)} minLength={5} maxLength={300} rows={2}/></label></ActionBar></details>;
}
