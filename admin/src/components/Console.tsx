'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { can, type Capability, type Role } from '../lib/permissions';
import { api, useResource, navigateFresh } from './client';
import { Feedback } from './Primitives';
import type { StaffSession } from './Verification';
import Overview from './Overview';
import Accounts from './Accounts';
import Cases from './Cases';
import { Content, Controls } from './Operations';
import Sellers from './Sellers';
import { Audit, Integrations, Staff } from './Administration';

const sections: { id:string;title:string;description:string;icon:string;capability?:Capability }[] = [
  { id:'overview',title:'Overview',description:'A clear view of the community and the work that needs attention.',icon:'◈' },
  { id:'accounts',title:'Customer accounts',description:'Find customers, manage access and sign out devices.',icon:'♙',capability:'accounts' },
  { id:'cases',title:'Review cases',description:'Reports, harm notices, corrections, privacy requests and incidents.',icon:'▤',capability:'cases' },
  { id:'content',title:'Editorial review',description:'Record source decisions and withdraw unsafe menu content.',icon:'✎',capability:'content' },
  { id:'sellers',title:'Market sellers',description:'Review reported shops and take down items or shops that break Market rules.',icon:'⌂',capability:'sellers' },
  { id:'controls',title:'Feature controls',description:'Pause affected services and record the operational decision.',icon:'⊙',capability:'operations' },
  { id:'integrations',title:'Integrations',description:'Check provider connections without viewing upstream secrets.',icon:'⇄',capability:'integrations' },
  { id:'staff',title:'Staff access',description:'Invite colleagues and keep privileges appropriate to their work.',icon:'♧',capability:'staff' },
  { id:'audit',title:'Audit history',description:'Trace privileged actions, their owners and the reason for each change.',icon:'◷',capability:'audit' },
  { id:'identity',title:'Identity review',description:'Controlled access to later-phase identity verification.',icon:'◇',capability:'identity' },
];
export default function Console({ section }: { section:string }) {
  const [logoutError,setLogoutError] = useState('');
  async function signOut() {
    try { await api('/api/auth/logout',{}); navigateFresh('/'); }
    catch { setLogoutError('Sign-out could not be confirmed. Check your connection and try again.'); }
  }
  const resource = useResource<StaffSession>('/api/auth/session'); const member = resource.data?.member;
  useEffect(() => { if (member && !member.verified) navigateFresh('/verify'); },[member]);
  if (!member?.verified) return <main id="main" className="login"><Feedback {...resource} retry={resource.reload}/></main>;
  const current = sections.find(s => s.id===section);
  const allowed = current && (!current.capability || can(member.role as Role,current.capability));
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/console/overview">Quin<span>Taste</span></Link>
    <nav aria-label="Staff workspace">{sections.filter(s => !s.capability || can(member.role as Role,s.capability)).map(s => <Link prefetch={false} key={s.id} href={'/console/'+s.id} aria-current={section===s.id?'page':undefined}><span className="nav-icon" aria-hidden="true">{s.icon}</span>{s.title}</Link>)}<Link href="/verify"><span className="nav-icon" aria-hidden="true">⌘</span>Security keys</Link></nav>
    <div className="sidebar-footer"><strong>{member.email}</strong><div>{member.role}</div><button onClick={signOut}>Sign out</button></div>
  </aside><main id="main" className="workspace"><div className="topbar"><div className="breadcrumb">Staff workspace / {current?.title||'Unavailable'}</div><Link className="badge" href="/verify">Security key verified</Link></div>
    <header className="heading"><div><div className="eyebrow">QuinTaste operations</div><h1>{current?.title||'Page unavailable'}</h1><p>{current?.description}</p></div><button onClick={signOut}>Sign out</button></header>
    {logoutError && <div className="notice error" role="alert">{logoutError}</div>}
    {!allowed ? <div className="notice">This page is unavailable for your staff role.</div> : <>
      {section==='overview'&&<Overview/>}{section==='accounts'&&<Accounts/>}{section==='cases'&&<Cases canAssign={can(member.role as Role,'operations')}/>}{section==='content'&&<Content/>}{section==='sellers'&&<Sellers/>}{section==='controls'&&<Controls/>}{section==='integrations'&&<Integrations/>}{section==='staff'&&<Staff/>}{section==='audit'&&<Audit/>}
      {section==='identity'&&<div className="panel"><h2>Identity intake is not enabled</h2><p>This later-phase workflow requires private evidence storage, case-scoped access and verified automatic deletion before it can accept documents.</p><p className="muted">No identity images can be uploaded or viewed here. Track readiness and operational issues in Review cases.</p><Link className="button" href="/console/cases">Open review cases</Link></div>}
    </>}
  </main></div>;
}
