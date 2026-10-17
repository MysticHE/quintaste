import { pool } from './config.mjs';

/** @param {string} userId @param {import('pg').Pool | import('pg').PoolClient} [db] */
export async function accountAccess(userId, db = pool) {
  const result = await db.query(`SELECT 1 FROM account_access.master_identity m
    JOIN public.account a ON a."providerId"='google' AND a."accountId"=m.google_subject
    JOIN public."user" u ON u.id=a."userId"
    WHERE u.id=$1 AND u."emailVerified" AND lower(u.email)=m.email AND m.active`, [userId]);
  const master = result.rowCount > 0;
  return { role: master ? 'master' : 'member', unlimitedUsage: master };
}
