'use client';
import { useState } from 'react';
import Link from 'next/link';
import { date, useResource } from './client';
import { Feedback, IconButton, Mutation, Segmented, Table, reveal } from './Primitives';

type Place = { name: string; branch?: string; address: string; unit?: string; postalCode: string; kitchen: 'veg' | 'mixed'; venueDiet?: string; alliumFreeClaim?: boolean };
type Row = { id: string; revision: number; state: string; message: string; created_at: string; place: Place; draft: string | null; outcome: string | null; members: number };
type Check = { status: string; url: string; checkedAt: string; note?: string };
type Draft = { decision: string; reason?: string; placeId?: string; place?: Place; checks?: { googleSearch: Check; googleMaps: Check };
  dishes?: { name: string; price: { amount: number | null }; diet: string | null; sourceUrl: string }[]; dietProof?: { sourceUrl: string; quote: string } | null;
  hours?: { summary: string } | null; sources?: { url: string; quote: string; checkedAt: string }[] };
type Detail = { id: string; revision: number; state: string; stage: string; message: string; created_at: string; payload: { place: Place };
  result: { coco?: { decision: string; reason: string }; pandan?: Draft & { listing?: { id: string }; why?: string };
    kaya?: { decision: string; reason: string; cover?: { digest: string; decision: string; subject: string; reason: string } };
    outcome?: { kind: string; placeId?: string }; publishError?: string };
  suggestions: (Place & { dishes: string; details: string; sourceUrl: string; worksHere: boolean })[]; photos: { id: string; cover: string | null }[];
  matches: { id: string; name: string; branch: string; address: string; state: string; why: string }[] };

const views = [['waiting', 'Waiting'], ['all', 'All']] as const;
const kitchen = (k?: string) => k === 'mixed' ? 'Mixed Kitchen' : 'Veg Kitchen';
const stateLabel = (r: { state: string; outcome?: string | null; draft?: string | null }) =>
  r.outcome === 'added' ? (r.state === 'published' ? 'Added' : r.state === 'staff' ? 'Live check failed' : 'Adding') : r.outcome === 'duplicate' ? 'Already listed' : r.outcome === 'declined' ? 'Declined'
  : r.state === 'staff' ? (r.draft === 'propose' ? 'Ready to decide' : r.draft ? 'Needs a decision' : 'Needs staff') : r.state === 'needs-input' ? 'Asked the member' : 'Checking';
/** One dish per line: "Name | 6.50 | VG" (price and label optional). */
const dishLines = (dishes: Draft['dishes'] = []) => dishes.map(d => [d.name, d.price.amount ?? '', d.diet ?? ''].join(' | ')).join('\n');
const parseDishes = (text: string) => text.split('\n').map(line => line.split('|').map(part => part.trim())).filter(([name]) => name)
  .map(([name, amount = '', diet = '']) => ({ name, amount, diet: diet.toUpperCase() }));

export default function PlaceSuggestions({ initialId = '' }: { initialId?: string }) {
  const [view, setView] = useState('waiting'), [selected, setSelected] = useState<string | null>(initialId || null);
  const resource = useResource<Row[]>('/api/manage/place-suggestions?view=' + view);
  return <>
    <div className="toolbar spread"><Segmented label="Show" value={view} onChange={v => { setView(v); setSelected(null); }} options={views}/>
      <IconButton icon="refresh" label="Refresh" onClick={resource.reload}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <div className="panel"><Table headings={['Place', 'Kitchen', 'Status', 'Members', 'Sent']} empty="No place suggestions"
      rows={resource.data.map(r => [<button type="button" className="link" key="open" onClick={() => setSelected(r.id)}>{r.place.name}</button>, kitchen(r.place.kitchen),
        <span key="s" className={'badge ' + (r.state === 'staff' ? 'warn' : r.outcome === 'added' ? 'good' : '')}>{stateLabel(r)}</span>, String(r.members), date(r.created_at)])}/></div>}
    {selected && <SuggestionDetail key={selected} id={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}
  </>;
}

