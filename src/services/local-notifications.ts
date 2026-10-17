// SDK 57's root export loads remote topic subscriptions missing from Android Expo Go.
// Keep local timer APIs isolated here; verify these package paths on SDK upgrades.
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";
export { IosAuthorizationStatus } from "expo-notifications/build/NotificationPermissions.types";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
export type { NotificationResponse } from "expo-notifications/build/Notifications.types";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { getAllScheduledNotificationsAsync } from "expo-notifications/build/getAllScheduledNotificationsAsync";
export { getPresentedNotificationsAsync } from "expo-notifications/build/getPresentedNotificationsAsync";
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export { dismissNotificationAsync } from "expo-notifications/build/dismissNotificationAsync";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { getLastNotificationResponse, clearLastNotificationResponse, addNotificationResponseReceivedListener } from "expo-notifications/build/NotificationsEmitter";
