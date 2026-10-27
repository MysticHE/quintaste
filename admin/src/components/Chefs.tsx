'use client';
import { useState } from 'react';
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

export function Chefs() {
  const [view, setView] = useState('asked'); const [page, setPage] = useState(0); const [open, setOpen] = useState<string | null>(null);
  const resource = useResource<Decision[]>(`/api/manage/chef-decisions?view=${view}&page=${page}`);
  const selected = resource.data?.find(d => d.id === open);
  return <>
    <div className="toolbar spread"><Segmented label="Show" value={view} onChange={v => { setView(v); setPage(0); setOpen(null); }} options={views}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['When', 'Chef', 'Lane', 'Item', 'Action', 'Status']} empty="Nothing here"
      rows={resource.data.map(d => [date(d.created_at), d.chef, d.lane,
        <button type="button" className="link" key="open" onClick={() => setOpen(d.id)}>{d.item}</button>, d.action,
        <span key="s" className={badge(d.outcome)}>{OUTCOME[d.outcome] ?? d.outcome}</span>])}/>
      <Pager page={page} setPage={setPage} count={resource.data.length}/></div>}
    {selected && <Detail key={selected.id + selected.outcome} decision={selected} onSaved={resource.reload} onClose={() => setOpen(null)}/>}
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
    {Object.keys(d.evidence).length > 0 && <details><summary>Evidence</summary><div className="code">{JSON.stringify(d.evidence, null, 1)}</div></details>}
    {d.outcome === 'asked' && <div className="row">
      <Mutation endpoint="chef-decisions" label="Approve" onSaved={onSaved} values={() => ({ id: d.id, action: 'approve' })}/>
      <Mutation endpoint="chef-decisions" label="Turn down" tone="danger" onSaved={onSaved} values={() => ({ id: d.id, action: 'reject' })}/></div>}
    {d.undoable && <details><summary>Undo</summary><div className="editor"><Mutation endpoint="chef-decisions" label="Undo" tone="danger" onSaved={onSaved}
      values={f => ({ id: d.id, action: 'undo', reason: f.get('reason') })}><label>Reason<textarea name="reason" rows={2} maxLength={300}/></label></Mutation></div></details>}
  </section>;
}
