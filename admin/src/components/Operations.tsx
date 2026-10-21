'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation } from './Primitives';
import { Icon } from './Icon';

type Control = { key: string; enabled: boolean; notice: string; version: number; updated_at: string };
const names: Record<string, string> = { registration: 'Registration', discovery: 'Live Google search', menus: 'Places and menus', avatars: 'Avatars', ai_recipes: 'AI recipes', ai_recipes_bots: 'AI recipes by QT bots', recipe_demand: 'Wanted recipes', social: 'Social',
  market: 'Market buying', market_sellers: 'Market selling', recipes: 'Member recipes', areas: 'Area counts', games: 'Game progress' };
/** What members lose when a feature is off (server/index.mjs featureGate and the routes that check it). */
const effects: Record<string, string> = { registration: 'New accounts', discovery: 'Google search, place photos and address lookup in Explore',
  menus: 'Explore places, menus and place reviews', avatars: 'Avatar portraits', ai_recipes: 'Asking for a recipe or reading one from a video', ai_recipes_bots: 'On: the QT bots write AI recipes. Off: Gemini does',
  recipe_demand: 'Writing recipes members search Cook for and cannot find (up to 10 a day, each waits for review; needs AI recipes)',
  social: 'Profiles, invitations, chats and gatherings', market: 'Browsing and ordering in Market', market_sellers: 'Opening and running a shop',
  recipes: 'Sharing recipes from Cook (AI recipes need this too)', areas: 'Home and Work area counts', games: 'Saving Rush Hour progress and café credits (the game still plays)' };
/** The AI recipes daily limit lives in that control's note as "daily=N"; the AI recipes page edits it. */
const noteOf = (row: { notice: string }) => row.notice.replace(/\s*daily=\d+\s*/g, ' ').trim();
/** Retired controls (owner, 19 Oct 2026): "AI features" and "Identity review" were Phase 4 placeholders that gated nothing. */
const hidden = ['ai', 'identity'];
export const featureName = (key: string) => names[key] ?? key.replaceAll('_', ' ');

export function Controls() {
  const resource = useResource<Control[]>('/api/manage/controls'); const [open, setOpen] = useState<string | null>(null);
  return <><Feedback {...resource} retry={resource.reload}/>{resource.data && <ul className="list">{resource.data.filter(row => !hidden.includes(row.key)).map(row => <li key={row.key} className={open === row.key ? 'open' : undefined}>
    <div className="row spread">
      <div className="label"><strong>{featureName(row.key)}</strong><small>{effects[row.key] ?? ''}</small>
        <small>{[row.key === 'ai_recipes' && /daily=\d+/.test(row.notice) ? 'Daily limit ' + /daily=(\d+)/.exec(row.notice)![1] : '', noteOf(row), 'Changed ' + date(row.updated_at)].filter(Boolean).join(' · ')}</small></div>
      <div className="row"><span className={'badge ' + (row.enabled ? 'good' : '')}>{row.enabled ? 'On' : 'Off'}</span>
        <button type="button" aria-expanded={open === row.key} onClick={() => setOpen(open === row.key ? null : row.key)}>{open === row.key ? 'Close' : row.enabled ? 'Turn off' : 'Turn on'}</button></div>
    </div>
    {open === row.key && <div className="editor" style={{ marginTop: 12 }}><Mutation key={row.key + row.version} endpoint="controls" label={row.enabled ? 'Turn off' : 'Turn on'} tone={row.enabled ? 'danger' : 'primary'}
      onSaved={() => { setOpen(null); resource.reload(); }} values={f => ({ key: row.key, version: row.version, enabled: !row.enabled, notice: f.get('notice') })}>
      <label>Note for staff<textarea name="notice" rows={2} maxLength={280} defaultValue={noteOf(row)} placeholder="Why, and until when"/></label>
    </Mutation></div>}
  </li>)}</ul>}{resource.data && !resource.data.length && <div className="panel"><div className="empty"><Icon name="controls" size={34}/>No features</div></div>}</>;
}
