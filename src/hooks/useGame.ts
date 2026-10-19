import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useFood } from "../state/Food";
import { withTier, type GameProgress } from "../game/progress";
import type { FoodDocument } from "../types/food";
import { useLotus } from "./useLotus";

/**
 * Game progress for the current owner, saved through the shared document queue. The lotus tier comes from the
 * account's server record (useLotus): changes see it, and it is stripped again before saving so the device never stores one.
 */
export function useGame() {
  const { doc, update, commit } = useFood();
  const { tier } = useLotus();
  const stored = doc.game;
  const game = useMemo(() => withTier(stored, tier), [stored, tier]);
  const tierRef = useRef(tier);
  useLayoutEffect(() => { tierRef.current = tier; }, [tier]);
  const apply = useCallback((change: (game: GameProgress) => GameProgress) =>
    (d: FoodDocument) => ({ ...d, game: { ...change({ ...d.game, tier: tierRef.current }), tier: null } }), []);
  const set = useCallback((change: (game: GameProgress) => GameProgress) => update(apply(change)), [update, apply]);
  /** For results and purchases: persists before resolving so a crash never loses earned credits. */
  const save = useCallback((change: (game: GameProgress) => GameProgress) => commit(apply(change)), [commit, apply]);
  return { game, set, save, tier };
}
