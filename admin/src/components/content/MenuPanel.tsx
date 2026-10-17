'use client';
import { useState } from 'react';
import { ActionBar, matches, money, type Staff } from './Parts';

type Price = { amount: number | null; currency: 'SGD' | 'unknown'; type: 'displayed' | 'from'; maxAmount?: number };
type Item = { id: string; name: string; category?: string; price: Price };
export type Menu = { sections: { id: string; title?: string; sourceLabel: string; items: Item[] }[] };
type Change = { name?: string; category?: string; price?: Price; hidden?: boolean };
type Data = { items?: Record<string, Change>; added?: Item[] };
const blank: Item = { id: '', name: '', category: '', price: { amount: null, currency: 'SGD', type: 'displayed' } };

/** Dishes as members see them: edit or hide packaged dishes, add staff dishes. Each change is audited separately. */
export default function MenuPanel({ placeId, menu, onSaved }: { placeId: string; menu: { base: Menu | null; staff: Staff | null; newer: boolean }; onSaved: () => void }) {
  const [query, setQuery] = useState(''), [open, setOpen] = useState<string | null>(null);
  const data = (menu.staff?.data ?? {}) as Data, changes = data.items ?? {}, added = data.added ?? [], version = menu.staff?.version ?? 0;
  const rows = (menu.base?.sections ?? []).flatMap(section => section.items.map(item => ({ key: section.id + '/' + item.id, section: section.title || section.sourceLabel, item, change: changes[section.id + '/' + item.id] })));
  const shown = rows.filter(row => matches(query, row.item.name, row.change?.name, row.item.category, row.section));
  const saved = () => { setOpen(null); onSaved(); };
  const editCount = Object.values(changes).filter(c => Object.keys(c).some(k => k !== 'hidden')).length, hiddenCount = Object.values(changes).filter(c => c.hidden).length;
  return <section className="panel stack" aria-label="Menu">
    <div className="row spread"><h3>Menu</h3><span className="muted">{rows.length} original dishes · {editCount} edited · {hiddenCount} hidden · {added.length} added</span></div>
    {menu.newer && <div className="notice">The original menu changed after the last staff edit. Staff dish changes still apply where the dish still exists.</div>}
    {!menu.base && !added.length && <div className="notice">Add at least one dish so this place appears in Explore.</div>}
    {!!rows.length && <label>Search dishes<input type="search" value={query} onChange={e => setQuery(e.target.value)}/></label>}
    <ul className="dishes">{shown.slice(0, 150).map(({ key, section, item, change }) => {
      const now = { ...item, ...change, price: change?.price ?? item.price };
      return <li key={key} className={change?.hidden ? 'muted-row' : undefined}>
        <div className="row spread"><div><strong>{now.name}</strong>{change?.name && <small className="muted"> (was {item.name})</small>}
          <div className="muted">{[now.category, section].filter(Boolean).join(' · ')}</div></div>
          <div className="row"><span>{money(now.price)}</span>{change?.hidden && <span className="badge warn">Hidden</span>}{change && !change.hidden && <span className="badge">Edited</span>}
            <button type="button" aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>{open === key ? 'Close' : 'Edit'}</button></div></div>
        {open === key && <DishEditor item={now} extra={{ key }} placeId={placeId} version={version} onSaved={saved} actions={[{ action: 'edit', label: 'Save dish', tone: 'primary' },
          change?.hidden ? { action: 'restore', label: 'Show dish again' } : { action: 'hide', label: 'Hide dish', tone: 'danger' }]}/>}
      </li>;
    })}</ul>
    {shown.length > 150 && <p className="muted">Showing 150 of {shown.length}. Search to find a dish.</p>}
    <h3>Added by QuinTaste</h3>
    <ul className="dishes">{added.map(item => <li key={item.id}>
      <div className="row spread"><div><strong>{item.name}</strong><div className="muted">{item.category}</div></div>
        <div className="row"><span>{money(item.price)}</span><button type="button" aria-expanded={open === item.id} onClick={() => setOpen(open === item.id ? null : item.id)}>{open === item.id ? 'Close' : 'Edit'}</button></div></div>
      {open === item.id && <DishEditor item={item} extra={{ dishId: item.id }} placeId={placeId} version={version} onSaved={saved}
        actions={[{ action: 'edit-added', label: 'Save dish', tone: 'primary' }, { action: 'remove-added', label: 'Remove dish', tone: 'danger' }]}/>}
    </li>)}</ul>
    {open === 'new' ? <DishEditor item={blank} extra={{}} placeId={placeId} version={version} onSaved={saved} actions={[{ action: 'add', label: 'Add dish', tone: 'primary' }]}/>
      : <div><button type="button" onClick={() => setOpen('new')}>Add a dish</button></div>}
    {menu.staff && <details><summary>Undo every dish change</summary><ActionBar resource="menus" onDone={saved} payload={() => ({ id: placeId, version })}
      actions={[{ action: 'clear', label: 'Revert menu to original', tone: 'danger', confirm: 'Remove every staff dish change and added dish?' }]}/></details>}
  </section>;
}
function DishEditor({ item, extra, placeId, version, actions, onSaved }: {
  item: Item; extra: Record<string, unknown>; placeId: string; version: number; onSaved: () => void;
  actions: { action: string; label: string; tone?: 'primary' | 'danger' }[];
}) {
  const [name, setName] = useState(item.name), [category, setCategory] = useState(item.category ?? '');
  const [amount, setAmount] = useState(item.price.amount === null ? '' : String(item.price.amount)), [max, setMax] = useState(item.price.maxAmount ? String(item.price.maxAmount) : '');
  const [type, setType] = useState(item.price.type);
  const payload = () => {
    const number = (v: string, label: string) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`Check the ${label}.`); return n; };
    return { id: placeId, version, ...extra, item: { name, category, price: { amount: amount.trim() ? number(amount, 'price') : null, currency: 'SGD', type,
      ...(max.trim() ? { maxAmount: number(max, 'highest price') } : {}) } } };
  };
  return <div className="editor stack"><div className="fields">
    <label>Dish name<input value={name} maxLength={300} onChange={e => setName(e.target.value)}/></label>
    <label>Category<input value={category} maxLength={100} onChange={e => setCategory(e.target.value)}/></label>
    <label>Price (S$, empty if unknown)<input value={amount} inputMode="decimal" onChange={e => setAmount(e.target.value)}/></label>
    <label>Highest price (for a range)<input value={max} inputMode="decimal" onChange={e => setMax(e.target.value)}/></label>
    <label>Price shown as<select value={type} onChange={e => setType(e.target.value as Price['type'])}><option value="displayed">Exact price</option><option value="from">From price</option></select></label>
  </div><ActionBar resource="menus" actions={actions} payload={payload} onDone={onSaved}/></div>;
}
