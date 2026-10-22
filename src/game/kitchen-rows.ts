/**
 * Recipe Kitchen rows (GAME_CONTENT_PLAN §5): which tier opens next, and the For you and New picks. Pure, so the checks can run
 * them; the app reads them through hooks/useKitchen.
 */
import { missingTechnique } from "./kitchen";
import { TIERS, type Tier } from "./mission";
import type { GameProgress } from "./progress";
import { passChance, PLAYER_START } from "./rating";

/** What the rows need from a shelf entry (services/game-api KitchenLevel). */
export type ShelfLevel = { hash: string; recipeId: string; techniques: string[]; best: Partial<Record<Tier, { clears: number }>>; added?: string;
  ratings?: Partial<Record<Tier, { rating: number; players: number }>>; held?: boolean };

/** A tier opens once the one before it is cleared (Learn is always open), for members and guests alike. */
export const tierOpen = (level: Pick<ShelfLevel, "best">, tier: Tier) => { const i = TIERS.indexOf(tier); return i === 0 || (level.best[TIERS[i - 1]]?.clears ?? 0) > 0; };
/** The tier to play next: the first open one not cleared yet, or From memory once all are cleared. */
export const nextTier = (level: ShelfLevel): Tier => TIERS.find(t => tierOpen(level, t) && !(level.best[t]?.clears ?? 0)) ?? "memory";

/** The For you band (GAME_CONTENT_PLAN §5, to tune): levels a player should clear about 60 to 80 percent of the time. */
const BAND = [0.6, 0.8] as const, ROW = 5, NEW_UNTIL = 10;
const playable = (l: ShelfLevel, game: GameProgress) => !l.held && !missingTechnique(game, l.techniques) && !(l.best[nextTier(l)]?.clears ?? 0);
/** The chance this player clears the level's next tier, from both ratings (a level without one counts as average). */
export const chanceFor = (l: ShelfLevel, player: number | null | undefined) => passChance(player ?? PLAYER_START.rating, l.ratings?.[nextTier(l)]?.rating ?? 1500);
/**
 * For you: playable levels whose next tier this player should clear within the band, saved recipes first, then the closest to the
 * middle of the band. When none fall inside it, the closest ones still show, so the row is never empty while levels are playable.
 */
export function forYou<L extends ShelfLevel>(levels: L[], player: number | null | undefined, game: GameProgress, saved: Set<string>) {
  const mid = (BAND[0] + BAND[1]) / 2, gap = (l: ShelfLevel) => Math.abs(chanceFor(l, player) - mid);
  const open = levels.filter(l => playable(l, game)), inside = open.filter(l => { const c = chanceFor(l, player); return c >= BAND[0] && c <= BAND[1]; });
  return (inside.length ? inside : open).sort((a, b) => Number(saved.has(b.recipeId)) - Number(saved.has(a.recipeId)) || gap(a) - gap(b)).slice(0, ROW);
}
/** New: playable levels fewer than ten players have tried, newest first, so every new level gets seen (minus the For you picks). */
export function newest<L extends ShelfLevel>(levels: L[], game: GameProgress, skip: Set<string>) {
  return levels.filter(l => playable(l, game) && !skip.has(l.hash) && (l.ratings?.learn?.players ?? 0) < NEW_UNTIL)
    .sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "")).slice(0, ROW);
}
