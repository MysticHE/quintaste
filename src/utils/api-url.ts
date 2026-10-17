import Constants from "expo-constants";
import { Platform } from "react-native";

export function apiUrl(path: string) {
  if (!path.startsWith("/api/")) throw new Error("Invalid API path.");
  if (Platform.OS === "web") return path;
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri;
  const base = configured || (host ? "http://" + host : "");
  if (!base) throw new Error("Live services are unavailable in this build.");
  const url = new URL(path, base);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid API address.");
  return url.href;
}
