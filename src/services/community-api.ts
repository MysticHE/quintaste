import { Platform } from "react-native";
import { apiUrl } from "../utils/api-url";
import { accountsEnabled, authClient } from "./auth-client";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}
type Options = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal };
/** Headers that carry the account session: the cookie on native, the browser's own cookie on web. */
export async function sessionHeaders(): Promise<Record<string, string>> {
  if (!accountsEnabled || Platform.OS === "web") return {};
  const cookie = await authClient.getCookie();
  return { ...(cookie ? { Cookie: cookie } : {}), "expo-origin": "quintaste://" };
}
/** JSON request to the community services with the account session, a 20-second timeout and readable errors. */
export async function communityRequest<T>(path: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
  if (!accountsEnabled) throw new ApiError("Sign-in isn't available in this build.", 503, "UNAVAILABLE");
  const controller = new AbortController(), cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 20000);
  try {
    const response = await fetch(apiUrl(path), {
      method, signal: controller.signal, cache: "no-store", credentials: Platform.OS === "web" ? "include" : "omit",
      headers: { "Content-Type": "application/json", ...await sessionHeaders() }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(typeof value.error === "string" ? value.error.slice(0, 200) : "That did not work. Try again.", response.status, value.code);
    return value as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted && !signal?.aborted ? "The connection timed out. Try again." : "You appear to be offline. Try again.", 0, "OFFLINE");
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", cancel); }
}
/** Image source for a server photo path; native requests carry the session so owners can see draft photos. */
export function photoSource(path: string | null | undefined, headers: Record<string, string>) {
  return path ? { uri: apiUrl(path), headers } : undefined;
}
