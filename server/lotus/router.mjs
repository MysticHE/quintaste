import { randomUUID } from 'node:crypto';
import { pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle, transaction } from '../community/http.mjs';
import { lockProfile, postCredits } from '../game/ledger.mjs';
import { decide, keepBetter, newSeed, ODDS_VERSION } from './odds.mjs';
import { breedBalance, grantBreed, granted, PRICES } from './entitlements.mjs';
import { account, lotusView } from './state.mjs';

/**
 * The member's lotus (/api/lotus): tier, published odds and pity, the free first bloom, re-blooms and breeds paid with
 * earned café credits. Signed-in, age-checked, unrestricted accounts only (communityRouter). Nothing here takes money:
 * store purchases (L1) will add a second grant source. The selfie upload for a breed goes through /api/avatar/lotus.
 */
export const lotus = communityRouter({ bodyLimit: '1kb' });

/** Request ids double as ledger sources (source pattern allows 64 characters after the prefix). */
function requestIdOf(body) {
  const id = body?.requestId;
  if (typeof id !== 'string' || !/^[A-Za-z0-9-]{16,64}$/.test(id)) throw new CommunityError(400, 'Start a valid request.');
  return id;
}

/** Rolls and records one bloom inside the caller's transaction. The caller holds the account row. */
async function recordBloom(db, me, requestId, kind, before) {
  const number = before.blooms + 1, seed = newSeed();
  const outcome = decide(seed, number, { sinceBlue: before.since_blue, sinceGolden: before.since_golden });
  await db.query(`INSERT INTO lotus.bloom(id, user_id, request_id, number, kind, seed, odds_version, roll, tier, pity, since_blue_before, since_golden_before)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [randomUUID(), me, requestId, number, kind, seed, ODDS_VERSION, outcome.roll, outcome.tier, outcome.pity, before.since_blue, before.since_golden]);
  await db.query(`UPDATE lotus.account SET tier=$2, blooms=$3, since_blue=$4, since_golden=$5,
    free_bloom_at=COALESCE(free_bloom_at, now()), updated_at=now() WHERE user_id=$1`,
  [me, keepBetter(before.tier, outcome.tier), number, outcome.sinceBlue, outcome.sinceGolden]);
}

lotus.get('/', async (_req, res) => res.json(await lotusView(pool, res.locals.user.id)));

/**
 * The free first bloom, once per account. The tier is decided and stored (seed, roll, pity counters) in one transaction
 * before the response, so the app only animates a result that already exists. Repeating the same requestId returns the
 * recorded bloom, which lets the app recover a response lost to a dropped connection.
 */
lotus.post('/bloom', async (req, res) => {
  const me = res.locals.user.id, requestId = req.body?.requestId;
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(requestId)) throw new CommunityError(400, 'Start a valid bloom.');
  await throttle('lotus-bloom:' + me, 20, 3600);
  const created = await transaction(async db => {
    const free = (await db.query(`SELECT request_id FROM lotus.bloom WHERE user_id=$1 AND kind='free'`, [me])).rows[0];
    if (free) {
      if (free.request_id === requestId) return false;
      throw new CommunityError(409, 'Your lotus has already bloomed.', 'BLOOMED');
    }
    await db.query('INSERT INTO lotus.account(user_id) VALUES($1) ON CONFLICT DO NOTHING', [me]);
    await recordBloom(db, me, requestId, 'free', await account(db, me, true));
    return true;
  }, 'lotus:' + me);
  res.status(created ? 201 : 200).json(await lotusView(pool, me));
});

/**
 * A re-bloom for 150 earned café credits, with the same odds and pity as the first bloom. The credit spend and the bloom
 * are one transaction; the same requestId returns the recorded re-bloom and never spends twice.
 */
lotus.post('/rebloom', async (req, res) => {
  const me = res.locals.user.id, requestId = requestIdOf(req.body);
  await throttle('lotus-rebloom:' + me, 60, 3600);
  const created = await transaction(async db => {
    const prior = (await db.query('SELECT kind FROM lotus.bloom WHERE user_id=$1 AND request_id=$2', [me, requestId])).rows[0];
    if (prior) { if (prior.kind === 'rebloom') return false; throw new CommunityError(409, 'Start a new re-bloom.'); }
    const before = await account(db, me, true);
    if (!before.tier) throw new CommunityError(409, 'Bloom your free lotus first.', 'NOT_BLOOMED');
    if (before.tier === 'golden') throw new CommunityError(409, 'Your lotus is already Golden.', 'TOP_TIER');
    await lockProfile(db, me);
    if (!await postCredits(db, me, -PRICES.rebloom, 'lotus_rebloom', 'bloom:' + requestId)) throw new CommunityError(409, 'Start a new re-bloom.');
    await recordBloom(db, me, requestId, 'rebloom', before);
    return true;
  }, 'lotus:' + me);
  res.status(created ? 201 : 200).json(await lotusView(pool, me, requestId));
});

/**
 * Breeds with 600 earned café credits: the spend and the entitlement grant are one transaction, idempotent per
 * requestId. One unused or running breed at a time, so a second tap never spends twice.
 */
lotus.post('/breeds/credits', async (req, res) => {
  const me = res.locals.user.id, requestId = requestIdOf(req.body);
  await throttle('lotus-breed-credits:' + me, 30, 3600);
  const created = await transaction(async db => {
    if (await granted(db, me, 'credits:' + requestId)) return false;
    if (!(await account(db, me)).tier) throw new CommunityError(409, 'Bloom your free lotus first.', 'NOT_BLOOMED');
    const balance = await breedBalance(db, me);
    if (balance.available + balance.held > 0) throw new CommunityError(409, 'Your breed is ready to use.', 'HAS_BREED');
    await lockProfile(db, me);
    if (!await postCredits(db, me, -PRICES.breed, 'lotus_breed', 'breed:' + requestId)) throw new CommunityError(409, 'Start a new request.');
    await grantBreed(db, me, 'credits:' + requestId);
    return true;
  }, 'lotus:' + me);
  res.status(created ? 201 : 200).json(await lotusView(pool, me));
});

// Until server/lotus/schema.sql is applied the tables are missing: answer "not ready" rather than a server error.
lotus.use((error, _req, res, next) => ['42P01', '3F000', '42703'].includes(error?.code)
  ? res.status(503).json({ error: 'Your lotus is not available yet.', code: 'UNAVAILABLE' }) : next(error));
lotus.use(errors);
