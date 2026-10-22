import { useMemo } from "react";
import { useMember } from "../components/CommunityGate";
import { fetchKitchen, fetchPublicKitchen, fetchSeasonsOn } from "../services/game-api";
import { pruneRevoked } from "../services/game-packs";
import { useFood } from "../state/Food";
import { useGameMemberId } from "./useGame";
import { useRemote } from "./useRemote";

/**
 * The Recipe Kitchen shelf (GAME_CONTENT_PLAN §5): a member's with their bests from the account, or the public one with a guest's
 * bests from the device (game.kitchen), so tiers open in order for everyone.
 */
export function useKitchen() {
  const auth = useMember(), memberId = useGameMemberId(), device = useFood().doc.game.kitchen;
  // Each time the shelf loads online, levels kept for offline play that staff hid since are dropped.
  const remote = useRemote(auth.pending ? null : memberId ? "game-kitchen" : "game-kitchen-public",
    signal => (memberId ? fetchKitchen(signal) : fetchPublicKitchen(signal)).then(shelf => { void pruneRevoked(); return shelf; }));
  const data = useMemo(() => !remote.data || memberId ? remote.data
    : { ...remote.data, levels: remote.data.levels.map(l => ({ ...l, best: device[l.recipeId] ?? {} })) }, [remote.data, memberId, device]);
  return { ...remote, data };
}
export { chanceFor, forYou, newest, nextTier, tierOpen } from "../game/kitchen-rows";
/** The Seasons shelf shows only when staff have it on; offline or unsure, it stays hidden (GAME_CONTENT_PLAN §10a: fail closed). */
export function useSeasonsOn() {
  return useRemote("game-seasons", signal => fetchSeasonsOn(signal)).data?.on === true;
}
