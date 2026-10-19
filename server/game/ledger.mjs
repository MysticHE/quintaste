import { CommunityError } from '../community/http.mjs';

/**
 * Café credit ledger (PRD QT-056): earned only, single-account, non-cashable, never below zero. Every change is one
 * game.ledger row, unique per (account, kind, source), and the balance on game.profile moves in the same transaction.
 * Callers run inside transaction() and call lockProfile first, so concurrent grants and spends for one account queue up.
 */

/** Creates the member's game profile if needed and locks it for the rest of the transaction. */
export async function lockProfile(db, userId) {
  await db.query('INSERT INTO game.profile(user_id) VALUES($1) ON CONFLICT DO NOTHING', [userId]);
  return (await db.query('SELECT credits, cafe, imported_at FROM game.profile WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
}

/**
 * Records one grant (positive) or spend (negative). Returns false when that kind and source were already recorded, so a
 * retried request changes nothing. A spend larger than the balance throws NOT_ENOUGH_CREDITS and records nothing.
 * Kinds in use: first_clear, mastered (source level:N), replay (run:<id>), import (device), purchase (decor:<id>).
 * The Lotus Avatar flow adds its own spend kinds (for example lotus_breed, source bloom:<id>).
 */
export async function postCredits(db, userId, amount, kind, source) {
  if (!Number.isInteger(amount) || amount === 0) throw new Error('Credit amount must be a non-zero integer.');
  const current = (await db.query('SELECT credits FROM game.profile WHERE user_id=$1', [userId])).rows[0];
  if (!current) throw new Error('Lock the game profile before posting credits.');
  const next = current.credits + amount;
  if (next < 0) throw new CommunityError(409, 'You need more café credits for that.', 'NOT_ENOUGH_CREDITS');
  const added = await db.query(`INSERT INTO game.ledger(user_id, amount, kind, source, balance_after) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT (user_id, kind, source) DO NOTHING RETURNING id`, [userId, amount, kind, source, next]);
  if (!added.rowCount) return false;
  await db.query('UPDATE game.profile SET credits=$2, updated_at=now() WHERE user_id=$1', [userId, next]);
  return true;
}
