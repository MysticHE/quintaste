import { useEffect } from "react";
import { router, useGlobalSearchParams, usePathname, type Href } from "expo-router";
import * as Notifications from "../services/local-notifications";
import { refreshPush } from "../services/push";
import { setVisibleScreen } from "../services/alert-focus";
// Installs the notification handler that decides how alerts show while the app is open.
import "../services/timer-alerts";
import { timerAlertPrefix } from "../services/timer-alert-sync";
import { invalidate } from "./useRemote";
import { useAuth } from "../state/Auth";
import { useLanguage } from "../i18n";

/** An app path from an alert, never another site. */
const inApp = (url: unknown): url is string => typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
/**
 * Phone alerts (server/community/push.mjs): once signed in, the phone's token is registered again (it can change, and the
 * language may have); tapping an alert opens what it is about; an alert arriving while the app is open refreshes what it
 * changed (the inbox counts, the chat, the order), and is quiet when that screen is already on show.
 */
export function usePushAlerts(ready: boolean) {
  const { user } = useAuth(), language = useLanguage(), userId = user?.id, path = usePathname(), params = useGlobalSearchParams();
  useEffect(() => { setVisibleScreen(path, params); }, [path, params]);
  useEffect(() => { if (ready && userId) void refreshPush(userId, language); }, [ready, userId, language]);
  useEffect(() => {
    if (!ready || !userId) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.notification.request.identifier.startsWith(timerAlertPrefix)) return;
      const url = response.notification.request.content.data?.url;
      if (!inApp(url)) return;
      Notifications.clearLastNotificationResponse();
      router.push(url as Href);
    };
    open(Notifications.getLastNotificationResponse());
    const opened = Notifications.addNotificationResponseReceivedListener(open);
    const received = Notifications.addNotificationReceivedListener(notification => {
      if (inApp(notification.request.content.data?.url)) invalidate("/api/inbox", "/api/social", "/api/market", "ai-recipes:", "member-recipes:");
    });
    return () => { opened.remove(); received.remove(); };
  }, [ready, userId]);
}
