import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import * as Notifications from "./local-notifications";
import { communityRequest as call } from "./community-api";
import { translate, type Language } from "../i18n";
import type { PushResult, PushSupport } from "./push";

export { pushKinds, pushSettingsKey, loadPushSettings, savePushSettings } from "./push";
export type { PushKind, PushResult, PushSupport } from "./push";

/**
 * Phone alerts on iOS and Android: the Expo push token (docs.expo.dev/push-notifications/push-notifications-setup), sent to
 * /api/push/device for the signed-in member. Android Expo Go has no remote push since SDK 53, so there it says the store app
 * is needed. The push modules load only when used, as their native parts are missing from Android Expo Go.
 */
const storeKey = (userId: string) => "@quintaste/push/" + userId;
const tokenKey = (userId: string) => "@quintaste/push-token/" + userId;
export const pushSupport = (): PushSupport => Platform.OS === "android" && isRunningInExpoGo() ? "store-app" : "ok";

/** The Android channel the server's alerts use (channelId "alerts"). */
const channel = (language: string) => Platform.OS === "android" ? Notifications.setNotificationChannelAsync("alerts", {
  name: translate(language as Language, "me", "pushChannelName"), importance: Notifications.AndroidImportance.HIGH }) : Promise.resolve(null);
async function token() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { getExpoPushTokenAsync } = await import("expo-notifications/build/getExpoPushTokenAsync");
  return (await getExpoPushTokenAsync({ projectId })).data;
}
async function register(userId: string, language: string) {
  const value = await token();
  await call("/api/push/device", { method: "PUT", body: { token: value, platform: Platform.OS, language } });
  await AsyncStorage.setItem(tokenKey(userId), value);
}

export async function enablePush(userId: string, language: string): Promise<PushResult> {
  if (pushSupport() !== "ok") return "failed";
  // Android 13+ shows the permission prompt only once a channel exists.
  try { await channel(language); } catch { /* The permission is still asked below. */ }
  const permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false }, android: {} });
  const granted = permission.ios ? permission.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    || permission.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL : permission.granted;
  if (!granted) return "denied";
  try { await register(userId, language); }
  catch { return "failed"; }
  await AsyncStorage.setItem(storeKey(userId), "on");
  return "on";
}
export async function disablePush(userId: string) {
  const value = await AsyncStorage.getItem(tokenKey(userId));
  await AsyncStorage.multiRemove([storeKey(userId), tokenKey(userId)]);
  if (value) await call("/api/push/device", { method: "DELETE", body: { token: value } }).catch(() => undefined);
}
export const pushIsOn = async (userId: string) => (await AsyncStorage.getItem(storeKey(userId))) === "on";
export async function refreshPush(userId: string, language: string) {
  if (pushSupport() !== "ok" || !(await pushIsOn(userId))) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) return;
  await register(userId, language).catch(() => undefined);
}
