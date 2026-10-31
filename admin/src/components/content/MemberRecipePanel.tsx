'use client';
import { useState } from 'react';
import { api, date, failure, useResource } from '../client';
import { Feedback } from '../Primitives';
import { Badges, History, type Audit } from './Parts';
import { RecipeDialog } from './RecipeDialog';
import { RecipeColumns, RecipeTabs, type ReadOnlyPhotos } from './RecipeColumns';
import { SourceLine, type Source } from './MemberRecipes';
import { fresh, type Form } from './recipe-model';
import { recipeLabels } from '../../lib/diet-labels';

type Summary = { id: string; hidden: boolean; restricted: boolean; hidden_reason: string | null; ai: boolean; published_at: string; username: string; photos: string[]; history: Audit[];
  recipe: { title: string; description: string; minutes: number; servings: number; diet: string; revision: number; categories: string[]; contains?: string[]; source?: Source;
    ingredients: { id: string; name: string; amount: number | null; unit: string }[];
    steps: { title: string; instruction: string; minutes: number | null; ingredientIds: string[]; image?: 'frame' | 'illustration'; at?: number }[] } };

/** A member's or the AI's recipe in the columns staff edit, as a form the columns can show read-only. */
function form(r: Summary): Form {
  const d = r.recipe, source = d.source;
  return { name: d.title, description: d.description, cuisine: '', minutes: String(d.minutes), servings: String(d.servings), categories: d.categories, onePot: false,
    // The labels members see, worked out from the ingredients the same way as the Member recipes page.
    diet: recipeLabels(d.contains) || 'No label', contains: d.contains ?? [], image: null, removeCover: false,
    sources: [source?.url, ...(source?.urls ?? [])].filter((url): url is string => !!url).join('\n'),
    ingredients: d.ingredients.map(i => ({ id: i.id, name: i.name, amount: i.amount === null ? '' : String(i.amount), unit: i.unit })),
    steps: d.steps.map(s => ({ key: fresh(), title: s.title, instruction: s.instruction, ingredientIds: s.ingredientIds, timerLabel: '', timerMinutes: s.minutes ? String(s.minutes) : '',
      ...(s.image ? { image: s.image } : {}), ...(s.at !== undefined ? { at: s.at } : {}) })) };
}
/** A published member or AI recipe in the Recipes workspace. Staff never rewrite a member's words, so hiding is how it leaves the app. */
export default function MemberRecipePanel({ id, onChanged }: { id: string; onChanged: (id?: string | null) => void }) {
  const resource = useResource<Summary>('/api/content/recipes?id=' + encodeURIComponent(id)), r = resource.data;
  if (!r) return <Feedback {...resource} retry={resource.reload}/>;
  // A newly published revision replaces the recipe and its photos, so it opens as a new view.
  return <MemberRecipe key={r.id + ':' + r.recipe.revision} r={r} refreshing={resource.refreshing} onChanged={() => { resource.reload(); onChanged(); }}/>;
}
function MemberRecipe({ r, refreshing, onChanged }: { r: Summary; refreshing: boolean; onChanged: () => void }) {
  const [tab, setTab] = useState('overview'), [confirm, setConfirm] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [shown] = useState(() => form(r));
  const photo = (slot: string) => r.photos.includes(slot) ? `/api/content/member-recipe-photo?id=${r.id}&version=live&slot=${slot}&rev=${r.recipe.revision}` : undefined;
  const photos: ReadOnlyPhotos = { cover: photo('cover'), step: index => photo('step-' + index) };
  const page = r.ai ? '/console/ai-recipes' : '/console/member-recipes';
  async function run() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/content/member-recipes', { id: r.id, action: r.hidden ? 'restore' : 'hide', reason });
      setConfirm(false); setReason(''); onChanged();
    } catch (problem) { setError(failure(problem)); }
    finally { setBusy(false); }
  }
  return <div className="recipe-editor" aria-busy={busy || refreshing}>
    <header className="recipe-editor-head">
      <div className="recipe-heading"><div className="grow"><input aria-label="Recipe name" className="recipe-title" value={shown.name} readOnly/>
        <div className="row recipe-meta"><Badges hidden={r.hidden || r.restricted}/><small>{r.ai ? 'AI' : 'Member'} · {r.username} · {date(r.published_at)}</small></div></div>
        <div className="row recipe-actions"><a className="button" href={page}>Review page</a>
          <button type="button" className={r.hidden ? 'primary' : 'danger'} disabled={busy || refreshing} onClick={() => setConfirm(true)}>{r.hidden ? 'Show' : 'Hide'}</button></div>
      </div>
      <RecipeTabs tab={tab} setTab={setTab}/>
    </header>
    {error && !confirm && <div role="alert" className="notice error">{error}</div>}
    {r.hidden && r.hidden_reason && <div className="notice">Hidden: {r.hidden_reason}</div>}
    {r.restricted && <div className="notice">Hidden from members while its author is restricted.</div>}
    <div className="recipe-page" role="tabpanel" id="recipe-page-overview" aria-labelledby="recipe-tab-overview" hidden={tab !== 'overview'}>
      <RecipeColumns r={shown} disabled={false} readOnly photos={photos}/>
    </div>
    <div className="recipe-page recipe-secondary" role="tabpanel" id="recipe-page-sources" aria-labelledby="recipe-tab-sources" hidden={tab !== 'sources'}>
      {r.recipe.source && <SourceLine source={r.recipe.source}/>}
      <label>Source URLs<textarea rows={8} value={shown.sources} readOnly placeholder="None"/></label>
    </div>
    <div className="recipe-page recipe-secondary" role="tabpanel" id="recipe-page-history" aria-labelledby="recipe-tab-history" hidden={tab !== 'history'}><History rows={r.history}/></div>
    {confirm && <RecipeDialog title={r.hidden ? 'Show recipe?' : 'Hide recipe?'} onClose={() => { if (!busy) { setConfirm(false); setError(''); } }} actions={<>
      <button type="button" autoFocus disabled={busy} onClick={() => { setConfirm(false); setError(''); }}>Cancel</button>
      <button type="button" className={r.hidden ? 'primary' : 'danger'} disabled={busy} onClick={() => void run()}>{busy ? 'Saving…' : r.hidden ? 'Show' : 'Hide'}</button></>}>
      <strong>{shown.name}</strong>{!r.hidden && <label>Reason<textarea rows={2} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label>}
      {error && <div role="alert" className="notice error">{error}</div>}
    </RecipeDialog>}
  </div>;
}
