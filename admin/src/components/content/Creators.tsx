'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, date, failure, useResource } from '../client';
import { Empty, Feedback, IconButton, Pager, SearchField } from '../Primitives';
import { Icon } from '../Icon';
import { RecipeDialog } from './RecipeDialog';
import { useSelection } from './ContentConsole';

type Channel = { platform: string; handle: string; url: string; followers: number | null; checked_at: string | null };
type Source = { url: string; name: string; status: string; recipe_id: string | null; coverage: number | null; last_seen: string };
type Creator = { id: string; name: string; kind: string; country: string | null; region: string; languages: string[]; diets: string[]; cuisines: string[];
  website: string | null; status: string; pinned: boolean; invite: string; note: string; found_by: string; updated_at: string;
  passed: number; published: number; held: number; rejected: number; coverage: number | null; last_published: string | null; channels: Channel[]; sources: Source[] };
type Profile = { name: string; kind: string; region: string; country: string; website: string; diets: string; cuisines: string; languages: string; note: string };
const PLATFORMS = ['website', 'youtube', 'instagram', 'tiktok', 'facebook', 'xiaohongshu', 'pinterest', 'other'];
const regions: Record<string, string> = { singapore: 'Singapore', asia: 'Asia', world: 'Worldwide' };
const tones: Record<string, string> = { published: 'good', held: 'warn', rejected: 'danger' };
const statuses = [['active', 'Active'], ['paused', 'Paused'], ['blocked', 'Blocked'], ['invite', 'To invite']];
const panels = ['Details', 'Channels', 'Activity'];
const percent = (n: number | null) => n == null ? '—' : Math.round(n * 100) + '%';
const channelKey = (c: Pick<Channel, 'platform' | 'handle'>) => c.platform + ':' + c.handle;
const profile = (c: Creator | null): Profile => ({ name: c?.name ?? '', kind: c?.kind ?? 'person', region: c?.region ?? 'asia', country: c?.country ?? '',
  website: c?.website ?? '', diets: c?.diets.join(', ') ?? '', cuisines: c?.cuisines.join(', ') ?? '', languages: c?.languages.join(', ') ?? '', note: c?.note ?? '' });

