'use client';
import { useState } from 'react';
import { date } from '../client';
import { Moderation } from './MemberContent';
import { ActionBar } from './Parts';

type Channel = { platform: string; handle: string; url: string; followers: number | null; checked_at: string | null };
type Source = { url: string; name: string; status: string; recipe_id: string | null; coverage: number | null; last_seen: string };
type Creator = { id: string; name: string; kind: string; country: string | null; region: string; languages: string[]; diets: string[]; cuisines: string[];
  website: string | null; status: string; pinned: boolean; invite: string; note: string; found_by: string; updated_at: string;
  passed: number; published: number; held: number; rejected: number; coverage: number | null; last_published: string | null; channels: Channel[]; sources: Source[] };
const PLATFORMS = ['website', 'youtube', 'instagram', 'tiktok', 'facebook', 'xiaohongshu', 'pinterest', 'other'];
const regionLabel: Record<string, string> = { singapore: 'Singapore', asia: 'Asia', world: 'Worldwide' };
const sourceTone: Record<string, string> = { published: 'good', held: 'warn', rejected: 'danger' };
const count = (n: number | null) => n == null ? '' : n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'K' : String(n);
const percent = (n: number | null) => n == null ? '' : Math.round(n * 100) + '%';

/** The recipe creators QT Cooker searches first (Singapore, then Asia, then worldwide), their channels and the pages it looked at. */
export function Creators() {
  const [key, setKey] = useState(0);
  return <div className="stack">
    <AddCreator done={() => setKey(k => k + 1)}/>
    <Moderation<Creator> key={key} path="/api/content/creators"
      statuses={[['active', 'Active'], ['paused', 'Paused'], ['blocked', 'Blocked'], ['invite', 'To invite']]}
      render={c => <>
        <div className="row spread"><strong>{c.name}</strong>
          <span className="row">{c.pinned && <span className="badge good">Pinned</span>}<span className="badge">{regionLabel[c.region] ?? c.region}</span>
            {c.invite !== 'not-yet' && <span className="badge">Invite: {c.invite}</span>}</span></div>
        <small>{[c.kind === 'organisation' ? 'Organisation' : 'Creator', c.country, c.diets.join(', '), c.cuisines.join(', ')].filter(Boolean).join(' · ')}</small>
        <small>{c.published} published · {c.passed} passed the bar · {c.held} held · {c.rejected} rejected{c.coverage != null ? ' · ' + percent(c.coverage) + ' measurable' : ''}
          {c.last_published ? ' · last published ' + date(c.last_published) : ''}</small>
        {!!c.channels.length && <ul className="list inset">{c.channels.map(ch => <li key={ch.platform + ch.handle}>
          <a href={ch.url} target="_blank" rel="noreferrer noopener">{ch.platform}: {ch.handle}</a>{ch.followers != null && <small> · {count(ch.followers)} followers</small>}</li>)}</ul>}
        {!!c.sources.length && <details><summary>Recent recipe pages</summary><ul className="list inset">{c.sources.map(s => <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer noopener">{s.name || s.url}</a> <span className={'badge ' + (sourceTone[s.status] ?? '')}>{s.status}</span>
          {s.coverage != null && <small> · {percent(s.coverage)} measurable</small>}<small> · {date(s.last_seen)}</small></li>)}</ul></details>}
        {c.note && <p className="muted">{c.note}</p>}
      </>}
      act={(c, _status, done) => <Actions row={c} done={done}/>}/>
  </div>;
}

function Fields({ value, set }: { value: Record<string, string>; set: (v: Record<string, string>) => void }) {
  const field = (name: string) => ({ value: value[name] ?? '', onChange: (e: { target: { value: string } }) => set({ ...value, [name]: e.target.value }) });
  return <>
    <label>Name<input {...field('name')} maxLength={120}/></label>
    <div className="row">
      <label>Kind<select {...field('kind')}><option value="person">Creator</option><option value="organisation">Organisation</option></select></label>
      <label>Region<select {...field('region')}><option value="singapore">Singapore</option><option value="asia">Asia</option><option value="world">Worldwide</option></select></label>
      <label>Country<input {...field('country')} maxLength={2} placeholder="SG"/></label></div>
    <label>Website<input {...field('website')} maxLength={300} placeholder="https://"/></label>
    <label>Diets<input {...field('diets')} maxLength={80} placeholder="vegan, vegetarian, five-pungent-free, buddhist, jain"/></label>
    <label>Cuisines<input {...field('cuisines')} maxLength={160} placeholder="chinese, malaysian, indian"/></label>
    <label>Languages<input {...field('languages')} maxLength={80} placeholder="en, zh"/></label>
    <label>Note<textarea {...field('note')} maxLength={500} rows={2}/></label>
  </>;
}
const payload = (v: Record<string, string>) => ({ name: v.name ?? '', kind: v.kind || 'person', region: v.region || 'asia', country: v.country ?? '', website: v.website ?? '',
  diets: v.diets ?? '', cuisines: v.cuisines ?? '', languages: v.languages ?? '', note: v.note ?? '' });

