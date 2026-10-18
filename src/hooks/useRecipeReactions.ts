import { useEffect, useReducer, useRef } from "react";
import { router, usePathname } from "expo-router";
import { useAuth } from "../state/Auth";
import { usePreferences } from "../state/Preferences";
import { useRemote, invalidate } from "./useRemote";
import { ApiError, communityRequest } from "../services/community-api";

export type RecipeReaction = { id: string; likes: number; shares: number; liked: boolean; shared: boolean };
type Page = { items: RecipeReaction[] };

/** Private drafts stay on the phone, so only published recipe ids can carry likes and shares. */
export const reactable = (id: string) => /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) && !id.startsWith("private-");
// The latest known state per account and recipe, shared by every card and recipe page so a like shows everywhere at once.
const known = new Map<string, RecipeReaction>(), listeners = new Set<() => void>();
function remember(account: string, reaction: RecipeReaction) {
  known.set(account + ":" + reaction.id, reaction);
  listeners.forEach(notify => notify());
}
function useKnown() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => { listeners.add(bump); return () => { listeners.delete(bump); }; }, []);
}

/** Loads the counts for every recipe on screen in one request; cards read them with `useRecipeReaction`. */
export function useRecipeReactions(ids: string[]) {
  const { user } = useAuth(), account = user?.id ?? "guest";
  const chosen = [...new Set(ids.filter(reactable))].slice(0, 200).sort().join(",");
  const remote = useRemote<Page>(chosen ? "recipe-reactions:" + account + ":" + chosen : null,
    signal => communityRequest<Page>("/api/recipe-reactions?ids=" + encodeURIComponent(chosen), { signal }));
  useEffect(() => { remote.data?.items.forEach(item => { if (item) remember(account, item); }); }, [remote.data, account]);
}

/** One recipe's counts with like and share actions. Guests are sent to sign in; counts update before the server answers. */
export function useRecipeReaction(id: string) {
  useKnown();
  const { user } = useAuth(), { setNotice } = usePreferences(), path = usePathname(), account = user?.id ?? "guest";
  const busy = useRef(false), enabled = reactable(id);
  const current = known.get(account + ":" + id) ?? { id, likes: 0, shares: 0, liked: false, shared: false };
  const signedIn = () => {
    if (!user) { router.push({ pathname: "/login", params: { returnTo: path } }); return false; }
    if (!user.adultConfirmed) { router.push("/account-eligibility"); return false; }
    return true;
  };
  const toggleLike = async () => {
    if (!enabled || busy.current || !signedIn()) return;
    busy.current = true;
    const before = current;
    remember(account, { ...before, liked: !before.liked, likes: Math.max(0, before.likes + (before.liked ? -1 : 1)) });
    try {
      remember(account, await communityRequest<RecipeReaction>(`/api/recipe-reactions/${id}/like`, { method: before.liked ? "DELETE" : "PUT" }));
      invalidate("recipe-reactions:" + account);
    } catch (error) {
      remember(account, before);
      setNotice({ text: error instanceof ApiError ? error.message : "Your like didn't save. Try again.", error: true });
    } finally { busy.current = false; }
  };
  /** Called once the share sheet completes; a member's share of a recipe counts once. */
  const recordShare = async () => {
    if (!enabled || !user?.adultConfirmed || current.shared) return;
    remember(account, { ...current, shared: true, shares: current.shares + 1 });
    try { remember(account, await communityRequest<RecipeReaction>(`/api/recipe-reactions/${id}/share`, { method: "POST" })); }
    catch { remember(account, current); }
  };
  return { reaction: current, enabled, toggleLike, recordShare };
}
