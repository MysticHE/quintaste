import { useCallback, useEffect, useRef, useState } from "react";
import type { DiscoverySearch, SearchOrigin } from "../types/discovery";
import type { CataloguePage } from "../types/catalogue";
import { useFood } from "../state/Food";
import { useExploreLocal } from "../state/ExploreLocal";
import { originIsFresh, sameSearchContext } from "../utils/discovery-search";
import { ownedApiRequest } from "../services/owned-api";
import { catalogueFreshMs, catalogueOfflineMs, cataloguePageByteLimit, readCataloguePage } from "../utils/catalogue-page";
import { utf8Bytes } from "../state/food-capacity";
import { rememberCatalogueVenues } from "../services/catalogue-summaries";

type Cached = { page: CataloguePage; etag: string; checkedAt: number };
// Owner-scoped, bounded memory only: private search coordinates are never persisted.
export function catalogueRequestKey(search: DiscoverySearch, cursor: string | null = null) {
  return JSON.stringify({ ...search, origin: search.origin ? { latitude: search.origin.latitude, longitude: search.origin.longitude } : undefined, cursor });
}
export function useCatalogueDiscovery() {
  const [location, setLocation] = useState<SearchOrigin | null>(null);
  const { searchSelection: selection, setSearchSelection: setSelection, discoveryQuery: query, setDiscoveryQuery: setQuery, radius, setRadius } = useFood();
  const { offline } = useExploreLocal();
  const [catalogue, setCatalogue] = useState<CataloguePage | null>(null);
  const [accepted, setAccepted] = useState<DiscoverySearch | undefined>();
  const [requested, setRequested] = useState<DiscoverySearch | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [cached, setCached] = useState(false);
  const active = useRef<AbortController | null>(null), activeKey = useRef("");
  const alive = useRef(true), current = useRef<CataloguePage | null>(null), currentSearch = useRef<DiscoverySearch | undefined>(undefined);
  const recent = useRef(new Map<string, Cached>()), failures = useRef(new Map<string, number>());
  const acceptedCheckedAt = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; active.current?.abort(); }; }, []);
  const loadPage = useCallback(async (search: DiscoverySearch, force = false, cursor: string | null = null) => {
    if (search.origin && !originIsFresh(search.origin, Date.now())) { setError("Update your location to search nearby."); return; }
    const key = catalogueRequestKey(search, cursor), saved = recent.current.get(key), now = Date.now();
    if (active.current && activeKey.current !== key) {
      active.current.abort(); active.current = null; setBusy(false);
    }
    if (!cursor && !force && current.current && currentSearch.current && sameSearchContext(currentSearch.current, search)
      && catalogueRequestKey(currentSearch.current) === catalogueRequestKey(search) && now - acceptedCheckedAt.current < catalogueFreshMs) {
      setRequested(search); setAccepted(search); setCached(offline); setError(""); return;
    }
    if (activeKey.current === key && active.current) return;
    active.current?.abort(); active.current = null; activeKey.current = key;
    const display = (page: CataloguePage) => {
      const previous = current.current;
      const merged = cursor && previous?.revision === page.revision
        ? { ...page, venues: [...new Map([...previous.venues, ...page.venues].map(v => [v.id, v])).values()] } : page;
      current.current = merged; currentSearch.current = search; setCatalogue(merged); setAccepted(search);
    };
    setRequested(search); setError("");
    const usable = saved && now - saved.checkedAt < catalogueOfflineMs;
    const usableCurrent = !!current.current && !!currentSearch.current
      && catalogueRequestKey(currentSearch.current) === catalogueRequestKey(search)
      && now - acceptedCheckedAt.current < catalogueOfflineMs;
    const hasSavedResults = !!usable || usableCurrent;
    if (usable) {
      if (!cursor && !force && current.current?.revision === saved.page.revision && currentSearch.current
        && catalogueRequestKey(currentSearch.current) === catalogueRequestKey(search)) { setAccepted(search); }
      else display(saved.page);
    }
    else if (!cursor && !usableCurrent) {
      current.current = null; setCatalogue(null); setAccepted(undefined);
    }
    if (usable && !force && now - saved.checkedAt < catalogueFreshMs) {
      if (!cursor) acceptedCheckedAt.current = saved.checkedAt;
      setCached(offline); setBusy(false); return;
    }
    if (offline || !force && !cursor && now - (failures.current.get(key) ?? 0) < 60_000) {
      setCached(hasSavedResults); setBusy(false);
      if (cursor && offline) setError("Offline. Connect to load more places.");
      else if (!hasSavedResults) setError(offline ? "Offline. Connect to load places for this location." : "Places unavailable. Please retry.");
      return;
    }
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000); setBusy(true); setCached(hasSavedResults);
    try {
      const response = await ownedApiRequest("/api/catalogue", { method: "POST", headers: { "Content-Type": "application/json",
        ...(saved?.etag ? { "X-Catalogue-Version": saved.etag } : {}) }, body: JSON.stringify({ search, cursor }), signal: controller.signal });
      let page: CataloguePage;
      if (response.status === 204 && saved) page = saved.page;
      else {
        if (!response.ok) throw new Error("Places unavailable");
        const text = await response.text();
        if (utf8Bytes(text) > cataloguePageByteLimit) throw new Error("Results too large");
        page = readCataloguePage(JSON.parse(text));
      }
      if (!alive.current || active.current !== controller || controller.signal.aborted) return;
      if (cursor && current.current && page.revision !== current.current.revision) throw new Error("Search changed. Refresh results.");
      recent.current.delete(key); recent.current.set(key, { page, etag: response.headers.get("ETag") ?? saved?.etag ?? "", checkedAt: Date.now() });
      while (recent.current.size > 8) recent.current.delete(recent.current.keys().next().value!);
      if (!cursor) acceptedCheckedAt.current = Date.now();
      failures.current.delete(key); rememberCatalogueVenues(page.venues); display(page); setCached(false);
    } catch (problem) {
      if (alive.current && active.current === controller) {
        failures.current.set(key, Date.now());
        while (failures.current.size > 8) failures.current.delete(failures.current.keys().next().value!);
        setCached(hasSavedResults); setError(problem instanceof Error && problem.message === "Search changed. Refresh results."
          ? problem.message : hasSavedResults ? "Showing saved results. Could not refresh." : "Places unavailable. Please retry.");
      }
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; if (alive.current) setBusy(false); }
    }
  }, [offline]);
  const load = useCallback((search: DiscoverySearch, force = false) => loadPage(search, force), [loadPage]);
  const ensure = useCallback((search: DiscoverySearch) => { void load(search); }, [load]);
  const loadMore = useCallback(() => {
    if (!active.current && current.current?.nextCursor && currentSearch.current) void loadPage(currentSearch.current, false, current.current.nextCursor);
  }, [loadPage]);
  const clear = useCallback(() => {
    active.current?.abort(); active.current = null; activeKey.current = ""; current.current = null; currentSearch.current = undefined; acceptedCheckedAt.current = 0;
    setCatalogue(null); setAccepted(undefined); setRequested(null); setQuery(""); setError(""); setBusy(false);
  }, [setQuery]);
  return { location, setLocation, selection, setSelection, radius, setRadius,
    requested, query, setQuery, busy, error, cached, offline, load, ensure, loadMore, clear, accepted,
    venues: catalogue?.venues ?? [], catalogue, capped: !!catalogue?.nextCursor };
}
