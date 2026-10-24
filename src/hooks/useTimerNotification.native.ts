import { useEffect } from "react";
import * as Notifications from "../services/local-notifications";
import { router } from "expo-router";
import { useFood } from "../state/Food";
import { timerAlertPrefix } from "../services/timer-alert-sync";
import { timerOwnerKey } from '../services/timer-alert-coordinator';
import { useAuth } from '../state/Auth';
export function useTimerNotification(ready: boolean) {
  const { owner, doc, readable } = useFood();
  const { user } = useAuth();
  const scope = timerOwnerKey(owner, user?.id);
  useEffect(() => {
    if (!ready || !readable) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const { identifier, content } = response.notification.request;
      if (!identifier.startsWith(timerAlertPrefix)) return;
      Notifications.clearLastNotificationResponse();
      if (content.data?.owner !== scope) return;
      if (content.data?.kind === "order-reminder") { router.push({ pathname: "/market/order/[id]", params: { id: String(content.data.timerId) } }); return; }
      if (content.data?.kind === "plan-reminder") { if (doc.social.network.reminders.some(r => r.groupId === content.data?.timerId)) router.push(("/social/dinner/" + content.data.timerId) as never); return; }
      if (doc.timers.some(t => t.id === content.data?.timerId)) router.push("/timers");
    };
    open(Notifications.getLastNotificationResponse());
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    return () => listener.remove();
  }, [ready, readable, scope, doc.timers, doc.social.network.reminders]);
}
