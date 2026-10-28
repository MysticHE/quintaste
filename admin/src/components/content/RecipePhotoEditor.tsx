'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { RecipeDialog } from './RecipeDialog';
export type RecipePhoto = { path: string; width: number; height: number; credit: string };
export const recipePhotoSrc = (path?: string) => path && /^\/api\/(catalogue-photos|editorial\/assets)\/[a-f0-9]{64}\.jpg$/.test(path)
  ? '/api/content/recipe-photo?path=' + encodeURIComponent(path) : '';
const bundled = new Set(['bowl','laksa','greens','kaya-toast','claypot-rice','sweet-sour-tofu','kangkung','abc-soup','oat-porridge','popiah','gentle-laksa','mapo-tofu','bubur-cha-cha','sago-gula-melaka','mee-goreng','fried-bee-hoon','nasi-lemak']);
export const bundledPhotoSrc = (key?: string) => key && bundled.has(key) ? '/recipe-photos/' + key + '.jpg' : '';
export function RecipePhotoEditor({ path, fallback, label, disabled, compact, onChange, onBusy }: {
  path?: string; fallback?: string; label: string; disabled?: boolean; compact?: boolean;
  onChange: (photo: RecipePhoto | null) => void; onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const src = recipePhotoSrc(path) || bundledPhotoSrc(fallback);
  async function upload(file?: File) {
    if (!file || busy || disabled) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setError('Use a JPEG, PNG or WebP under 8 MB.'); return; }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); onBusy(true); setError('');
    try {
      const response = await fetch('/api/content/upload', { method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': file.type, 'x-quintaste-admin': '1' }, body: file });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || 'Upload failed.');
      if (!controller.signal.aborted) onChange({ ...value, credit: 'QuinTaste' });
    } catch (problem) { if (!controller.signal.aborted) setError(problem instanceof Error ? problem.message : 'Upload failed.'); }
    finally { if (!controller.signal.aborted) { setBusy(false); onBusy(false); } }
  }
  return <div className="recipe-photo-editor">
    {src ? <button type="button" className="recipe-photo-thumb" aria-label={'Preview ' + label} onClick={() => setPreview(true)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated asset preview */}
      <img src={src} alt={label}/></button> : <span className="recipe-photo-empty" aria-label={'No ' + label}><Icon name="photo"/></span>}
    <div className="recipe-photo-actions"><label className="upload" title={(src ? 'Replace ' : 'Upload ') + label}><Icon name="photo" size={14}/>{!compact && (busy ? 'Uploading…' : src ? 'Replace' : 'Upload')}
      <input type="file" aria-label={'Upload ' + label} accept="image/jpeg,image/png,image/webp" disabled={disabled || busy}
        onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}/></label>
      {src && <button type="button" className="plain" disabled={disabled || busy} onClick={() => onChange(null)} aria-label={'Remove ' + label} title={'Remove ' + label}>{compact ? <Icon name="trash" size={13}/> : 'Remove'}</button>}
      {error && <span role="alert" className="recipe-error">{error}</span>}
    </div>
    {preview && <RecipeDialog title={label} onClose={() => setPreview(false)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated asset preview */}
      <img className="recipe-full-photo" src={src} alt={label}/>
    </RecipeDialog>}
  </div>;
}
