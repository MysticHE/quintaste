'use client';
import { useState } from 'react';
import { date, useResource } from './client';
import { Feedback, Mutation } from './Primitives';
import { Icon } from './Icon';

type Control = { key: string; enabled: boolean; notice: string; version: number; updated_at: string };
const names: Record<string, string> = { registration: 'Registration', discovery: 'Explore', menus: 'Menus', avatars: 'Avatars', ai: 'AI features', social: 'Social',
  market: 'Market buying', market_sellers: 'Market selling', recipes: 'Member recipes', areas: 'Area counts', games: 'Games', identity: 'Identity review' };
/** Features that need production acceptance; the server refuses to switch them on. */
const locked = ['ai', 'identity'];
export const featureName = (key: string) => names[key] ?? key.replaceAll('_', ' ');

export function Controls() {
  const resource = useResource<Control[]>('/api/manage/controls'); const [open, setOpen] = useState<string | null>(null);
  return <><Feedback {...resource} retry={resource.reload}/>{resource.data && <ul className="list">{resource.data.map(row => <li key={row.key} className={open === row.key ? 'open' : undefined}>
    <div className="row spread">
      <div className="label"><strong>{featureName(row.key)}</strong><small>{row.notice || date(row.updated_at)}</small></div>
      <div className="row"><span className={'badge ' + (row.enabled ? 'good' : '')}>{row.enabled ? 'On' : 'Off'}</span>
        {!(locked.includes(row.key) && !row.enabled) && <button type="button" aria-expanded={open === row.key} onClick={() => setOpen(open === row.key ? null : row.key)}>{open === row.key ? 'Close' : row.enabled ? 'Turn off' : 'Turn on'}</button>}</div>
    </div>
    {open === row.key && <div className="editor" style={{ marginTop: 12 }}><Mutation key={row.key + row.version} endpoint="controls" label={row.enabled ? 'Turn off' : 'Turn on'} tone={row.enabled ? 'danger' : 'primary'}
      onSaved={() => { setOpen(null); resource.reload(); }} values={f => ({ key: row.key, version: row.version, enabled: !row.enabled, notice: f.get('notice') })}>
      <label>Member notice<textarea name="notice" rows={2} maxLength={300} minLength={row.enabled ? 10 : 0} required={row.enabled} defaultValue={row.notice}/></label>
    </Mutation></div>}
  </li>)}</ul>}{resource.data && !resource.data.length && <div className="panel"><div className="empty"><Icon name="controls" size={34}/>No features</div></div>}</>;
}
