/**
 * Checks the server's lotus odds and pity (server/lotus/odds.mjs) against AVATAR_LOTUS_PLAN §3 with simulated blooms.
 * 1. 100,000 free first blooms, each with a fresh seed: every tier within 4 standard errors of 55/28/13/4 and a
 *    chi-square below the 0.1% critical value (3 degrees of freedom).
 * 2. 100,000 blooms as 5,000 members × 20 blooms in a row: never 10 in a row below Blue, never 20 in a row below Golden.
 *    Their tier mix is reported (pity lifts it above the published odds, as intended).
 * 3. Replay: a recorded seed and bloom number always give the same roll and tier.
 * Usage: node scripts/simulate-lotus-odds.mjs [--blooms 100000]
 */
import { decide, newSeed, ODDS, PITY, TIERS } from '../server/lotus/odds.mjs';

const arg = (key, fallback) => { const i = process.argv.indexOf('--' + key); return i > 0 ? Number(process.argv[i + 1]) : fallback; };
const blooms = arg('blooms', 100000), failures = [];
const zero = () => Object.fromEntries(TIERS.map(tier => [tier, 0]));

const first = zero();
for (let i = 0; i < blooms; i++) first[decide(newSeed(), 1, { sinceBlue: 0, sinceGolden: 0 }).tier]++;
let chi = 0;
const firstReport = TIERS.map(tier => {
  const p = ODDS[tier] / 10000, expected = p * blooms, z = (first[tier] - expected) / Math.sqrt(blooms * p * (1 - p));
  chi += (first[tier] - expected) ** 2 / expected;
  if (Math.abs(z) > 4) failures.push(`${tier}: ${first[tier]} first blooms is ${z.toFixed(2)} standard errors from ${expected}`);
  return { tier, published: ODDS[tier] / 100, observed: +(first[tier] / blooms * 100).toFixed(3), z: +z.toFixed(2) };
});
if (chi > 16.27) failures.push(`chi-square ${chi.toFixed(2)} exceeds 16.27 (p < 0.001, 3 degrees of freedom)`);

const members = Math.round(blooms / 20), mixed = zero();
let longestBelowBlue = 0, longestBelowGolden = 0, pityBlue = 0, pityGolden = 0;
for (let m = 0; m < members; m++) {
  let counters = { sinceBlue: 0, sinceGolden: 0 };
  for (let n = 1; n <= 20; n++) {
    const outcome = decide(newSeed(), n, counters);
    mixed[outcome.tier]++;
    if (outcome.pity === 'blue') pityBlue++;
    if (outcome.pity === 'golden') pityGolden++;
    counters = { sinceBlue: outcome.sinceBlue, sinceGolden: outcome.sinceGolden };
    longestBelowBlue = Math.max(longestBelowBlue, counters.sinceBlue);
    longestBelowGolden = Math.max(longestBelowGolden, counters.sinceGolden);
  }
}
if (longestBelowBlue >= PITY.blueWithin) failures.push(`${longestBelowBlue} blooms in a row below Blue`);
if (longestBelowGolden >= PITY.goldenBy) failures.push(`${longestBelowGolden} blooms in a row below Golden`);

const seed = newSeed(), counters = { sinceBlue: 9, sinceGolden: 19 };
const once = decide(seed, 7, counters), again = decide(seed, 7, counters);
if (JSON.stringify(once) !== JSON.stringify(again)) failures.push('the same seed gave two different blooms');
if (once.tier !== 'golden') failures.push('bloom 20 without Golden was not raised to Golden');

const total = members * 20;
console.log(JSON.stringify({
  firstBlooms: { blooms, chiSquare: +chi.toFixed(2), tiers: firstReport },
  withPity: { members, blooms: total, longestBelowBlue, longestBelowGolden, pityBlue, pityGolden,
    tiers: TIERS.map(tier => ({ tier, observed: +(mixed[tier] / total * 100).toFixed(3) })) },
  replay: once.tier === again.tier && once.roll === again.roll, passed: failures.length === 0, failures,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
