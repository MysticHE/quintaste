'use client';
import { useState } from 'react';
import { api, failure, useResource } from './client';
import { Feedback, Mutation, Table } from './Primitives';
import { Icon } from './Icon';

type Ledger = { id: string; created_at: string; amount: number; kind: string; source: string; balance_after: number };
type Badge = { badge: string; name: string; earned_at: string; revoked_at: string | null; revoke_reason: string | null; shown: boolean };
type View = { ready: false } | { ready: true; credits: number; ledger: Ledger[]; badges: Badge[] };

/** Ledger and badge times in Singapore time, whatever the staff member's own clock says. */
const sgTime = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' });
};
const signed = (amount: number) => (amount > 0 ? '+' : '−') + Math.abs(amount).toLocaleString('en-SG');

/** A member's credits and badges (Accounts › Manage): Adjust credits and Revoke both need a reason and are audited. */
export default function Collection({ id }: { id: string }) {
  const resource = useResource<View>('/api/manage/collection?id=' + encodeURIComponent(id)), view = resource.data;
  const [revoking, setRevoking] = useState<Badge | null>(null);
  return <div className="stack compact">
    <h3>Collection</h3>
    <Feedback {...resource} retry={resource.reload}/>
    {view && !view.ready && <div className="notice"><Icon name="warning"/>Collection isn’t set up yet</div>}
    {view?.ready && <>
      <ul className="list inset"><li><span>Credits</span><span className="value strong">{view.credits.toLocaleString('en-SG')}</span></li></ul>
      <details><summary>Adjust credits</summary><div className="editor">
        <Mutation endpoint="collection" label="Adjust" reset onSaved={resource.reload}
          values={f => ({ id, action: 'adjust', amount: Number(f.get('amount')), reason: f.get('reason') })}>
          <label>Amount<input name="amount" type="number" inputMode="numeric" step={1} min={-10000} max={10000} required/></label>
          <label>Reason<textarea name="reason" rows={2} maxLength={300} required/></label>
        </Mutation></div></details>
      <h3>Badges</h3>
      <Table headings={['Badge', 'Earned', 'Status', '']} empty="No badges"
        rows={view.badges.map(b => [<strong key="n">{b.name}</strong>, sgTime(b.earned_at),
          b.revoked_at ? <span key="s" className="badge warn" title={b.revoke_reason ?? undefined}>Revoked {sgTime(b.revoked_at)}</span>
            : <span key="s" className="badge good">{b.shown ? 'Shown' : 'Earned'}</span>,
          b.revoked_at ? '' : <button type="button" key="r" aria-label={'Revoke ' + b.name} onClick={() => setRevoking(b)}>Revoke</button>])}/>
      {revoking && <Revoke key={revoking.badge} id={id} badge={revoking} onClose={() => setRevoking(null)} onSaved={() => { setRevoking(null); resource.reload(); }}/>}
      <h3>Credits history</h3>
      <Table headings={['When', 'Amount', 'Balance', 'Kind', 'Source']} empty="No credits yet"
        rows={view.ledger.map(r => [sgTime(r.created_at), <strong key="a">{signed(r.amount)}</strong>, r.balance_after.toLocaleString('en-SG'), r.kind, r.source])}/>
    </>}
  </div>;
}

/** The confirm step for Revoke: the badge leaves the member's profile at once. */
function Revoke({ id, badge, onClose, onSaved }: { id: string; badge: Badge; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function revoke() {
    if (busy || !reason.trim()) return;
    setBusy(true); setError('');
    try { await api('/api/manage/collection', { id, action: 'revoke', badge: badge.badge, reason: reason.trim() }); onSaved(); }
    catch (e) { setError(failure(e)); setBusy(false); }
  }
  return <div className="editor stack compact" role="group" aria-label={'Revoke ' + badge.name}>
    <strong>Revoke {badge.name}?</strong>
    <label>Reason<textarea rows={2} maxLength={300} value={reason} onChange={e => setReason(e.target.value)} autoFocus/></label>
    {error && <div className="notice error" role="alert"><Icon name="warning"/>{error}</div>}
    <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button>
      <button type="button" className="danger" disabled={busy || !reason.trim()} onClick={revoke}>{busy ? 'Revoking…' : 'Revoke'}</button></div>
  </div>;
}
