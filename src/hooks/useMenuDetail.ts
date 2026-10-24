import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuDetail, MenuSummary } from "../types/menus";
import { useMenus } from "../state/Menus";
import { useCatalogueVenue } from "./useCatalogueVenue";
import { utf8Bytes } from "../state/food-capacity";
import { cachedMenuDetail, menuDetailByteLimit, readMenuDetail, removeMenuDetail, saveMenuDetail } from "../services/menu-storage";
import { ownedApiRequest } from "../services/owned-api";
import { menuOfflineMs, menuRefreshMs } from "../utils/menu-catalogue";
import { useLanguage } from "../i18n";
import { exploreText } from "../utils/location-feedback";

const settleKey = (id: string | undefined, fingerprint: string | undefined) => id + ":" + (fingerprint ?? "");

/** `known` supplies the summary where the menu index is not loaded (Explore rows carry their own). The index lists packaged and staff-created
 * places only: for any other place (a QT Explorer one) the place's own catalogue summary, a superset of a menu summary, stands in once the index has answered. */
export function useMenuDetail(id: string | undefined, known?: MenuSummary) {
  const { menus, offline, now, cached: indexCached, loaded: indexLoaded, error: indexError } = useMenus(), language = useLanguage();
  const indexed = known ?? menus.find(menu => menu.id === id);
  const lookupWanted = !!id && !indexed && (indexLoaded || !!indexError || offline);
  const lookup = useCatalogueVenue(id ?? "", lookupWanted), retryLookup = lookup.retry;
  const found = lookup.venue && lookup.venue.id === id ? lookup.venue : undefined;
  const summary: MenuSummary | undefined = indexed ?? found, summaryRef = useRef(summary);
  const lookupOpen = useRef(false);
  useEffect(() => { summaryRef.current = summary; lookupOpen.current = lookupWanted && !summary; }, [summary, lookupWanted]);
  const [detail, setDetail] = useState<MenuDetail | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [storageError, setStorageError] = useState(false), [settled, setSettled] = useState("");
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
        setError(cause instanceof Error && cause.message === "Menu no longer published." ? "menuNoLongerPublished" : "menuUnavailable");
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
      setBusy(false); setSettled("");
      if (current.current?.venues[0].id !== id || current.current?.fingerprint !== fingerprint) {
        current.current = null; setDetail(null); setError("");
      }
      if (!venue) { setSettled(settleKey(id, fingerprint)); return; }
      try {
        const saved = await cachedMenuDetail(venue);
        if (!disposed && saved && !current.current) { current.current = saved; setDetail(saved); }
      } catch { if (!disposed) setStorageError(true); }
      if (!disposed) { ready.current = true; void load(); setSettled(settleKey(id, fingerprint)); }
    });
    return () => { disposed = true; alive.current = false; ready.current = false; active.current?.abort(); active.current = null; };
  }, [id, fingerprint, load]);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [now, load]);
  const valid = summary && detail?.fingerprint === summary.fingerprint && detail.venues[0].id === id
    && now - detail.generatedAt < menuOfflineMs ? detail : null;
  // A retry also asks again for a summary that could not be loaded.
  const reload = useCallback((force = false) => { if (force && lookupOpen.current) retryLookup(); return load(force); }, [load, retryLookup]);
  const lookupError = lookupWanted && !summary ? lookup.error : "";
  // Busy until the saved copy of this very place and version has been read, so no render shows "no menu" between a summary arriving and its menu loading.
  const waiting = !!summary && settled !== settleKey(id, fingerprint), looking = lookupWanted && lookup.busy && !summary;
  return { menu: valid?.venues[0], busy: busy || waiting || looking, error: exploreText(language, error) || lookupError, storageError, load: reload,
    cached: offline || indexCached || !!error || !!valid && now - valid.generatedAt >= menuRefreshMs };
}
