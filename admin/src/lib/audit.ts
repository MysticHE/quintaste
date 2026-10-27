import 'server-only';
import type { PoolClient } from 'pg';

/**
 * Who made a change: a staff member (id), or a chef (bot) acting in its lane with no staff id. `proposedBy` names the chef whose
 * proposal a staff member approved, so text the chef wrote stays credited to it.
 */
export type Actor = { id: string | null; bot?: string; email?: string; proposedBy?: string };

/** Records a staff action. `bot` names the chef (QT bot) that acted instead of a staff member (admin/db/chefs.sql). */
export async function audit(db: PoolClient, actor: string | null, action: string, target: string,
  reason: string, details: Record<string, unknown> = {}, bot?: string | null) {
  if (bot) {
    await db.query('INSERT INTO staff.audit(actor_id,action,target,reason,details,bot) VALUES($1,$2,$3,$4,$5,$6)',
      [actor, action, target, reason, JSON.stringify(details), bot]);
    return;
  }
  await db.query('INSERT INTO staff.audit(actor_id,action,target,reason,details) VALUES($1,$2,$3,$4,$5)',
    [actor, action, target, reason, JSON.stringify(details)]);
}
