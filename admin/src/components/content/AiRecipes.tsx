'use client';
import { useState } from 'react';
import Link from 'next/link';
import { date, useResource } from '../client';
import { Empty, Feedback, Mutation, Segmented } from '../Primitives';
import { Icon } from '../Icon';
import { Moderation } from './MemberContent';
import { MemberRecipes } from './MemberRecipes';

export type AiSummary = { installed: false } | { installed: true; enabled: boolean; version: number; dailyCap: number; today: number; queued: number; working: number;
  waiting: number; failedToday: number; publishedToday: number; reviewToday: number };
type Job = { id: string; kind: 'video' | 'request'; status: string; attempts: number; message: string; recipe_id: string | null; created_at: string; finished_at: string | null;
  input: string; calls: number; bytes: number | null; username: string; title: string | null; confidence: number | null };
const tone: Record<string, string> = { published: 'good', failed: 'danger', review: 'warn', queued: '', working: '' };

/** AI recipe operations: what the worker did today, the daily limit, low-confidence recipes waiting for a person, and every job. */
export default function AiRecipes({ canLimit }: { canLimit: boolean }) {
  const summary = useResource<AiSummary>('/api/content/ai-summary'), s = summary.data;
  const [view, setView] = useState<'review' | 'jobs'>('review');
  if (s && !s.installed) return <div className="panel"><Empty icon="wand">AI recipes are not installed on this server yet</Empty></div>;
  return <>
    <Feedback {...summary} retry={summary.reload}/>
    {s?.installed && <>
      {!s.enabled && <div className="notice warn"><Icon name="warning"/>Members cannot start AI recipes: the feature is off.<Link className="button" href="/console/features">Features</Link></div>}
      <ul className="list">
        <li><span>Started today</span><span className="value strong">{s.today} <small>of {s.dailyCap}</small></span></li>
        <li><span>Working now</span><span className="value">{s.queued + s.working ? `${s.working} working · ${s.queued} queued` : 'Idle'}</span></li>
        <li><span>Published today</span><span className="value">{s.publishedToday}</span></li>
        <li><span>Failed today</span><span className="value">{s.failedToday ? <span className="badge danger">{s.failedToday}</span> : 0}</span></li>
      </ul>
      {canLimit && <details className="panel"><summary>Daily limit for all members</summary>
        <Mutation key={s.version} endpoint="ai-limit" label="Save limit" onSaved={summary.reload} values={f => ({ dailyCap: Number(f.get('dailyCap')), version: s.version })}>
          <div className="fields"><label>AI recipes a day, across all members<input name="dailyCap" type="number" min={0} max={10000} step={1} required defaultValue={s.dailyCap}/></label></div>
          <small>Each member can still start three a day. 0 pauses new requests without turning the feature off.</small>
        </Mutation></details>}
    </>}
    <Segmented label="AI recipes" value={view} onChange={v => setView(v as 'review' | 'jobs')}
      options={[['review', s?.installed && s.waiting ? `Needs review (${s.waiting})` : 'Needs review'], ['jobs', 'All jobs']]}/>
    {view === 'review' ? <MemberRecipes origin="ai"/> : <Jobs/>}
  </>;
}

function Jobs() {
  return <Moderation<Job> path="/api/content/ai-jobs" statuses={[['all', 'All'], ['failed', 'Failed'], ['review', 'Sent to review'], ['published', 'Published'], ['queued', 'Queued'], ['working', 'Working']]}
    render={j => <>
      <div className="row spread"><strong>{j.title ?? (j.kind === 'video' ? 'Video' : 'Request')}</strong><span className={'badge ' + (tone[j.status] ?? '')}>{j.status === 'review' ? 'sent to review' : j.status}</span></div>
      <small>{j.username} · {date(j.created_at)}{j.finished_at ? ' · took ' + Math.max(1, Math.round((Date.parse(j.finished_at) - Date.parse(j.created_at)) / 1000)) + ' s' : ''}
        {' · '}{j.calls} model {j.calls === 1 ? 'call' : 'calls'}{j.bytes ? ' · ' + (j.bytes / 1048576).toFixed(1) + ' MB video' : ''}{j.attempts > 1 ? ' · ' + j.attempts + ' attempts' : ''}
        {j.confidence !== null ? ' · ' + Math.round(j.confidence * 100) + '% confidence' : ''}</small>
      <p className="detail">{/^https?:\/\//.test(j.input) ? <a href={j.input} target="_blank" rel="noreferrer">{j.input}</a> : j.input}</p>
      {j.message && <p className={j.status === 'failed' ? 'notice error' : 'muted'}>{j.message}</p>}
    </>} act={() => null}/>;
}
