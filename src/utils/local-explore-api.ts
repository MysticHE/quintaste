import type { LocalOwner } from "../types/explore-local";
import { apiUrl } from "./api-url";
import { localSessionHeaders, saveLocalSession, clearLocalSession } from "./local-explore-session";

export class LocalApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function request(owner: LocalOwner, path: string, options: RequestInit = {}) {
  const response = await fetch(apiUrl("/api/local-explore/" + path), { ...options, credentials: "include", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-QuinTaste-Client": "explore", "X-QuinTaste-Owner": owner,
      ...await localSessionHeaders(owner), ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new LocalApiError(response.status, response.status === 429 ? "Retry in a minute."
    : response.status === 409 ? "This case changed. Refresh your cases." : response.status === 400 || response.status === 413 ? "Check the details and photo."
    : "Local review unavailable. Your draft is kept.");
  return body;
}
const sessions = new Map<LocalOwner, Promise<void>>();
export async function ensureLocalSession(owner: LocalOwner, signal?: AbortSignal) {
  if (!__DEV__) throw new LocalApiError(503, "Local services are unavailable in this build.");
  let task = sessions.get(owner);
  if (!task) {
    task = localExploreRequest(owner, "session", { method: "POST" }).then(body => saveLocalSession(owner, body)).finally(() => { sessions.delete(owner); });
    sessions.set(owner, task);
  }
  await task;
  if (signal?.aborted) throw new LocalApiError(499, "Cancelled");
}
export async function localExploreRequest(owner: LocalOwner, path: string, options: RequestInit = {}) {
  if (!__DEV__) throw new LocalApiError(503, "Local services are unavailable in this build.");
  const controller = new AbortController(), parent = options.signal;
  const abort = () => controller.abort(); parent?.addEventListener("abort", abort, { once: true });
  if (parent?.aborted) controller.abort();
  const timer = setTimeout(abort, 12000);
  try { return await request(owner, path, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); parent?.removeEventListener("abort", abort); }
}
export const completeLocalExploreErase = clearLocalSession;
export async function eraseLocalExplore(owner: LocalOwner, hasServerRecords = false) {
  // Finish an already-started session before deleting; never create one for deletion.
  await sessions.get(owner)?.catch(() => {});
  await localExploreRequest(owner, "owner", { method: "DELETE",
    headers: { "X-QuinTaste-Records": hasServerRecords ? "required" : "none" } });
}
