import { useMember } from "../components/CommunityGate";
import { fetchKitchen, fetchPublicKitchen } from "../services/game-api";
import { pruneRevoked } from "../services/game-packs";
import { useRemote } from "./useRemote";

/** The Recipe Kitchen shelf (GAME_CONTENT_PLAN §5): a member's with their bests, or the public one for signed-out players. */
export function useKitchen() {
  const member = useMember();
  // Each time the shelf loads online, levels kept for offline play that staff hid since are dropped.
  return useRemote(member.pending ? null : member.member ? "game-kitchen" : "game-kitchen-public",
    signal => (member.member ? fetchKitchen(signal) : fetchPublicKitchen(signal)).then(shelf => { void pruneRevoked(); return shelf; }));
}
export { chanceFor, forYou, newest, nextTier, tierOpen } from "../game/kitchen-rows";
