import { useEffect, useReducer } from "react";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
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
// Each card listens to its own item only, so a page of counts redraws only the cards whose numbers changed.
const known = new Map<string, Reaction>(), listeners = new Map<string, Set<() => void>>(), pending = new Set<string>();
const keyOf = (account: string, kind: ReactionKind, id: string) => account + ":" + kind + ":" + id;
const same = (a: Reaction | undefined, b: Reaction) => !!a && a.likes === b.likes && a.shares === b.shares && a.liked === b.liked && a.shared === b.shared;
function remember(account: string, kind: ReactionKind, items: Reaction[]) {
  for (const item of items) {
    const key = keyOf(account, kind, item.id), before = known.get(key);
    known.set(key, item);
    if (!same(before, item)) listeners.get(key)?.forEach(notify => notify());
  }
}
function useKnown(key: string) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const set = listeners.get(key) ?? new Set<() => void>();
    listeners.set(key, set.add(bump));
    return () => { set.delete(bump); if (!set.size) listeners.delete(key); };
  }, [key]);
}

/** Loads the counts for every item on screen in one request; cards read them with `useReaction`. */
export function useReactions(kind: ReactionKind, ids: string[]) {
  const { user } = useAuth(), account = user?.id ?? "guest";
  const chosen = [...new Set(ids.filter(reactable))].slice(0, 200).sort().join(",");
  const remote = useRemote<Page>(chosen ? "reactions:" + kind + ":" + account + ":" + chosen : null,
    signal => communityRequest<Page>("/api/reactions/" + kind + "?ids=" + encodeURIComponent(chosen), { signal }));
  useEffect(() => { if (remote.data) remember(account, kind, remote.data.items); }, [remote.data, account, kind]);
}

/** One item's counts with like and share actions. Guests are sent to sign in; counts update before the server answers. */
export function useReaction(kind: ReactionKind, id: string) {
  const { user } = useAuth(), { setNotice } = usePreferences(), account = user?.id ?? "guest", key = keyOf(account, kind, id);
  useKnown(key);
  // Sign-in returns to the same tab (Cook > Saved, Market > Orders...), not just the same screen.
  const path = usePathname(), { tab } = useGlobalSearchParams<{ tab?: string }>();
  const returnTo = path + (typeof tab === "string" && /^[a-z]+$/.test(tab) ? "?tab=" + tab : "");
  const enabled = reactable(id);
  const current = known.get(key) ?? { id, likes: 0, shares: 0, liked: false, shared: false };
  const signedIn = () => {
    if (!user) { router.push({ pathname: "/login", params: { returnTo } }); return false; }
    if (!user.adultConfirmed) { router.push("/account-eligibility"); return false; }
    return true;
  };
  // One like or share request per item at a time, across every card and page showing it.
  const toggleLike = async () => {
    if (!enabled || pending.has(key + ":like") || !signedIn()) return;
    pending.add(key + ":like");
    const before = known.get(key) ?? current;
    remember(account, kind, [{ ...before, liked: !before.liked, likes: Math.max(0, before.likes + (before.liked ? -1 : 1)) }]);
    try {
      remember(account, kind, [await communityRequest<Reaction>(`/api/reactions/${kind}/${id}/like`, { method: before.liked ? "DELETE" : "PUT" })]);
      invalidate("reactions:" + kind + ":" + account);
    } catch (error) {
      remember(account, kind, [before]);
      setNotice({ text: error instanceof ApiError ? error.message : "Your like didn't save. Try again.", error: true });
    } finally { pending.delete(key + ":like"); }
  };
  /**
   * Called when the share sheet reports a share. Android reports one as soon as the sheet opens (it never says when a share
   * is cancelled), so there it counts members who opened the sheet. Either way a member counts once per item.
   */
  const recordShare = async () => {
    const before = known.get(key) ?? current;
    if (!enabled || !user?.adultConfirmed || before.shared || pending.has(key + ":share")) return;
    pending.add(key + ":share");
    remember(account, kind, [{ ...before, shared: true, shares: before.shares + 1 }]);
    try { remember(account, kind, [await communityRequest<Reaction>(`/api/reactions/${kind}/${id}/share`, { method: "POST" })]); }
    catch { remember(account, kind, [before]); }
    finally { pending.delete(key + ":share"); }
  };
  return { reaction: current, enabled, toggleLike, recordShare };
}
