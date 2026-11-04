'use client';
import { useState } from 'react';
import Image from 'next/image';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, Pager, Segmented, Table, reveal } from './Primitives';

/** What the chefs (QT bots) decided in their admin lanes, and what they asked you (docs/ADMIN_CHEFS_PLAN.md). */
type Decision = { id: string; chef: string; lane: string; item: string; action: string; reason: string; evidence: Record<string, unknown>;
  confidence: number | null; review: string; why: string | null; mode: string; outcome: string; note: string; created_at: string;
  decided_at: string | null; decided_by: string | null; undoable: boolean };
const views = [['asked', 'Waiting for you'], ['done', 'Decided'], ['watched', 'Watching'], ['all', 'All']] as const;
const WHY: Record<string, string> = { disagree: 'Kaya disagreed', weak: 'Not sure enough', 'no-to-member': 'A no to a member',
  irreversible: 'Cannot be undone', rule: 'Lane asks you first', batch: 'Another batch' };
const OUTCOME: Record<string, string> = { watched: 'Would do', done: 'Done', asked: 'Waiting for you', approved: 'You approved',
  rejected: 'You turned down', undone: 'Undone', failed: 'Could not apply' };
const badge = (outcome: string) => 'badge ' + (['done', 'approved'].includes(outcome) ? 'good' : ['asked', 'failed'].includes(outcome) ? 'warn' : '');

export function Chefs({ initialId = '' }: { initialId?: string }) {
  const [view, setView] = useState('asked'); const [page, setPage] = useState(0); const [open, setOpen] = useState<string | null>(initialId || null);
  const resource = useResource<Decision[]>(`/api/manage/chef-decisions?view=${view}&page=${page}`);
  const exact = useResource<Decision[]>(open ? '/api/manage/chef-decisions?id=' + encodeURIComponent(open) : null);
  const selected = exact.data?.[0];
  return <>
    <div className="toolbar spread"><Segmented label="Show" value={view} onChange={v => { setView(v); setPage(0); setOpen(null); }} options={views}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['When', 'Chef', 'Lane', 'Item', 'Action', 'Status']} empty="Nothing here"
      rows={resource.data.map(d => [date(d.created_at), d.chef, d.lane,
        <button type="button" className="link" key="open" onClick={() => setOpen(d.id)}>{d.item}</button>, d.action,
        <span key="s" className={badge(d.outcome)}>{OUTCOME[d.outcome] ?? d.outcome}</span>])}/>
      <Pager page={page} setPage={setPage} count={resource.data.length}/></div>}
    {open && <Feedback {...exact} retry={exact.reload}/>}
    {open && exact.data && !selected && <p role="status">This issue is unavailable or you do not have access.</p>}
    {selected && <Detail key={selected.id + selected.outcome} decision={selected} onSaved={() => { resource.reload(); exact.reload(); }} onClose={() => setOpen(null)}/>}
  </>;
}

function Detail({ decision: d, onSaved, onClose }: { decision: Decision; onSaved: () => void; onClose: () => void }) {
  const facts: [string, string][] = [['Chef', d.chef + ' · ' + d.lane], ['Wants to', d.action + ' ' + d.item], ['Why', d.reason],
    ['Sure', d.confidence === null ? '—' : Math.round(d.confidence * 100) + '%'], ['Kaya', d.review === 'agree' ? 'Agreed' : 'Disagreed'],
    ['Asked you because', d.why ? WHY[d.why] ?? d.why : '—'], ['Lane was', d.mode === 'on' ? 'On' : 'Watching'],
    ['Result', [OUTCOME[d.outcome] ?? d.outcome, d.note, d.decided_by && 'by ' + d.decided_by].filter(Boolean).join(' · ')]];
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{d.item}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <ul className="list inset">{facts.map(([k, v]) => <li key={k}><span>{k}</span><span className="value">{v}</span></li>)}</ul>
    {typeof d.evidence.foodReview==='string' && <FoodEvidence id={d.evidence.foodReview}/>}
    {Object.keys(d.evidence).length > 0 && <details><summary>Evidence</summary><div className="code">{JSON.stringify(d.evidence, null, 1)}</div></details>}
    {d.outcome === 'asked' && (d.evidence.foodReview ? <div className="row">
      <Mutation endpoint="chef-decisions" label="Clear this food revision" onSaved={onSaved} values={f=>({id:d.id,action:'food-clear',reason:f.get('reason')})}><label>Reason<textarea name="reason" required minLength={10} maxLength={300}/></label></Mutation>
      <Mutation endpoint="chef-decisions" label="Hold this food revision" tone="danger" onSaved={onSaved} values={f=>({id:d.id,action:'food-hold',reason:f.get('reason')})}><label>Reason<textarea name="reason" required minLength={10} maxLength={300}/></label></Mutation>
    </div> : <div className="row">
      <Mutation endpoint="chef-decisions" label="Approve" onSaved={onSaved} values={() => ({ id: d.id, action: 'approve' })}/>
      <Mutation endpoint="chef-decisions" label="Turn down" tone="danger" onSaved={onSaved} values={() => ({ id: d.id, action: 'reject' })}/></div>)}
    {d.undoable && <details><summary>Undo</summary><div className="editor"><Mutation endpoint="chef-decisions" label="Undo" tone="danger" onSaved={onSaved}
      values={f => ({ id: d.id, action: 'undo', reason: f.get('reason') })}><label>Reason<textarea name="reason" rows={2} maxLength={300}/></label></Mutation></div></details>}
  </section>;
}

function FoodEvidence({id}:{id:string}){
  const resource=useResource<{kind:string;target:string;state:string;path:string|null;message:string;payload:{data:Record<string,unknown>};photos:{slot:string;digest:string}[]}>('/api/manage/food-review?id='+encodeURIComponent(id));
  const row=resource.data;
  return <div><Feedback {...resource} retry={resource.reload}/>{row&&<>
    <h3>Exact food revision</h3><p>{row.kind} · {row.target} · {row.state}</p>
    <div className="code">{JSON.stringify(row.payload.data,null,2)}</div>
    {row.photos.map(p=><figure key={p.slot}><Image unoptimized width={480} height={320} alt={'Submitted '+p.slot} style={{maxWidth:'100%',height:'auto',maxHeight:320,objectFit:'contain'}} src={'/api/manage/food-review-photo?id='+encodeURIComponent(id)+'&slot='+encodeURIComponent(p.slot)}/><figcaption>{p.slot}</figcaption></figure>)}
    {row.message&&<p>{row.message}</p>}
  </>}</div>;
}
