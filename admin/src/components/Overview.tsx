'use client';
import { useResource } from './client';
import { Feedback, Table } from './Primitives';

export default function Overview() {
  const resource = useResource<{ users: number | null; queues: { kind: string; count: number; overdue: number }[]; readiness: { title: string; state: string }[] }>('/api/manage/overview');
  return <><Feedback {...resource} retry={resource.reload}/>{resource.data && <>
    <div className="grid">{resource.data.users !== null && <div className="panel"><small>Customer accounts</small><div className="metric">{resource.data.users}</div><small>Registered on this deployment</small></div>}
      <div className="panel"><small>Your open cases</small><div className="metric">{resource.data.queues.reduce((sum,q) => sum+q.count,0)}</div><small>Includes assigned cases you can access</small></div>
      <div className="panel"><small>Past response target</small><div className="metric">{resource.data.queues.reduce((sum,q) => sum+q.overdue,0)}</div><small>Review and update the case owner</small></div></div>
    <div className="panel"><h2>Review queues</h2><Table headings={['Queue','Open','Overdue']} rows={resource.data.queues.map(q => [q.kind,q.count,q.overdue])} empty="No open cases in your queues."/></div>
    <div className="panel"><h2>Deployment readiness</h2><p className="muted">Connection and feature readiness are tracked separately. These states do not certify the whole product for launch.</p><Table headings={['Area','Current state']} rows={resource.data.readiness.map(r => [r.title,r.state])}/></div>
  </>}</>;
}
