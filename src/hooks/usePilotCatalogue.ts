import { useCallback, useEffect, useRef, useState } from "react";
import { readPilotResponse } from "../utils/pilot-response";
import type { PilotCatalogueResponse, PilotReviewStatus, PilotVenueState } from "../types/pilot-catalogue";
import type { LocalReviewRequest } from "../types/local-review";

export function usePilotCatalogue(request: LocalReviewRequest) {
  const [data, setData] = useState<PilotCatalogueResponse | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(false), alive = useRef(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await request("GET", undefined, undefined, "catalogue");
      const parsed = readPilotResponse(result.body);
      if (alive.current && result.valid()) setData(parsed);
    } catch { if (alive.current) setError("Catalogue unavailable. Retry."); }
    finally { if (alive.current) setLoading(false); }
  }, [request]);
  useEffect(() => {
    alive.current = true; let mounted = true;
    void Promise.resolve().then(() => { if (mounted) void load(); });
    return () => { mounted = false; alive.current = false; };
  }, [load]);
  const review = async (state: PilotVenueState, status: PilotReviewStatus, reason: string) => {
    setError("");
    try {
      const result = await request("PATCH", { venueId: state.venueId, fingerprint: state.fingerprint, revision: state.revision, status, reason }, undefined, "catalogue");
      const parsed = readPilotResponse(result.body);
      if (alive.current && result.valid()) { setData(parsed); return true; }
    } catch { if (alive.current) setError("Review could not be saved. Refresh the catalogue and retry."); }
    return false;
  };
  return { data, error, loading, load, review };
}
