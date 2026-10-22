/**
 * Recipe Kitchen difficulty (docs/game/GAME_CONTENT_PLAN.md §5): Glicko-2, a player against a level and tier, one game per rating
 * period as Lichess rates puzzles. Pure, so the server's settle and the level worker share it.
 */
export type Glicko = { rating: number; rd: number; vol: number };

export const PLAYER_START: Glicko = { rating: 1500, rd: 350, vol: 0.06 };
/** A tier's rating stops moving after this many players' first attempts (GAME_CONTENT_PLAN suggests 30–50, to tune). */
export const LOCK_PLAYERS = 40;
/** Rated plays per player per Singapore day; later plays still count for bests, not ratings. */
export const RATED_PER_DAY = 30;
const SCALE = 173.7178, TAU = 0.5, EPS = 1e-6, MIN_RD = 45, MAX_RD = 350;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** One Glicko-2 update of `me` after a game against `opp`; score 1 is a win for `me`. */
export function rate(me: Glicko, opp: Glicko, score: 0 | 1): Glicko {
  const mu = (me.rating - 1500) / SCALE, phi = me.rd / SCALE, muj = (opp.rating - 1500) / SCALE, phij = opp.rd / SCALE;
  const g = 1 / Math.sqrt(1 + 3 * phij * phij / (Math.PI * Math.PI)), E = 1 / (1 + Math.exp(-g * (mu - muj)));
  const v = 1 / (g * g * E * (1 - E)), delta = v * g * (score - E), a = Math.log(me.vol * me.vol);
  const f = (x: number) => Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x)) / (2 * (phi * phi + v + Math.exp(x)) ** 2) - (x - a) / (TAU * TAU);
  let A = a, B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * TAU) < 0 && k < 100) k++; B = a - k * TAU; }
  let fA = f(A), fB = f(B);
  for (let i = 0; Math.abs(B - A) > EPS && i < 100; i++) {
    const C = A + (A - B) * fA / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2;
    B = C; fB = fC;
  }
  const vol = Math.exp(A / 2), star = Math.sqrt(phi * phi + vol * vol), phiNew = 1 / Math.sqrt(1 / (star * star) + 1 / v);
  const muNew = mu + phiNew * phiNew * g * (score - E);
  return { rating: clamp(muNew * SCALE + 1500, 400, 3000), rd: clamp(phiNew * SCALE, MIN_RD, MAX_RD), vol: clamp(vol, 0.01, 0.2) };
}

/** Chance a player at `player` clears a level at `level` (the Elo curve Glicko-2 uses, ignoring deviation). */
export const passChance = (player: number, level: number) => 1 / (1 + 10 ** ((level - player) / 400));

/**
 * The test player's seconds per action and the player rating each stands for. Placeholders until main-path play gives real data to
 * fit them (GAME_CONTENT_PLAN §5): quick (0.7 s) is a strong player, 2.2 s an average one, 3.2 s a beginner.
 */
export const TEST_SPEEDS: readonly [number, number][] = [[0.7, 1900], [2.2, 1500], [2.8, 1300], [3.2, 1150]];
/** Starting deviation for a level rated only by the test player: wide, so the first real players move it quickly. */
export const START_RD = 300;

/** A level's starting rating: the one whose predicted clear chances best match the test player's clear rates at each speed. */
export function startRating(passRates: number[]): Glicko {
  let best = 1500, err = Infinity;
  for (let level = 800; level <= 2400; level += 5) {
    const e = TEST_SPEEDS.reduce((sum, [, player], i) => sum + (passChance(player, level) - passRates[i]) ** 2, 0);
    if (e < err) { err = e; best = level; }
  }
  return { rating: best, rd: START_RD, vol: 0.06 };
}
