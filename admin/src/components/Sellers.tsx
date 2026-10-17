'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation, Table } from './Primitives';

type Row = { id:string; trading_name:string; area:string; status:string; opened_at:string|null; username:string; reports:number };
type Seller = Record<string, string|number|boolean|null> & { user_id:string; status:string; trading_name:string };
type Detail = { seller:Seller; listings:{ id:string; name:string; kind:string; status:string; removed_reason:string; updated_at:string }[];
  orders:{ open:number; completed:number; disputed:number }; reports:{ id:string; title:string; status:string; created_at:string }[] };
const statuses = ['active','suspended','removed','draft'];
const kind = (value: string) => value === 'prepacked' ? 'Sealed pack' : 'Home-cooked';
const badge = (status: string) => 'badge ' + (status === 'active' ? 'good' : ['suspended','removed'].includes(status) ? 'warn' : '');

export default function Sellers() {
  const [status,setStatus] = useState('active'); const [selected,setSelected] = useState<string | null>(null);
  const resource = useResource<Row[]>('/api/manage/sellers?status=' + status);
  return <><div className="notice">Any member can open a shop and list food without a check. Review reports, then remove items or suspend shops that break Market rules. Never describe a seller as checked or SFA-approved.</div>
    <div className="row spread"><label>Status<select value={status} onChange={e => { setStatus(e.target.value); setSelected(null); }}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><button onClick={resource.reload}>Refresh</button></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Shop','Area','Status','Opened','Open reports']} empty="No shops in this state."
      rows={resource.data.map(r => [<button key="open" onClick={() => setSelected(r.id)}>{r.trading_name || r.username}</button>, r.area || '—', <span key="s" className={badge(r.status)}>{r.status}</span>, date(r.opened_at), r.reports ? <span key="r" className="badge warn">{r.reports}</span> : '0'])}/></div>}
    {selected && <SellerDetail key={selected} id={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function Facts({ seller }: { seller: Seller }) {
  const rows: [string, unknown][] = [['Account', `${seller.username} · ${seller.account_name}`], ['Area', seller.area], ['About', seller.about],
    ['Collection', [seller.meetup && 'Meetup', seller.delivery && `Delivery (${seller.delivery_areas})`].filter(Boolean).join(' · ')],
    ['Payment at handover', [seller.pay_cash && 'Cash', seller.pay_paynow && 'PayNow'].filter(Boolean).join(' · ')],
    ['Declarations', seller.declared_at ? `Version ${seller.declarations_version}, ${date(seller.declared_at as string)}` : 'Not accepted'],
    ['Opened', seller.opened_at ? date(seller.opened_at as string) : '—'], ['Status note', seller.status_note || '—']];
  return <Table headings={['Field','Value']} rows={rows.map(([k, v]) => [k, String(v ?? '—')])}/>;
}
function SellerDetail({ id, onSaved, onClose }: { id:string; onSaved:()=>void; onClose:()=>void }) {
  const resource = useResource<Detail>('/api/manage/sellers?id=' + encodeURIComponent(id)), d = resource.data;
  const saved = () => { resource.reload(); onSaved(); };
  return <section className="panel"><div className="row spread"><h2>{d?.seller.trading_name || 'Seller'}</h2><button onClick={onClose}>Close</button></div><Feedback {...resource} retry={resource.reload}/>
    {d && <div className="stack"><p><span className={badge(d.seller.status)}>{d.seller.status}</span> · Orders: {d.orders.open} open, {d.orders.completed} completed, {d.orders.disputed} disputed</p>
      <Facts seller={d.seller}/>
      <h3>Reports</h3><Table headings={['When','Report','Case status']} empty="No reports about this shop, its items or its orders."
        rows={d.reports.map(r => [date(r.created_at), r.title, r.status])}/>
      <details><summary>Shop decision</summary><Mutation key={'decide' + d.seller.status} endpoint="sellers" onSaved={saved} label="Save decision" values={f => ({ id, action:f.get('action'), note:f.get('note') })}>
        <label>Action<select name="action"><option value="suspend">Suspend (cancels open orders)</option><option value="reinstate">Reinstate</option><option value="remove">Remove (cancels open orders)</option></select></label>
        <label>Note shown to the seller<textarea name="note" maxLength={300}/></label></Mutation></details>
      <h3>Items</h3><Table headings={['Item','Type','Status','Updated']} empty="No items." rows={d.listings.map(l => [l.name || 'Untitled', kind(l.kind), l.status + (l.removed_reason ? ' · ' + l.removed_reason : ''), date(l.updated_at)])}/>
      {d.listings.some(l => l.status !== 'removed') && <details><summary>Remove an item and notify buyers</summary><Mutation endpoint="sellers" onSaved={saved} label="Remove item" values={f => ({ id, action:'remove_listing', listingId:f.get('listingId'), note:f.get('note') })}>
        <label>Item<select name="listingId">{d.listings.filter(l => l.status !== 'removed').map(l => <option key={l.id} value={l.id}>{l.name || 'Untitled'}</option>)}</select></label>
        <label>Reason shown to the seller<textarea name="note" required minLength={5} maxLength={300}/></label></Mutation></details>}
    </div>}
  </section>;
}
