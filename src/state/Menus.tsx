import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import type { MenuIndex } from "../types/menus";
import { ownedApiRequest } from "../services/owned-api";
import { menuOfflineMs, menuRefreshMs, readMenuIndex } from "../utils/menu-catalogue";
import { menuIndexCacheKey, menuIndexByteLimit } from "../services/menu-storage";
import { utf8Bytes } from "./food-capacity";
import { useExploreLocal } from "./ExploreLocal";
import { useSegments } from "expo-router";
import { useT } from "../i18n";

function useMenuState() {
  const segments = useSegments();
  const enabled = segments.some(segment => segment === "menu" || segment === "place");
  const { offline } = useExploreLocal();
  const [data, setData] = useState<MenuIndex | null>(null), [failed, setFailed] = useState(false), t = useT("me");
  const [busy, setBusy] = useState(false), [storageError, setStorageError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const current = useRef(data), active = useRef<AbortController | null>(null), alive = useRef(false);
  const fetched = useRef(0);
  const etag = useRef("");
  const cancel = useCallback(() => { active.current?.abort(); active.current = null; setBusy(false); }, []);
  const load = useCallback(async (force = false) => {
    if (!alive.current || offline || active.current || !force && Date.now() - fetched.current < menuRefreshMs) return;
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setBusy(true); setFailed(false);
    try {
      const response = await ownedApiRequest("/api/menus?view=index", { signal: controller.signal,
        headers: etag.current ? { "If-None-Match": etag.current } : undefined });
      if (response.status === 304 && current.current) {
        const refreshed = { ...current.current, generatedAt: Date.now() };
        if (!alive.current || active.current !== controller || controller.signal.aborted) return;
        fetched.current = refreshed.generatedAt; current.current = refreshed; setData(refreshed); setNow(Date.now());
        return;
      }
      if (!response.ok) throw new Error("Menus unavailable");
      const text = await response.text();
      if (utf8Bytes(text) > menuIndexByteLimit) throw new Error("Invalid menus");
      const parsed = readMenuIndex(JSON.parse(text));
      if (!alive.current || active.current !== controller || controller.signal.aborted) return;
      current.current = parsed; fetched.current = parsed.generatedAt; setData(parsed); setNow(Date.now());
      etag.current = response.headers.get("ETag") ?? "";
      try { await AsyncStorage.setItem(menuIndexCacheKey, JSON.stringify(parsed));
        await AsyncStorage.removeItem("quintaste:public-menus:v1");
        if (alive.current) setStorageError(false); }
      catch { if (alive.current) setStorageError(true); }
    } catch {
      if (alive.current && active.current === controller) setFailed(true);
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; if (alive.current) setBusy(false); }
    }
  }, [offline]);
  useEffect(() => {
    alive.current = true;
    void AsyncStorage.getItem(menuIndexCacheKey).then(value => {
      if (!value || utf8Bytes(value) > menuIndexByteLimit || !alive.current || current.current) return;
      const parsed = readMenuIndex(JSON.parse(value), Date.now(), true);
      current.current = parsed; setData(parsed);
    }).catch(() => { if (alive.current) setStorageError(true); });
    return () => { alive.current = false; active.current?.abort(); active.current = null; };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) { if (offline) cancel(); else void load(); } });
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") { setNow(Date.now()); void load(); } else cancel();
    });
    const timer = setInterval(() => {
      if (AppState.currentState !== "background" && AppState.currentState !== "inactive") { setNow(Date.now()); void load(); }
    }, 60000);
    return () => { mounted = false; subscription.remove(); clearInterval(timer); cancel(); };
  }, [offline, load, cancel, enabled]);
  const usable = data && now - data.generatedAt < menuOfflineMs ? data : null, error = failed ? t("menusUnavailable") : "";
  return { menus: usable?.venues ?? [], loaded: !!usable, busy, error, storageError, load, now, offline,
    cached: offline || !!error || !!usable && now - usable.generatedAt >= menuRefreshMs };
}
const Context = createContext<ReturnType<typeof useMenuState> | null>(null);
export function MenusProvider({ children }: PropsWithChildren) {
  return <Context.Provider value={useMenuState()}>{children}</Context.Provider>;
}
export function useMenus() {
  const state = useContext(Context);
  if (!state) throw new Error("MenusProvider is required");
  return state;
}
