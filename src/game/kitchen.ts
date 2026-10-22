/**
 * Recipe Kitchen rules shared by the app and the server (docs/game/GAME_CONTENT_PLAN.md §5): a recipe level opens once the
 * player has learned every technique it uses, by clearing the main-path level that introduces it.
 */
import { STATIONS, type StationKind } from "./content/dishes";
import { cleared, type GameProgress } from "./progress";

/** The main-path level that introduces each built station (§3); each later chapter adds its technique here at its first level. */
export const TECHNIQUE_LEVEL: Record<StationKind, number> = { pan: 1, pot: 9, rice: 12, board: 16, dessert: 18, blender: 21, steamer: 31, oven: 41, griddle: 51, fryer: 61, dough: 71, fridge: 81 };

/** The first technique a recipe level needs that this player has not learned, or null when it is open. */
export function missingTechnique(game: GameProgress, techniques: readonly string[]): { station: StationKind; name: string; level: number } | null {
  for (const t of techniques) {
    const level = TECHNIQUE_LEVEL[t as StationKind];
    if (!level) return { station: t as StationKind, name: t, level: 0 };
    if (!cleared(game, level)) return { station: t as StationKind, name: STATIONS[t as StationKind].name, level };
  }
  return null;
}
