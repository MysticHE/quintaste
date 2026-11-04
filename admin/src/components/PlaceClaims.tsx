'use client';
import { useState } from 'react';
import Link from 'next/link';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, Segmented, Table, reveal } from './Primitives';

type Row = { id: string; state: string; created_at: string; place: string; role: string; finding: string | null; outcome: string | null };
type Detail = { id: string; revision: number; state: string; message: string; created_at: string;
  payload: { place: { id: string; name: string; branch: string; address: string }; role: string; pageUrl: string; code: string };
  result: { coco?: { decision: string; reason: string }; pandan?: { decision: string; official?: boolean; codeFound?: boolean; reason: string; checkedAt?: string }; outcome?: { kind: string } };
  account: { username: string; name: string; created: string } | null; confirmed: { role: string; created_at: string; username: string }[] };

const views = [['waiting', 'Waiting'], ['all', 'All']] as const;
const label = (r: { state: string; finding?: string | null; outcome?: string | null }) => r.outcome === 'approved' ? 'Confirmed' : r.outcome === 'declined' ? 'Declined'
  : r.state === 'staff' ? (r.finding === 'verified' ? 'Code found' : 'Needs a decision') : r.state === 'needs-input' ? 'Asked the member' : 'Checking';

/** Owner checks: a member says they run a listed place; staff confirm or decline after seeing what the page showed. */
export default function PlaceClaims({ initialId = '' }: { initialId?: string }) {
  const [view, setView] = useState('waiting'), [selected, setSelected] = useState<string | null>(initialId || null);
  const resource = useResource<Row[]>('/api/manage/place-claims?view=' + view);
  return <>
    <div className="toolbar spread"><Segmented label="Show" value={view} onChange={v => { setView(v); setSelected(null); }} options={views}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Place', 'Role', 'Status', 'Sent']} empty="No owner checks"
      rows={resource.data.map(r => [<button type="button" className="link" key="open" onClick={() => setSelected(r.id)}>{r.place}</button>, r.role,
        <span key="s" className={'badge ' + (r.state === 'staff' ? 'warn' : r.outcome === 'approved' ? 'good' : '')}>{label(r)}</span>, date(r.created_at)])}/></div>}
    {selected && <ClaimDetail key={selected} id={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}
function ClaimDetail({ id, onSaved, onClose }: { id: string; onSaved: () => void; onClose: () => void }) {
  const resource = useResource<Detail>('/api/manage/place-claims?id=' + encodeURIComponent(id)), d = resource.data;
  const saved = () => { resource.reload(); onSaved(); };
  const decide = (action: string, extra: (f: FormData) => Record<string, unknown> = () => ({})) => (f: FormData) => ({ id, revision: d!.revision, action, reason: f.get('reason') || undefined, ...extra(f) });
  const open = d && ['staff', 'needs-input'].includes(d.state), p = d?.result.pandan;
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{d?.payload.place.name || 'Owner check'}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {d && <div className="stack">
      <div className="row badges"><span className="badge">{label({ state: d.state, finding: p?.decision, outcome: d.result.outcome?.kind })}</span></div>
      {!!d.message && <p className="muted">{d.message}</p>}
      <ul className="list inset">{([['Place', <Link key="p" href={'/console/places?id=' + encodeURIComponent(d.payload.place.id)}>{[d.payload.place.name, d.payload.place.branch].filter(Boolean).join(' · ')}</Link>],
        ['Address', d.payload.place.address], ['Role', d.payload.role], ['Account', d.account ? `${d.account.username || d.account.name} · since ${date(d.account.created)}` : 'Gone'],
        ['Page', <a key="u" href={d.payload.pageUrl} target="_blank" rel="noreferrer noopener">{d.payload.pageUrl}</a>], ['Code', d.payload.code]] as const)
        .map(([k, v]) => <li key={k}><span>{k}</span><span className="value">{v}</span></li>)}</ul>
      {d.result.coco && <p><strong>Coco</strong> · {d.result.coco.decision} · {d.result.coco.reason}</p>}
      {p && <p><strong>Pandan</strong> · {p.decision === 'verified' ? 'The code is on the place’s own page' : p.decision === 'staff' ? 'Could not check' : p.decision === 'unreadable' ? 'The page could not be read' : 'Not confirmed'}
        {p.codeFound !== undefined ? ` · code ${p.codeFound ? 'found' : 'not found'} in the fetched page` : ''}{p.official !== undefined ? ` · ${p.official ? 'the place’s own page' : 'not the place’s own page'}` : ''} · {p.reason}</p>}
      {!!d.confirmed.length && <p className="muted">Already confirmed for this place: {d.confirmed.map(c => `${c.username} (${c.role})`).join(', ')}</p>}
      {open && <>
        <details open={p?.decision === 'verified'}><summary>Confirm</summary><div className="editor">
          <Mutation endpoint="place-claims" onSaved={saved} label="Confirm they run it" values={decide('approve', f => ({ override: f.get('override') === 'on' }))}>
            {p?.decision !== 'verified' && <label className="check"><input type="checkbox" name="override"/>I checked the page myself and the code is there</label>}
            <label>Reason<input name="reason" maxLength={1000} placeholder="Code on the official page"/></label></Mutation></div></details>
        <details><summary>Ask the member</summary><div className="editor">
          <Mutation endpoint="place-claims" onSaved={saved} label="Send question" values={decide('ask', f => ({ message: f.get('message') }))}>
            <label>Message the member sees<textarea name="message" rows={3} maxLength={600} required/></label></Mutation></div></details>
        <details><summary>Decline</summary><div className="editor">
          <Mutation endpoint="place-claims" onSaved={saved} label="Decline" tone="danger" values={decide('decline', f => ({ message: f.get('message') }))}>
            <label>Reason the member sees<textarea name="message" rows={3} maxLength={600} required/></label></Mutation></div></details>
      </>}
      {['staff', 'needs-input', 'resolved'].includes(d.state) && d.result.outcome?.kind !== 'approved' && <details><summary>Check again</summary><div className="editor">
        <Mutation endpoint="place-claims" onSaved={saved} label="Send back to Coco and Pandan" values={decide('recheck')}/></div></details>}
      {d.result.outcome?.kind === 'approved' && <details><summary>Remove confirmation</summary><div className="editor">
        <Mutation endpoint="place-claims" onSaved={saved} label="Remove" tone="danger" values={decide('revoke')}>
          <label>Reason<input name="reason" maxLength={1000} required minLength={10}/></label></Mutation></div></details>}
    </div>}
  </section>;
}
