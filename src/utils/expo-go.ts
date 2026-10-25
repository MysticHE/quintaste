import { getExpoGoProjectConfig, isRunningInExpoGo } from "expo";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Whether the bundle runs inside Expo Go or a development client rather than an installed build. On 25 Oct 2026 a production
 * bundle in Expo Go 58 on Android did not report `storeClient` (the game fell back to the installed build's file:// page), so
 * Expo Go is also recognised by its own native module.
 */
export function inExpoClient(): boolean {
  return Platform.OS !== "web" && (isRunningInExpoGo() || Constants.executionEnvironment === ExecutionEnvironment.StoreClient);
}

/**
 * A link back into the app for a browser to return to. Expo Go opens only its own scheme (`exps://<server>/--/<path>`), and
 * expo-linking picks the app's scheme instead when Expo Go doesn't report `storeClient`, so there the link is rebuilt from the
 * server Expo Go loaded the app from (a dev server on the LAN has a port and plain `exp://`).
 */
export function appLink(path: string): string {
  if (!isRunningInExpoGo()) return Linking.createURL(path);
  let url = "";
  try { url = Linking.createURL(path); } catch { /* rebuilt from the server below */ }
  if (/^exps?:\/\//.test(url)) return url;
  const host = (Constants.expoConfig?.hostUri ?? getExpoGoProjectConfig()?.debuggerHost ?? "").replace(/\/.*$/, "").replace(/:443$/, "");
  if (!host) return url || Linking.createURL(path);
  return `${/:\d+$/.test(host) ? "exp" : "exps"}://${host}/--/${path.replace(/^\//, "")}`;
}
