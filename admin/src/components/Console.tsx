'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { can, type Capability, type Role } from '../lib/permissions';
import { api, useResource, navigateFresh } from './client';
import { Empty, Feedback } from './Primitives';
import { Icon, type IconName } from './Icon';
import Overview, { type OverviewData } from './Overview';
import Accounts from './Accounts';
import Cases from './Cases';
import { Controls } from './Operations';
import { ChefJobs } from './ChefJobs';
import { Chefs } from './Chefs';
import { Events, Places, Recipes } from './content/ContentConsole';
import { Gatherings, Listings, Reviews } from './content/MemberContent';
import { MemberRecipes } from './content/MemberRecipes';
import AiRecipes from './content/AiRecipes';
import { Ingredients } from './content/Ingredients';
import { Creators } from './content/Creators';
import { GameLevels } from './content/GameLevels';
import Sellers from './Sellers';
import { PhotoChecks, Teachers } from './Social';
import { Audit, Integrations, Staff } from './Administration';

type StaffSession = { member: { id: string; email: string; role: Role } };
/** A section shows for staff with its `capability`, or with any of `anyOf` when its parts need different ones. */
type Section = { id: string; title: string; icon: IconName; capability?: Capability; anyOf?: Capability[]; count?: (d: OverviewData) => number | null | undefined };
/** Grouped by the job staff are doing: deciding on the catalogue, on what members post, on Market, on safety, and running the service. */
const groups: { title?: string; sections: Section[] }[] = [
  { sections: [{ id: 'overview', title: 'Overview', icon: 'overview' }] },
  { title: 'Catalogue', sections: [
    { id: 'places', title: 'Places', icon: 'pin', capability: 'content' },
    { id: 'recipes', title: 'Recipes', icon: 'book', capability: 'content' },
    { id: 'events', title: 'Events', icon: 'calendar', capability: 'content' },
    { id: 'creators', title: 'Creators', icon: 'person', capability: 'content' },
    { id: 'game-levels', title: 'Game levels', icon: 'game', capability: 'content', count: d => d.game ? d.game.levels + d.game.pictures : null }] },
  { title: 'Community', sections: [
    { id: 'member-recipes', title: 'Member recipes', icon: 'chef', capability: 'content', count: d => d.memberRecipes },
    { id: 'ai-recipes', title: 'AI recipes', icon: 'wand', capability: 'content', count: d => d.ai?.installed ? d.ai.waiting : null },
    { id: 'ingredients', title: 'Ingredients', icon: 'leaf', capability: 'content' },
    { id: 'reviews', title: 'Place reviews', icon: 'star', capability: 'content', count: d => d.reviews },
    { id: 'gatherings', title: 'Gatherings', icon: 'group', capability: 'content' }] },
  { title: 'Social', sections: [
    { id: 'photo-checks', title: 'Photo checks', icon: 'identity', capability: 'identity', count: d => d.social?.checks }] },
  { title: 'Market', sections: [
    { id: 'shops', title: 'Shops', icon: 'sellers', capability: 'sellers' },
    { id: 'teachers', title: 'Class teachers', icon: 'person', capability: 'sellers', count: d => d.social?.teachers },
    { id: 'listings', title: 'Listings', icon: 'tag', capability: 'content', count: d => d.listings }] },
  { title: 'Safety', sections: [
    { id: 'cases', title: 'Cases', icon: 'cases', capability: 'cases', count: d => d.queues?.reduce((sum, q) => sum + q.count, 0) },
    { id: 'accounts', title: 'Accounts', icon: 'accounts', capability: 'accounts' }] },
  { title: 'Kitchen', sections: [
    { id: 'chefs', title: 'Chef decisions', icon: 'chef', anyOf: ['content', 'cases', 'sellers'], count: d => d.chefs },
    { id: 'chef-jobs', title: 'Chefs', icon: 'group', capability: 'operations' }] },
  { title: 'Service', sections: [
    { id: 'features', title: 'Features', icon: 'controls', capability: 'operations' },
    { id: 'integrations', title: 'Integrations', icon: 'integrations', capability: 'integrations' },
    { id: 'staff', title: 'Staff', icon: 'staff', capability: 'staff' },
    { id: 'audit', title: 'Audit', icon: 'audit', capability: 'audit' }] },
];

