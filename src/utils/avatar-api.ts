import { Platform } from "react-native";
import { apiUrl } from "./api-url";
import { ensureLocalSession } from "./local-explore-api";
import { localSessionHeaders } from "./local-explore-session";
import type { LocalOwner } from "../types/explore-local";
import type { AvatarAvailability, AvatarJob } from "../types/avatar";
import { accountsEnabled, authClient } from "../services/auth-client";
export function avatarEndpoint(path: string) {
  const url = apiUrl((accountsEnabled ? "/api/avatar/" : "/api/local-explore/avatar/") + path);
  const parsed = new URL(url, Platform.OS === "web" ? globalThis.location?.origin : undefined);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) throw new Error("Connect securely to use avatar generation.");
  return url;
}
export async function avatarRequest<T>(owner: LocalOwner, path: string, options: RequestInit = {}): Promise<T> {
  const url = avatarEndpoint(path);
  if (!accountsEnabled) await ensureLocalSession(owner, options.signal ?? undefined);
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-QuinTaste-Client": accountsEnabled ? "avatar" : "explore" };
  if (accountsEnabled && Platform.OS !== "web") {
    const cookie = await authClient.getCookie();
    if (cookie) headers.Cookie = cookie;
    headers["expo-origin"] = "quintaste://";
  } else if (!accountsEnabled) {
    headers["X-QuinTaste-Owner"] = owner;
    Object.assign(headers, await localSessionHeaders(owner));
  }
  const controller = new AbortController(), cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal,
      credentials: accountsEnabled && Platform.OS !== "web" ? "omit" : "include", cache: "no-store",
      headers });
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(typeof value.error === "string" ? value.error.slice(0, 200) : "Avatar generation is unavailable."), { status: response.status });
    return value as T;
  } finally { clearTimeout(timeout); options.signal?.removeEventListener("abort", cancel); }
}
export const avatarAvailability = (owner: LocalOwner, signal?: AbortSignal) => avatarRequest<AvatarAvailability>(owner, "status", { signal });
export const avatarProgress = (owner: LocalOwner, requestId: string, signal?: AbortSignal) =>
  avatarRequest<AvatarJob>(owner, "jobs?requestId=" + encodeURIComponent(requestId), { signal });
export const removeAvatarJob = (owner: LocalOwner, id: string) => avatarRequest(owner, "jobs?requestId=" + encodeURIComponent(id), { method: "DELETE" });
