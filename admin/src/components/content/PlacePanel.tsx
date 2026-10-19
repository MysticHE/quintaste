'use client';
import { useState } from 'react';
import Link from 'next/link';
import { date, useResource } from '../client';
import { Feedback } from '../Primitives';
import { Icon } from '../Icon';
import { ActionBar, Badges, Edited, History, PhotoUpload, photoSrc, type Audit, type Staff } from './Parts';
import MenuPanel, { type Menu } from './MenuPanel';

type Hours = { summary: string; schedule: string[]; notes: string; sourceUrl: string; checkedAt: string };
type Photo = { path: string; width: number; height: number; author: string; sourceUrl: string; license: string; licenseUrl: string | null; capturedAt: string | null; checkedAt: string; changes: string; provider?: string };
type Place = { name: string; branch: string; address: string; postalCode: string; aliases: string[]; point: { latitude: number; longitude: number } | null;
  venueDiet: 'Vegetarian' | 'Vegan'; alliumFreeClaim: boolean; kitchen?: 'options' | null; menuTotal?: number | null; hours?: Hours | null; photo?: Photo | null; sourceUrl?: string };
type Detail = { id: string; app: string | null; base: Place | null; staff: Staff | null; newer: boolean; history: Audit[];
  menu: { base: Menu | null; staff: Staff | null; newer: boolean }; reports: { id: string; title: string; status: string; created_at: string }[] };
const blank: Place = { name: '', branch: '', address: '', postalCode: '', aliases: [], point: null, venueDiet: 'Vegetarian', alliumFreeClaim: false, kitchen: null, menuTotal: null, hours: null, photo: null, sourceUrl: '' };
const today = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);

