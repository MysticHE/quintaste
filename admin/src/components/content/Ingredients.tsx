'use client';
import { useState } from 'react';
import { date } from '../client';
import { ActionBar } from './Parts';
import { Moderation } from './MemberContent';

type Per100 = { kcal: number; protein: number; fat: number; carbs: number; fibre: number | null; sugar: number | null; sodium: number | null };
type Row = {
  id: string; name: string; status: string; usda: string | null; usda_name: string | null; negligible: boolean; g_per_ml: number | null; units: Record<string, number>;
  confidence: number | null; reason: string; staff_note: string; updated_at: string; version: string; reviewed_at: string | null;
  food_id: string | null; food_name: string | null; per100: Per100 | null; sources: { url: string; title: string }[] | null; food_note: string | null; recipes: number;
};
const FIELDS: [keyof Per100, string][] = [['kcal', 'kcal'], ['protein', 'Protein g'], ['fat', 'Fat g'], ['carbs', 'Carbs g'], ['fibre', 'Fibre g'], ['sugar', 'Sugar g'], ['sodium', 'Sodium mg']];
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; } };

/** The learned ingredient database: what the AI matched each recipe ingredient to, for staff to check. */
export function Ingredients() {
  return <Moderation<Row> path="/api/content/ingredients" statuses={[['auto', 'To check'], ['approved', 'Approved'], ['unknown', 'Not found'], ['rejected', 'Rejected'], ['retry', 'Asked again']]}
    render={r => <Card r={r}/>} act={(r, status, done) => <Actions r={r} status={status} done={done}/>}/>;
}
function Card({ r }: { r: Row }) {
  const weights = [r.g_per_ml ? `${r.g_per_ml} g per ml` : '', ...Object.entries(r.units ?? {}).map(([unit, grams]) => `1 ${unit} = ${grams} g`)].filter(Boolean).join(' · ');
  return <>
    <div className="row spread"><strong>{r.name}</strong><span className="row badges"><span className="badge">{r.recipes} {r.recipes === 1 ? 'recipe' : 'recipes'}</span>
      {r.confidence !== null && r.confidence < 0.6 && <span className="badge warn">Low confidence</span>}</span></div>
    {r.negligible ? <div>No nutrients (water, wrapping or aroma leaves)</div>
      : r.usda ? <div>USDA: <a href={`https://fdc.nal.usda.gov/food-details/${r.usda}/nutrients`} target="_blank" rel="noreferrer noopener">{r.usda_name ?? r.usda}</a></div>
      : r.food_id && r.per100 ? <div className="stack"><div>Not in USDA: {r.food_name}{r.food_note ? ` (${r.food_note})` : ''}</div>
        <small>Per 100 g: {FIELDS.map(([key, label]) => `${label.replace(' g', '').replace(' mg', '')} ${r.per100?.[key] ?? '—'}${key === 'kcal' ? '' : key === 'sodium' ? ' mg' : ' g'}`).join(' · ')}</small>
        {!!r.sources?.length && <small>Sources: {r.sources.map((page, index) => <a key={index} href={page.url} target="_blank" rel="noreferrer noopener">{page.title || host(page.url)}</a>).reduce<React.ReactNode[]>((all, link, index) => index ? [...all, ', ', link] : [link], [])}</small>}</div>
      : <div className="muted">No food matched</div>}
    {weights && <small>Weights: {weights}</small>}
    {r.reason && <small className="muted">AI: {r.reason}</small>}
    {r.staff_note && <small className="muted">Staff note: {r.staff_note}</small>}
    <small className="muted">{r.reviewed_at ? 'Reviewed ' + date(r.reviewed_at) : 'Updated ' + date(r.updated_at)}</small>
  </>;
}
function Actions({ r, status, done }: { r: Row; status: string; done: () => void }) {
  const [note, setNote] = useState(''), [density, setDensity] = useState(r.g_per_ml?.toString() ?? ''), [negligible, setNegligible] = useState(r.negligible);
  const [units, setUnits] = useState(Object.entries(r.units ?? {}).map(([unit, grams]) => `${unit}=${grams}`).join(', '));
  const [figures, setFigures] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(([key]) => [key, r.per100?.[key]?.toString() ?? ''])));
  const sourced = !!r.usda || !!r.food_id || r.negligible;
  const parseUnits = () => Object.fromEntries(units.split(',').map(part => part.trim()).filter(Boolean).map(part => {
    const [unit, grams] = part.split('=').map(value => value.trim());
    if (!unit || !grams || !Number.isFinite(Number(grams))) throw new Error('Write unit weights like clove=3, each=120.');
    return [unit.toLowerCase(), Number(grams)];
  }));
  return <>
    {status !== 'retry' && <details><summary>Ask the AI again</summary>
      <ActionBar resource="ingredients" onDone={done} payload={() => ({ id: r.id, version: r.version, note })} actions={[{ action: 'retry', label: 'Ask again', tone: 'primary' }]}>
        <label>What was wrong<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2} placeholder="For example: this is the dried form, not fresh"/></label>
      </ActionBar></details>}
    {sourced && <details><summary>Correct</summary>
      <ActionBar resource="ingredients" onDone={done} actions={[{ action: 'edit', label: 'Save and approve', tone: 'primary' }]}
        payload={() => ({ id: r.id, version: r.version, negligible, gPerMl: density, units: parseUnits(),
          ...(r.food_id ? { per100: Object.fromEntries(FIELDS.map(([key]) => [key, figures[key]])) } : {}) })}>
        <label className="row"><input type="checkbox" checked={negligible} onChange={e => setNegligible(e.target.checked)}/>No nutrients</label>
        <label>Grams per ml<input inputMode="decimal" value={density} onChange={e => setDensity(e.target.value)}/></label>
        <label>Unit weights in grams<input value={units} onChange={e => setUnits(e.target.value)} placeholder="each=120, clove=3"/></label>
        {r.food_id && <div className="row wrap">{FIELDS.map(([key, label]) => <label key={key}>{label}<input inputMode="decimal" size={6} value={figures[key]}
          onChange={e => setFigures(current => ({ ...current, [key]: e.target.value }))}/></label>)}</div>}
      </ActionBar></details>}
    <ActionBar resource="ingredients" onDone={done} payload={() => ({ id: r.id, version: r.version })}
      actions={[...(sourced && status !== 'approved' ? [{ action: 'approve', label: 'Approve', tone: 'primary' as const }] : []),
        ...(status !== 'rejected' ? [{ action: 'reject', label: 'Reject', tone: 'danger' as const }] : [])]}/>
  </>;
}
