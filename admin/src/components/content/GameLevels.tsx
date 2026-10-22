'use client';
import { useState } from 'react';
import { date } from '../client';
import { Segmented } from '../Primitives';
import { Moderation } from './MemberContent';
import { ActionBar } from './Parts';

type Slot = { key: string; label: string; accepts: string[]; optional?: boolean };
type Stage = { slots: Slot[]; secs: number; hint: string; band?: [number, number]; scorchSecs?: number };
type Pack = { techniques: string[]; items: { id: string; name: string; tags?: string[] }[];
  dishes: { id: string; name: string; remember: string; parts: { id: string; name: string; station: string; stages: Stage[] }[] }[] };
type Level = { id: string; recipe_id: string; recipe_revision: number; status: string; created_at: string; reviewed_at: string | null; reviewed_by: string | null;
  owner: string | null; pack: Pack; unpictured: number; plays: number };
type Picture = { id: string; width: number; height: number; status: string; created_at: string; reviewed_by: string | null; prompt: string | null; model: string | null;
  checks: Record<string, unknown> | null; art_key: string | null; kind: string | null; subject: string | null; current: boolean };
type Job = { id: string; art_key: string; kind: string; subject: string; details: string; status: string; attempts: number; error: string; created_at: string; drafts: number };
/** A built-in game item id as words ("cooking-oil" → "Cooking oil"); look-alike pairs drop their A/B letter. */
const words = (id: string) => { const s = id.replace(/-[ab]$/, '').replace(/-/g, ' '); return s[0].toUpperCase() + s.slice(1); };
const STATION: Record<string, string> = { pan: 'Wok', pot: 'Soup pot', rice: 'Rice cooker', board: 'Assembly board', dessert: 'Dessert pot' };

/** Recipe levels waiting for review, QT Gamer's pictures waiting for the artist, and the picture jobs themselves. */
export function GameLevels() {
  const [view, setView] = useState<'levels' | 'pictures' | 'jobs'>('levels');
  return <div className="stack">
    <Segmented label="Game levels" value={view} onChange={v => setView(v as typeof view)} options={[['levels', 'Levels'], ['pictures', 'Pictures'], ['jobs', 'Picture jobs']]}/>
    {view === 'levels' ? <Levels/> : view === 'pictures' ? <Pictures/> : <Jobs/>}
  </div>;
}

function Levels() {
  return <Moderation<Level> path="/api/content/game-levels" statuses={[['review', 'Needs review'], ['ready', 'Live'], ['hidden', 'Hidden']]}
    render={l => { const dish = l.pack.dishes[0], name = (id: string) => l.pack.items.find(i => i.id === id)?.name ?? words(id);
      return <>
        <div className="row spread"><strong>{dish?.name ?? l.recipe_id}</strong>
          <span className="row">{l.owner ? <span className="badge">Private · {l.owner}</span> : <span className="badge">Public</span>}
            {l.unpictured > 0 && <span className="badge warn">{l.unpictured} without a picture</span>}</span></div>
        <small>{l.recipe_id} · revision {l.recipe_revision} · {l.pack.techniques.map(t => STATION[t] ?? t).join(', ')} · {l.plays} {l.plays === 1 ? 'play' : 'plays'}
          {' · '}{date(l.created_at)}{l.reviewed_by ? ' · reviewed by ' + l.reviewed_by : ''}</small>
        {dish && <p className="detail">{dish.remember}</p>}
        <details><summary>Stages</summary>{l.pack.dishes.map(d => d.parts.map(p => <div key={d.id + p.id} className="stack compact">
          <strong>{p.name} · {STATION[p.station] ?? p.station}</strong>
          <ol>{p.stages.map((s, n) => <li key={n}>{s.slots.map(x => x.label + (x.optional ? ' (optional)' : '') + ': ' + x.accepts.map(name).join(' or ')).join(' · ')}
            <small className="muted"> · {s.secs} s{s.band ? ' · heat ' + Math.round(s.band[0] * 100) + '–' + Math.round(s.band[1] * 100) + '%' : ''}{s.scorchSecs ? ' · burns fast' : ''}</small></li>)}</ol>
        </div>))}</details>
        {!!l.pack.items.length && <small>New ingredients: {l.pack.items.map(i => i.name + (i.tags?.length ? ' (' + i.tags.join(', ') + ')' : '')).join(', ')}</small>}
      </>; }}
    act={(l, _status, done) => <ActionBar resource="game-levels" payload={() => ({ id: l.id })} onDone={done}
      actions={l.status === 'review' ? [{ action: 'approve', label: 'Approve' }, { action: 'hide', label: 'Hide', tone: 'danger' }]
        : l.status === 'ready' ? [{ action: 'hide', label: 'Hide', tone: 'danger' }] : [{ action: 'restore', label: 'Show again' }]}/>}/>;
}

function Pictures() {
  return <Moderation<Picture> path="/api/content/game-pictures" search={false} statuses={[['draft', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Set aside']]}
    render={p => <>
      <div className="row spread"><strong>{p.subject ?? 'Picture'}</strong>
        <span className="row">{p.kind && <span className="badge">{p.kind}</span>}{p.current && <span className="badge good">In use</span>}</span></div>
      {/* eslint-disable-next-line @next/next/no-img-element -- staff preview of a draft sprite, served privately */}
      <img className="sprite" src={'/api/content/game-picture?id=' + p.id} alt={p.subject ? 'Draft picture of ' + p.subject : 'Draft picture'} width={160} height={160}/>
      <small>{p.art_key ?? ''} · {p.width} × {p.height} · {date(p.created_at)}{p.model ? ' · ' + p.model : ''}{p.reviewed_by ? ' · ' + p.reviewed_by : ''}</small>
      {p.prompt && <details><summary>Prompt</summary><p className="detail">{p.prompt}</p></details>}
    </>}
    act={(p, _status, done) => p.status === 'draft' ? <ActionBar resource="game-pictures" payload={() => ({ id: p.id })} onDone={done}
      actions={[{ action: 'approve', label: 'Approve' }, { action: 'reject', label: 'Set aside', tone: 'danger' }]}/>
      : p.art_key ? <Redo artKey={p.art_key} done={done}/> : null}/>;
}

function Jobs() {
  return <Moderation<Job> path="/api/content/game-pictures?jobs=1" search={false} statuses={[['jobs', 'Open and failed']]}
    render={j => <>
      <div className="row spread"><strong>{j.subject}</strong><span className={'badge ' + (j.status === 'failed' ? 'danger' : '')}>{j.status}</span></div>
      <small>{j.art_key} · {j.kind} · {date(j.created_at)}{j.attempts > 1 ? ' · ' + j.attempts + ' attempts' : ''}</small>
      {j.details && <p className="muted">{j.details}</p>}
      {j.error && <p className="notice error">{j.error}</p>}
    </>}
    act={(j, _status, done) => j.status === 'failed' ? <Redo artKey={j.art_key} done={done}/> : null}/>;
}

/** Asks QT Gamer for a new picture of an art key, with optional notes on what to change. */
function Redo({ artKey, done }: { artKey: string; done: () => void }) {
  const [details, setDetails] = useState('');
  return <details><summary>Draw again</summary>
    <ActionBar resource="game-pictures" payload={() => ({ artKey, details })} onDone={done} actions={[{ action: 'redo', label: 'Draw again' }]}>
      <label>Notes for QT Gamer<input value={details} maxLength={400} onChange={e => setDetails(e.target.value)} placeholder="What to change"/></label>
    </ActionBar></details>;
}
