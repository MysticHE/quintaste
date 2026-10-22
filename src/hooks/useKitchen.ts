import { useMember } from "../components/CommunityGate";
import { TIERS, type Tier } from "../game/mission";
import { fetchKitchen, type KitchenLevel } from "../services/game-api";
import { useRemote } from "./useRemote";

/** The Recipe Kitchen shelf (GAME_CONTENT_PLAN §5) for signed-in members; signed-out players get no request. */
export function useKitchen() {
  const member = useMember();
  return useRemote(member.member ? "game-kitchen" : null, signal => fetchKitchen(signal));
}
/** A tier opens once the one before it is cleared (Learn is always open). */
export const tierOpen = (level: KitchenLevel, tier: Tier) => { const i = TIERS.indexOf(tier); return i === 0 || (level.best[TIERS[i - 1]]?.clears ?? 0) > 0; };
/** The tier to play next: the first open one not cleared yet, or From memory once all are cleared. */
export const nextTier = (level: KitchenLevel): Tier => TIERS.find(t => tierOpen(level, t) && !(level.best[t]?.clears ?? 0)) ?? "memory";
