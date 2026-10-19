import { CommunityError } from '../community/http.mjs';

/**
 * The breed entitlement ledger (AVATAR_LOTUS_PLAN §4, §6). Credits are earned café credits only (game.ledger);
 * nothing here takes money. A breed entitlement is granted once per source, held while its breed runs,
 * consumed only when the breed succeeds and released when it fails. lotus.breed_balance moves only through the ledger
 * trigger in server/lotus/schema.sql; the app role cannot write it.
 */
export { PRICES, REGENERATIONS } from './prices.mjs';

/** The account's entitlements: unused, held by a running breed, and used by finished breeds. */
export async function breedBalance(db, userId) {
  const row = (await db.query('SELECT available, held, used FROM lotus.breed_balance WHERE user_id=$1', [userId])).rows[0];
  return row ?? { available: 0, held: 0, used: 0 };
}

/**
 * Records one entitlement change. Returns false when that kind and source were already recorded, so retries change
 * nothing. The trigger refuses a credit grant without its café credit spend, a hold with nothing available and a settle
 * without a hold; those surface as NO_BREED.
 */
async function post(db, userId, kind, source) {
  try {
    const added = await db.query(`INSERT INTO lotus.breed_ledger(user_id, kind, source) VALUES($1,$2,$3)
      ON CONFLICT DO NOTHING RETURNING id`, [userId, kind, source]);
    return added.rowCount > 0;
  } catch (error) {
    if (error?.code === '23514') throw new CommunityError(409, 'You have no breed ready.', 'NO_BREED');
    throw error;
  }
}
/** Grants one breed. Sources: credits:<request id> (after the café credit spend), later store:<transaction> (L1). */
export const grantBreed = (db, userId, source) => post(db, userId, 'grant', source);
export const holdBreed = (db, userId, breedId) => post(db, userId, 'hold', 'breed:' + breedId);
/** Settles a held breed once: consume when it succeeded, release when it failed. */
export const settleBreed = (db, userId, breedId, outcome) => post(db, userId, outcome === 'consume' ? 'consume' : 'release', 'breed:' + breedId);
export async function granted(db, userId, source) {
  return (await db.query(`SELECT 1 FROM lotus.breed_ledger WHERE user_id=$1 AND kind='grant' AND source=$2`, [userId, source])).rowCount > 0;
}
