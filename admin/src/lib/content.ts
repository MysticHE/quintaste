import 'server-only';
import { transaction, query } from './db';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, text } from './http';
import { audit } from './audit';

type CatalogMenu = { id:string; name:string; branch:string; fingerprint:string; checkedAt:string };

export async function catalog(member: Session) {
  authorize(member, 'content');
  const base = process.env.NODE_ENV === 'production' ? 'http://app:3000' : 'http://localhost:3300';
  const response = await fetch(base + '/api/menus?view=index', { cache:'no-store', redirect:'error', signal:AbortSignal.timeout(8000) });
  if (!response.ok) throw new HttpError(503, 'The published menu index is unavailable. Restore menu delivery or try again.');
  const data = await response.json();
  if (!Array.isArray(data.venues) || data.venues.length>10000) throw new HttpError(503, 'The menu index could not be read.');
  return data.venues.map((menu: Record<string, unknown>): CatalogMenu => ({
    id:text(menu.id,'menu id',120),name:text(menu.name,'menu name',300),branch:text(menu.branch || '', 'branch',300,0),
    fingerprint:text(menu.fingerprint,'source revision',64,64),checkedAt:text(menu.checkedAt,'source date',80),
  }));
}

export async function contentList(member: Session) {
  authorize(member, 'content');
  return (await query(`SELECT d.id,d.content_id,d.revision,d.decision,d.reason,d.created_at,m.email AS reviewer
    FROM ops.content_decision d JOIN staff.member m ON m.id=d.reviewer_id ORDER BY d.created_at DESC LIMIT 100`)).rows;
}
export async function decideContent(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'content', true);
  const contentId = text(input.contentId, 'menu branch id', 120);
  if (!/^[a-z0-9][a-z0-9-]{2,119}$/.test(contentId)) throw new HttpError(400, 'Enter a valid menu branch id.');
  const revision = text(input.revision, 'reviewed source revision', 200);
  const decision = choice(input.decision, ['reviewed','changes_requested','withdrawn'] as const, 'decision');
  const current = (await catalog(member)).find((menu: CatalogMenu) => menu.id===contentId);
  if (!current || current.fingerprint!==revision) throw new HttpError(409, 'The published source changed or is unavailable. Refresh the menu index before deciding.');
  return transaction(async db => {
    await lockPermission(db, member, 'content', true);
    await db.query('INSERT INTO ops.content_decision(content_id,revision,decision,reason,reviewer_id) VALUES($1,$2,$3,$4,$5)', [contentId,revision,decision,reason,member.id]);
    await audit(db, member.id, 'content.' + decision, contentId, reason, { revision });
    return { saved: true, note: decision === 'withdrawn' ? 'Menu removed from server delivery. Offline clients update when reconnected.' : 'Review recorded. Publication requires the source publishing workflow; this does not restore withdrawn content.' };
  });
}
