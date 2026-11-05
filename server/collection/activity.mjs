import { CommunityError } from '../community/http.mjs';

/** An account-scoped ledger page. Reading history never settles, awards or spends credits. */
export async function creditActivity(db, userId, before) {
  if (before !== undefined && (typeof before !== 'string' || !/^[1-9][0-9]{0,18}$/.test(before) || BigInt(before) > 9223372036854775807n))
    throw new CommunityError(400, 'Invalid activity cursor.');
  const result = await db.query(`SELECT id::text, amount, kind, balance_after AS "balanceAfter", created_at AS at
    FROM game.ledger WHERE user_id=$1 AND ($2::bigint IS NULL OR id<$2::bigint)
    ORDER BY game.ledger.id DESC LIMIT 31`, [userId, before ?? null]);
  const items = result.rows.slice(0, 30);
  return { items, next: result.rows.length > 30 ? items.at(-1).id : null };
}
