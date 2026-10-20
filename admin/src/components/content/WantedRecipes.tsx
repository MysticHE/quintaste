'use client';
import { useState } from 'react';
import { date } from '../client';
import { Moderation } from './MemberContent';
import { ActionBar } from './Parts';

type Wanted = { id: string; term: string; status: string; searches: number; searchers: number; results: number; failures: number; recipe_id: string | null;
  note: string; first_seen: string; last_seen: string; title: string | null };
const label: Record<string, string> = { open: 'waiting', requested: 'starting', queued: 'writing', review: 'in review', published: 'published', linked: 'linked', skipped: 'skipped' };
const tone: Record<string, string> = { published: 'good', linked: 'good', review: 'warn', skipped: 'danger' };

/** Cook searches members keep making without finding a recipe; the worker writes up to 10 a day with AI, each waiting in review. */
export function WantedRecipes() {
  return <Moderation<Wanted> path="/api/content/recipe-demand"
    statuses={[['waiting', 'Waiting'], ['review', 'In review'], ['published', 'Published'], ['linked', 'Linked'], ['skipped', 'Skipped']]}
    render={w => <>
      <div className="row spread"><strong>{w.term}</strong><span className={'badge ' + (tone[w.status] ?? '')}>{label[w.status] ?? w.status}</span></div>
      <small>{w.searchers} {w.searchers === 1 ? 'member' : 'members'} in 14 days · {w.searches} {w.searches === 1 ? 'search' : 'searches'} · {w.results} {w.results === 1 ? 'recipe' : 'recipes'} found
        {' · '}last {date(w.last_seen)}{w.failures ? ' · ' + w.failures + ' failed' : ''}</small>
      {(w.title || w.recipe_id) && <p className="detail">{[w.title, w.recipe_id].filter(Boolean).join(' · ')}</p>}
      {w.note && <p className="muted">{w.note}</p>}
    </>}
    act={(w, _status, done) => <Actions row={w} done={done}/>}/>;
}

function Actions({ row, done }: { row: Wanted; done: () => void }) {
  const [recipe, setRecipe] = useState(''), [note, setNote] = useState('');
  const can = (statuses: string[]) => statuses.includes(row.status);
  return <>
    {can(['open', 'skipped']) && <ActionBar resource="recipe-demand" payload={() => ({ id: row.term })} onDone={done} actions={[{ action: 'make', label: 'Make With AI' }]}/>}
    {can(['skipped', 'linked']) && <ActionBar resource="recipe-demand" payload={() => ({ id: row.term })} onDone={done} actions={[{ action: 'reopen', label: 'Back to waiting' }]}/>}
    {can(['open', 'requested', 'skipped', 'review']) && <details><summary>Link an existing recipe</summary>
      <ActionBar resource="recipe-demand" payload={() => ({ id: row.term, recipe: recipe.trim() })} onDone={done} actions={[{ action: 'link', label: 'Link' }]}>
        <label>Recipe id<input value={recipe} onChange={e => setRecipe(e.target.value)} maxLength={120} placeholder="member-… or a QuinTaste recipe id"/></label></ActionBar></details>}
    {can(['open', 'requested']) && <details><summary>Skip</summary>
      <ActionBar resource="recipe-demand" payload={() => ({ id: row.term, note })} onDone={done} actions={[{ action: 'skip', label: 'Skip', tone: 'danger' }]}>
        <label>Why (optional)<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2}/></label></ActionBar></details>}
  </>;
}
