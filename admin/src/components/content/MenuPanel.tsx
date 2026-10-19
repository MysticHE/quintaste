'use client';
import { useState } from 'react';
import { optionalNumber } from '../client';
import { Icon } from '../Icon';
import { SearchField } from '../Primitives';
import { ActionBar, matches, money, type Staff } from './Parts';

type Price = { amount: number | null; currency: 'SGD' | 'unknown'; type: 'displayed' | 'from'; maxAmount?: number };
type Item = { id: string; name: string; category?: string; price: Price; diet?: 'V' | 'VG' };
export type Menu = { sections: { id: string; title?: string; sourceLabel: string; items: Item[] }[] };
type Change = { name?: string; category?: string; price?: Price; diet?: 'V' | 'VG'; hidden?: boolean };
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
    <div className="row spread"><h3>Menu</h3><div className="row badges"><span className="badge">{rows.length} dishes</span>{!!editCount && <span className="badge">{editCount} edited</span>}
      {!!hiddenCount && <span className="badge warn">{hiddenCount} hidden</span>}{!!added.length && <span className="badge">{added.length} added</span>}{menu.newer && <span className="badge warn">Newer source</span>}</div></div>
    {!menu.base && !added.length && <div className="notice warn"><Icon name="warning"/>No dishes</div>}
    {!!rows.length && <SearchField label="Search dishes" value={query} onChange={setQuery} maxLength={100}/>}
    <ul className="dishes">{shown.slice(0, 150).map(({ key, section, item, change }) => {
      const now = { ...item, ...change, price: change?.price ?? item.price };
      return <li key={key} className={change?.hidden ? 'muted-row' : undefined}>
        <div className="row spread"><div><strong>{now.name}</strong>{change?.name && <small> · {item.name}</small>}
          <small>{[now.category, section].filter(Boolean).join(' · ')}</small></div>
          <div className="row">{now.diet && <span className="badge">{now.diet}</span>}<span>{money(now.price)}</span>{change?.hidden && <span className="badge warn">Hidden</span>}{change && !change.hidden && <span className="badge">Edited</span>}
            <button type="button" className="icon-button" aria-label={(open === key ? 'Close ' : 'Edit ') + now.name} aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}><Icon name={open === key ? 'close' : 'edit'}/></button></div></div>
        {open === key && <DishEditor item={now} keepLabel={!!item.diet} extra={{ key }} placeId={placeId} version={version} onSaved={saved} actions={[{ action: 'edit', label: 'Save', tone: 'primary' },
          change?.hidden ? { action: 'restore', label: 'Show' } : { action: 'hide', label: 'Hide', tone: 'danger' }]}/>}
      </li>;
    })}</ul>
    {shown.length > 150 && <small>150 of {shown.length}</small>}
    {!!added.length && <h3>Added by staff</h3>}
    <ul className="dishes">{added.map(item => <li key={item.id}>
      <div className="row spread"><div><strong>{item.name}</strong><div><small>{item.category}</small></div></div>
        <div className="row">{item.diet && <span className="badge">{item.diet}</span>}<span>{money(item.price)}</span><button type="button" className="icon-button" aria-label={(open === item.id ? 'Close ' : 'Edit ') + item.name} aria-expanded={open === item.id} onClick={() => setOpen(open === item.id ? null : item.id)}><Icon name={open === item.id ? 'close' : 'edit'}/></button></div></div>
      {open === item.id && <DishEditor item={item} extra={{ dishId: item.id }} placeId={placeId} version={version} onSaved={saved}
        actions={[{ action: 'edit-added', label: 'Save', tone: 'primary' }, { action: 'remove-added', label: 'Remove', tone: 'danger' }]}/>}
    </li>)}</ul>
    {open === 'new' ? <DishEditor item={blank} extra={{}} placeId={placeId} version={version} onSaved={saved} actions={[{ action: 'add', label: 'Add', tone: 'primary' }]}/>
      : <div><button type="button" onClick={() => setOpen('new')}><Icon name="plus" size={16}/>Dish</button></div>}
    {menu.staff && <details><summary>Revert menu</summary><ActionBar resource="menus" onDone={saved} payload={() => ({ id: placeId, version })}
      actions={[{ action: 'clear', label: 'Revert', tone: 'danger', confirm: 'Remove every staff dish change and added dish?' }]}/></details>}
  </section>;
}
/** A packaged dish's venue label can be changed but not cleared; the server records only a new label. */
function DishEditor({ item, extra, placeId, version, actions, onSaved, keepLabel = false }: {
  item: Item; keepLabel?: boolean; extra: Record<string, unknown>; placeId: string; version: number; onSaved: () => void;
  actions: { action: string; label: string; tone?: 'primary' | 'danger' }[];
}) {
  const [name, setName] = useState(item.name), [category, setCategory] = useState(item.category ?? '');
  const [amount, setAmount] = useState(item.price.amount === null ? '' : String(item.price.amount)), [max, setMax] = useState(item.price.maxAmount ? String(item.price.maxAmount) : '');
  const [type, setType] = useState(item.price.type), [diet, setDiet] = useState(item.diet ?? '');
  const payload = () => {
    const maxAmount = optionalNumber(max, 'the highest price');
    // Keep the source currency of an existing price, so editing a name never confirms an unverified currency;
    // a price typed for a dish that had none is entered in S$.
    const currency = item.price.amount === null ? 'SGD' : item.price.currency;
    return { id: placeId, version, ...extra, item: { name, category, diet, price: { amount: optionalNumber(amount, 'the price'), currency, type,
      ...(maxAmount !== null ? { maxAmount } : {}) } } };
  };
  return <div className="editor stack"><div className="fields">
    <label>Name<input value={name} maxLength={300} onChange={e => setName(e.target.value)}/></label>
    <label>Category<input value={category} maxLength={100} onChange={e => setCategory(e.target.value)}/></label>
    <label>Price<input value={amount} inputMode="decimal" onChange={e => setAmount(e.target.value)}/></label>
    <label>Up to<input value={max} inputMode="decimal" onChange={e => setMax(e.target.value)}/></label>
    <label>Label<select value={diet} onChange={e => setDiet(e.target.value)}><option value="" disabled={keepLabel}>None</option><option value="V">V</option><option value="VG">VG</option></select></label>
    <label>Price type<select value={type} onChange={e => setType(e.target.value as Price['type'])}><option value="displayed">Exact</option><option value="from">From</option></select></label>
  </div><ActionBar resource="menus" actions={actions} payload={payload} onDone={onSaved}/></div>;
}