/** What members see now: the packaged place with staff changes on top (null clears photo or hours). */
function current(detail: Detail): Place {
  const patch = { ...detail.staff?.data } as Partial<Place> & { base?: string };
  delete patch.base;
  return { ...blank, ...(detail.base ?? {}), ...patch };
}
export default function PlacePanel({ id, onChanged }: { id: string; onChanged: (id?: string | null) => void }) {
  const creating = id === 'new', resource = useResource<Detail>(creating ? null : '/api/content/places?id=' + encodeURIComponent(id));
  if (creating) return <PlaceForm detail={null} onSaved={onChanged}/>;
  const d = resource.data;
  return <><Feedback {...resource} retry={resource.reload}/>{d && <PlaceForm key={d.staff?.version ?? 0} detail={d} onSaved={next => { resource.reload(); onChanged(next); }}/>}</>;
}
function PlaceForm({ detail, onSaved }: { detail: Detail | null; onSaved: (id?: string | null) => void }) {
  const start = detail ? current(detail) : blank, base = detail?.base, staffMade = !detail || detail.staff?.origin === 'staff';
  const [place, setPlace] = useState<Place>(start), set = (patch: Partial<Place>) => setPlace(p => ({ ...p, ...patch }));
  const [lat, setLat] = useState(start.point ? String(start.point.latitude) : ''), [lng, setLng] = useState(start.point ? String(start.point.longitude) : '');
  const [aliases, setAliases] = useState(start.aliases.join(', '));
  const hours = place.hours, photo = place.photo, edited = detail?.staff?.origin === 'edit' && Object.keys(detail.staff.data).some(k => k !== 'base');
  const was = (key: keyof Place) => base && JSON.stringify(base[key] ?? null) !== JSON.stringify(place[key] ?? null)
    ? <small>Original: {Array.isArray(base[key]) ? (base[key] as string[]).join(', ') || '—' : String(base[key] ?? '—')}</small> : null;
  function payload() {
    if ((lat || lng) && !(Number.isFinite(Number(lat)) && Number(lat) && Number.isFinite(Number(lng)) && Number(lng))) throw new Error('Check latitude and longitude.');
    const hours = place.hours ? { ...place.hours, schedule: place.hours.schedule.filter(line => line.trim()) } : null;
    return { id: detail?.id, version: detail?.staff?.version ?? 0, fields: { ...place, hours, aliases, point: lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : null } };
  }
  const actions = !detail ? [{ action: 'create', label: 'Create place', tone: 'primary' as const }] : [
    { action: 'save', label: 'Save', tone: 'primary' as const },
    detail.staff?.hidden ? { action: 'restore', label: 'Show' } : { action: 'hide', label: 'Hide', tone: 'danger' as const },
    ...(edited && !staffMade ? [{ action: 'clear', label: 'Revert', confirm: 'Revert every staff edit to this place?' }] : []),
    ...(staffMade ? [{ action: 'delete', label: 'Delete', tone: 'danger' as const, confirm: 'Delete this place and its dishes?' }] : [])];
  return <div className="stack">
    <section className="panel stack">
      <div className="row spread"><div className="stack compact"><h2>{detail ? start.name : 'New place'}</h2>{detail && <span className="code">{detail.id}</span>}</div>
        {detail && <Badges hidden={detail.staff?.hidden} edited={edited} staff={staffMade} newer={detail.newer} reports={detail.reports.filter(r => !['resolved', 'dismissed'].includes(r.status)).length}/>}</div>
      {detail && <Edited staff={detail.staff} link={detail.app && !detail.staff?.hidden ? `${detail.app}/place/catalogue-${detail.id}` : null}/>}
      <div className="fields">
        <label>Name<input value={place.name} onChange={e => set({ name: e.target.value })} maxLength={300}/>{was('name')}</label>
        <label>Branch<input value={place.branch} onChange={e => set({ branch: e.target.value })} maxLength={300}/>{was('branch')}</label>
        <label>Postal code<input value={place.postalCode} onChange={e => set({ postalCode: e.target.value })} inputMode="numeric" maxLength={6}/>{was('postalCode')}</label>
        <label>Diet<select value={place.venueDiet} onChange={e => set({ venueDiet: e.target.value as Place['venueDiet'] })}><option>Vegetarian</option><option>Vegan</option></select>{was('venueDiet')}</label>
        {/* Veg options needs the app's menu filter (docs/VEG_OPTIONS_PLAN.md); until that ships, staff cannot newly mark a place. */}
        {start.kitchen === 'options' && <label>Kitchen<select value={place.kitchen ?? ''} onChange={e => set(e.target.value === 'options' ? { kitchen: 'options', alliumFreeClaim: false } : { kitchen: null, menuTotal: null })}>
          <option value="">Vegetarian</option><option value="options">Mixed Kitchen</option></select>{was('kitchen')}</label>}
        {place.kitchen === 'options' && <label>Full menu size<input value={place.menuTotal ?? ''} inputMode="numeric" maxLength={4}
          onChange={e => { const digits = e.target.value.replace(/\D/g, ''); set({ menuTotal: digits ? Number(digits) : null }); }}/>{was('menuTotal')}</label>}
      </div>
      <label>Address<input value={place.address} onChange={e => set({ address: e.target.value })} maxLength={500}/>{was('address')}</label>
      <label>Other names<input value={aliases} onChange={e => setAliases(e.target.value)}/></label>
      <div className="fields">
        <label>Latitude<input value={lat} onChange={e => setLat(e.target.value)} inputMode="decimal" placeholder="1.3521"/></label>
        <label>Longitude<input value={lng} onChange={e => setLng(e.target.value)} inputMode="decimal" placeholder="103.8198"/></label>
        <label className="check"><input type="checkbox" checked={place.alliumFreeClaim} disabled={place.kitchen === 'options'} onChange={e => set({ alliumFreeClaim: e.target.checked })}/>Allium-free</label>
      </div>
      {staffMade && <label>Source<input value={place.sourceUrl ?? ''} onChange={e => set({ sourceUrl: e.target.value })} placeholder="https://"/></label>}
    </section>
    <section className="panel stack"><div className="row spread"><h3>Opening hours</h3>
      {hours ? <button type="button" className="danger" onClick={() => set({ hours: null })}><Icon name="trash" size={16}/>Remove</button>
        : <button type="button" onClick={() => set({ hours: { summary: '', schedule: [''], notes: '', sourceUrl: '', checkedAt: today() } })}><Icon name="plus" size={16}/>Add</button>}</div>
      {hours ? <><div className="fields"><label>Summary<input value={hours.summary} maxLength={120} onChange={e => set({ hours: { ...hours, summary: e.target.value } })} placeholder="Daily 11:30–21:00"/></label>
        <label>Checked<input type="date" value={hours.checkedAt} max={today()} onChange={e => set({ hours: { ...hours, checkedAt: e.target.value } })}/></label></div>
        <label>Schedule<textarea rows={4} value={hours.schedule.join('\n')} onChange={e => set({ hours: { ...hours, schedule: e.target.value.split('\n').slice(0, 8) } })}/></label>
        <label>Notes<input value={hours.notes} maxLength={500} onChange={e => set({ hours: { ...hours, notes: e.target.value } })}/></label>
        <label>Source<input value={hours.sourceUrl} onChange={e => set({ hours: { ...hours, sourceUrl: e.target.value } })} placeholder="https://"/></label></>
        : null}
    </section>
    <section className="panel stack"><div className="row spread"><h3>Photo</h3>{photo && <button type="button" className="danger" onClick={() => set({ photo: null })}><Icon name="trash" size={16}/>Remove</button>}</div>
      {/* eslint-disable-next-line @next/next/no-img-element -- staff preview of an uploaded photo */}
      {photo && <img className="preview" src={photoSrc(photo.path)} alt={'Photo of ' + place.name} width={photo.width} height={photo.height}/>}
      <PhotoUpload label={photo ? 'Replace' : 'Upload'} onUploaded={up => set({ photo: { ...up, author: '', sourceUrl: place.sourceUrl ?? '', license: 'Used with permission', licenseUrl: null, capturedAt: null, checkedAt: today(), changes: 'Resized for display.' } })}/>
      {photo && <div className="fields">
        <label>Credit<input value={photo.author} maxLength={180} onChange={e => set({ photo: { ...photo, author: e.target.value } })}/></label>
        <label>Licence<input value={photo.license} maxLength={80} onChange={e => set({ photo: { ...photo, license: e.target.value } })}/></label>
        <label>Source<input value={photo.sourceUrl} onChange={e => set({ photo: { ...photo, sourceUrl: e.target.value } })} placeholder="https://"/></label>
        <label>Changes<input value={photo.changes} maxLength={300} onChange={e => set({ photo: { ...photo, changes: e.target.value } })}/></label></div>}
    </section>
    <section className="panel"><ActionBar resource="places" actions={actions} payload={payload} onDone={(result, action) => onSaved(action === 'delete' ? null : result.id)}/></section>
    {detail && <MenuPanel placeId={detail.id} menu={detail.menu} onSaved={() => onSaved()}/>}
    {detail && <section className="panel stack">{!!detail.reports.length && <><div className="row spread"><h3>Reports</h3><Link className="row" href="/console/cases">Cases<Icon name="forward" size={14}/></Link></div>
      <ul className="history">{detail.reports.map(r => <li key={r.id}><strong>{r.title}</strong><small>{date(r.created_at)} · {r.status}</small></li>)}</ul></>}
      <h3>History</h3><History rows={detail.history}/></section>}
  </div>;
}
