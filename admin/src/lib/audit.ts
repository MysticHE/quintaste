import 'server-only';
import type { PoolClient } from 'pg';

export async function audit(db: PoolClient, actor: string | null, action: string, target: string,
  reason: string, details: Record<string, unknown> = {}) {
  await db.query('INSERT INTO staff.audit(actor_id,action,target,reason,details) VALUES($1,$2,$3,$4,$5)',
    [actor, action, target, reason, JSON.stringify(details)]);
}
