'use client';
import { useState } from 'react';
import Link from 'next/link';
import { can, type Capability, type Role } from '../lib/permissions';
import { api, useResource, navigateFresh } from './client';
import { Empty, Feedback } from './Primitives';
import { Icon, type IconName } from './Icon';
import Overview from './Overview';
import Accounts from './Accounts';
import Cases from './Cases';
import { Controls } from './Operations';
import ContentConsole from './content/ContentConsole';
import Sellers from './Sellers';
import { Audit, Integrations, Staff } from './Administration';

type StaffSession = { member: { id: string; email: string; role: Role } };
const sections: { id: string; title: string; icon: IconName; capability?: Capability }[] = [
  { id: 'overview', title: 'Overview', icon: 'overview' },
  { id: 'accounts', title: 'Accounts', icon: 'accounts', capability: 'accounts' },
  { id: 'cases', title: 'Cases', icon: 'cases', capability: 'cases' },
  { id: 'content', title: 'Content', icon: 'content', capability: 'content' },
  { id: 'sellers', title: 'Sellers', icon: 'sellers', capability: 'sellers' },
  { id: 'controls', title: 'Features', icon: 'controls', capability: 'operations' },
  { id: 'integrations', title: 'Integrations', icon: 'integrations', capability: 'integrations' },
  { id: 'staff', title: 'Staff', icon: 'staff', capability: 'staff' },
  { id: 'audit', title: 'Audit', icon: 'audit', capability: 'audit' },
  { id: 'identity', title: 'Identity', icon: 'identity', capability: 'identity' },
];
export default function Console({ section }: { section: string }) {
  const [signOutError, setSignOutError] = useState('');
  const resource = useResource<StaffSession>('/api/auth/session'); const member = resource.data?.member;
  async function signOut() {
    try { await api('/api/auth/logout', {}); navigateFresh('/?signedout'); }
    catch { setSignOutError('Could not sign out. Try again.'); }
  }
  if (!member) return <main id="main" className="login"><div className="login-card"><Feedback {...resource} retry={resource.reload}/></div></main>;
  const visible = sections.filter(s => !s.capability || can(member.role, s.capability));
  const current = visible.find(s => s.id === section);
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/console/overview"><span className="mark"><Icon name="leaf"/></span>QuinTaste</Link>
      <nav aria-label="Console">{visible.map(s => <Link prefetch={false} key={s.id} href={'/console/' + s.id} aria-current={section === s.id ? 'page' : undefined}>
        <Icon name={s.icon}/>{s.title}</Link>)}</nav>
      <div className="sidebar-footer"><span className="avatar" aria-hidden="true">{member.email[0]}</span>
        <div className="who"><strong title={member.email}>{member.email}</strong><small>{member.role}</small></div>
        <button type="button" className="icon-button" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="signOut"/></button></div>
    </aside>
    <main id="main" className="workspace">
      <header className="heading"><h1>{current?.title ?? 'Not found'}</h1></header>
      {signOutError && <div className="notice error" role="alert"><Icon name="warning"/>{signOutError}</div>}
      {!current ? <Empty icon="warning">Not available</Empty> : <>
        {section === 'overview' && <Overview/>}{section === 'accounts' && <Accounts/>}
        {section === 'cases' && <Cases canAssign={can(member.role, 'operations')}/>}{section === 'content' && <ContentConsole/>}
        {section === 'sellers' && <Sellers/>}{section === 'controls' && <Controls/>}{section === 'integrations' && <Integrations/>}
        {section === 'staff' && <Staff self={member.id}/>}{section === 'audit' && <Audit/>}
        {section === 'identity' && <div className="panel"><Empty icon="identity">Identity review is off</Empty></div>}
      </>}
    </main>
  </div>;
}
