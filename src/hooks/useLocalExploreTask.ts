import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalOwner } from "../types/explore-local";
import { ensureLocalSession, LocalApiError } from "../utils/local-explore-api";

export function useLocalExploreTask(owner: LocalOwner) {
  const active = useRef<AbortController | null>(null), alive = useRef(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const cancel = useCallback(() => { active.current?.abort(); active.current = null; setBusy(false); }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; active.current?.abort(); active.current = null; }; }, []);
  const run = useCallback(async (action: (signal: AbortSignal, current: () => boolean) => Promise<void>) => {
    if (active.current) return false;
    const controller = new AbortController(); active.current = controller;
    const current = () => alive.current && active.current === controller && !controller.signal.aborted;
    setBusy(true); setError("");
    try {
      await ensureLocalSession(owner, controller.signal);
      if (!current()) return false;
      await action(controller.signal, current);
      return current();
    } catch (problem) {
      if (current()) setError(problem instanceof LocalApiError ? problem.message : "Connection unavailable. Your changes are kept.");
      return false;
    } finally { if (active.current === controller) { active.current = null; if (alive.current) setBusy(false); } }
  }, [owner]);
  return { run, cancel, busy, error };
}
