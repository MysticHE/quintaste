import { useCallback } from "react";
import { useFood } from "../state/Food";
import type { GameProgress } from "../game/progress";

/** Game progress for the current owner, saved through the shared document queue. */
export function useGame() {
  const { doc, update, commit } = useFood();
  const set = useCallback((change: (game: GameProgress) => GameProgress) => update(d => ({ ...d, game: change(d.game) })), [update]);
  /** For results and purchases: persists before resolving so a crash never loses earned credits. */
  const save = useCallback((change: (game: GameProgress) => GameProgress) => commit(d => ({ ...d, game: change(d.game) })), [commit]);
  return { game: doc.game, set, save };
}
