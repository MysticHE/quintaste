'use client';
import { useState } from 'react';
import { date } from '../client';
import { ActionBar } from './Parts';
import { Moderation, toggle } from './MemberContent';

type Listing = { id: string; name: string; status: string; price_cents: number } | null;
type Recipe = {
  id: string; version: 'live' | 'pending'; pending_state: 'review' | 'declined' | null; decision_note: string; live: boolean; hidden_reason: string | null;
  submitted_at: string | null; published_at: string | null; username: string; photos: string[]; reports: number;
  recipe: { title: string; description: string; author: string; language: string; servings: number; minutes: number; diet: string; categories: string[]; sponsorship: string; revision: number;
    ingredients: { id: string; name: string; amount: number | null; unit: string; listingId?: string; listing?: Listing }[];
    steps: { title: string; instruction: string; minutes: number | null }[] };
};
const photo = (r: Recipe, slot: string) => `/api/content/member-recipe-photo?id=${r.id}&version=${r.version}&slot=${slot}`;

/** Staff review of recipes members submit from Cook: publish, decline with a note to the author, or hide a published one. */
export function MemberRecipes() {
  return <><div className="notice">Members&apos; recipes appear in Cook only after you publish them. Check the diet, ingredients, steps, photos and any linked shop items. A published recipe stays live while an update waits here.</div>
    <Moderation<Recipe> path="/api/content/member-recipes" statuses={[['review', 'In review'], ['published', 'Published'], ['declined', 'Declined'], ['hidden', 'Hidden']]} render={r => <RecipeCard r={r}/>}
      act={(r, status, done) => status === 'review' ? <Decide r={r} done={done}/> : status === 'published' || status === 'hidden' ? toggle('member-recipes', r.id, status === 'hidden', done, 'Hide recipe') : null}/></>;
}
function RecipeCard({ r }: { r: Recipe }) {
  const d = r.recipe, links = d.ingredients.filter(i => i.listingId);
  return <>
    <div className="row spread"><strong>{d.title}</strong><span className="row badges">
      {r.live && r.version === 'pending' && <span className="badge">Update to a published recipe</span>}
      {!!r.reports && <span className="badge warn">{r.reports} open {r.reports === 1 ? 'report' : 'reports'}</span>}</span></div>
    <div className="muted">By {d.author} ({r.username}) · {d.diet} · {d.categories.join(', ')} · {d.servings} servings · {d.minutes} min · v{d.revision} · {r.version === 'pending' ? 'submitted ' + date(r.submitted_at ?? '') : 'published ' + date(r.published_at ?? '')}</div>
    <div className="muted">Sponsorship: {d.sponsorship} · {d.language}</div>
    {/* eslint-disable-next-line @next/next/no-img-element -- staff view of member photos */}
    {r.photos.includes('cover') && <img src={photo(r, 'cover')} alt="Recipe photo" width={240} height={160} style={{ objectFit: 'cover' }}/>}
    <p className="detail">{d.description}</p>
    {!!links.length && <p className="muted">Linked shop items: {links.map(i => i.listing ? `${i.name} → ${i.listing.name} (S$${(i.listing.price_cents / 100).toFixed(2)}, ${i.listing.status})` : `${i.name} → removed item`).join(' · ')}</p>}
    <details><summary>Ingredients and steps</summary>
      <ul>{d.ingredients.map(i => <li key={i.id}>{i.amount === null ? i.name + ', to taste' : `${i.amount} ${i.unit} ${i.name}`}</li>)}</ul>
      <ol>{d.steps.map((s, index) => <li key={index}><strong>{s.title}</strong>{s.minutes ? ` · ${s.minutes} min timer` : ''}<p className="detail">{s.instruction}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- staff view of member photos */}
        {r.photos.includes('step-' + index) && <img src={photo(r, 'step-' + index)} alt={'Step ' + (index + 1) + ' photo'} width={160} height={110} style={{ objectFit: 'cover' }}/>}</li>)}</ol>
    </details>
    {r.pending_state === 'declined' && <p className="muted">Declined: {r.decision_note}</p>}
    {r.hidden_reason && <p className="muted">Hidden: {r.hidden_reason}</p>}
  </>;
}
function Decide({ r, done }: { r: Recipe; done: () => void }) {
  const [note, setNote] = useState('');
  return <details><summary>Publish or decline</summary>
    <ActionBar resource="member-recipes" onDone={done} payload={() => ({ id: r.id, revision: r.recipe.revision, note })}
      actions={[{ action: 'publish', label: 'Publish to Cook', tone: 'primary' }, { action: 'decline', label: 'Decline' }]}>
      <label>Note shown to the author if you decline<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2}/></label>
    </ActionBar></details>;
}
