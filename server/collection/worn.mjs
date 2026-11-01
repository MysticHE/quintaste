import { logger, pool } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { accountAccess } from '../account-access.mjs';

/** The borders members `ids` wear, as id → border, for lists (Friends, Messages); empty while Collection or Game progress is off. */
export async function bordersOf(ids) {
  if (!ids.length || !(await allowed('collection')) || !(await allowed('games'))) return new Map();
  try {
    const rows = (await pool.query('SELECT user_id, border FROM social.profile WHERE user_id = ANY($1::text[]) AND border IS NOT NULL', [ids])).rows;
    return new Map(rows.map(r => [r.user_id, r.border]));
  } catch (error) {
    if (error?.code !== '42703') throw error;
    return new Map();
  }
}

/**
 * What a member shows others from their Collection: the avatar border they wear and up to three earned badges, in order
 * (the master account has every badge unlocked). Null while Collection or Game progress (which holds the credits) is
 * off. A database without the Collection tables (schema not applied yet) gives null too, so Social keeps working.
 */
export async function wornBy(userId) {
  if (!(await allowed('collection')) || !(await allowed('games'))) return null;
  try {
    const [border, badges] = await Promise.all([
      pool.query('SELECT border FROM social.profile WHERE user_id=$1', [userId]).then(r => r.rows[0]?.border ?? null),
      accountAccess(userId).then(access => pool.query(access.role === 'master'
        ? 'SELECT badge FROM community.badge_shown WHERE user_id=$1 ORDER BY position'
        : `SELECT s.badge FROM community.badge_shown s JOIN community.badge_award a ON a.user_id=s.user_id AND a.badge=s.badge
          WHERE s.user_id=$1 AND a.revoked_at IS NULL ORDER BY s.position`, [userId])).then(r => r.rows.map(x => x.badge)),
    ]);
    return { border, badges };
  } catch (error) {
    if (error?.code !== '42P01' && error?.code !== '42703') throw error;
    logger.warn({ event: 'collection_schema_missing' });
    return null;
  }
}
