import { useMember } from "../components/CommunityGate";
import { TIERS, type Tier } from "../game/mission";
import { fetchKitchen, fetchPublicKitchen, type KitchenLevel } from "../services/game-api";
import { useRemote } from "./useRemote";

/** The Recipe Kitchen shelf (GAME_CONTENT_PLAN §5): a member's with their bests, or the public one for signed-out players. */
export function useKitchen() {
  const member = useMember();
  return useRemote(member.pending ? null : member.member ? "game-kitchen" : "game-kitchen-public", signal => member.member ? fetchKitchen(signal) : fetchPublicKitchen(signal));
}
/** A tier opens once the one before it is cleared (Learn is always open). Signed-out players practise any tier (`practice`). */
export const tierOpen = (level: KitchenLevel, tier: Tier, practice = false) => { const i = TIERS.indexOf(tier); return practice || i === 0 || (level.best[TIERS[i - 1]]?.clears ?? 0) > 0; };
/** The tier to play next: the first open one not cleared yet, or From memory once all are cleared. */
export const nextTier = (level: KitchenLevel): Tier => TIERS.find(t => tierOpen(level, t) && !(level.best[t]?.clears ?? 0)) ?? "memory";
