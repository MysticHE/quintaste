import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { TIERS, type Tier } from "../game/content/cosmetics";
import { accountsEnabled } from "../services/auth-client";
import { getLotus, type LotusState } from "../services/lotus-api";
import { useAuth } from "../state/Auth";
import { useRemote } from "./useRemote";

/** Last tier the server confirmed for an account, so Rush Hour keeps the member's companions while offline. Removed with the account. */
export const lotusTierKey = (userId: string) => "@quintaste/lotus-tier/" + userId;
const isTier = (value: unknown): value is Tier => typeof value === "string" && (TIERS as string[]).includes(value);

/**
 * The signed-in member's lotus from the server. Guests and members still finishing account setup have no lotus.
 * `tier` is the server's answer, or the last confirmed tier while the server can't be reached; it is never set on the device.
 */
export function useLotus() {
  const { user } = useAuth();
  const member = accountsEnabled && !!user?.adultConfirmed, userId = member ? user!.id : null;
  const remote = useRemote<LotusState>(userId ? "lotus:" + userId : null, getLotus);
  const [stored, setStored] = useState<{ id: string; tier: Tier | null } | null>(null);
  const confirmed = remote.data ? remote.data.tier : undefined;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    if (confirmed !== undefined) {
      const write = confirmed ? AsyncStorage.setItem(lotusTierKey(userId), confirmed) : AsyncStorage.removeItem(lotusTierKey(userId));
      void write.catch(() => {});
      return;
    }
    void AsyncStorage.getItem(lotusTierKey(userId)).then(value => { if (alive) setStored({ id: userId, tier: isTier(value) ? value : null }); }).catch(() => {});
    return () => { alive = false; };
  }, [userId, confirmed]);
  const fallback = stored && stored.id === userId ? stored.tier : null;
  /** The service is not set up on this server yet: lotus screens stay hidden rather than showing a dead control. */
  const unavailable = remote.error?.code === "UNAVAILABLE" || remote.error?.status === 404;
  return { member, remote, unavailable, tier: !userId ? null : confirmed !== undefined ? confirmed : fallback };
}
