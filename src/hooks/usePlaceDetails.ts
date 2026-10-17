import { useCallback, useEffect, useRef, useState } from "react";
import type { LivePlace } from "../types/discovery";
import { recalledPlace, rememberPlaces } from "../utils/live-place-cache";
import { apiUrl } from "../utils/api-url";
import { useExploreLocal } from "../state/ExploreLocal";

export function usePlaceDetails(id: string) {
  const { offline } = useExploreLocal();
  const [place, setPlace] = useState<LivePlace | null>(() => recalledPlace(id, Date.now()) ?? null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [expired, setExpired] = useState(false);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    if (offline) { setPlace(recalledPlace(id, Date.now()) ?? null); setError("You’re offline"); setBusy(false); return; }
    const timeout = setTimeout(() => controller.abort(), 25000);
    setBusy(true); setError(""); setExpired(false);
    try {
      const response = await fetch(apiUrl("/api/place-details?id=" + encodeURIComponent(id)), { signal: controller.signal });
      const body = await response.json();
      if (!response.ok || !body || !body.place || body.place.placeId !== id || typeof body.place.name !== "string"
        || !Array.isArray(body.place.photos) || !Array.isArray(body.place.hours)) throw new Error("Place details unavailable");
      const fetched = body.place.fetchedAt, now = Date.now();
      if (!Number.isFinite(fetched) || fetched > now + 30000 || now - fetched >= 300000) throw new Error("Refresh place details");
      if (active.current !== controller || controller.signal.aborted) return;
      setPlace(body.place); rememberPlaces([body.place]);
    } catch (problem) {
      if (active.current === controller) {
        setPlace(recalledPlace(id, Date.now()) ?? null);
        setError(controller.signal.aborted ? "Loading took too long"
          : problem instanceof TypeError ? "Connection unavailable" : problem instanceof Error && problem.message === "Refresh place details" ? problem.message : "Place details unavailable");
      }
    } finally { clearTimeout(timeout); if (active.current === controller) { setBusy(false); active.current = null; } }
  }, [id, offline]);
  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) void load(); });
    return () => { mounted = false; active.current?.abort(); active.current = null; };
  }, [load]);
  useEffect(() => {
    if (!place) return;
    const timer = setTimeout(() => { setPlace(null); setExpired(true); }, Math.max(0, place.fetchedAt + 300000 - Date.now()));
    return () => clearTimeout(timer);
  }, [place]);
  return { place, busy, error, expired, offline, load };
}
