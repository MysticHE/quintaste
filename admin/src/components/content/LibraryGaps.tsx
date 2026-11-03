'use client';
import { useState } from 'react';
import { date } from '../client';
import { Moderation } from './MemberContent';
import { ActionBar } from './Parts';

type Words = { en: string; zh: string };
type DishDraft = { name: Words; aliases: string[]; cuisine: string; category: string; serving: number; parts: { name: string; grams: number; role: string }[]; sources: string[] };
type FoodDraft = { name: Words; what: string; per100: Record<string, number>; source: { name: string; url: string }; roles: string[]; contains: string[]; sources: string[] };
type SwapDraft = { rules: { to: string; basis: string; factor?: number; keeps: string[]; failsIn: string[]; note?: Words; step?: Words; reason: string }[]; sources: string[] };
type Gap = { id: string; kind: 'dish' | 'food' | 'swap'; key: string; label: string; context: Record<string, string>; hits: number; members: number; status: string;
  draft: (Partial<DishDraft & FoodDraft & SwapDraft> & { skip?: string }) | null; error: string; note: string; attempts: number; last_seen: string; drafted_at: string | null };
const kindName = { dish: 'Dish card', food: 'Food', swap: 'Swap rules' } as const;
const tone: Record<string, string> = { drafted: 'warn', approved: 'good', shipped: 'good', rejected: 'danger', failed: 'danger' };
const label: Record<string, string> = { open: 'collecting', queued: 'drafting', claimed: 'drafting', drafted: 'to review', approved: 'approved', shipped: 'in the library', rejected: 'rejected', failed: 'failed' };

/**
 * Library gaps: what members hit that the reviewed library lacks. The QT bots draft an addition at 3 members (or Draft now); staff
 * read it with its sources and approve or reject. Dish cards and swap rules are used within five minutes; foods with the next release.
 */
export function LibraryGaps() {
  return <>
    <p className="row"><a className="button" href="/api/content/library-foods" download>Download Approved Foods</a></p>
    <Moderation<Gap> path="/api/content/library-gaps"
    statuses={[['review', 'To review'], ['drafting', 'Drafting'], ['collecting', 'Collecting'], ['approved', 'Approved'], ['shipped', 'In library'], ['rejected', 'Rejected'], ['failed', 'Failed']]}
    render={g => <>
      <div className="row spread"><strong>{g.label}{g.context?.zh && g.context.zh !== g.label ? ' · ' + g.context.zh : ''}</strong>
        <span className={'badge ' + (tone[g.status] ?? '')}>{label[g.status] ?? g.status}</span></div>
      <small>{kindName[g.kind]} · {g.members} {g.members === 1 ? 'member' : 'members'} · {g.hits} {g.hits === 1 ? 'time' : 'times'} · last {date(g.last_seen)}
        {g.context?.recipe ? ' · in ' + g.context.recipe : ''}{g.attempts > 1 ? ' · ' + g.attempts + ' tries' : ''}</small>
      {g.draft && <Draft gap={g}/>}
      {g.error && g.status !== 'drafted' && <p className="notice error">{g.error}</p>}
      {g.note && <p className="muted">{g.note}</p>}
    </>}
    act={(g, _status, done) => <Actions row={g} done={done}/>}/>
  </>;
}

function Draft({ gap }: { gap: Gap }) {
  const d = gap.draft!;
  if (d.skip) return <p className="notice warn">The bots say this is not a real {gap.kind === 'dish' ? 'dish' : 'food'}: {d.skip}</p>;
  return <details open={gap.status === 'drafted'}><summary>Draft</summary><div className="stack compact">
    {gap.kind === 'dish' && d.parts && <>
      <p className="detail">{d.name?.en} · {d.name?.zh} · {d.cuisine} · {d.category} · {d.serving} g a serving{d.aliases?.length ? ' · also ' + d.aliases.join(', ') : ''}</p>
      <ul className="list">{d.parts.map(p => <li key={p.name}><span>{p.name}</span><span className="value">{p.grams} g · {p.role}</span></li>)}</ul></>}
    {gap.kind === 'food' && d.per100 && <>
      <p className="detail">{d.name?.en} · {d.name?.zh}{d.what ? ' · ' + d.what : ''}</p>
      <ul className="list">{Object.entries(d.per100).map(([k, v]) => <li key={k}><span>{k}</span><span className="value">{v}{k === 'kcal' ? '' : k === 'sodium' ? ' mg' : ' g'} per 100 g</span></li>)}</ul>
      <small>From {d.source?.url ? <a href={d.source.url} target="_blank" rel="noreferrer">{d.source.name}</a> : d.source?.name} · roles {d.roles?.join(', ')}
        {d.contains?.length ? ' · contains ' + d.contains.join(', ') : ''}</small></>}
    {gap.kind === 'swap' && d.rules && <ul className="list">{d.rules.map(r => <li key={r.to} className="stack compact">
      <span><strong>{gap.label} → {r.to.replace(/_/g, ' ')}</strong> · {r.basis === 'factor' ? 'factor ' + r.factor : 'same ' + r.basis} · keeps {r.keeps.join(', ')}
        {r.failsIn?.length ? ' · not for ' + r.failsIn.join(', ') : ''}</span>
      {(r.note || r.step) && <small>{(r.step ?? r.note)!.en} · {(r.step ?? r.note)!.zh}</small>}
      <small className="muted">{r.reason}</small></li>)}</ul>}
    {!!d.sources?.length && <small>Sources: {d.sources.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer">{i ? ', ' : ''}{new URL(u).hostname}</a>)}</small>}
  </div></details>;
}

function Actions({ row, done }: { row: Gap; done: () => void }) {
  const [note, setNote] = useState('');
  const can = (statuses: string[]) => statuses.includes(row.status);
  const ready = row.status === 'drafted' && !!row.draft && !row.draft.skip;
  return <>
    {ready && <ActionBar resource="library-gaps" payload={() => ({ id: row.id })} onDone={done} actions={[{ action: 'approve', label: 'Approve' }]}/>}
    {can(['open', 'rejected', 'failed']) && <ActionBar resource="library-gaps" payload={() => ({ id: row.id })} onDone={done} actions={[{ action: 'draft', label: 'Draft Now' }]}/>}
    {can(['drafted', 'failed', 'open', 'queued']) && <details><summary>Reject</summary>
      <ActionBar resource="library-gaps" payload={() => ({ id: row.id, note })} onDone={done} actions={[{ action: 'reject', label: 'Reject', tone: 'danger' }]}>
        <label>Why (optional)<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2}/></label></ActionBar></details>}
    {row.kind === 'food' && can(['approved']) && <ActionBar resource="library-gaps" payload={() => ({ id: row.id })} onDone={done} actions={[{ action: 'ship', label: 'Mark As Added' }]}/>}
    {can(['approved']) && <details><summary>Withdraw</summary>
      <ActionBar resource="library-gaps" payload={() => ({ id: row.id, note })} onDone={done} actions={[{ action: 'withdraw', label: 'Withdraw', tone: 'danger' }]}>
        <label>Why (optional)<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2}/></label></ActionBar></details>}
  </>;
}
