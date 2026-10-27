'use client';
import { useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { useResource } from './client';
import { Empty, Feedback, IconButton, Segmented } from './Primitives';
import { Icon } from './Icon';
import { ControlError, ControlPanel, useControl, type Control } from './Operations';
import { CHEFS, modeOf, plainNote, type Mode } from '../lib/chef-names';
import wok from '../assets/chefs/wok.webp';
import artist from '../assets/chefs/artist.webp';
import writer from '../assets/chefs/writer.webp';
import fixer from '../assets/chefs/fixer.webp';
import host from '../assets/chefs/host.webp';
import safety from '../assets/chefs/safety.webp';

/** Kitchen › Chefs: one row per chef, each of its admin lanes Off, Watch or On (docs/ADMIN_CHEFS_PLAN.md §6). */
type Lane = Control & { lane: string; chef: string; title: string };
const ICONS: Record<string, StaticImageData> = { wok, artist, writer, fixer, host, safety };
/** What each lane does, and the lanes that send members' words to a model, which wait for `chefMemberText` (plan §7). */
const JOBS: Record<string, { does: string; privacy?: true }> = {
  ingredients: { does: 'Approves ingredient matches or asks the AI again; asks you before rejecting' },
  creators: { does: 'Pins, pauses or reactivates creators; asks you before blocking' },
  'game-levels': { does: 'Approves recipe levels that pass the level checks' },
  'ai-recipes': { does: 'Publishes AI recipes that pass the rules; asks you before declining' },
  wanted: { does: 'Makes, links or skips wanted recipes' },
  'member-recipes': { does: 'Publishes member recipes that pass the rules; asks you before declining', privacy: true },
  reviews: { does: 'Flags links, phone numbers, emails or payment details; asks you before hiding' },
  'place-reports': { does: 'Sends members’ place reports for a recheck; asks you before dismissing', privacy: true },
  recalls: { does: 'Files a critical case when an SFA recall may match a sealed item; never removes it', privacy: true },
  gatherings: { does: 'Flags links, phone numbers, emails or payment details; asks you before hiding' },
};
const MODES = [['off', 'Off'], ['watch', 'Watch'], ['on', 'On']] as const;

function summary(lanes: Lane[]): [string, string] {
  const modes = lanes.map(modeOf), on = modes.filter(m => m === 'on').length, watch = modes.filter(m => m === 'watch').length;
  if (on === lanes.length) return ['On', 'good'];
  if (watch === lanes.length) return ['Watching', 'warn'];
  if (!on && !watch) return ['Off', ''];
  return [[on && `${on} on`, watch && `${watch} watching`].filter(Boolean).join(' · ') + ` of ${lanes.length}`, on ? 'good' : 'warn'];
}

export function ChefJobs() {
  const resource = useResource<Lane[]>('/api/manage/chef-lanes'); const [open, setOpen] = useState<string | null>(null);
  const chefs = [...(resource.data ?? []).reduce((all, l) => all.set(l.chef, [...(all.get(l.chef) ?? []), l]), new Map<string, Lane[]>())];
  return <>
    <p className="muted lede">Watch records what a chef would do without doing it. Every decision shows in Chef decisions.</p>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && (chefs.length ? <ul className="list chefs">{chefs.map(([id, lanes]) => {
      const [text, tone] = summary(lanes), expanded = open === id, name = CHEFS[id] ?? id;
      return <li key={id} className="chef">
        <button type="button" className="chef-head" aria-expanded={expanded} aria-controls={'jobs-' + id} onClick={() => setOpen(expanded ? null : id)}>
          {ICONS[id] ? <Image className="chef-icon" src={ICONS[id]} alt="" width={36} height={36} unoptimized/> : <span className="chef-icon" aria-hidden="true">{name[0]}</span>}
          <span className="label grow"><strong>{name}</strong><small>{lanes.map(l => l.title).join(' · ')}</small></span>
          <span className={'badge ' + tone}>{text}</span><Icon name={expanded ? 'up' : 'down'} size={16}/>
        </button>
        {expanded && <ul className="jobs" id={'jobs-' + id}>{lanes.map(l => <Job key={l.key} lane={l} chef={name} onSaved={resource.reload}/>)}</ul>}
      </li>;
    })}</ul> : <div className="panel"><Empty icon="chef">No chef lanes installed</Empty></div>)}
  </>;
}

/** Off and Watch apply at once; On asks first, since the chef then acts on its own. Each lane keeps its own staff note. */
function Job({ lane, chef, onSaved }: { lane: Lane; chef: string; onSaved: () => void }) {
  const control = useControl(lane, onSaved), { busy, error, save, panel, open } = control;
  const mode = modeOf(lane), job = JOBS[lane.lane], note = plainNote(lane.notice);
  const choose = (next: Mode) => {
    if (next === 'on' && mode !== 'on') return open('on');
    open(null);
    if (next !== mode) save({ mode: next });
  };
  return <li className={'job' + (panel ? ' open' : '')}>
    <div className="feature-row">
      <span className="label grow"><strong>{lane.title}</strong>{job && <small>{job.does}</small>}
        {job?.privacy && <small className="tag">Waits for the privacy notice</small>}{note && <small className="note">{note}</small>}</span>
      <IconButton icon="edit" label={'Note on ' + chef + ' · ' + lane.title} onClick={() => open(panel === 'note' ? null : 'note')}/>
      <span aria-busy={busy || undefined}><Segmented label={lane.title} value={panel === 'on' ? 'on' : mode} options={MODES} onChange={v => choose(v as Mode)}/></span>
    </div>
    {panel === 'on' && <ControlPanel control={control} label="Turn on" onConfirm={() => save({ mode: 'on' }, control.note)}>
      <span className="label"><strong>Let {chef} act on {lane.title}?</strong><small>It acts when Kaya agrees and it’s sure enough; anything else still asks you.</small></span>
    </ControlPanel>}
    {panel === 'note' && <ControlPanel control={control} label="Save note" onConfirm={() => save({ mode }, control.note)}/>}
    <ControlError error={error}/>
  </li>;
}
