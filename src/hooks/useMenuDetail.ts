import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuDetail } from "../types/menus";
import { useMenus } from "../state/Menus";
import { utf8Bytes } from "../state/food-capacity";
import { cachedMenuDetail, menuDetailByteLimit, readMenuDetail, removeMenuDetail, saveMenuDetail } from "../services/menu-storage";
import { ownedApiRequest } from "../services/owned-api";
import { menuOfflineMs, menuRefreshMs } from "../utils/menu-catalogue";

export function useMenuDetail(id: string | undefined) {
  const { menus, offline, now, cached: indexCached } = useMenus();
  const summary = menus.find(menu => menu.id === id), summaryRef = useRef(summary);
  useEffect(() => { summaryRef.current = summary; }, [summary]);
  const [detail, setDetail] = useState<MenuDetail | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [storageError, setStorageError] = useState(false), [settled, setSettled] = useState(false);
  const active = useRef<AbortController | null>(null), alive = useRef(false), ready = useRef(false), current = useRef(detail);
  const fingerprint = summary?.fingerprint;
  const load = useCallback(async (force = false) => {
    const venue = summaryRef.current;
    if (!alive.current || !ready.current || !venue || offline || active.current) return;
    if (!force && current.current?.fingerprint === venue.fingerprint && current.current.venues[0].id === venue.id
      && Date.now() - current.current.generatedAt < menuRefreshMs) return;
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setBusy(true); setError("");
    try {
      const previous = current.current?.venues[0].id === venue.id && current.current.fingerprint === venue.fingerprint ? current.current : null;
      const response = await ownedApiRequest(`/api/menus?id=${encodeURIComponent(venue.id)}`, { signal: controller.signal,
        headers: previous ? { "If-None-Match": 'W/"' + previous.fingerprint + '"' } : undefined });
      if (response.status === 304 && previous) {
        if (!alive.current || active.current !== controller || controller.signal.aborted) return;
        const refreshed = { ...previous, generatedAt: Date.now() };
        current.current = refreshed; setDetail(refreshed); await saveMenuDetail(refreshed); return;
      }
      if (response.status === 404 || response.status === 410) {
        if (alive.current && active.current === controller) { current.current = null; setDetail(null); }
        await removeMenuDetail(venue.id);
        throw new Error("Menu no longer published.");
      }
      if (!response.ok) throw new Error("Menu unavailable. Please retry.");
      const text = await response.text();
      if (utf8Bytes(text) > menuDetailByteLimit) throw new Error("Menu could not be loaded.");
      const parsed = readMenuDetail(JSON.parse(text), venue);
      if (!alive.current || active.current !== controller || controller.signal.aborted) return;
      current.current = parsed; setDetail(parsed);
      try { await saveMenuDetail(parsed); if (alive.current) setStorageError(false); }
      catch { if (alive.current) setStorageError(true); }
    } catch (cause) {
      if (alive.current && active.current === controller)
        setError(cause instanceof Error && cause.message === "Menu no longer published." ? cause.message : "Menu unavailable. Please retry.");
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; if (alive.current) setBusy(false); }
    }
  }, [offline]);
  useEffect(() => {
    alive.current = true;
    ready.current = false;
    const venue = summaryRef.current;
    let disposed = false;
    void Promise.resolve().then(async () => {
      if (disposed) return;
      setBusy(false); setSettled(false);
      if (current.current?.venues[0].id !== id || current.current?.fingerprint !== fingerprint) {
        current.current = null; setDetail(null); setError("");
      }
      if (!venue) { setSettled(true); return; }
      try {
        const saved = await cachedMenuDetail(venue);
        if (!disposed && saved && !current.current) { current.current = saved; setDetail(saved); }
      } catch { if (!disposed) setStorageError(true); }
      if (!disposed) { ready.current = true; void load(); setSettled(true); }
    });
    return () => { disposed = true; alive.current = false; ready.current = false; active.current?.abort(); active.current = null; };
  }, [id, fingerprint, load]);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [now, load]);
  const valid = summary && detail?.fingerprint === summary.fingerprint && detail.venues[0].id === id
    && now - detail.generatedAt < menuOfflineMs ? detail : null;
  return { menu: valid?.venues[0], busy: busy || !!summary && !settled, error, storageError, load,
    cached: offline || indexCached || !!error || !!valid && now - valid.generatedAt >= menuRefreshMs };
}
