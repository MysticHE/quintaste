'use client';
import Link from 'next/link';
import type { Role } from '../lib/permissions';
import { can } from '../lib/permissions';
import { Feedback } from './Primitives';
import { Icon, type IconName } from './Icon';
import { featureName } from './Operations';
import type { AiSummary } from './content/AiRecipes';

export type OverviewData = { users: number | null; queues: { kind: string; count: number; overdue: number }[] | null; features: { key: string; enabled: boolean }[] | null;
  memberRecipes: number | null; reviews: number | null; listings: number | null; places: { total: number; explorer: number; mixed: number } | null; ai: AiSummary | null;
  game?: { levels: number; pictures: number } | null };
type Resource = { data: OverviewData | null; error: string; loading: boolean; reload: () => void };
type Task = { href: string; icon: IconName; label: string; count: number; detail?: string; urgent?: boolean };

/** What is waiting for a staff decision first, then the state of the catalogue and the service. */
export default function Overview({ resource, role }: { resource: Resource; role: Role }) {
  const d = resource.data;
  if (!d) return <Feedback {...resource} retry={resource.reload}/>;
  const open = d.queues?.reduce((sum, q) => sum + q.count, 0) ?? 0, overdue = d.queues?.reduce((sum, q) => sum + q.overdue, 0) ?? 0;
  const ai = d.ai?.installed ? d.ai : null;
  const tasks: Task[] = [
    ...(d.queues ? [{ href: '/console/cases', icon: 'cases' as const, label: 'Open cases', count: open, urgent: overdue > 0,
      detail: [overdue ? `${overdue} overdue` : '', d.queues.map(q => `${q.count} ${q.kind}`).join(' · ')].filter(Boolean).join(' · ') }] : []),
    ...(d.memberRecipes !== null ? [{ href: '/console/member-recipes', icon: 'chef' as const, label: 'Member recipes to review', count: d.memberRecipes }] : []),
    ...(ai ? [{ href: '/console/ai-recipes', icon: 'wand' as const, label: 'AI recipes to review', count: ai.waiting }] : []),
    ...(d.reviews !== null ? [{ href: '/console/reviews', icon: 'star' as const, label: 'Reported place reviews', count: d.reviews }] : []),
    ...(d.listings !== null ? [{ href: '/console/listings', icon: 'tag' as const, label: 'Reported Market listings', count: d.listings }] : []),
  ];
  const waiting = tasks.filter(t => t.count > 0), clear = tasks.filter(t => !t.count);
  const off = d.features?.filter(f => !f.enabled) ?? [];
  return <div className="stack">
    <Feedback {...resource} retry={resource.reload}/>
    {!!tasks.length && <section className="stack compact" aria-labelledby="waiting">
      <h2 id="waiting" className="section-title">Waiting for you</h2>
      {waiting.length ? <ul className="list tasks">{waiting.map(t => <li key={t.href}><Link href={t.href} className="task">
        <Icon name={t.icon}/><span className="label"><strong>{t.label}</strong>{t.detail && <small>{t.detail}</small>}</span>
        <span className={'badge ' + (t.urgent ? 'danger' : 'warn')}>{t.count}</span><Icon name="forward" size={16}/></Link></li>)}</ul>
        : <div className="panel all-clear"><Icon name="check"/><span>Nothing is waiting. Every queue you can act on is clear.</span></div>}
      {!!waiting.length && !!clear.length && <small className="clear-line">Clear: {clear.map(t => t.label.toLowerCase()).join(', ')}</small>}
    </section>}
    {(d.places || ai) && <section className="stack compact" aria-labelledby="catalogue">
      <h2 id="catalogue" className="section-title">Catalogue</h2>
      <ul className="list">
        {d.places && <li><Link href="/console/places" className="task"><Icon name="pin"/><span className="label"><strong>{d.places.total.toLocaleString()} places</strong>
          <small>{(d.places.total - d.places.mixed).toLocaleString()} Veg Kitchen · {d.places.mixed.toLocaleString()} Mixed Kitchen · {d.places.explorer.toLocaleString()} added by QT Explorer</small></span><Icon name="forward" size={16}/></Link></li>}
        {ai && <li><Link href="/console/ai-recipes" className="task"><Icon name="wand"/><span className="label"><strong>AI recipes today: {ai.today} of {ai.dailyCap}</strong>
          <small>{ai.publishedToday} published · {ai.reviewToday} sent to review · {ai.failedToday} failed{ai.queued + ai.working ? ` · ${ai.queued + ai.working} in progress` : ''}{ai.enabled ? '' : ' · feature off'}</small></span><Icon name="forward" size={16}/></Link></li>}
      </ul>
    </section>}
    {(d.users !== null || d.features) && <section className="stack compact" aria-labelledby="service">
      <h2 id="service" className="section-title">Service</h2>
      <ul className="list">
        {d.users !== null && <li><Icon name="accounts"/><span>Members</span><span className="value strong">{d.users.toLocaleString()}</span></li>}
        {d.features && <li><Link href={can(role, 'operations') ? '/console/features' : '/console/overview'} className="task"><Icon name="controls"/>
          <span className="label"><strong>{off.length ? `${off.length} ${off.length === 1 ? 'feature is' : 'features are'} off` : 'Every feature is on'}</strong>
            {!!off.length && <small>{off.map(f => featureName(f.key)).join(', ')}</small>}</span><Icon name="forward" size={16}/></Link></li>}
      </ul>
    </section>}
  </div>;
}
