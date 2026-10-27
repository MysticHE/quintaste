'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation } from './Primitives';
import { Icon } from './Icon';
import { modeOf, plainNote } from '../lib/chef-names';

type Control ={ key: string; enabled: boolean; notice: string; version: number; updated_at: string };
const names: Record<string, string> = { registration: 'Registration', discovery: 'Live Google search', menus: 'Places and menus', avatars: 'Avatars', ai_recipes: 'AI recipes', ai_recipes_bots: 'AI recipes by QT bots', recipe_demand: 'Wanted recipes', social: 'Social',
  market: 'Market buying', market_sellers: 'Market selling', recipes: 'Member recipes', areas: 'Area counts', games: 'Game progress', game_levels: 'Recipe levels', game_seasons: 'Seasons',
  chef_ingredients: 'Mango · Ingredients', chef_creators: 'Mango · Creators', chef_game_levels: 'Taro · Game levels',
  chef_ai_recipes: 'Peach · AI recipes', chef_wanted: 'Peach · Wanted recipes', chef_member_recipes: 'Peach · Member recipes',
  chef_reviews: 'Coco · Place reviews', chef_gatherings: 'Lychee · Gatherings', chef_place_reports: 'Coco · Place reports', chef_recalls: 'Mint · Recall matches' };
/** What members lose when a feature is off (server/index.mjs featureGate and the routes that check it). */
const effects: Record<string, string> = { registration: 'New accounts', discovery: 'Google search, place photos and address lookup in Explore',
  menus: 'Explore places, menus and place reviews', avatars: 'Avatar portraits', ai_recipes: 'Asking for a recipe or reading one from a video', ai_recipes_bots: 'On: the QT bots write AI recipes. Off: Gemini does',
  recipe_demand: 'Writing recipes members search Cook for and cannot find (up to 10 a day, each waits for review; needs AI recipes)',
  social: 'Profiles, invitations, chats and gatherings', market: 'Browsing and ordering in Market', market_sellers: 'Opening and running a shop',
  recipes: 'Sharing recipes from Cook (AI recipes need this too)', areas: 'Home and Work area counts', games: 'Saving Rush Hour progress and café credits (the game still plays)',
  game_levels: 'QT Gamer turning recipes staff choose into game levels (each waits for review; needs Game progress)',
  game_seasons: 'The Seasons shelf in Rush Hour and new season runs (signed-off seasons only; runs already started still settle)',
  chef_ingredients: 'Approves ingredient matches or asks the AI again; asks you before rejecting one',
  chef_creators: 'Pins, pauses or reactivates recipe creators; asks you before blocking one',
  chef_game_levels: 'Approves recipe levels that pass the level checks',
  chef_ai_recipes: 'Publishes AI recipes that pass the recipe rules; asks you before declining one',
  chef_wanted: 'Makes, links or skips wanted recipes',
  chef_member_recipes: 'Publishes member recipes that pass the rules; asks you before declining one (needs the privacy notice first)',
  chef_reviews: 'Flags reviews with links, phone numbers, emails or payment details; asks you before hiding one',
  chef_gatherings: 'Flags gatherings with links, phone numbers, emails or payment details; asks you before hiding one',
  chef_place_reports: 'Sends members\' place reports for a recheck with a note; asks you before dismissing one (needs the privacy notice first)',
  chef_recalls: 'Files a critical case when an SFA recall may match a sealed Market item; never removes the item (needs the privacy notice first)' };
/** The AI recipes daily limit ("daily=N", edited on the AI recipes page) and a chef lane's mode live in the note, not shown in it. */
const noteOf = (row: { notice: string }) => plainNote(row.notice);
/** Chef lanes are Off, Watch (records what the chef would do) or On (acts), docs/ADMIN_CHEFS_PLAN.md §6. */
const isChef = (key: string) => key.startsWith('chef_');
const MODES = [['off', 'Off'], ['watch', 'Watch'], ['on', 'On']] as const;
const modeLabel = (row: Control) => isChef(row.key) ? { off: 'Off', watch: 'Watching', on: 'On' }[modeOf(row)] : row.enabled ? 'On' : 'Off';
/** Retired controls (owner, 19 Oct 2026): "AI features" and "Identity review" were Phase 4 placeholders that gated nothing. */
const hidden = ['ai', 'identity'];
export const featureName = (key: string) => names[key] ?? key.replaceAll('_', ' ');

export function Controls() {
  const resource = useResource<Control[]>('/api/manage/controls'); const [open, setOpen] = useState<string | null>(null);
  return <><Feedback {...resource} retry={resource.reload}/>{resource.data && <ul className="list">{resource.data.filter(row => !hidden.includes(row.key)).map(row => <li key={row.key} className={open === row.key ? 'open' : undefined}>
    <div className="row spread">
      <div className="label"><strong>{featureName(row.key)}</strong><small>{effects[row.key] ?? ''}</small>
        <small>{[row.key === 'ai_recipes' && /daily=\d+/.test(row.notice) ? 'Daily limit ' + /daily=(\d+)/.exec(row.notice)![1] : '', noteOf(row), 'Changed ' + date(row.updated_at)].filter(Boolean).join(' · ')}</small></div>
      <div className="row"><span className={'badge ' + (row.enabled ? 'good' : '')}>{modeLabel(row)}</span>
        <button type="button" aria-expanded={open === row.key} onClick={() => setOpen(open === row.key ? null : row.key)}>{open === row.key ? 'Close' : isChef(row.key) ? 'Change' : row.enabled ? 'Turn off' : 'Turn on'}</button></div>
    </div>
    {open === row.key && <div className="editor" style={{ marginTop: 12 }}>{isChef(row.key)
      ? <Mutation key={row.key + row.version} endpoint="controls" label="Save" onSaved={() => { setOpen(null); resource.reload(); }}
        values={f => ({ key: row.key, version: row.version, mode: f.get('mode'), notice: f.get('notice') })}>
        <label>Mode<select name="mode" defaultValue={modeOf(row)}>{MODES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label>Note for staff<textarea name="notice" rows={2} maxLength={280} defaultValue={noteOf(row)} placeholder="Why, and until when"/></label>
      </Mutation>
      : <Mutation key={row.key + row.version} endpoint="controls" label={row.enabled ? 'Turn off' : 'Turn on'} tone={row.enabled ? 'danger' : 'primary'}
        onSaved={() => { setOpen(null); resource.reload(); }} values={f => ({ key: row.key, version: row.version, enabled: !row.enabled, notice: f.get('notice') })}>
        <label>Note for staff<textarea name="notice" rows={2} maxLength={280} defaultValue={noteOf(row)} placeholder="Why, and until when"/></label>
      </Mutation>}</div>}
  </li>)}</ul>}{resource.data && !resource.data.length && <div className="panel"><div className="empty"><Icon name="controls" size={34}/>No features</div></div>}</>;
}
