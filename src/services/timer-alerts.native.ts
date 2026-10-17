import * as Notifications from "./local-notifications";
import { Platform } from "react-native";
import type { AlertPermission, TimerAlertAdapter } from "./timer-alerts";

const channelId = "cooking-timers";
Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
}) });
async function channel() {
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync(channelId, {
    name: "Cooking timers", importance: Notifications.AndroidImportance.HIGH,
    sound: "default", vibrationPattern: [0, 250, 250, 250],
  });
}
export const timerAlerts: TimerAlertAdapter = {
  async permission(request = false): Promise<AlertPermission> {
    if (request) await channel();
    const result = request ? await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })
      : await Notifications.getPermissionsAsync();
    if (result.ios) return result.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ? "granted"
      : result.ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED ? "undetermined" : "denied";
    // The app does not request exact alarms, so Android 12+ schedules inexact (approximate) alerts.
    if (result.granted) return Platform.OS === "android" && Number(Platform.Version) >= 31 ? "timing-unverified" : "granted";
    return result.canAskAgain ? "undetermined" : "denied";
  },
  scheduled: async () => (await Notifications.getAllScheduledNotificationsAsync()).map(n => n.identifier),
  presented: async () => (await Notifications.getPresentedNotificationsAsync()).map(n => n.request.identifier),
  cancel: id => Notifications.cancelScheduledNotificationAsync(id),
  dismiss: id => Notifications.dismissNotificationAsync(id),
  async schedule(alert) {
    await channel();
    await Notifications.scheduleNotificationAsync({ identifier: alert.id,
      content: { title: alert.title ?? "Cooking timer finished", body: alert.label, sound: "default",
        data: { kind: alert.kind === "plan" ? "plan-reminder" : "cooking-timer", owner: alert.owner, timerId: alert.timerId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(alert.endsAt), channelId },
    });
  },
};
