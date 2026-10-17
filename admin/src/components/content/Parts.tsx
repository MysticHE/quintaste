'use client';
import { useState, type ReactNode } from 'react';
import { api, date, VerifyAgain } from '../client';

export type Staff = { origin: 'edit' | 'staff'; hidden: boolean; version: number; updatedAt: string; editor: string | null; data: Record<string, unknown> };
export type Photo = { path: string; width: number; height: number };
export type Audit = { occurred_at: string; action: string; reason: string; actor: string | null };
type Action = { action: string; label: string; tone?: 'primary' | 'danger'; confirm?: string; extra?: Record<string, unknown> };

/** One status line for any content item. */
export function Badges({ hidden, edited, staff, newer, reports, extra }: { hidden?: boolean; edited?: boolean; staff?: boolean; newer?: boolean; reports?: number; extra?: string }) {
  return <span className="row badges">
    {hidden ? <span className="badge warn">Hidden</span> : <span className="badge good">Live</span>}
    {staff && <span className="badge">Added by staff</span>}
    {edited && <span className="badge">Edited</span>}
    {newer && <span className="badge warn">Newer data below</span>}
    {!!reports && <span className="badge warn">{reports} open {reports === 1 ? 'report' : 'reports'}</span>}
    {extra && <span className="badge">{extra}</span>}
  </span>;
}
/**
 * Every content change needs a reason for the audit log. When the security key must be verified again, the page stays
 * so unsaved edits survive: verify in a new tab, then press the button again.
 */
export function ActionBar({ resource, actions, payload, onDone, children }: {
  resource: string; actions: Action[]; payload: () => Record<string, unknown>; onDone: (result: { id?: string; note?: string }) => void; children?: ReactNode;
}) {
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(''), [error, setError] = useState(''), [verify, setVerify] = useState(false), [message, setMessage] = useState('');
  async function run(item: Action) {
    setError(''); setMessage(''); setVerify(false);
    if (reason.trim().length < 10) return setError('Give a reason of at least 10 characters for the audit record.');
    if (item.confirm && !window.confirm(item.confirm)) return;
    let input: Record<string, unknown>;
    try { input = payload(); } catch (problem) { return setError(problem instanceof Error ? problem.message : 'Check the form.'); }
    setBusy(item.action);
    try {
      const result = await api<{ id?: string; note?: string }>('/api/content/' + resource, { ...input, ...item.extra, action: item.action, reason }, undefined, true);
      setReason(''); setMessage(result.note || 'Saved. Members see the change within a minute.'); onDone(result);
    } catch (problem) { setVerify(problem instanceof VerifyAgain); setError(problem instanceof Error ? problem.message : 'Request failed.'); }
    finally { setBusy(''); }
  }
  return <div className="stack action-bar">{children}
    <label>Reason for this change<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={2} placeholder="Explain the change for the audit record."/></label>
    {error && <div className="notice error" role="alert">{error}{verify && <> <a href="/verify" target="_blank" rel="noopener">Verify your security key in a new tab</a>, then try again.</>}</div>}
    {message && <div className="notice success" role="status">{message}</div>}
    <div className="row">{actions.map(item => <button type="button" key={item.action} className={item.tone} disabled={!!busy} onClick={() => run(item)}>{busy === item.action ? 'Saving…' : item.label}</button>)}</div>
  </div>;
}
export const photoSrc = (path?: string | null) => path && /\/([a-f0-9]{64})\.jpg$/.test(path) ? '/api/content/photo?id=' + path.match(/\/([a-f0-9]{64})\.jpg$/)![1] : '';
/** Uploads a photo (the server re-encodes it and strips metadata) and returns its public path and size. */
export function PhotoUpload({ onUploaded, label = 'Upload photo' }: { onUploaded: (photo: Photo) => void; label?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [reason, setReason] = useState('');
  async function upload(file: File | undefined) {
    if (!file) return;
    if (reason.trim().length < 10) return setError('Give a reason of at least 10 characters for this photo first.');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/content/upload', { method: 'POST', credentials: 'same-origin', body: file, headers: { 'Content-Type': file.type, 'x-quintaste-admin': '1', 'x-quintaste-reason': encodeURIComponent(reason.trim()) } });
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 428 ? 'Verify your security key again (Security keys page), then upload.' : value.error || 'Upload failed.');
      onUploaded(value as Photo);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }
  return <div className="stack compact"><label>Reason for this photo<input value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} placeholder="Where the photo comes from and why it is used"/></label>
    <label className="upload">{busy ? 'Uploading…' : label}
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}/></label>
    {error && <div className="notice error" role="alert">{error}</div>}</div>;
}
export function History({ rows }: { rows: Audit[] }) {
  if (!rows.length) return <p className="muted">No staff changes yet.</p>;
  return <ul className="history">{rows.map((row, i) => <li key={i}><strong>{row.action.replace(/^content\./, '').replaceAll('.', ' · ')}</strong>
    <span className="muted"> {date(row.occurred_at)} · {row.actor ?? 'Staff'}</span><div>{row.reason}</div></li>)}</ul>;
}
/** Search box plus one-tap filters for a content list. */
export function ListTools({ query, setQuery, filters, filter, setFilter, children }: {
  query: string; setQuery: (v: string) => void; filters: [string, string][]; filter: string; setFilter: (v: string) => void; children?: ReactNode;
}) {
  return <div className="stack compact list-tools">
    <div className="row"><label className="grow">Search<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, area or id"/></label>{children}</div>
    <div className="chips" role="group" aria-label="Filter">{filters.map(([value, label]) =>
      <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
  </div>;
}
export const money = (price: { amount: number | null; maxAmount?: number; type: string; currency: string }) =>
  price.amount === null ? 'Price unknown' : (price.type === 'from' ? 'From ' : '') + (price.currency === 'SGD' ? 'S$' : '') + price.amount.toFixed(2) + (price.maxAmount ? '–' + price.maxAmount.toFixed(2) : '');
export const matches = (query: string, ...values: unknown[]) => !query.trim() || values.join(' ').toLowerCase().includes(query.trim().toLowerCase());
