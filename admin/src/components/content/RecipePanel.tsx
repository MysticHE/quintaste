'use client';
import { useState } from 'react';
import { optionalNumber, useResource } from '../client';
import { Feedback, IconButton } from '../Primitives';
import { Icon } from '../Icon';
import { ActionBar, Badges, Edited, History, PhotoUpload, photoSrc, type Audit, type Staff } from './Parts';

const categories = ['Breakfast', 'Noodles', 'Rice meals', 'With rice', 'Soups', 'Snacks & kueh', 'Desserts & drinks'];
const exclusions = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida', 'Eggs', 'Dairy', 'Honey', 'Peanuts', 'Tree nuts', 'Gluten', 'Mushrooms', 'Root vegetables'];
const alliums = exclusions.slice(0, 7);
type Recipe = { name: string; description: string; cuisine: string; minutes: number; servings: number; categories: string[]; onePot?: boolean;
  dietary: { diet: string; contains: string[] }; ingredients: { id: string; name: string; amount: number | null; unit: string }[];
  steps: { title: string; instruction: string; ingredientIds: string[]; timer?: { label: string; seconds: number } }[];
  image?: { path: string; width: number; height: number; credit: string }; provenance?: { sources: string[] }; withdrawal?: string };
type Detail = { id: string; app: string | null; source: 'bundled' | 'bot' | 'staff'; base: Recipe | null; staff: Staff | null; newer: boolean; history: Audit[] };
type Ingredient = { id: string; name: string; amount: string; unit: string };
type Step = { title: string; instruction: string; ingredientIds: string[]; timerLabel: string; timerMinutes: string };
const fresh = () => 'n' + Math.random().toString(36).slice(2, 10);
const empty: Recipe = { name: '', description: '', cuisine: 'Local', minutes: 30, servings: 2, categories: ['Rice meals'], dietary: { diet: 'Vegan', contains: [] },
  ingredients: [{ id: fresh(), name: '', amount: null, unit: '' }], steps: [{ title: '', instruction: '', ingredientIds: [] }] };
const move = <T,>(list: T[], index: number, by: number) => { const next = [...list], [item] = next.splice(index, 1); next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item); return next; };

