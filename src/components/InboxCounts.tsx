import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMember } from "./CommunityGate";
import { onInvalidate, useRemote } from "../hooks/useRemote";
import { communityRequest } from "../services/community-api";
import { setAppBadge } from "../services/app-badge";

/**
 * Server counts from /api/inbox (server/community/inbox.mjs); `messages` is chats that need the member (unread, or a seller's new
 * order not yet answered), `total` everything waiting, `dining` whether the member can use Dining (older servers leave it out).
 */
export type InboxCounts = { friends: number; market: number; classes: number; messages: number; orders: number; requests: number; dinners: number; total: number; dining?: boolean;
  /** Unopened gifts (older servers leave it out). */
  gifts?: number;
  /** Names the photo check waiting on the member (it did not pass, or they changed the checked photo), else null; not in `total` (older servers leave it out). */
  photoCheck?: string | null;
  /** Likes and thank-yous on gifts you sent to people who aren't friends, not yet seen (older servers leave it out). */
  giftNews?: number };
export const inboxPath = "/api/inbox";
const load = (signal: AbortSignal) => communityRequest<InboxCounts>(inboxPath, { signal });
const Context = createContext<InboxCounts | undefined>(undefined);
/** Social and Market changes (reading a chat, an order step, a friend request, a block) can move the counts. */
const touches = (prefix: string) => ["/api/social", "/api/market"].some(area => prefix.startsWith(area) || area.startsWith(prefix));
/** The counts, refreshed on focus, every 30 s while focused and on Social or Market changes. */
export function useLiveInbox() {
  const { member } = useMember(), { data, refresh } = useRemote(member ? inboxPath : null, load, 30000);
  useEffect(() => onInvalidate(prefixes => { if (prefixes.some(touches)) refresh(); }), [refresh]);
  return data;
}
/**
 * One poll for the tabs (the request the tab bar already made for Market): the Social tab dot, the Messages count,
 * new orders on My shop and friend requests and dinner invites on Dining all read it, so they never disagree.
 * Screens above the tabs (the Orders / My shop hub) call useLiveInbox, which shares the cached counts.
 */
export function InboxProvider({ children }: PropsWithChildren) {
  const counts = useLiveInbox(), { member } = useMember(), total = member ? counts?.total : 0;
  // The app-icon badge follows the same total; signed out it clears. Unknown (still loading) leaves it as it is.
  useEffect(() => { if (total !== undefined) setAppBadge(total); }, [total]);
  return <Context.Provider value={counts}><PhotoCheckSeenProvider>{children}</PhotoCheckSeenProvider></Context.Provider>;
}
export const useInbox = () => useContext(Context);

/**
 * A photo check that needs the member lights the Social tab until they have seen it: the server can't tell when a decision is
 * read, so the last one seen is kept on the device, per account. Seeing it is opening a screen that shows the notice.
 */
const seenKey = (userId: string) => "@quintaste/photo-check-seen/" + userId;
const SeenContext = createContext<{ dot: boolean; seen: () => void }>({ dot: false, seen: () => {} });
function PhotoCheckSeenProvider({ children }: PropsWithChildren) {
  const { userId } = useMember(), current = useContext(Context)?.photoCheck ?? null;
  const [stored, setStored] = useState<{ userId: string | null; token: string | null; ready: boolean }>({ userId: null, token: null, ready: false });
  useEffect(() => {
    if (!userId) return;
    let live = true;
    AsyncStorage.getItem(seenKey(userId)).catch(() => null).then(token => { if (live) setStored({ userId, token, ready: true }); });
    return () => { live = false; };
  }, [userId]);
  const mine = stored.userId === userId && stored.ready;
  const seen = useCallback(() => {
    if (!userId || !current || (mine && stored.token === current)) return;
    setStored({ userId, token: current, ready: true });
    AsyncStorage.setItem(seenKey(userId), current).catch(() => {});
  }, [userId, current, mine, stored.token]);
  return <SeenContext.Provider value={{ dot: !!current && mine && stored.token !== current, seen }}>{children}</SeenContext.Provider>;
}
/** `dot`: a photo check needs the member and they have not seen it yet; `seen` records that they have. */
export const usePhotoCheckDot = () => useContext(SeenContext);
