import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { ApiError, sessionHeaders } from "../services/community-api";

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>(), followers = new Set<(prefixes: string[]) => void>();
/** Refetches every mounted view whose key starts with one of the prefixes. */
export function invalidate(...prefixes: string[]) {
  for (const [key, set] of listeners) if (prefixes.some(prefix => key.startsWith(prefix))) set.forEach(run => run());
  followers.forEach(follow => follow(prefixes));
}
/** Hears every invalidation, for data derived from other keys (the inbox count follows Social and Market changes). */
export function onInvalidate(follow: (prefixes: string[]) => void) {
  followers.add(follow);
  return () => { followers.delete(follow); };
}
let headerCache: Record<string, string> | null = null, epoch = 0;
/** Clears all cached community data, for example when the signed-in account changes, and reloads mounted views. */
export function clearRemoteCache() {
  cache.clear(); headerCache = null; epoch++;
  for (const set of listeners.values()) set.forEach(run => run());
}
/** `stale`: the data shown belongs to the previous key while the new one loads (only with `keepPrevious`). */
export type Remote<T> = { data: T | undefined; error: ApiError | null; loading: boolean; stale: boolean; refresh: () => void };
type Entry<T> = { key: string; epoch: number; data?: T; error?: ApiError | null; loading?: boolean; previous?: T };
/**
 * `keepPrevious` keeps the last result on screen while a new key (a search, filter or page) loads, so a list does not
 * collapse to a spinner and grow back. Leave it off where the key names a different item, such as a detail page.
 */
export type RemoteOptions = { poll?: number; keepPrevious?: boolean };
/**
 * Loads data for a key, shows the last cached copy immediately, refreshes on focus and app resume,
 * and polls while the screen is focused when `poll` is set. A null key disables loading.
 */
export function useRemote<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>, options?: number | RemoteOptions): Remote<T> {
  const { poll, keepPrevious = false } = typeof options === "number" ? { poll: options } : options ?? {};
  const [entry, setEntry] = useState<Entry<T> | null>(null);
  const loader = useRef(load), current = useRef<AbortController | null>(null);
  useEffect(() => { loader.current = load; });
  const refresh = useCallback(() => {
    if (!key) return;
    current.current?.abort();
    const controller = new AbortController(), started = epoch; current.current = controller;
    // A new key starts empty but remembers what the old key showed; a different account (epoch) forgets it.
    const same = (previous: Entry<T> | null): Entry<T> => previous?.key === key && previous.epoch === started ? previous
      : { key, epoch: started, previous: previous?.epoch === started ? previous.data ?? previous.previous : undefined };
    setEntry(previous => ({ ...same(previous), loading: true }));
    loader.current(controller.signal).then(value => {
      if (controller.signal.aborted || started !== epoch) return;
      cache.set(key, value); setEntry({ key, epoch: started, data: value, error: null });
    }).catch(problem => {
      if (controller.signal.aborted || started !== epoch) return;
      const error = problem instanceof ApiError ? problem : new ApiError("That did not load. Try again.", 0, "LOAD_FAILED");
      setEntry(previous => ({ ...same(previous), error, loading: false }));
    });
  }, [key]);
  useEffect(() => {
    if (!key) return;
    const set = listeners.get(key) ?? new Set(); set.add(refresh); listeners.set(key, set);
    return () => { set.delete(refresh); current.current?.abort(); };
  }, [key, refresh]);
  useFocusEffect(useCallback(() => {
    refresh();
    const timer = poll ? setInterval(() => { if (AppState.currentState === "active") refresh(); }, poll) : undefined;
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { if (timer) clearInterval(timer); subscription.remove(); };
  }, [refresh, poll]));
  // A disabled key (a cleared search) forgets what it showed, so the next search never starts from older, unrelated results.
  if (!key && entry) setEntry(null);
  const own = entry?.key === key && entry.epoch === epoch ? entry : null;
  const fresh = own?.data ?? (key ? cache.get(key) as T | undefined : undefined), error = own?.error ?? null;
  // Until the new key's first load starts, the entry still holds the old key's result.
  const previous = keepPrevious && key && entry?.epoch === epoch ? (own ? own.previous : entry.data ?? entry.previous) : undefined;
  const stale = fresh === undefined && !error && previous !== undefined;
  return { data: stale ? previous : fresh, error, loading: !!key && (!!own?.loading || (fresh === undefined && !error)), stale, refresh };
}
/** Session headers for images; the last value is reused so photos do not reload on every mount. */
export function useSessionHeaders() {
  const [headers, setHeaders] = useState<Record<string, string>>(() => headerCache ?? {});
  useEffect(() => {
    let alive = true;
    void sessionHeaders().then(value => {
      headerCache = value;
      if (alive) setHeaders(current => JSON.stringify(current) === JSON.stringify(value) ? current : value);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return headers;
}
