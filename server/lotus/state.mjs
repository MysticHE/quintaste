import { allowed } from '../operations.mjs';
import { avatarConfig } from '../avatar/config.mjs';
import { ODDS_VERSION, PITY, publishedOdds } from './odds.mjs';
import { breedBalance, PRICES, REGENERATIONS } from './entitlements.mjs';

/** Six image calls per breed attempt: Adult base, Mini base, then blink and talk for each form. */
export const BREED_STEPS = 6;

/** The account's lotus row, or the not-yet-bloomed defaults. `lock` holds the row for the rest of the transaction. */
export async function account(db, userId, lock = false) {
  return (await db.query(`SELECT tier, blooms, since_blue, since_golden, free_bloom_at FROM lotus.account WHERE user_id=$1${lock ? ' FOR UPDATE' : ''}`, [userId])).rows[0]
    ?? { tier: null, blooms: 0, since_blue: 0, since_golden: 0, free_bloom_at: null };
}

/** A generation attempt as the app shows it; never includes payloads, prompts or provider details. */
export function jobView(job) {
  const expired = ['queued', 'working'].includes(job.status) && new Date(job.expires_at).getTime() <= Date.now();
  const status = expired ? 'failed' : job.status === 'queued' ? 'working' : job.status;
  return { requestId: job.request_id, breedId: job.breed_id, kind: job.kind, status, completed: job.completed, total: BREED_STEPS,
    message: expired ? 'This breed took too long and stopped. Nothing was used up.' : job.message ?? null };
}

/** The latest breed, its latest attempt and where its Adult and Mini results sit in the avatar library. */
async function latestBreed(db, userId) {
  const breed = (await db.query(`SELECT id, tier, status, regenerations, adult_id, mini_id FROM lotus.breed WHERE user_id=$1
    ORDER BY created_at DESC LIMIT 1`, [userId])).rows[0];
  if (!breed) return null;
  const job = (await db.query(`SELECT request_id, breed_id, kind, status, completed, message, expires_at FROM lotus.job WHERE breed_id=$1
    ORDER BY created_at DESC LIMIT 1`, [breed.id])).rows[0];
  return { id: breed.id, tier: breed.tier, status: breed.status, regenerationsLeft: REGENERATIONS - breed.regenerations,
    adultId: breed.adult_id, miniId: breed.mini_id, job: job ? jobView({ ...job, breed_id: breed.id }) : null };
}

/** Runs a read that needs tables a later schema step adds; until then the lotus screens get `fallback`. */
async function optional(read, fallback) {
  try { return await read(); } catch (error) { if (['42P01', '3F000'].includes(error?.code)) return fallback; throw error; }
}
/** Café credits from the game ledger, or null while the game service is not set up on this server. */
const credits = (db, userId) => optional(async () => (await db.query('SELECT credits FROM game.profile WHERE user_id=$1', [userId])).rows[0]?.credits ?? 0, null);
const bloomView = row => row && { id: row.id, number: row.number, kind: row.kind, tier: row.tier, pity: row.pity, bloomedAt: row.created_at };

/**
 * Everything the lotus screens show, so odds, pity, prices and balances always come from the server. `requestId` picks
 * the bloom that request recorded (a re-bloom answer); otherwise the latest bloom.
 */
export async function lotusView(db, userId, requestId = null) {
  const row = await account(db, userId);
  const bloom = (await db.query(`SELECT id, number, kind, tier, pity, created_at FROM lotus.bloom WHERE user_id=$1
    ${requestId ? 'AND request_id=$2' : ''} ORDER BY number DESC LIMIT 1`, requestId ? [userId, requestId] : [userId])).rows[0] ?? null;
  const [balance, breed, wallet, generation] = await Promise.all([optional(() => breedBalance(db, userId), { available: 0, held: 0, used: 0 }),
    optional(() => latestBreed(db, userId), null), credits(db, userId),
    allowed('avatars').then(on => on && avatarConfig().enabled)]);
  return {
    tier: row.tier, blooms: row.blooms, freeBloom: !row.free_bloom_at, bloom: bloomView(bloom),
    odds: publishedOdds(), oddsVersion: ODDS_VERSION,
    pity: { blueWithin: PITY.blueWithin, goldenBy: PITY.goldenBy, sinceBlue: row.since_blue, sinceGolden: row.since_golden },
    credits: wallet, prices: PRICES, breeds: balance, breed, generation,
  };
}
