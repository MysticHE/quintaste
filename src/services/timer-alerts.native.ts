import * as Notifications from "./local-notifications";
import { Platform } from "react-native";
import { translate, type Language } from "../i18n";
import { savedLanguage } from "./saved-language";
import type { AlertPermission, TimerAlertAdapter } from "./timer-alerts";

const channelId = "cooking-timers";
Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
}) });
// No `sound` key: Android then uses the phone's default notification sound. Naming "default" makes Android look for a
// bundled file of that name and log an error.
async function channel(language: Language) {
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync(channelId, {
    name: translate(language, "cook", "timerChannelName"), importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250],
  });
}
function readPermission(result: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>): AlertPermission {
  if (result.ios) return result.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ? "granted"
    : result.ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED ? "undetermined" : "denied";
  // The app does not request exact alarms, so Android 12+ schedules inexact (approximate) alerts.
  if (result.granted) return Platform.OS === "android" && Number(Platform.Version) >= 31 ? "timing-unverified" : "granted";
  return result.canAskAgain ? "undetermined" : "denied";
}
export const timerAlerts: TimerAlertAdapter = {
  /**
   * Android 13+ shows the prompt only once a channel exists, so the channel comes first. Neither a failed channel nor a
   * prompt the runtime cannot show ends the attempt: the current permission is read instead, so the switch can say what to do.
   */
  async permission(request = false): Promise<AlertPermission> {
    if (request) {
      try { await channel(await savedLanguage()); } catch { /* Read the permission below; scheduling recreates the channel. */ }
      try { return readPermission(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false }, android: {} })); }
      catch { /* Fall through to the current permission. */ }
    }
    return readPermission(await Notifications.getPermissionsAsync());
  },
  scheduled: async () => (await Notifications.getAllScheduledNotificationsAsync()).map(n => n.identifier),
  presented: async () => (await Notifications.getPresentedNotificationsAsync()).map(n => n.request.identifier),
  cancel: id => Notifications.cancelScheduledNotificationAsync(id),
  dismiss: id => Notifications.dismissNotificationAsync(id),
  /** Worded in the language chosen when the alert is scheduled; a later language change leaves scheduled alerts as they are. */
  async schedule(alert) {
    const language = await savedLanguage(), { title, body } = alert.text(language);
    await channel(language);
    await Notifications.scheduleNotificationAsync({ identifier: alert.id,
      content: { title, body, sound: "default",
        data: { kind: alert.kind === "plan" ? "plan-reminder" : alert.kind === "order" ? "order-reminder" : "cooking-timer", owner: alert.owner, timerId: alert.timerId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(alert.endsAt), channelId },
    });
  },
};
