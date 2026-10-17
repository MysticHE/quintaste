'use client';
import { useState, type ReactNode, type FormEvent } from 'react';
import { api } from './client';

export function Feedback({ error, loading, retry }: { error: string; loading: boolean; retry: () => void }) {
  if (loading) return <p className="loading" role="status">Loading workspace…</p>;
  return error ? <div className="notice error" role="alert">{error} <button onClick={retry}>Try again</button></div> : null;
}
export function Mutation({ endpoint, values, onSaved, children, label = 'Save change' }: {
  endpoint: string; values: (form: FormData) => Record<string, unknown>; onSaved: () => void; children?: ReactNode; label?: string;
}) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [message,setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ note?: string; status?: string }>(`/api/manage/${endpoint}`, { ...values(form), reason: form.get('reason') });
      setMessage(result.note || (result.status ? result.status.replaceAll('_',' ') : 'Change saved.')); onSaved();
    } catch(error) { setError(error instanceof Error ? error.message : 'Request failed.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="stack">{children}
    <label>Reason for this action<textarea name="reason" required minLength={10} maxLength={1000} placeholder="Explain the decision for the audit record."/></label>
    {error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice success" role="status">{message}</div>}
    <div><button className="primary" disabled={busy}>{busy ? 'Saving…' : label}</button></div>
  </form>;
}
export function Table({ headings, rows, empty = 'No records to show.' }: { headings: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return <div className="table-wrap" role="region" aria-label={headings.join(', ')} tabIndex={0}><table><thead><tr>{headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
