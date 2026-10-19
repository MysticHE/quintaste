import { randomUUID } from 'node:crypto';
import { pool } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle, transaction } from '../community/http.mjs';
import { decide, newSeed, ODDS_VERSION, PITY, publishedOdds } from './odds.mjs';

/**
 * The member's lotus (/api/lotus): their tier, the published odds and pity counters, and the free first bloom.
 * Signed-in, age-checked, unrestricted accounts only (communityRouter). No payments, credits or breeding in L0.
 */
export const lotus = communityRouter({ bodyLimit: '1kb' });

const columns = 'tier, blooms, since_blue, since_golden, free_bloom_at';
/** The account's lotus row, or the not-yet-bloomed defaults. `lock` holds the row for the rest of the transaction. */
async function account(db, userId, lock = false) {
  return (await db.query(`SELECT ${columns} FROM lotus.account WHERE user_id=$1${lock ? ' FOR UPDATE' : ''}`, [userId])).rows[0]
    ?? { tier: null, blooms: 0, since_blue: 0, since_golden: 0, free_bloom_at: null };
}
const latest = async (db, userId) => (await db.query(
  `SELECT id, number, kind, tier, pity, created_at FROM lotus.bloom WHERE user_id=$1 ORDER BY number DESC LIMIT 1`, [userId])).rows[0] ?? null;
const bloomView = row => row && { id: row.id, number: row.number, kind: row.kind, tier: row.tier, pity: row.pity, bloomedAt: row.created_at };
/** Everything the lotus screens show, so odds and pity always come from the table the server rolls against. */
function view(row, last) {
  return {
    tier: row.tier, blooms: row.blooms, freeBloom: !row.free_bloom_at, bloom: bloomView(last),
    odds: publishedOdds(), oddsVersion: ODDS_VERSION,
    pity: { blueWithin: PITY.blueWithin, goldenBy: PITY.goldenBy, sinceBlue: row.since_blue, sinceGolden: row.since_golden },
  };
}

lotus.get('/', async (_req, res) => {
  const me = res.locals.user.id;
  res.json(view(await account(pool, me), await latest(pool, me)));
});

/**
 * The free first bloom, once per account. The tier is decided and stored (seed, roll, pity counters) in one transaction
 * before the response, so the app only animates a result that already exists. Repeating the same requestId returns the
 * recorded bloom, which lets the app recover a response lost to a dropped connection.
 */
lotus.post('/bloom', async (req, res) => {
  const me = res.locals.user.id, requestId = req.body?.requestId;
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(requestId)) throw new CommunityError(400, 'Start a valid bloom.');
  await throttle('lotus-bloom:' + me, 20, 3600);
  const result = await transaction(async db => {
    const free = (await db.query(`SELECT request_id FROM lotus.bloom WHERE user_id=$1 AND kind='free'`, [me])).rows[0];
    if (free) {
      if (free.request_id === requestId) return { created: false };
      throw new CommunityError(409, 'Your lotus has already bloomed.', 'BLOOMED');
    }
    await db.query('INSERT INTO lotus.account(user_id) VALUES($1) ON CONFLICT DO NOTHING', [me]);
    const before = await account(db, me, true), number = before.blooms + 1, seed = newSeed();
    const outcome = decide(seed, number, { sinceBlue: before.since_blue, sinceGolden: before.since_golden });
    await db.query(`INSERT INTO lotus.bloom(id, user_id, request_id, number, kind, seed, odds_version, roll, tier, pity, since_blue_before, since_golden_before)
      VALUES($1,$2,$3,$4,'free',$5,$6,$7,$8,$9,$10,$11)`,
    [randomUUID(), me, requestId, number, seed, ODDS_VERSION, outcome.roll, outcome.tier, outcome.pity, before.since_blue, before.since_golden]);
    await db.query(`UPDATE lotus.account SET tier=$2, blooms=$3, since_blue=$4, since_golden=$5, free_bloom_at=now(), updated_at=now() WHERE user_id=$1`,
      [me, outcome.tier, number, outcome.sinceBlue, outcome.sinceGolden]);
    return { created: true };
  }, 'lotus:' + me);
  res.status(result.created ? 201 : 200).json(view(await account(pool, me), await latest(pool, me)));
});
// Until server/lotus/schema.sql is applied the tables are missing: answer "not ready" rather than a server error.
lotus.use((error, _req, res, next) => ['42P01', '3F000'].includes(error?.code)
  ? res.status(503).json({ error: 'Your lotus is not available yet.', code: 'UNAVAILABLE' }) : next(error));
lotus.use(errors);
