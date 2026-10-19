'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, Segmented, Table, reveal } from './Primitives';

type Row = { id: string; trading_name: string; area: string; status: string; opened_at: string | null; username: string; reports: number };
type Seller = Record<string, string | number | boolean | null> & { user_id: string; status: string; trading_name: string };
type Detail = { seller: Seller; listings: { id: string; name: string; kind: string; status: string; removed_reason: string; updated_at: string }[];
  orders: { open: number; completed: number; disputed: number }; reports: { id: string; title: string; status: string; created_at: string }[] };
const statuses = [['active', 'Active'], ['suspended', 'Suspended'], ['removed', 'Removed'], ['draft', 'Draft']] as const;
const kind = (value: string) => value === 'prepacked' ? 'Sealed pack' : 'Home-cooked';
const badge = (status: string) => 'badge ' + (status === 'active' ? 'good' : ['suspended', 'removed'].includes(status) ? 'warn' : '');
/** The server allows reinstating only a suspended shop; a removed shop stays removed. */
const decisionsFor = (status: string) => status === 'suspended' ? [['reinstate', 'Reinstate'], ['remove', 'Remove']]
  : status === 'removed' ? [] : [['suspend', 'Suspend'], ['remove', 'Remove']];

export default function Sellers() {
  const [status, setStatus] = useState('active'); const [selected, setSelected] = useState<string | null>(null);
  const resource = useResource<Row[]>('/api/manage/sellers?status=' + status);
  return <>
    <div className="toolbar spread"><Segmented label="Status" value={status} onChange={v => { setStatus(v); setSelected(null); }} options={statuses}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Shop', 'Area', 'Status', 'Opened', 'Reports']} empty="No shops"
      rows={resource.data.map(r => [<button type="button" className="link" key="open" onClick={() => setSelected(r.id)}>{r.trading_name || r.username}</button>, r.area || '—',
        <span key="s" className={badge(r.status)}>{r.status}</span>, date(r.opened_at), r.reports ? <span key="r" className="badge warn">{r.reports}</span> : '0'])}/></div>}
    {selected && <SellerDetail key={selected} id={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function Facts({ seller }: { seller: Seller }) {
  const rows: [string, unknown][] = [['Account', `${seller.username} · ${seller.account_name}`], ['Area', seller.area], ['About', seller.about],
    ['Collection', [seller.meetup && 'Meetup', seller.delivery && `Delivery (${seller.delivery_areas})`].filter(Boolean).join(' · ')],
    ['Payment', [seller.pay_cash && 'Cash', seller.pay_paynow && 'PayNow'].filter(Boolean).join(' · ')],
    ['Declarations', seller.declared_at ? `v${seller.declarations_version} · ${date(seller.declared_at as string)}` : 'Not accepted'],
    ['Opened', seller.opened_at ? date(seller.opened_at as string) : '—'], ['Note', seller.status_note || '—']];
  return <ul className="list inset">{rows.map(([k, v]) => <li key={k}><span>{k}</span><span className="value">{String(v || '—')}</span></li>)}</ul>;
}
function SellerDetail({ id, onSaved, onClose }: { id: string; onSaved: () => void; onClose: () => void }) {
  const resource = useResource<Detail>('/api/manage/sellers?id=' + encodeURIComponent(id)), d = resource.data;
  const saved = () => { resource.reload(); onSaved(); };
  const decisions = d ? decisionsFor(d.seller.status) : [];
  const live = d?.listings.filter(l => l.status !== 'removed') ?? [];
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{d?.seller.trading_name || 'Shop'}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {d && <div className="stack">
      <div className="row badges"><span className={badge(d.seller.status)}>{d.seller.status}</span><span className="badge">{d.orders.open} open</span>
        <span className="badge">{d.orders.completed} completed</span>{!!d.orders.disputed && <span className="badge warn">{d.orders.disputed} disputed</span>}</div>
      <Facts seller={d.seller}/>
      <h3>Reports</h3><Table headings={['When', 'Report', 'Status']} empty="No reports" rows={d.reports.map(r => [date(r.created_at), r.title, <span key="s" className="badge">{r.status}</span>])}/>
      <h3>Items</h3><Table headings={['Item', 'Type', 'Status', 'Updated']} empty="No items"
        rows={d.listings.map(l => [l.name || 'Untitled', kind(l.kind), <span key="s" className={badge(l.status)}>{l.status}</span>, date(l.updated_at)])}/>
      {!!decisions.length && <details><summary>Shop decision</summary><div className="editor"><Mutation key={'decide' + d.seller.status} endpoint="sellers" onSaved={saved} label="Apply" tone="danger"
        values={f => ({ id, action: f.get('action'), note: f.get('note') })}>
        <label>Action<select name="action">{decisions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label>Note to seller<textarea name="note" rows={2} maxLength={300}/></label></Mutation></div></details>}
      {!!live.length && <details><summary>Remove an item</summary><div className="editor"><Mutation endpoint="sellers" onSaved={saved} label="Remove item" tone="danger" reset
        values={f => ({ id, action: 'remove_listing', listingId: f.get('listingId'), note: f.get('note') })}>
        <label>Item<select name="listingId">{live.map(l => <option key={l.id} value={l.id}>{l.name || 'Untitled'}</option>)}</select></label>
        <label>Note to seller<textarea name="note" rows={2} required minLength={5} maxLength={300}/></label></Mutation></div></details>}
    </div>}
  </section>;
}
