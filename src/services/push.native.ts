import AsyncStorage from "@react-native-async-storage/async-storage";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import * as Notifications from "./local-notifications";
import { communityRequest as call } from "./community-api";
import { translate, type Language } from "../i18n";
import { pushKinds, type PushResult, type PushState, type PushSupport } from "./push";

export { pushKinds, pushSettingsKey, loadPushSettings, savePushSettings } from "./push";
export type { PushKind, PushResult, PushState, PushSupport } from "./push";

/**
 * Phone alerts on iOS and Android: the phone's own token (Firebase on Android, APNs on iPhone), sent to /api/push/device for
 * the signed-in member; the server sends straight to Google and Apple. Expo Go can't receive them, as its tokens belong to
 * Expo Go, so there it says the store app is needed. The push modules load only when used, as their native parts are
 * missing from Android Expo Go. The device keeps "on", or "failed" when the last registration did not reach the server.
 */
const storeKey = (userId: string) => "@quintaste/push/" + userId;
const tokenKey = (userId: string) => "@quintaste/push-token/" + userId;
const oldChannelKey = "@quintaste/push-alerts-channel-removed";
export const pushSupport = (): PushSupport => isRunningInExpoGo() ? "store-app" : "ok";

/**
 * One Android channel per kind of alert (the server's channelId is the kind), named like the switches in Phone alerts, so
 * members can also mute a kind in the phone's settings. Made once per launch and language. Builds before 2 Nov 2026 used
 * one "alerts" channel, removed once.
 */
let channelsFor: string | null = null;
async function channels(language: string) {
  if (Platform.OS !== "android" || channelsFor === language) return;
  await Promise.all(pushKinds.map(kind => Notifications.setNotificationChannelAsync(kind, {
    name: translate(language as Language, "me", `push_${kind}`), importance: Notifications.AndroidImportance.HIGH })));
  channelsFor = language;
  if (await AsyncStorage.getItem(oldChannelKey).catch(() => "1")) return;
  await Notifications.deleteNotificationChannelAsync("alerts").catch(() => undefined);
  await AsyncStorage.setItem(oldChannelKey, "1").catch(() => undefined);
}
async function token() {
  const { getDevicePushTokenAsync } = await import("expo-notifications/build/getDevicePushTokenAsync");
  return String((await getDevicePushTokenAsync()).data);
}
/** Sends this phone's token for member `userId`; Android needs its channels first (done by the callers). */
async function register(userId: string, language: string) {
  const value = await token();
  // iPhone development builds get their token from Apple's sandbox.
  await call("/api/push/device", { method: "PUT", body: { token: value, platform: Platform.OS, language, sandbox: Platform.OS === "ios" && __DEV__ } });
  await AsyncStorage.setItem(tokenKey(userId), value);
}

export async function enablePush(userId: string, language: string): Promise<PushResult> {
  if (pushSupport() !== "ok") return "failed";
  // Android 13+ shows the permission prompt only once a channel exists.
  try { await channels(language); } catch { /* The permission is still asked below. */ }
  if (!allowed(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: true }, android: {} }))) return "denied";
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
/** Whether member `userId` turned alerts on here (also while the last registration failed). */
export const pushIsOn = async (userId: string) => ["on", "failed"].includes((await AsyncStorage.getItem(storeKey(userId))) ?? "");
const allowed = (p: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) => p.ios
  ? p.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED || p.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL : p.granted;
export async function pushState(userId: string): Promise<PushState> {
  if (pushSupport() !== "ok") return "off";
  const stored = await AsyncStorage.getItem(storeKey(userId));
  if (stored !== "on" && stored !== "failed") return "off";
  if (!allowed(await Notifications.getPermissionsAsync())) return "blocked";
  return stored === "failed" ? "failed" : "on";
}
/** Registers the token again (it can change, and the language may have); a failure shows in Phone alerts until it works. */
export async function refreshPush(userId: string, language: string) {
  const state = await pushState(userId);
  if (state !== "on" && state !== "failed") return;
  try {
    await channels(language);
    await register(userId, language);
    if (state === "failed") await AsyncStorage.setItem(storeKey(userId), "on");
  } catch { await AsyncStorage.setItem(storeKey(userId), "failed").catch(() => undefined); }
}
