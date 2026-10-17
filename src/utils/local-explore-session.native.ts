import * as SecureStore from "expo-secure-store";
import type { LocalOwner } from "../types/explore-local";
import { apiUrl } from "./api-url";
const key = (owner: LocalOwner) => "quintaste.explore." + owner;
const origin = () => new URL(apiUrl("/api/local-explore/session")).origin;
export async function localSessionHeaders(owner: LocalOwner): Promise<Record<string, string>> {
  const raw = await SecureStore.getItemAsync(key(owner));
  let value: { token?: unknown; origin?: unknown } = {};
  try { value = raw ? JSON.parse(raw) : {}; } catch { throw new Error("Local session could not be read."); }
  return { "X-QuinTaste-Native": "1", ...(value.origin === origin() && typeof value.token === "string" && /^[a-f0-9]{64}$/.test(value.token)
    ? { Authorization: "Bearer " + value.token } : {}) };
}
export async function saveLocalSession(owner: LocalOwner, body: unknown) {
  const value = body as { token?: unknown };
  if (!value || typeof value.token !== "string" || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error("Local session unavailable.");
  await SecureStore.setItemAsync(key(owner), JSON.stringify({ token: value.token, origin: origin() }),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export async function clearLocalSession(owner: LocalOwner) { await SecureStore.deleteItemAsync(key(owner)); }