export default function Console({ section }: { section: string }) {
  const [signOutError, setSignOutError] = useState('');
  const resource = useResource<StaffSession>('/api/auth/session'); const member = resource.data?.member;
  const attention = useResource<OverviewData>(member ? '/api/manage/overview' : null), counts = attention.data;
  // Counts follow the staff member around the console, so a decision made on one page shows in the sidebar on the next.
  const { reload } = attention, shown = useRef(section);
  useEffect(() => { if (shown.current !== section) { shown.current = section; reload(); } }, [section, reload]);
  async function signOut() {
    try { await api('/api/auth/logout', {}); navigateFresh('/?signedout'); }
    catch { setSignOutError('Could not sign out. Try again.'); }
  }
  if (!member) return <main id="main" className="login"><div className="login-card"><Feedback {...resource} retry={resource.reload}/></div></main>;
  const allowed = (s: Section) => s.anyOf ? s.anyOf.some(c => can(member.role, c)) : !s.capability || can(member.role, s.capability);
  const visible = groups.map(g => ({ ...g, sections: g.sections.filter(allowed) })).filter(g => g.sections.length);
  const current = visible.flatMap(g => g.sections).find(s => s.id === section);
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/console/overview"><BrandLogo /></Link>
      <nav aria-label="Console">{visible.map((group, i) => <div className="nav-group" key={group.title ?? i} role="group" aria-label={group.title}>
        {group.title && <span className="nav-title" aria-hidden="true">{group.title}</span>}
        {group.sections.map(s => { const n = counts && s.count ? s.count(counts) ?? 0 : 0;
          return <Link prefetch={false} key={s.id} href={'/console/' + s.id} aria-current={section === s.id ? 'page' : undefined}>
            <Icon name={s.icon}/><span className="grow">{s.title}</span>{n > 0 && <span className="count" aria-label={n + ' waiting'}>{n > 99 ? '99+' : n}</span>}</Link>; })}
      </div>)}</nav>
      <div className="sidebar-footer"><span className="avatar" aria-hidden="true">{member.email[0]}</span>
        <div className="who"><strong title={member.email}>{member.email}</strong><small>{member.role}</small></div>
        <button type="button" className="icon-button" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="signOut"/></button></div>
    </aside>
    <main id="main" className="workspace">
      <header className="heading"><h1>{current?.title ?? 'Not found'}</h1></header>
      {signOutError && <div className="notice error" role="alert"><Icon name="warning"/>{signOutError}</div>}
      {!current ? <Empty icon="warning">Not available</Empty> : <>
        {section === 'overview' && <Overview resource={attention} role={member.role}/>}
        {section === 'places' && <Places/>}{section === 'recipes' && <Recipes/>}{section === 'events' && <Events/>}{section === 'creators' && <Creators/>}{section === 'game-levels' && <GameLevels/>}
        {section === 'member-recipes' && <MemberRecipes origin="member"/>}{section === 'ai-recipes' && <AiRecipes canLimit={can(member.role, 'operations')}/>}{section === 'ingredients' && <Ingredients/>}
        {section === 'reviews' && <Reviews/>}{section === 'gatherings' && <Gatherings/>}
        {section === 'photo-checks' && <PhotoChecks/>}{section === 'teachers' && <Teachers/>}
        {section === 'shops' && <Sellers/>}{section === 'listings' && <Listings/>}
        {section === 'accounts' && <Accounts/>}{section === 'cases' && <Cases canAssign={can(member.role, 'operations')}/>}
        {section === 'chefs' && <Chefs/>}{section === 'chef-jobs' && <ChefJobs/>}{section === 'features' && <Controls/>}{section === 'integrations' && <Integrations/>}
        {section === 'staff' && <Staff self={member.id}/>}{section === 'audit' && <Audit/>}
      </>}
    </main>
  </div>;
}
