import { createHash, randomBytes } from 'node:crypto';

/**
 * Lotus bloom odds and pity (AVATAR_LOTUS_PLAN §3). The server alone decides a bloom: it draws a fresh seed, derives the
 * roll from it and records seed, roll and pity counters before the app animates anything, so every recorded bloom can be
 * replayed exactly with `decide`.
 */
export const TIERS = /** @type {const} */ (['pink', 'purple', 'blue', 'golden']);
/** @typedef {typeof TIERS[number]} Tier */
/** Published odds in basis points (55% / 28% / 13% / 4%), so the total is exactly 10,000. */
export const ODDS = /** @type {Record<Tier, number>} */ ({ pink: 5500, purple: 2800, blue: 1300, golden: 400 });
export const ODDS_VERSION = 'lotus-odds-v1';
/** At least Blue within any 10 blooms in a row, and Golden guaranteed by bloom 20. Each counter resets on a hit. */
export const PITY = { blueWithin: 10, goldenBy: 20 };

const rank = (/** @type {Tier} */ tier) => TIERS.indexOf(tier);
export const newSeed = () => randomBytes(32).toString('hex');

/** A roll in 0–9,999 taken from the first 48 bits of SHA-256 over the odds version, seed and bloom number. */
export function rollFrom(/** @type {string} */ seed, /** @type {number} */ number) {
  const digest = createHash('sha256').update(`${ODDS_VERSION}:${seed}:${number}`).digest();
  return Math.floor(digest.readUIntBE(0, 6) / 2 ** 48 * 10000);
}
export function tierFor(/** @type {number} */ roll) {
  let edge = 0;
  for (const tier of TIERS) { edge += ODDS[tier]; if (roll < edge) return tier; }
  return 'golden';
}

/**
 * Decides one bloom. `sinceBlue` and `sinceGolden` count the blooms in a row before this one that came out below Blue and
 * below Golden. Pity only ever raises a result; a natural Golden is never lowered.
 * @param {string} seed
 * @param {number} number the account's bloom number, 1 for the free first bloom
 * @param {{ sinceBlue: number, sinceGolden: number }} counters
 */
export function decide(seed, number, { sinceBlue, sinceGolden }) {
  const roll = rollFrom(seed, number);
  /** @type {Tier} */ let tier = tierFor(roll);
  /** @type {'blue' | 'golden' | null} */ let pity = null;
  if (sinceGolden >= PITY.goldenBy - 1 && tier !== 'golden') { tier = 'golden'; pity = 'golden'; }
  else if (sinceBlue >= PITY.blueWithin - 1 && rank(tier) < rank('blue')) { tier = 'blue'; pity = 'blue'; }
  return { roll, tier, pity, sinceBlue: rank(tier) >= rank('blue') ? 0 : sinceBlue + 1, sinceGolden: tier === 'golden' ? 0 : sinceGolden + 1 };
}

/** A re-bloom never lowers a lotus: every tier includes the perks below it, so the member keeps the better of the two. */
export const keepBetter = (/** @type {Tier | null} */ current, /** @type {Tier} */ rolled) => (current && rank(current) >= rank(rolled) ? current : rolled);

/** Odds as shown to members: the same table the server rolls against. */
export const publishedOdds = () => TIERS.map(tier => ({ tier, percent: ODDS[tier] / 100 }));