function AddCreator({ done }: { done: () => void }) {
  const [value, set] = useState<Record<string, string>>({ kind: 'person', region: 'asia' });
  return <details className="panel"><summary>Add creator</summary>
    <ActionBar resource="creators" payload={() => payload(value)} onDone={() => { set({ kind: 'person', region: 'asia' }); done(); }}
      actions={[{ action: 'create', label: 'Add' }]}><Fields value={value} set={set}/></ActionBar></details>;
}

function Actions({ row, done }: { row: Creator; done: () => void }) {
  const [edit, setEdit] = useState<Record<string, string>>({ name: row.name, kind: row.kind, region: row.region, country: row.country ?? '', website: row.website ?? '',
    diets: row.diets.join(', '), cuisines: row.cuisines.join(', '), languages: row.languages.join(', '), note: row.note });
  const [channel, setChannel] = useState({ platform: 'instagram', handle: '', url: '', followers: '' });
  const [invite, setInvite] = useState(row.invite);
  const id = { id: row.id };
  return <>
    <ActionBar resource="creators" payload={() => id} onDone={done} actions={[
      row.pinned ? { action: 'unpin', label: 'Unpin' } : { action: 'pin', label: 'Pin' },
      ...(row.status === 'active' ? [{ action: 'pause', label: 'Pause' }] : [{ action: 'activate', label: 'Make active' }]),
      ...(row.status !== 'blocked' ? [{ action: 'block', label: 'Block', tone: 'danger' as const, confirm: 'Block ' + row.name + '? Cooker will never search their pages.' }] : [])]}/>
    <details><summary>Edit</summary>
      <ActionBar resource="creators" payload={() => ({ ...id, ...payload(edit) })} onDone={done} actions={[{ action: 'edit', label: 'Save' }]}>
        <Fields value={edit} set={setEdit}/></ActionBar></details>
    <details><summary>Add or update a channel</summary>
      <ActionBar resource="creators" onDone={done} actions={[{ action: 'channel', label: 'Save channel' }]}
        payload={() => ({ ...id, platform: channel.platform, handle: channel.handle, url: channel.url, followers: channel.followers === '' ? '' : Number(channel.followers) })}>
        <div className="row"><label>Platform<select value={channel.platform} onChange={e => setChannel({ ...channel, platform: e.target.value })}>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>Handle<input value={channel.handle} onChange={e => setChannel({ ...channel, handle: e.target.value })} maxLength={120} placeholder="woonheng"/></label>
          <label>Followers<input value={channel.followers} inputMode="numeric" onChange={e => setChannel({ ...channel, followers: e.target.value.replace(/\D/g, '') })} maxLength={10}/></label></div>
        <label>Link<input value={channel.url} onChange={e => setChannel({ ...channel, url: e.target.value })} maxLength={300} placeholder="https://"/></label></ActionBar>
      {row.channels.map(ch => <ActionBar key={ch.platform + ch.handle} resource="creators" onDone={done} payload={() => ({ ...id, platform: ch.platform, handle: ch.handle })}
        actions={[{ action: 'remove-channel', label: 'Remove ' + ch.platform + ': ' + ch.handle, tone: 'danger' }]}/>)}</details>
    <details><summary>Invite later</summary>
      <ActionBar resource="creators" payload={() => ({ ...id, invite })} onDone={done} actions={[{ action: 'invite', label: 'Save' }]}>
        <label>Invite<select value={invite} onChange={e => setInvite(e.target.value)}>
          <option value="not-yet">Not yet</option><option value="ready">Ready to invite</option><option value="invited">Invited</option><option value="declined">Declined</option></select></label>
      </ActionBar></details>
  </>;
}