export default function RecipePanel({ id, onChanged }: { id: string; onChanged: (id?: string | null) => void }) {
  const resource = useResource<Detail>(id === 'new' ? null : '/api/content/recipes?id=' + encodeURIComponent(id)), d = resource.data;
  if (id === 'new') return <RecipeForm detail={null} onSaved={onChanged}/>;
  return <><Feedback {...resource} retry={resource.reload}/>{d && <RecipeForm key={d.staff?.version ?? 0} detail={d} onSaved={next => { resource.reload(); onChanged(next); }}/>}</>;
}
function RecipeForm({ detail, onSaved }: { detail: Detail | null; onSaved: (id?: string | null) => void }) {
  const edited = !!detail?.staff && Object.keys(detail.staff.data).length > 1, staffMade = !detail || detail.source === 'staff';
  const start = (edited ? detail!.staff!.data : detail?.base ?? empty) as Recipe;
  const [r, setR] = useState({ name: start.name, description: start.description ?? '', cuisine: start.cuisine, minutes: String(start.minutes), servings: String(start.servings),
    categories: start.categories, onePot: !!start.onePot, diet: start.dietary.diet === 'Vegetarian' ? 'Vegetarian' : 'Vegan', contains: start.dietary.contains,
    image: start.image ?? null, sources: (start.provenance?.sources ?? []).join('\n') });
  const set = (patch: Partial<typeof r>) => setR(v => ({ ...v, ...patch }));
  const [ingredients, setIngredients] = useState<Ingredient[]>(start.ingredients.map(i => ({ id: i.id, name: i.name, amount: i.amount === null ? '' : String(i.amount), unit: i.unit })));
  const [steps, setSteps] = useState<Step[]>(start.steps.map(s => ({ title: s.title, instruction: s.instruction, ingredientIds: s.ingredientIds, timerLabel: s.timer?.label ?? '', timerMinutes: s.timer ? String(s.timer.seconds / 60) : '' })));
  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter(v => v !== value) : [...list, value];
  const ingredient = (i: number, patch: Partial<Ingredient>) => setIngredients(list => list.map((x, j) => j === i ? { ...x, ...patch } : x));
  const step = (i: number, patch: Partial<Step>) => setSteps(list => list.map((x, j) => j === i ? { ...x, ...patch } : x));
  const payload = () => ({ id: detail?.id, version: detail?.staff?.version ?? 0, fields: { name: r.name, description: r.description, cuisine: r.cuisine,
    minutes: Number(r.minutes), servings: Number(r.servings), categories: r.categories, onePot: r.onePot, diet: r.diet, contains: r.contains, image: r.image,
    sources: r.sources.split('\n').map(s => s.trim()).filter(Boolean),
    ingredients: ingredients.filter(i => i.name.trim()).map(i => ({ id: i.id, name: i.name, unit: i.unit, amount: optionalNumber(i.amount, 'the amount of ' + i.name) })),
    steps: steps.filter(s => s.title.trim() || s.instruction.trim()).map(s => ({ title: s.title, instruction: s.instruction, ingredientIds: s.ingredientIds,
      ...(s.timerMinutes.trim() ? { timer: { label: s.timerLabel.trim() || s.title, seconds: Math.round(optionalNumber(s.timerMinutes, 'the timer of ' + (s.title || 'a step'))! * 60) } } : {}) })) } });
  const actions = !detail ? [{ action: 'create', label: 'Create recipe', tone: 'primary' as const }] : [
    { action: 'save', label: 'Save', tone: 'primary' as const },
    detail.staff?.hidden ? { action: 'restore', label: 'Show' } : { action: 'hide', label: 'Hide', tone: 'danger' as const },
    ...(edited && !staffMade ? [{ action: 'clear', label: 'Revert', confirm: 'Revert to the original recipe?' }] : []),
    ...(staffMade ? [{ action: 'delete', label: 'Delete', tone: 'danger' as const, confirm: 'Delete this recipe?' }] : [])];
  const pungent = r.contains.filter(c => alliums.includes(c));
  return <div className="stack">
    <section className="panel stack">
      <div className="row spread"><div className="stack compact"><h2>{detail ? start.name : 'New recipe'}</h2>{detail && <span className="code">{detail.id} · {({ bundled: 'App', bot: 'QT Manager', staff: 'Staff' })[detail.source]}</span>}</div>
        {detail && <Badges hidden={detail.staff?.hidden} edited={edited} staff={staffMade} newer={detail.newer} extra={detail.base?.withdrawal ? 'Withdrawn' : undefined}/>}</div>
      {detail && <Edited staff={detail.staff} link={detail.app && !detail.staff?.hidden ? `${detail.app}/cook/recipe/${detail.id}` : null}/>}
      <div className="fields">
        <label>Name<input value={r.name} maxLength={160} onChange={e => set({ name: e.target.value })}/></label>
        <label>Cuisine<input value={r.cuisine} maxLength={60} onChange={e => set({ cuisine: e.target.value })}/></label>
        <label>Minutes<input type="number" min={1} max={180} value={r.minutes} onChange={e => set({ minutes: e.target.value })}/></label>
        <label>Servings<input type="number" min={1} max={8} value={r.servings} onChange={e => set({ servings: e.target.value })}/></label>
        <label>Diet<select value={r.diet} onChange={e => set({ diet: e.target.value })}><option>Vegan</option><option>Vegetarian</option></select></label>
      </div>
      <label>Description<textarea rows={2} maxLength={700} value={r.description} onChange={e => set({ description: e.target.value })}/></label>
      <fieldset><legend>Categories</legend><div className="chips">{categories.map(c => <button type="button" key={c} aria-pressed={r.categories.includes(c)}
        disabled={!r.categories.includes(c) && r.categories.length >= 2} onClick={() => set({ categories: toggle(r.categories, c) })}>{c}</button>)}</div></fieldset>
      <label className="check"><input type="checkbox" checked={r.onePot} onChange={e => set({ onePot: e.target.checked })}/>One pot</label>
      <fieldset><legend>Contains</legend><div className="chips">{exclusions.map(c => <button type="button" key={c} aria-pressed={r.contains.includes(c)} onClick={() => set({ contains: toggle(r.contains, c) })}>{c}</button>)}</div></fieldset>
      {!!pungent.length && <div className="notice warn"><Icon name="warning"/>Pungent: {pungent.join(', ')}</div>}
    </section>
    <section className="panel stack"><h3>Ingredients</h3>
      {ingredients.map((x, i) => <div key={x.id} className="line-editor">
        <label>Ingredient<input value={x.name} maxLength={160} onChange={e => ingredient(i, { name: e.target.value })}/></label>
        <label>Amount<input value={x.amount} inputMode="decimal" placeholder="To taste" onChange={e => ingredient(i, { amount: e.target.value })}/></label>
        <label>Unit<input value={x.unit} maxLength={30} onChange={e => ingredient(i, { unit: e.target.value })}/></label>
        <div className="row line-tools"><IconButton icon="up" label={'Move ' + (x.name || 'ingredient') + ' up'} disabled={!i} onClick={() => setIngredients(l => move(l, i, -1))}/>
          <IconButton icon="down" label={'Move ' + (x.name || 'ingredient') + ' down'} disabled={i === ingredients.length - 1} onClick={() => setIngredients(l => move(l, i, 1))}/>
          <IconButton icon="trash" label={'Remove ' + (x.name || 'ingredient')} onClick={() => { setIngredients(l => l.filter((_, j) => j !== i)); setSteps(l => l.map(s => ({ ...s, ingredientIds: s.ingredientIds.filter(id => id !== x.id) }))); }}/></div>
      </div>)}
      <div><button type="button" disabled={ingredients.length >= 30} onClick={() => setIngredients(l => [...l, { id: fresh(), name: '', amount: '', unit: '' }])}><Icon name="plus" size={16}/>Ingredient</button></div>
    </section>
    <section className="panel stack"><h3>Steps</h3>
      {steps.map((s, i) => <div key={i} className="step-editor stack">
        <div className="row spread"><strong>Step {i + 1}</strong><div className="row line-tools"><IconButton icon="up" label={`Move step ${i + 1} up`} disabled={!i} onClick={() => setSteps(l => move(l, i, -1))}/>
          <IconButton icon="down" label={`Move step ${i + 1} down`} disabled={i === steps.length - 1} onClick={() => setSteps(l => move(l, i, 1))}/>
          <IconButton icon="trash" label={`Remove step ${i + 1}`} onClick={() => setSteps(l => l.filter((_, j) => j !== i))}/></div></div>
        <label>Title<input value={s.title} maxLength={120} onChange={e => step(i, { title: e.target.value })}/></label>
        <label>Instructions<textarea rows={3} maxLength={1400} value={s.instruction} onChange={e => step(i, { instruction: e.target.value })}/></label>
        <fieldset><legend>Uses</legend><div className="chips">{ingredients.filter(x => x.name.trim()).map(x => <button type="button" key={x.id} aria-pressed={s.ingredientIds.includes(x.id)}
          onClick={() => step(i, { ingredientIds: toggle(s.ingredientIds, x.id) })}>{x.name}</button>)}</div></fieldset>
        <div className="fields"><label>Timer (min)<input value={s.timerMinutes} inputMode="decimal" onChange={e => step(i, { timerMinutes: e.target.value })}/></label>
          <label>Timer label<input value={s.timerLabel} maxLength={80} placeholder={s.title} onChange={e => step(i, { timerLabel: e.target.value })}/></label></div>
      </div>)}
      <div><button type="button" disabled={steps.length >= 20} onClick={() => setSteps(l => [...l, { title: '', instruction: '', ingredientIds: [], timerLabel: '', timerMinutes: '' }])}><Icon name="plus" size={16}/>Step</button></div>
    </section>
    <section className="panel stack"><div className="row spread"><h3>Photo</h3>{r.image && <button type="button" className="danger" onClick={() => set({ image: null })}><Icon name="trash" size={16}/>Remove</button>}</div>
      {/* eslint-disable-next-line @next/next/no-img-element -- staff preview of an uploaded photo */}
      {r.image && <img className="preview" src={photoSrc(r.image.path)} alt={'Photo of ' + r.name} width={r.image.width} height={r.image.height}/>}
      <PhotoUpload label={r.image ? 'Replace' : 'Upload'} onUploaded={up => set({ image: { ...up, credit: r.image?.credit ?? 'QuinTaste' } })}/>
      {r.image && <label>Credit<input value={r.image.credit} maxLength={180} onChange={e => set({ image: { ...r.image!, credit: e.target.value } })}/></label>}
      <label>Sources<textarea rows={2} value={r.sources} onChange={e => set({ sources: e.target.value })} placeholder="https://"/></label>
    </section>
    <section className="panel"><ActionBar resource="recipes" actions={actions} payload={payload} onDone={(result, action) => onSaved(action === 'delete' ? null : result.id)}/></section>
    {detail && <section className="panel stack"><h3>History</h3><History rows={detail.history}/></section>}
  </div>;
}
