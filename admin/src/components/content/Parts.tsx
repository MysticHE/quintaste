'use client';
import { useState, type ReactNode } from 'react';
import { actionLabel } from '../../lib/audit-labels';
import { api, date } from '../client';
import { Icon } from '../Icon';

export type Staff = { origin: 'edit' | 'staff'; hidden: boolean; version: number; updatedAt: string; editor: string | null; data: Record<string, unknown> };
export type Photo = { path: string; width: number; height: number };
export type Audit = { occurred_at: string; action: string; reason: string; actor: string | null };
type Action = { action: string; label: string; tone?: 'primary' | 'danger'; confirm?: string };

/** One status line for any content item. */
export function Badges({ hidden, edited, staff, newer, reports, extra, tags = [] }: { hidden?: boolean; edited?: boolean; staff?: boolean; newer?: boolean; reports?: number; extra?: string; tags?: string[] }) {
  return <span className="row badges">
    {hidden ? <span className="badge warn">Hidden</span> : <span className="badge good">Live</span>}
    {staff && <span className="badge">Staff</span>}
    {edited && <span className="badge">Edited</span>}
    {newer && <span className="badge warn">Newer source</span>}
    {!!reports && <span className="badge warn">{reports} {reports === 1 ? 'report' : 'reports'}</span>}
    {extra && <span className="badge">{extra}</span>}
    {tags.filter(Boolean).map(tag => <span key={tag} className="badge">{tag}</span>)}
  </span>;
}
/** Content actions; each change is recorded in the audit log. */
export function ActionBar({ resource, actions, payload, onDone, children }: {
  resource: string; actions: Action[]; payload: () => Record<string, unknown>; onDone: (result: { id?: string; note?: string }, action: string) => void; children?: ReactNode;
}) {
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function run(item: Action) {
    setError(''); setMessage('');
    if (item.confirm && !window.confirm(item.confirm)) return;
    let input: Record<string, unknown>;
    try { input = payload(); } catch (problem) { return setError(problem instanceof Error ? problem.message : 'Check the form.'); }
    setBusy(item.action);
    try {
      const result = await api<{ id?: string; note?: string }>('/api/content/' + resource, { ...input, action: item.action });
      setMessage(result.note || 'Saved'); onDone(result, item.action);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Request failed.'); }
    finally { setBusy(''); }
  }
  return <div className="stack action-bar">{children}
    {error && <div className="notice error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="notice success" role="status"><Icon name="check"/>{message}</div>}
    <div className="form-actions">{actions.map(item => <button type="button" key={item.action} className={item.tone} disabled={!!busy} onClick={() => run(item)}>
      {busy === item.action ? 'Saving…' : item.label}</button>)}</div>
  </div>;
}
export const photoSrc = (path?: string | null) => path && /\/([a-f0-9]{64})\.jpg$/.test(path) ? '/api/content/photo?id=' + path.match(/\/([a-f0-9]{64})\.jpg$/)![1] : '';
/** Uploads a photo (the server re-encodes it and strips metadata) and returns its public path and size. */
export function PhotoUpload({ onUploaded, label = 'Upload' }: { onUploaded: (photo: Photo) => void; label?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/content/upload', { method: 'POST', credentials: 'same-origin', body: file, headers: { 'Content-Type': file.type, 'x-quintaste-admin': '1' } });
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.error || 'Upload failed.');
      onUploaded(value as Photo);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }
  return <div className="stack compact"><label className="upload"><Icon name="photo" size={16}/>{busy ? 'Uploading…' : label}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}/></label>
    {error && <div className="notice error" role="alert"><Icon name="warning"/>{error}</div>}</div>;
}
export function History({ rows }: { rows: Audit[] }) {
  if (!rows.length) return <p className="muted">No changes</p>;
  return <ul className="history">{rows.map((row, i) => <li key={i}><strong>{actionLabel(row.action)}</strong>
    <small>{date(row.occurred_at)} · {row.actor ?? 'Staff'}</small><div>{row.reason}</div></li>)}</ul>;
}
/** One-tap filters that wrap instead of scrolling out of sight, each with how many items it holds. */
export function Chips({ options, value, onChange, label }: { options: [string, string, number?][]; value: string; onChange: (value: string) => void; label: string }) {
  return <div className="chips" role="group" aria-label={label}>{options.map(([id, text, n]) =>
    <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{text}{n !== undefined && <span className="chip-count">{n}</span>}</button>)}</div>;
}
/** "Last staff change" line with an optional link to the member-facing page. */
export function Edited({ staff, link }: { staff: Staff | null | undefined; link?: string | null }) {
  if (!staff && !link) return null;
  return <div className="row">{staff && <small>{date(staff.updatedAt)} · {staff.editor ?? 'Staff'}</small>}
    {link && <a className="row" href={link} target="_blank" rel="noreferrer">App<Icon name="external" size={14}/></a>}</div>;
}
export const money = (price: { amount: number | null; maxAmount?: number; type: string; currency: string }) =>
  price.amount === null ? '—' : (price.type === 'from' ? 'From ' : '') + (price.currency === 'SGD' ? 'S$' : '') + price.amount.toFixed(2) + (price.maxAmount ? '–' + price.maxAmount.toFixed(2) : '');
export const matches = (query: string, ...values: unknown[]) => !query.trim() || values.join(' ').toLowerCase().includes(query.trim().toLowerCase());
