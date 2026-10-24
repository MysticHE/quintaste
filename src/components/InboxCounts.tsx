import { createContext, useContext, useEffect, type PropsWithChildren } from "react";
import { useMember } from "./CommunityGate";
import { onInvalidate, useRemote } from "../hooks/useRemote";
import { communityRequest } from "../services/community-api";

/** Server counts from /api/inbox (server/community/inbox.mjs); `messages` is unread conversations, `total` everything waiting. */
export type InboxCounts = { friends: number; market: number; classes: number; messages: number; orders: number; requests: number; dinners: number; total: number };
export const inboxPath = "/api/inbox";
const load = (signal: AbortSignal) => communityRequest<InboxCounts>(inboxPath, { signal });
const Context = createContext<InboxCounts | undefined>(undefined);
/** Social and Market changes (reading a chat, an order step, a friend request, a block) can move the counts. */
const touches = (prefix: string) => ["/api/social", "/api/market"].some(area => prefix.startsWith(area) || area.startsWith(prefix));
/**
 * One poll for the whole app (the request the tab bar already made for Market): the Social tab dot, the Messages count,
 * new orders on My shop and friend requests and dinner invites on Dining all read it, so they never disagree.
 */
export function InboxProvider({ children }: PropsWithChildren) {
  const { member } = useMember(), { data, refresh } = useRemote(member ? inboxPath : null, load, 30000);
  useEffect(() => onInvalidate(prefixes => { if (prefixes.some(touches)) refresh(); }), [refresh]);
  return <Context.Provider value={data}>{children}</Context.Provider>;
}
export const useInbox = () => useContext(Context);
