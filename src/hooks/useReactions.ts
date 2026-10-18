import { useEffect, useReducer, useRef } from "react";
import { router, usePathname } from "expo-router";
import { useAuth } from "../state/Auth";
import { usePreferences } from "../state/Preferences";
import { useRemote, invalidate } from "./useRemote";
import { ApiError, communityRequest } from "../services/community-api";

export type ReactionKind = "recipe" | "place";
export type Reaction = { id: string; likes: number; shares: number; liked: boolean; shared: boolean };
type Page = { items: Reaction[] };

/** Private recipe drafts stay on the phone, so only published ids can carry likes and shares. */
export const reactable = (id: string) => /^[a-z0-9][a-z0-9-]{0,119}$/.test(id) && !id.startsWith("private-");
// The latest known state per account and item, shared by every card and detail page so a like shows everywhere at once.
const known = new Map<string, Reaction>(), listeners = new Set<() => void>();
function remember(account: string, kind: ReactionKind, reaction: Reaction) {
  known.set(account + ":" + kind + ":" + reaction.id, reaction);
  listeners.forEach(notify => notify());
}
function useKnown() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => { listeners.add(bump); return () => { listeners.delete(bump); }; }, []);
}

/** Loads the counts for every item on screen in one request; cards read them with `useReaction`. */
export function useReactions(kind: ReactionKind, ids: string[]) {
  const { user } = useAuth(), account = user?.id ?? "guest";
  const chosen = [...new Set(ids.filter(reactable))].slice(0, 200).sort().join(",");
  const remote = useRemote<Page>(chosen ? "reactions:" + kind + ":" + account + ":" + chosen : null,
    signal => communityRequest<Page>("/api/reactions/" + kind + "?ids=" + encodeURIComponent(chosen), { signal }));
  useEffect(() => { remote.data?.items.forEach(item => remember(account, kind, item)); }, [remote.data, account, kind]);
}

/** One item's counts with like and share actions. Guests are sent to sign in; counts update before the server answers. */
export function useReaction(kind: ReactionKind, id: string) {
  useKnown();
  const { user } = useAuth(), { setNotice } = usePreferences(), path = usePathname(), account = user?.id ?? "guest";
  const busy = useRef(false), enabled = reactable(id);
  const current = known.get(account + ":" + kind + ":" + id) ?? { id, likes: 0, shares: 0, liked: false, shared: false };
  const signedIn = () => {
    if (!user) { router.push({ pathname: "/login", params: { returnTo: path } }); return false; }
    if (!user.adultConfirmed) { router.push("/account-eligibility"); return false; }
    return true;
  };
  const toggleLike = async () => {
    if (!enabled || busy.current || !signedIn()) return;
    busy.current = true;
    const before = current;
    remember(account, kind, { ...before, liked: !before.liked, likes: Math.max(0, before.likes + (before.liked ? -1 : 1)) });
    try {
      remember(account, kind, await communityRequest<Reaction>(`/api/reactions/${kind}/${id}/like`, { method: before.liked ? "DELETE" : "PUT" }));
      invalidate("reactions:" + kind + ":" + account);
    } catch (error) {
      remember(account, kind, before);
      setNotice({ text: error instanceof ApiError ? error.message : "Your like didn't save. Try again.", error: true });
    } finally { busy.current = false; }
  };
  /** Called once the share sheet completes; a member's share of an item counts once. */
  const recordShare = async () => {
    if (!enabled || !user?.adultConfirmed || current.shared) return;
    remember(account, kind, { ...current, shared: true, shares: current.shares + 1 });
    try { remember(account, kind, await communityRequest<Reaction>(`/api/reactions/${kind}/${id}/share`, { method: "POST" })); }
    catch { remember(account, kind, current); }
  };
  return { reaction: current, enabled, toggleLike, recordShare };
}
