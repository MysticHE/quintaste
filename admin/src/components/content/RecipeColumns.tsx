'use client';
import { useState, type ReactNode } from 'react';
import { IconButton } from '../Primitives';
import { Icon } from '../Icon';
import { RecipeDialog } from './RecipeDialog';
import { RecipePhotoEditor } from './RecipePhotoEditor';
import { categories, exclusions, emptyStep, fresh, move, toggle, type Form, type Step } from './recipe-model';

export function RecipeColumns({ r, set, disabled, uploading }: { r: Form; set: (patch: Partial<Form>) => void; disabled: boolean; uploading: (active: boolean) => void }) {
  const [mobile, setMobile] = useState('details'), [focus, setFocus] = useState(''), [contains, setContains] = useState(false), [settings, setSettings] = useState<string | null>(null);
  const [order, setOrder] = useState<string | null>(null);
  const step = (key: string, patch: Partial<Step>) => set({ steps: r.steps.map(s => s.key === key ? { ...s, ...patch } : s) });
  const selected = r.steps.find(s => s.key === settings);
  const panel = (id: string, name: string, children: ReactNode, footer?: ReactNode) => <section className={'recipe-column' + (mobile === id ? ' mobile-selected' : '') + (focus === id ? ' expanded' : '')}>
    <header><h3>{name}</h3><IconButton icon={focus === id ? 'close' : 'external'} label={focus === id ? 'Show all columns' : 'Expand ' + name.toLowerCase()} onClick={() => setFocus(focus === id ? '' : id)}/></header>
    <div className="recipe-column-body">{children}</div>{footer && <footer>{footer}</footer>}</section>;
  return <>
    <div className="recipe-mobile-tabs" role="group" aria-label="Editing columns">{['details','ingredients','method'].map(id => <button type="button" key={id} aria-pressed={mobile === id} onClick={() => { setMobile(id); setFocus(''); }}>{id[0].toUpperCase() + id.slice(1)}</button>)}</div>
    <fieldset disabled={disabled} className={'recipe-columns' + (focus ? ' has-expanded' : '')}>
      {panel('details', 'Details', <div className="recipe-basics">
        <RecipePhotoEditor label="Recipe photo" path={r.image?.path} fallback={r.removeCover ? undefined : r.photo} disabled={disabled} onBusy={uploading}
          onChange={image => set({ image, removeCover: !image, ...(!image ? { photo: undefined } : {}) })}/>
        {r.image && <label>Credit<input value={r.image.credit} maxLength={180} onChange={e => set({ image: { ...r.image!, credit: e.target.value } })}/></label>}
        <label>Description<textarea rows={3} maxLength={700} value={r.description} onChange={e => set({ description: e.target.value })}/></label>
        <div className="recipe-three"><label>Cuisine<input value={r.cuisine} maxLength={60} onChange={e => set({ cuisine: e.target.value })}/></label>
          <label>Minutes<input type="number" min={1} max={180} value={r.minutes} onChange={e => set({ minutes: e.target.value })}/></label>
          <label>Servings<input type="number" min={1} max={8} value={r.servings} onChange={e => set({ servings: e.target.value })}/></label></div>
        <div className="recipe-two"><label>Diet<select value={r.diet} onChange={e => set({ diet: e.target.value })}><option>Vegan</option><option>Vegetarian</option></select></label>
          <label className="check"><input type="checkbox" checked={r.onePot} onChange={e => set({ onePot: e.target.checked })}/>One pot</label></div>
        <fieldset><legend>Categories</legend><div className="chips">{categories.map(c => <button type="button" key={c} aria-pressed={r.categories.includes(c)} disabled={!r.categories.includes(c) && r.categories.length >= 2}
          onClick={() => set({ categories: toggle(r.categories, c) })}>{c}</button>)}</div></fieldset>
        <div><div className="row spread"><label>Contains</label><button type="button" className="plain" onClick={() => setContains(true)}>Edit</button></div>
          <div className="row">{r.contains.map(c => <span className="badge" key={c}>{c}</span>)}{!r.contains.length && <small>None</small>}</div></div>
      </div>)}
      {panel('ingredients', 'Ingredients', <table className="recipe-ingredients"><thead><tr><th scope="col">#</th><th scope="col">Ingredient</th><th scope="col">Amount</th><th scope="col">Unit</th><th aria-label="Actions"/></tr></thead>
        <tbody>{r.ingredients.map((x, i) => <tr key={x.id}><td><button type="button" className="plain" aria-label={`Reorder ingredient ${i + 1}`} onClick={() => setOrder(x.id)}>{i + 1}</button></td>
          {(['name','amount','unit'] as const).map(key => <td key={key}><input aria-label={`Ingredient ${i + 1} ${key}`} value={x[key]} maxLength={key === 'name' ? 160 : 30} inputMode={key === 'amount' ? 'decimal' : 'text'}
            onChange={e => set({ ingredients: r.ingredients.map(item => item.id === x.id ? { ...item, [key]: e.target.value } : item) })}/></td>)}
          <td><IconButton icon="close" label={`Remove ingredient ${i + 1}`} onClick={() => set({ ingredients: r.ingredients.filter(item => item.id !== x.id), steps: r.steps.map(s => ({ ...s, ingredientIds: s.ingredientIds.filter(id => id !== x.id) })) })}/></td>
        </tr>)}</tbody></table>, <button type="button" className="plain" disabled={r.ingredients.length >= 30} onClick={() => set({ ingredients: [...r.ingredients, { id: fresh(), name: '', amount: '', unit: '' }] })}><Icon name="plus" size={14}/>Ingredient</button>)}
      {panel('method', 'Method', <div className="recipe-step-list">{r.steps.map((s, i) => <article key={s.key} className="recipe-step">
        <div className="recipe-step-head"><span>{i + 1}</span><input aria-label={`Step ${i + 1} title`} maxLength={120} value={s.title} onChange={e => step(s.key, { title: e.target.value })}/>
          <div className="row nowrap"><IconButton icon="up" label={`Move step ${i + 1} up`} disabled={!i} onClick={() => set({ steps: move(r.steps, i, -1) })}/>
            <IconButton icon="down" label={`Move step ${i + 1} down`} disabled={i === r.steps.length - 1} onClick={() => set({ steps: move(r.steps, i, 1) })}/>
            <IconButton icon="close" label={`Remove step ${i + 1}`} onClick={() => set({ steps: r.steps.filter(x => x.key !== s.key) })}/></div></div>
        <div className="recipe-step-main"><textarea aria-label={`Step ${i + 1} instructions`} rows={3} maxLength={1400} value={s.instruction} onChange={e => step(s.key, { instruction: e.target.value })}/>
          <RecipePhotoEditor compact label={`Step ${i + 1} photo`} path={s.photo} disabled={disabled} onBusy={uploading} onChange={photo => step(s.key, { photo: photo?.path, image: undefined })}/></div>
        <div className="row spread recipe-step-options"><button type="button" className="plain" onClick={() => setSettings(s.key)}>Ingredients {s.ingredientIds.length}</button>
          <button type="button" className="plain" aria-label={`Step ${i + 1} settings`} onClick={() => setSettings(s.key)}>{s.timerMinutes ? s.timerMinutes + ' min' : 'Timer'}</button></div>
      </article>)}</div>, <button type="button" className="plain" disabled={r.steps.length >= 20} onClick={() => set({ steps: [...r.steps, emptyStep()] })}><Icon name="plus" size={14}/>Step</button>)}
    </fieldset>
    {contains && <RecipeDialog title="Contains" onClose={() => setContains(false)}><div className="recipe-checks">{exclusions.map(c => <label className="check" key={c}><input type="checkbox" checked={r.contains.includes(c)} disabled={disabled}
      onChange={() => set({ contains: toggle(r.contains, c) })}/>{c}</label>)}</div></RecipeDialog>}
    {selected && <RecipeDialog title={`Step ${r.steps.indexOf(selected) + 1}`} onClose={() => setSettings(null)}><fieldset disabled={disabled} className="stack">
      <div className="recipe-two"><label>Timer (min)<input type="number" min="0.02" max="180" step="any" value={selected.timerMinutes} onChange={e => step(selected.key, { timerMinutes: e.target.value })}/></label>
        <label>Timer label<input maxLength={80} value={selected.timerLabel} onChange={e => step(selected.key, { timerLabel: e.target.value })}/></label></div>
      {selected.photo && <label>Image type<select value={selected.image ?? ''} onChange={e => step(selected.key, { image: e.target.value as Step['image'] || undefined })}><option value="">Photo</option><option value="frame">Video frame</option><option value="illustration">Illustration</option></select></label>}
      {selected.at !== undefined && <label>Video time (sec)<input type="number" min={0} max={86400} step="any" value={selected.at} onChange={e => step(selected.key, { at: e.target.value === '' ? undefined : Number(e.target.value) })}/></label>}
      <fieldset><legend>Ingredients</legend><div className="recipe-checks">{r.ingredients.map(item => <label className="check" key={item.id}><input type="checkbox" checked={selected.ingredientIds.includes(item.id)}
        onChange={() => step(selected.key, { ingredientIds: toggle(selected.ingredientIds, item.id) })}/>{item.name}</label>)}</div></fieldset>
    </fieldset></RecipeDialog>}
    {order && <RecipeDialog title="Ingredient order" onClose={() => setOrder(null)}><label>Position<select value={r.ingredients.findIndex(x => x.id === order)} onChange={e => {
      const at = r.ingredients.findIndex(x => x.id === order); set({ ingredients: move(r.ingredients, at, Number(e.target.value) - at) });
    }}>{r.ingredients.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label></RecipeDialog>}
  </>;
}
