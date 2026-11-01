import { useEffect } from "react";
import { router, type Href } from "expo-router";
import * as Notifications from "../services/local-notifications";
import { refreshPush } from "../services/push";
import { timerAlertPrefix } from "../services/timer-alert-sync";
import { useAuth } from "../state/Auth";
import { useLanguage } from "../i18n";

/** An app path from an alert, never another site. */
const inApp = (url: unknown): url is string => typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
/**
 * Phone alerts (server/community/push.mjs): once signed in, the phone's token is registered again (it can change, and the
 * language may have), and tapping an alert opens what it is about.
 */
export function usePushAlerts(ready: boolean) {
  const { user } = useAuth(), language = useLanguage(), userId = user?.id;
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
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    return () => listener.remove();
  }, [ready, userId]);
}
