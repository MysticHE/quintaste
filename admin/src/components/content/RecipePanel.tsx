'use client';
import { useEffect, useState } from 'react';
import { api, failure, useResource } from '../client';
import { Feedback, IconButton } from '../Primitives';
import { Icon } from '../Icon';
import { Badges, History } from './Parts';
import { RecipeDialog } from './RecipeDialog';
import { RecipeColumns } from './RecipeColumns';
import { fields, initial, type Detail, type Form } from './recipe-model';
import { bundledPhotoSrc, recipePhotoSrc } from './RecipePhotoEditor';

export default function RecipePanel({ id, onChanged, onDirty, onBusy }: { id: string; onChanged: (id?: string | null) => void; onDirty: (dirty: boolean) => void; onBusy: (busy: boolean) => void }) {
  const resource = useResource<Detail>(id === 'new' ? null : '/api/content/recipes?id=' + encodeURIComponent(id));
  if (id === 'new') return <RecipeForm detail={null} onSaved={onChanged} onDirty={onDirty} onBusy={onBusy}/>;
  return <><Feedback {...resource} retry={resource.reload}/>{resource.data && <RecipeForm key={resource.data.staff?.version ?? 0} detail={resource.data}
    onDirty={onDirty} onBusy={onBusy} onSaved={next => { resource.reload(); onChanged(next); }}/>}</>;
}
function RecipeForm({ detail, onSaved, onDirty, onBusy }: { detail: Detail | null; onSaved: (id?: string | null) => void; onDirty: (dirty: boolean) => void; onBusy: (busy: boolean) => void }) {
  const [r, setR] = useState(() => initial(detail)), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(''), [uploads, setUploads] = useState(0);
  const [error, setError] = useState(''), [tab, setTab] = useState('overview'), [confirm, setConfirm] = useState(''), [reason, setReason] = useState('');
  const [preview, setPreview] = useState(false);
  const deleted = !!detail?.staff?.data._deletedAt, locked = !!busy || uploads > 0, edited = !!detail?.staff && Object.keys(detail.staff.data).length > 1;
  const set = (patch: Partial<Form>) => { setR(old => ({ ...old, ...patch })); setDirty(true); onDirty(true); };
  const uploading = (active: boolean) => { setUploads(n => n + (active ? 1 : -1)); if (active) { setDirty(true); onDirty(true); } };
  useEffect(() => { onBusy(locked); return () => onBusy(false); }, [locked, onBusy]);
  const ask = (action: string) => { if (!dirty || window.confirm('Discard changes?')) setConfirm(action); };
  useEffect(() => {
    if (!dirty && !locked) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => { const link = (event.target as Element).closest('a[href]');
      if (link && !link.hasAttribute('target') && (locked || !window.confirm('Discard changes?'))) event.preventDefault(); };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, locked]);
  async function run(action: string) {
    if (locked) return;
    setBusy(action); setError('');
    try {
      const result = await api<{ id?: string }>('/api/content/recipes', { id: detail?.id, version: detail?.staff?.version ?? 0, action, reason,
        ...(['save', 'create'].includes(action) ? { fields: fields(r) } : {}) });
      onDirty(false); onBusy(false); setDirty(false); setConfirm(''); setReason(''); onSaved(result.id);
    } catch (problem) { setError(failure(problem)); }
    finally { setBusy(''); }
  }
  const titles: Record<string, string> = { delete: 'Delete recipe?', clear: 'Revert edits?', hide: 'Hide recipe?', restore: 'Show recipe?', undelete: 'Restore recipe?' };
  const labels: Record<string, string> = { delete: 'Delete', clear: 'Revert', hide: 'Hide', restore: 'Show', undelete: 'Restore' };
  return <div className="recipe-editor" aria-busy={locked}>
    <header className="recipe-editor-head">
      <div className="recipe-heading"><div className="grow"><input aria-label="Recipe name" className="recipe-title" value={r.name} placeholder="New recipe" maxLength={160} disabled={locked || deleted} onChange={e => set({ name: e.target.value })}/>
        <div className="row recipe-meta">{deleted ? <span className="badge danger">Deleted</span> : <Badges hidden={detail?.staff?.hidden} newer={detail?.newer} extra={detail?.base?.withdrawal ? 'Withdrawn' : undefined}/>}
          <small>{detail ? ({ bundled: 'App', bot: 'QT Manager', staff: 'Staff' })[detail.source] : 'Staff'}</small></div></div>
        <div className="row recipe-actions"><button type="button" onClick={() => setPreview(true)}><Icon name="eye" size={15}/>Preview</button>
          {deleted ? <button type="button" disabled={locked} onClick={() => setConfirm('undelete')}>Restore</button> : <>
            {detail && edited && detail.source !== 'staff' && <IconButton icon="refresh" label="Revert edits" disabled={locked} onClick={() => ask('clear')}/>}
            {detail && <button type="button" disabled={locked} onClick={() => ask(detail.staff?.hidden ? 'restore' : 'hide')}>{detail.staff?.hidden ? 'Show' : 'Hide'}</button>}
            {detail && <button type="button" className="danger" disabled={locked} onClick={() => ask('delete')}><Icon name="trash" size={15}/>Delete</button>}
            <button type="button" className="primary" disabled={locked || (!!detail && !dirty)} onClick={() => void run(detail ? 'save' : 'create')}>{busy ? 'Saving…' : detail ? 'Save' : 'Create'}</button>
          </>}</div>
      </div>
      <div className="recipe-tabs" role="tablist" aria-label="Recipe sections">{['overview','sources','history'].map((name, index, names) => <button type="button" key={name} role="tab" id={'recipe-tab-' + name}
        aria-controls={'recipe-page-' + name} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)}
        onKeyDown={event => { const at = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : -1;
          if (at >= 0) { event.preventDefault(); setTab(names[at]); document.getElementById('recipe-tab-' + names[at])?.focus(); } }}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div>
    </header>
    {error && !confirm && <div role="alert" className="notice error">{error}</div>}
    <div className="recipe-page" role="tabpanel" id="recipe-page-overview" aria-labelledby="recipe-tab-overview" hidden={tab !== 'overview'}>
      <RecipeColumns r={r} set={set} disabled={locked || deleted} uploading={uploading}/>
    </div>
    <div className="recipe-page recipe-secondary" role="tabpanel" id="recipe-page-sources" aria-labelledby="recipe-tab-sources" hidden={tab !== 'sources'}>
      <label>Source URLs<textarea rows={8} value={r.sources} disabled={locked || deleted} onChange={e => set({ sources: e.target.value })} placeholder="https://"/></label>
    </div>
    <div className="recipe-page recipe-secondary" role="tabpanel" id="recipe-page-history" aria-labelledby="recipe-tab-history" hidden={tab !== 'history'}><History rows={detail?.history ?? []}/></div>
    {dirty && <div className="recipe-save-state" role="status">{uploads ? 'Uploading…' : 'Unsaved changes'}</div>}
    {confirm && <RecipeDialog title={titles[confirm]} onClose={() => { if (!locked) { setConfirm(''); setError(''); } }} actions={<>
      <button type="button" autoFocus disabled={locked} onClick={() => { setConfirm(''); setError(''); }}>Cancel</button>
      <button type="button" className={confirm === 'delete' ? 'danger' : 'primary'} disabled={locked} onClick={() => void run(confirm)}>{busy ? 'Saving…' : labels[confirm]}</button></>}>
      <strong>{r.name}</strong>{confirm === 'delete' && <label>Reason<textarea rows={2} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label>}
      {error && <div role="alert" className="notice error">{error}</div>}
    </RecipeDialog>}
    {preview && <RecipeDialog title={r.name || 'Preview'} onClose={() => setPreview(false)}><RecipePreview r={r}/></RecipeDialog>}
  </div>;
}
function RecipePreview({ r }: { r: Form }) {
  const cover = recipePhotoSrc(r.image?.path) || (!r.removeCover && bundledPhotoSrc(r.photo));
  return <div className="stack">
    {/* eslint-disable-next-line @next/next/no-img-element -- authenticated preview */}
    {cover && <img className="recipe-full-photo" src={cover} alt={r.name}/>}
    <small>{r.minutes} min · {r.servings} servings · {r.diet}</small>{r.description && <p>{r.description}</p>}
    <h3>Ingredients</h3><ul>{r.ingredients.map(i => <li key={i.id}>{i.amount} {i.unit} {i.name}</li>)}</ul>
    <h3>Method</h3><ol>{r.steps.map(s => <li key={s.key}><strong>{s.title}</strong><p>{s.instruction}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated step image */}
      {s.photo && <img className="recipe-full-photo" src={recipePhotoSrc(s.photo)} alt={s.title}/>}</li>)}</ol></div>;
}
