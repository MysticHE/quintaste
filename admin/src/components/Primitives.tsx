'use client';
import { useState, type ReactNode, type FormEvent } from 'react';
import { api } from './client';
import { Icon, type IconName } from './Icon';
import { pageSize } from '../lib/paging';

/** Scrolls a detail panel into view when it opens below a long list. */
export const reveal = (node: HTMLElement | null) => { node?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
export function Feedback({ error, loading, retry }: { error: string; loading: boolean; retry: () => void }) {
  if (loading) return <div className="loading" role="status" aria-label="Loading"><span/><span/><span/></div>;
  return error ? <div className="notice error" role="alert"><Icon name="warning"/>{error}<button type="button" onClick={retry}>Try again</button></div> : null;
}
export function Empty({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={34}/>{children}</div>;
}
/** A form whose submit is audited: every change carries a reason. Create forms pass `reset` so a second click cannot repeat the save. */
export function Mutation({ endpoint, values, onSaved, children, label = 'Save', tone = 'primary', reset = false }: {
  endpoint: string; values: (form: FormData) => Record<string, unknown>; onSaved: () => void; children?: ReactNode; label?: string; tone?: 'primary' | 'danger'; reset?: boolean;
}) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [message,setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, data = new FormData(form);
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api<{ note?: string; status?: string }>(`/api/manage/${endpoint}`, { ...values(data), reason: data.get('reason') });
      const reasonField = form.elements.namedItem('reason');
      if (reset) form.reset(); else if (reasonField instanceof HTMLTextAreaElement) reasonField.value = '';
      setMessage(result.note || (result.status ? result.status.replaceAll('_',' ') : 'Saved')); onSaved();
    } catch(error) { setError(error instanceof Error ? error.message : 'Request failed.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="stack">{children}
    <label>Reason<textarea name="reason" required minLength={10} maxLength={1000} rows={2}/></label>
    {error && <div className="notice error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="notice success" role="status"><Icon name="check"/>{message}</div>}
    <div className="form-actions"><button className={tone} disabled={busy}>{busy ? 'Saving…' : label}</button></div>
  </form>;
}
export function Table({ headings, rows, empty = 'Nothing here' }: { headings: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return <div className="table-wrap" role="region" aria-label={headings.join(', ')} tabIndex={0}><table><thead><tr>{headings.map((h,i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function SearchField({ value, onChange, label, maxLength = 60, autoFocus }: { value: string; onChange: (value: string) => void; label: string; maxLength?: number; autoFocus?: boolean }) {
  return <div className="search"><Icon name="search" size={16}/><input type="search" aria-label={label} placeholder={label} value={value} maxLength={maxLength}
    autoFocus={autoFocus} onChange={e => onChange(e.target.value)}/></div>;
}
export function Segmented({ options, value, onChange, label }: { options: readonly (readonly [string, string])[]; value: string; onChange: (value: string) => void; label: string }) {
  return <div className="segmented" role="group" aria-label={label}>{options.map(([id, text]) =>
    <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div>;
}
/** Previous/next for server lists that return up to `pageSize` rows per page. */
export function Pager({ page, setPage, count }: { page: number; setPage: (page: number) => void; count: number }) {
  if (!page && count < pageSize) return null;
  return <div className="form-actions pager"><button type="button" disabled={!page} onClick={() => setPage(page - 1)}><Icon name="back" size={16}/>Previous</button>
    <small>Page {page + 1}</small><button type="button" disabled={count < pageSize} onClick={() => setPage(page + 1)}>Next<Icon name="forward" size={16}/></button></div>;
}
export function IconButton({ icon, label, onClick, disabled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="icon-button" aria-label={label} title={label} disabled={disabled} onClick={onClick}><Icon name={icon}/></button>;
}
