'use client';
import Link from 'next/link';
import { useResource } from './client';
import { Feedback } from './Primitives';
import { Icon } from './Icon';
import { featureName } from './Operations';

type Data = { users: number | null; queues: { kind: string; count: number; overdue: number }[] | null; features: { key: string; enabled: boolean }[] | null };
export default function Overview() {
  const resource = useResource<Data>('/api/manage/overview'), d = resource.data;
  const open = d?.queues?.reduce((sum, q) => sum + q.count, 0) ?? 0, overdue = d?.queues?.reduce((sum, q) => sum + q.overdue, 0) ?? 0;
  return <><Feedback {...resource} retry={resource.reload}/>{d && <div className="stack">
    {(d.users !== null || d.queues) && <ul className="list">
      {d.users !== null && <li><Icon name="accounts"/><span>Members</span><span className="value strong">{d.users.toLocaleString()}</span></li>}
      {d.queues && <li><Icon name="cases"/><span>Open cases</span><span className="value strong">{open}</span></li>}
      {d.queues && <li><Icon name="warning"/><span>Overdue</span><span className={'value strong'}>{overdue ? <span className="badge warn">{overdue}</span> : 0}</span></li>}
    </ul>}
    {!!d.queues?.length && <><h2 className="section-title">Queues</h2><ul className="list">{d.queues.map(q =>
      <li key={q.kind}><span className="badge">{q.kind}</span><span className="value">{q.count}{q.overdue ? <> · <span className="badge warn">{q.overdue} overdue</span></> : null}</span></li>)}</ul></>}
    {d.features && <><h2 className="section-title">Features</h2><ul className="list">{d.features.map(f =>
      <li key={f.key}><span>{featureName(f.key)}</span><span className="value"><span className={'badge ' + (f.enabled ? 'good' : '')}>{f.enabled ? 'On' : 'Off'}</span></span></li>)}</ul>
      <div><Link className="button" href="/console/controls"><Icon name="controls" size={16}/>Manage</Link></div></>}
  </div>}</>;
}
