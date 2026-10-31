'use client';
import { useState } from 'react';
import { api, date, failure, useResource } from '../client';
import { Feedback } from '../Primitives';
import { Badges } from './Parts';
import { RecipeDialog } from './RecipeDialog';

type Summary = { id: string; hidden: boolean; restricted: boolean; hidden_reason: string | null; ai: boolean; published_at: string; username: string; cover: boolean;
  recipe: { title: string; description: string; author: string; servings: number; minutes: number; categories: string[];
    ingredients: { id: string; name: string; amount: number | null; unit: string }[]; steps: { title: string; instruction: string }[] } };

/** A published member or AI recipe in the Recipes workspace. Staff never rewrite a member's words, so hiding is how it leaves the app. */
export default function MemberRecipePanel({ id, onChanged }: { id: string; onChanged: (id?: string | null) => void }) {
  const resource = useResource<Summary>('/api/content/recipes?id=' + encodeURIComponent(id)), r = resource.data;
  const [confirm, setConfirm] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function run() {
    if (!r || busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/content/member-recipes', { id: r.id, action: r.hidden ? 'restore' : 'hide', reason });
      setConfirm(false); setReason(''); resource.reload(); onChanged();
    } catch (problem) { setError(failure(problem)); }
    finally { setBusy(false); }
  }
  if (!r) return <Feedback {...resource} retry={resource.reload}/>;
  const d = r.recipe, page = r.ai ? '/console/ai-recipes' : '/console/member-recipes';
  return <div className="recipe-editor" aria-busy={busy || resource.refreshing}>
    <header className="recipe-editor-head">
      <div className="recipe-heading"><div className="grow"><h2 className="recipe-title">{d.title}</h2>
        <div className="row recipe-meta"><Badges hidden={r.hidden || r.restricted}/><small>{r.ai ? 'AI' : 'Member'} · {r.username} · {date(r.published_at)}</small></div></div>
        <div className="row recipe-actions"><a className="button" href={page}>Review page</a>
          <button type="button" className={r.hidden ? 'primary' : 'danger'} disabled={busy} onClick={() => setConfirm(true)}>{r.hidden ? 'Show' : 'Hide'}</button></div>
      </div>
    </header>
    {error && !confirm && <div role="alert" className="notice error">{error}</div>}
    <div className="recipe-page stack">
      {/* eslint-disable-next-line @next/next/no-img-element -- staff view of member photos */}
      {r.cover && <img className="recipe-full-photo" src={`/api/content/member-recipe-photo?id=${r.id}&version=live&slot=cover`} alt={d.title}/>}
      <small>{d.minutes} min · {d.servings} servings · {d.categories.join(', ')}</small>
      {d.description && <p>{d.description}</p>}
      {r.hidden_reason && <p className="muted">Hidden: {r.hidden_reason}</p>}
      {r.restricted && <p className="muted">Hidden from members while its author is restricted.</p>}
      <h3>Ingredients</h3><ul>{d.ingredients.map(i => <li key={i.id}>{i.amount === null ? i.name + ', to taste' : `${i.amount} ${i.unit} ${i.name}`}</li>)}</ul>
      <h3>Method</h3><ol>{d.steps.map((s, index) => <li key={index}><strong>{s.title}</strong><p>{s.instruction}</p></li>)}</ol>
    </div>
    {confirm && <RecipeDialog title={r.hidden ? 'Show recipe?' : 'Hide recipe?'} onClose={() => { if (!busy) { setConfirm(false); setError(''); } }} actions={<>
      <button type="button" autoFocus disabled={busy} onClick={() => { setConfirm(false); setError(''); }}>Cancel</button>
      <button type="button" className={r.hidden ? 'primary' : 'danger'} disabled={busy} onClick={() => void run()}>{busy ? 'Saving…' : r.hidden ? 'Show' : 'Hide'}</button></>}>
      <strong>{d.title}</strong>{!r.hidden && <label>Reason<textarea rows={2} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label>}
      {error && <div role="alert" className="notice error">{error}</div>}
    </RecipeDialog>}
  </div>;
}