function SuggestionDetail({ id, onSaved, onClose }: { id: string; onSaved: () => void; onClose: () => void }) {
  const resource = useResource<Detail>('/api/manage/place-suggestions?id=' + encodeURIComponent(id)), d = resource.data;
  const saved = () => { resource.reload(); onSaved(); };
  const draft = d?.result.pandan, base = draft?.place ?? d?.payload.place, added = d?.result.outcome?.kind === 'added', open = d && !added && ['staff', 'needs-input'].includes(d.state);
  const checked = !!draft?.listing && d?.result.kaya?.decision === 'approve';
  const decide = (action: string, extra: (f: FormData) => Record<string, unknown> = () => ({})) => (f: FormData) => ({ id, revision: d!.revision, action, reason: f.get('reason') || undefined, ...extra(f) });
  return <section className="panel" ref={reveal}>
    <div className="row spread"><h2>{d?.payload.place.name || 'Place suggestion'}</h2><IconButton icon="close" label="Close" onClick={onClose}/></div>
    <Feedback {...resource} retry={resource.reload}/>
    {d && base && <div className="stack">
      <div className="row badges"><span className="badge">{stateLabel({ state: d.state, outcome: d.result.outcome?.kind, draft: draft?.decision })}</span>
        <span className="badge">{kitchen(d.payload.place.kitchen)}</span>{d.suggestions.some(s => s.worksHere) && <span className="badge warn">Sent by someone who works there</span>}</div>
      {!!d.message && <p className="muted">{d.message}</p>}
      <h3>What members sent</h3>
      {d.suggestions.map((s, i) => <ul key={i} className="list inset">{([['Name', s.name], ['Address', [s.address, s.unit].filter(Boolean).join(' ')], ['Serves', kitchen(s.kitchen)],
        ['Dishes', s.dishes], ['Details', s.details], ['Link', s.sourceUrl]] as const).filter(([, v]) => v).map(([k, v]) =>
        <li key={k}><span>{k}</span><span className="value">{k === 'Link' ? <a href={v} target="_blank" rel="noreferrer noopener">{v}</a> : v}</span></li>)}</ul>)}
      {/* eslint-disable-next-line @next/next/no-img-element -- private staff view of member evidence */}
      {!!d.photos.length && <div className="row thumbs">{d.photos.map(p => <figure key={p.id}><img src={`/api/manage/place-suggestion-photo?id=${id}&photo=${p.id}`} alt="Member photo" width={160} height={160}/>
        {p.cover && <figcaption>May be the cover</figcaption>}</figure>)}</div>}
      {d.result.coco && <p><strong>Coco</strong> · {d.result.coco.decision} · {d.result.coco.reason}</p>}
      {d.result.kaya && <p><strong>Kaya</strong> · {d.result.kaya.decision} · {d.result.kaya.reason}</p>}
      {d.result.kaya?.cover && <p><strong>Cover</strong> · {d.result.kaya.cover.decision === 'approve' ? 'Approved' : 'Not used'} ({d.result.kaya.cover.subject}) · {d.result.kaya.cover.reason}</p>}
      {(draft?.why || d.result.publishError) && <p className="muted">{d.result.publishError ?? draft?.why}</p>}
      {draft && <><h3>Pandan&apos;s research</h3>
        <p><strong>{draft.decision === 'propose' ? 'Listing drafted' : draft.decision === 'duplicate' ? 'Possible duplicate' : draft.decision === 'not-eligible' ? 'Cannot be listed' : 'Unclear'}</strong>{draft.reason ? ' · ' + draft.reason : ''}</p>
        {draft.checks && <ul className="list inset">{(['googleSearch', 'googleMaps'] as const).map(k => <li key={k}><span>{k === 'googleSearch' ? 'Google Search' : 'Google Maps'}</span>
          <span className="value"><span className={'badge ' + (draft.checks![k].status === 'CHECKED' ? 'good' : 'warn')}>{draft.checks![k].status === 'CHECKED' ? 'Checked' : 'Access limited'}</span>{' '}
            <a href={draft.checks![k].url} target="_blank" rel="noreferrer noopener">{draft.checks![k].checkedAt.slice(0, 10)}</a>{draft.checks![k].note ? ' · ' + draft.checks![k].note : ''}</span></li>)}</ul>}
        {draft.dietProof && <blockquote>“{draft.dietProof.quote}” <a href={draft.dietProof.sourceUrl} target="_blank" rel="noreferrer noopener">Source</a></blockquote>}
        {draft.hours && <p>Hours · {draft.hours.summary}</p>}
        {!!draft.sources?.length && <details><summary>Sources ({draft.sources.length})</summary><ul className="list inset">{draft.sources.map(s => <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer noopener">{s.url}</a><small>{s.checkedAt.slice(0, 10)} · “{s.quote.slice(0, 300)}”</small></li>)}</ul></details>}</>}
      <h3>Listed places that may be the same</h3>
      {d.matches.length ? <ul className="list inset">{d.matches.map(m => <li key={m.id}><span><Link href={'/console/places?id=' + encodeURIComponent(m.id)}>{m.name}</Link>
        <small>{[m.branch, m.address].filter(Boolean).join(' · ')} · {m.why}{m.state !== 'live' ? ' · ' + m.state : ''}</small></span>
        {open && <Mutation endpoint="place-suggestions" onSaved={saved} label="Same place" values={decide('duplicate', () => ({ placeId: m.id }))}/>}</li>)}</ul>
        : <p className="muted">No listed place matches.</p>}
      {open && checked && <div className="row action-bar">
        <Mutation endpoint="place-suggestions" onSaved={saved} label="Publish as Kaya checked it" values={decide('publish')}/></div>}
      {open && <>
        <details open={draft?.decision === 'propose' && !checked}><summary>{checked ? 'Edit, then add to Explore' : 'Add to Explore'}</summary><div className="editor">
          <Mutation endpoint="place-suggestions" onSaved={saved} label="Add to Explore" values={decide('approve', f => ({
            allowDuplicate: f.get('allowDuplicate') === 'on', dishes: parseDishes(String(f.get('dishes') ?? '')), cover: f.get('cover') || undefined,
            place: { name: f.get('name'), branch: f.get('branch'), address: f.get('address'), postalCode: f.get('postalCode'), kitchen: f.get('kitchen'),
              venueDiet: f.get('venueDiet'), alliumFreeClaim: f.get('alliumFreeClaim') === 'on', sourceUrl: f.get('sourceUrl') } }))}>
            <label>Name<input name="name" defaultValue={base.name} maxLength={300} required/></label>
            <label>Branch<input name="branch" defaultValue={base.branch ?? ''} maxLength={300} required/></label>
            <label>Address<input name="address" defaultValue={[base.address, base.unit].filter(Boolean).join(' ')} maxLength={500} required/></label>
            <label>Postal code<input name="postalCode" defaultValue={base.postalCode} inputMode="numeric" pattern="\d{6}" required/></label>
            <label>Kitchen<select name="kitchen" defaultValue={base.kitchen}><option value="veg">Veg Kitchen</option><option value="mixed">Mixed Kitchen</option></select></label>
            <label>Diet<select name="venueDiet" defaultValue={base.venueDiet ?? 'Vegetarian'}><option>Vegetarian</option><option>Vegan</option></select></label>
            <label className="check"><input type="checkbox" name="alliumFreeClaim" defaultChecked={base.alliumFreeClaim === true}/>No five pungent (source proves it)</label>
            <label>Place source<input name="sourceUrl" type="url" defaultValue={draft?.dietProof?.sourceUrl ?? draft?.sources?.[0]?.url ?? ''} maxLength={1000} required/></label>
            <label>Dishes, one per line: name | price | V or VG<textarea name="dishes" rows={6} defaultValue={dishLines(draft?.dishes)} required/></label>
            {d.photos.some(p => p.cover) && <label>Cover<select name="cover" defaultValue={d.result.kaya?.cover?.decision === 'approve' ? d.result.kaya.cover.digest : ''}>
              <option value="">No cover</option>{d.photos.filter(p => p.cover).map((p, i) => <option key={p.id} value={p.cover!}>Member photo {i + 1}</option>)}</select></label>}
            <label className="check"><input type="checkbox" name="allowDuplicate"/>Different place at this address</label>
            <label>Reason<input name="reason" maxLength={1000} placeholder="Checked the sources"/></label>
          </Mutation></div></details>
        <details><summary>Ask the member</summary><div className="editor">
          <Mutation endpoint="place-suggestions" onSaved={saved} label="Send question" values={decide('ask', f => ({ message: f.get('message') }))}>
            <label>Message the member sees<textarea name="message" rows={3} maxLength={600} required/></label></Mutation></div></details>
        <details><summary>Decline</summary><div className="editor">
          <Mutation endpoint="place-suggestions" onSaved={saved} label="Decline" tone="danger" values={decide('decline', f => ({ message: f.get('message') }))}>
            <label>Reason the member sees<textarea name="message" rows={3} maxLength={600} required/></label></Mutation></div></details>
      </>}
      {['staff', 'needs-input', 'resolved'].includes(d.state) && <details><summary>Check again</summary><div className="editor">
        <Mutation endpoint="place-suggestions" onSaved={saved} label={added ? 'Check it is live again' : 'Send back to Coco and Pandan'} values={decide('recheck')}/></div></details>}
      {d.result.outcome?.placeId && <p><Link href={'/console/places?id=' + encodeURIComponent(d.result.outcome.placeId)}>Open the place in Places</Link></p>}
    </div>}
  </section>;
}
