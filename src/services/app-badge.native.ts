import { isRunningInExpoGo } from "expo";

let shown = -1;
/**
 * The app-icon badge: everything waiting on the member (the inbox total), the same number phone alerts carry
 * (server/community/push.mjs). Phones that don't show badges, or block them, simply ignore it. Expo Go is skipped, and the
 * badge module loads only when used, as its native part may be missing from Android Expo Go.
 */
export function setAppBadge(count: number) {
  const next = Math.max(0, Math.floor(count) || 0);
  if (next === shown || isRunningInExpoGo()) return;
  shown = next;
  void import("expo-notifications/build/setBadgeCountAsync")
    .then(({ setBadgeCountAsync }) => setBadgeCountAsync(next))
    .catch(() => { shown = -1; });
}