export function Creators() {
  const [selected, select] = useSelection(), [status, setStatus] = useState('active'), [draft, setDraft] = useState(''), [q, setQ] = useState(''), [page, setPage] = useState(0);
  const resource = useResource<Creator[]>(`/api/content/creators?status=${status}&q=${encodeURIComponent(q)}&page=${page}`);
  const root = useRef<HTMLDivElement>(null), opened = useRef(false), dirty = useRef(false), busy = useRef(false);
  const choose = (id: string | null) => { if (id === selected || busy.current) return; if (dirty.current && !window.confirm('Discard changes?')) return; dirty.current = false; select(id); };
  useEffect(() => {
    if (opened.current || !resource.data || !root.current) return;
    opened.current = true;
    if (!selected && resource.data[0] && getComputedStyle(root.current).getPropertyValue('--workspace-auto-open').trim() === '1') select(resource.data[0].id);
  }, [resource.data, selected, select]);
  return <div ref={root} className={'content-split workspace-split creator-split' + (selected ? ' has-selection' : '')}>
    <section className="panel content-list" aria-label="All creators"><div className="stack compact list-tools">
      <div className="row nowrap"><form className="creator-search" onSubmit={e => { e.preventDefault(); setQ(draft.trim()); setPage(0); }}>
        <SearchField label="Search creators" value={draft} onChange={setDraft}/><IconButton icon="search" label="Search" onClick={() => { setQ(draft.trim()); setPage(0); }}/>
      </form><IconButton icon="plus" label="New creator" onClick={() => choose('new')}/></div>
      <select aria-label="Creator filter" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>{statuses.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
    </div><Feedback {...resource} retry={resource.reload}/>
    <ul className="items">{resource.data?.map(c => <li key={c.id}><button type="button" className="item" aria-current={selected === c.id ? 'true' : undefined} onClick={() => choose(c.id)}>
      <strong>{c.name}</strong><span className="muted">{regions[c.region] ?? c.region} · {c.published} published</span><span className="row"><span className="badge">{c.status}</span>{c.pinned && <span className="badge good">Pinned</span>}{c.invite !== 'not-yet' && <span className="badge">{c.invite}</span>}</span>
    </button></li>)}{resource.data?.length === 0 && <li><Empty icon="search">No creators in this view</Empty></li>}</ul>
    {resource.data && <Pager page={page} setPage={setPage} count={resource.data.length}/>}
    </section><div className="content-detail">{selected ? <><button type="button" className="back plain" onClick={() => choose(null)}><Icon name="back"/>Creators</button>
      <CreatorPanel key={selected} id={selected} onDirty={v => { dirty.current = v; }} onBusy={v => { busy.current = v; }} onSaved={id => { resource.reload(); if (id) select(id); }}/>
    </> : <div className="workspace-empty"><Empty icon="content">Select a creator</Empty></div>}</div>
  </div>;
}
function CreatorPanel({ id, onDirty, onBusy, onSaved }: { id: string; onDirty: (v: boolean) => void; onBusy: (v: boolean) => void; onSaved: (id?: string) => void }) {
  const resource = useResource<Creator>(id === 'new' ? null : '/api/content/creators?id=' + encodeURIComponent(id), true);
  return <><Feedback {...resource} retry={resource.reload}/>{(id === 'new' || resource.data) && <CreatorEditor detail={resource.data} refreshing={resource.refreshing}
    onDirty={onDirty} onBusy={onBusy} onSaved={next => { if (id !== 'new') resource.reload(); onSaved(next); }}/>}</>;
}
function CreatorEditor({ detail: c, refreshing, onDirty, onBusy, onSaved }: { detail: Creator | null; refreshing: boolean; onDirty: (v: boolean) => void; onBusy: (v: boolean) => void; onSaved: (id?: string) => void }) {
  const [value, setValue] = useState(() => profile(c)), [channel, setChannel] = useState({ platform: 'instagram', handle: '', url: '', followers: '' }), [invite, setInvite] = useState(c?.invite ?? 'not-yet');
  const [changed, setChanged] = useState({ profile: false, channel: false, invite: false }), [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [panel, setPanel] = useState('Details'), [focus, setFocus] = useState(''), [directory, setDirectory] = useState(true), [confirm, setConfirm] = useState<Channel | 'block' | null>(null);
  const dirty = Object.values(changed).some(Boolean), locked = refreshing || !!busy;
  const mark = (part: keyof typeof changed) => { setChanged(v => ({ ...v, [part]: true })); setMessage(''); };
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => { onBusy(locked); return () => onBusy(false); }, [locked, onBusy]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !document.querySelector('dialog[open]')) { e.preventDefault(); document.getElementById('creator-save')?.click(); } };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!dirty && !locked) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const navigate = (e: MouseEvent) => { const target = e.target as Element, link = target.closest('a[href]'); if (((link && !link.hasAttribute('target')) || target.closest('button[aria-label="Sign out"]')) && (locked || !window.confirm('Discard changes?'))) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, locked]);
  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (locked) return;
    setBusy(action); setError(''); setMessage('');
    try {
      const result = await api<{ id?: string; note?: string }>('/api/content/creators', { id: c?.id, action,
        ...(['create', 'edit'].includes(action) ? value : action === 'channel' ? { ...channel, followers: channel.followers === '' ? '' : Number(channel.followers) } : action === 'invite' ? { invite } : extra) });
      if (action === 'edit' || action === 'create') setChanged(v => ({ ...v, profile: false }));
      if (action === 'channel') { setChanged(v => ({ ...v, channel: false })); setChannel({ platform: 'instagram', handle: '', url: '', followers: '' }); }
      if (action === 'invite') setChanged(v => ({ ...v, invite: false }));
      setConfirm(null); setMessage(result.note || 'Saved'); onSaved(result.id);
    } catch (problem) { setError(failure(problem)); } finally { setBusy(''); }
  }
  const field = (key: keyof Profile) => ({ value: value[key], disabled: locked, onChange: (e: { target: { value: string } }) => { setValue(v => ({ ...v, [key]: e.target.value })); mark('profile'); } });
  const channelField = (key: keyof typeof channel) => ({ value: channel[key], disabled: locked || !c, onChange: (e: { target: { value: string } }) => { setChannel(v => ({ ...v, [key]: key === 'followers' ? e.target.value.replace(/\D/g, '') : e.target.value })); mark('channel'); } });
  const column = (name: string, children: ReactNode) => <section className={'workspace-panel' + (panel === name ? ' mobile-selected' : '') + (focus === name ? ' expanded' : '')} aria-label={name}>
    <header><h2>{name}</h2><IconButton icon="external" label={(focus === name ? 'Restore ' : 'Expand ') + name.toLowerCase()} onClick={() => { setFocus(focus === name ? '' : name); setPanel(name); }}/></header><div className="workspace-panel-body"><div className="creator-fields">{children}</div></div></section>;
  const toggleDirectory = () => { const split = document.querySelector('.creator-split'); if (split && getComputedStyle(split).getPropertyValue('--workspace-directory-overlay').trim() === '1') document.querySelector<HTMLButtonElement>('.creator-split .back')?.click(); else setDirectory(!directory); };
  return <div className="workspace-editor creator-editor" data-directory={directory ? 'shown' : 'hidden'} aria-busy={locked}>
    <header className="workspace-editor-head"><div className="workspace-heading"><div className="grow"><input className="workspace-title" aria-label="Creator name" placeholder="New creator" maxLength={120} {...field('name')}/>
      <div className="row workspace-meta">{c && <><span className={'badge ' + (c.status === 'active' ? 'good' : c.status === 'blocked' ? 'danger' : 'warn')}>{c.status}</span>{c.pinned && <span className="badge good">Pinned</span>}<small>{regions[c.region]}</small></>}</div>
    </div><div className="row workspace-actions creator-actions"><IconButton icon="content" label="Toggle creators list" onClick={toggleDirectory}/>
      {c && <><button type="button" disabled={locked} onClick={() => void run(c.pinned ? 'unpin' : 'pin')}>{c.pinned ? 'Unpin' : 'Pin'}</button>
        <button type="button" disabled={locked} onClick={() => void run(c.status === 'active' ? 'pause' : 'activate')}>{c.status === 'active' ? 'Pause' : 'Make active'}</button>
        {c.status !== 'blocked' && <button type="button" className="danger" disabled={locked} onClick={() => { setError(''); setConfirm('block'); }}>Block</button>}</>}
      <button type="button" className="primary" id="creator-save" disabled={locked || (!!c && !changed.profile)} onClick={() => void run(c ? 'edit' : 'create')}>{busy === 'edit' || busy === 'create' ? 'Saving…' : c ? 'Save' : 'Add creator'}</button>
    </div></div><div className="creator-state" role="status">{locked ? 'Saving…' : dirty ? 'Unsaved' : message}</div></header>
    {error && !confirm && <div className="notice error" role="alert">{error}</div>}
    <div className="workspace-page"><div className="workspace-mobile-tabs">{panels.map(name => <button type="button" key={name} aria-pressed={panel === name} onClick={() => { setPanel(name); setFocus(''); }}>{name}</button>)}</div>
      <div className={'workspace-columns creator-columns' + (focus ? ' has-expanded' : '')}>
        {column('Details', <><label>Kind<select aria-label="Kind" {...field('kind')}><option value="person">Creator</option><option value="organisation">Organisation</option></select></label>
          <label>Region<select aria-label="Region" {...field('region')}>{Object.entries(regions).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Country<input {...field('country')} maxLength={2} placeholder="SG"/></label><label>Website<input {...field('website')} maxLength={300} placeholder="https://"/></label>
          <label>Diets<input {...field('diets')} maxLength={80} placeholder="vegan, vegetarian, five-pungent-free, buddhist, jain"/></label>
          <label>Cuisines<input {...field('cuisines')} maxLength={160} placeholder="chinese, malaysian, indian"/></label><label>Languages<input {...field('languages')} maxLength={80} placeholder="en, zh"/></label>
          <label>Note<textarea aria-label="Note" {...field('note')} maxLength={500} rows={2}/></label></>)}
        {column('Channels', <>{c?.channels.map(ch => <div className="creator-channel" key={channelKey(ch)}><a href={ch.url} target="_blank" rel="noreferrer noopener">{ch.platform}: {ch.handle}</a>
          {ch.followers != null && <small>{ch.followers.toLocaleString()} followers</small>}{ch.checked_at && <small>{date(ch.checked_at)}</small>}
          <div className="row"><button type="button" aria-label={'Edit channel: ' + ch.platform} disabled={locked} onClick={() => { if (changed.channel && !window.confirm('Discard channel changes?')) return; setChannel({ platform: ch.platform, handle: ch.handle, url: ch.url, followers: ch.followers == null ? '' : String(ch.followers) }); mark('channel'); }}>Edit</button>
            <button type="button" disabled={locked} className="danger" aria-label={'Remove ' + ch.platform + ': ' + ch.handle} onClick={() => { setError(''); setConfirm(ch); }}>Remove</button></div></div>)}
          {!c && <span className="muted">Save the creator to add channels.</span>}
          <label>Platform<select aria-label="Platform" {...channelField('platform')}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>Handle<input {...channelField('handle')} maxLength={120} placeholder="woonheng"/></label><label>Followers<input {...channelField('followers')} inputMode="numeric" maxLength={10}/></label>
          <label>Link<input {...channelField('url')} maxLength={300} placeholder="https://"/></label>
          <button type="button" disabled={locked || !c || !changed.channel} onClick={() => void run('channel')}>{busy === 'channel' ? 'Saving…' : 'Save channel'}</button></>)}
        {column('Activity', <><dl className="creator-facts">{([['Published', c?.published ?? 0], ['Passed the bar', c?.passed ?? 0], ['Held', c?.held ?? 0], ['Rejected', c?.rejected ?? 0], ['Measurable', percent(c?.coverage ?? null)], ['Last published', date(c?.last_published)], ['Found by', c?.found_by ?? 'staff'], ['Updated', date(c?.updated_at)]] as const).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
          <label>Invite<select aria-label="Invite" value={invite} disabled={locked || !c} onChange={e => { setInvite(e.target.value); mark('invite'); }}><option value="not-yet">Not yet</option><option value="ready">Ready to invite</option><option value="invited">Invited</option><option value="declined">Declined</option></select></label>
          <button type="button" disabled={locked || !c || !changed.invite} onClick={() => void run('invite')}>{busy === 'invite' ? 'Saving…' : 'Save invite'}</button>
          <h3>Recent recipe pages</h3>{!c?.sources.length && <span className="muted">No recipe pages</span>}{c?.sources.map(s => <div className="creator-source" key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.name || s.url}</a><span className={'badge ' + (tones[s.status] ?? '')}>{s.status}</span>{s.coverage != null && <small>{percent(s.coverage)} measurable</small>}<small>{date(s.last_seen)}</small></div>)}</>)}
      </div>
    </div>
    {confirm && <RecipeDialog title={confirm === 'block' ? 'Block creator?' : 'Remove channel?'} onClose={() => { if (!locked) setConfirm(null); }} actions={<><button type="button" disabled={locked} onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="danger" disabled={locked} onClick={() => void run(confirm === 'block' ? 'block' : 'remove-channel', confirm === 'block' ? {} : { platform: confirm.platform, handle: confirm.handle })}>{confirm === 'block' ? 'Block' : 'Remove'}</button></>}>
      <strong>{confirm === 'block' ? value.name : confirm.platform + ': ' + confirm.handle}</strong>{confirm === 'block' && <p>Cooker will never search their pages.</p>}{error && <div className="notice error" role="alert">{error}</div>}
    </RecipeDialog>}
  </div>;
}
