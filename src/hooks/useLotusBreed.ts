import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { invalidate } from "./useRemote";
import { breedProgress, newRequestId, startBreed, type BreedJob } from "../services/lotus-api";
import { useT } from "../i18n";

type Failure = Error & { status?: number; code?: string };
const POLL_MS = 2500, POLL_FOR_MS = 35 * 60 * 1000;
const wait = (ms: number, signal: AbortSignal) => new Promise<void>(resolve => {
  const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); };
  const timer = setTimeout(done, ms); signal.addEventListener("abort", done, { once: true });
});

/**
 * One breed attempt for the signed-in member (AVATAR_LOTUS_PLAN §2 steps 7–8). The request id is stored before the
 * upload, so a reload or a dropped connection resumes the same attempt and never starts (or pays for) a second one.
 * `serverJob` is the account's latest attempt from /api/lotus, which resumes it on another device too.
 */
export function useLotusBreed(userId: string, serverJob: BreedJob | null | undefined) {
  const key = "@quintaste/lotus-breed-request/" + userId;
  const [job, setJob] = useState<BreedJob | null>(null), [uploading, setUploading] = useState(false), [error, setError] = useState("");
  const [restored, setRestored] = useState(false), [pending, setPending] = useState("");
  const controller = useRef<AbortController | null>(null), active = useRef(""), t = useT("game");
  const track = useCallback((id: string) => { active.current = id; setPending(id); }, []);

  const finish = useCallback(async (id: string) => {
    if (active.current === id) track("");
    await AsyncStorage.removeItem(key).catch(() => {});
    invalidate("lotus:");
  }, [key, track]);
  const poll = useCallback(async (id: string) => {
    controller.current?.abort();
    const run = new AbortController(); controller.current = run; track(id);
    const until = Date.now() + POLL_FOR_MS;
    try {
      while (!run.signal.aborted && Date.now() < until) {
        const next = await breedProgress(id, run.signal);
        if (run.signal.aborted) return;
        setJob(next); setError("");
        if (next.status !== "working") { await finish(id); return; }
        await wait(POLL_MS, run.signal);
      }
    } catch (failure) {
      if (run.signal.aborted) return;
      const problem = failure as Failure;
      // The upload never arrived: forget the id so the member can start again. Otherwise keep it and reconnect later.
      if (problem.status === 404) { await finish(id); setJob(null); setError(t("lotusPhotoNotUploaded")); return; }
      setError(problem.message || t("lotusConnectionLost"));
    }
  }, [finish, track, t]);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(key).then(id => {
      if (!alive) return;
      const resume = id && /^[A-Za-z0-9-]{16,80}$/.test(id) ? id : serverJob?.status === "working" ? serverJob.requestId : null;
      if (resume) void poll(resume);
    }).catch(() => {}).finally(() => { if (alive) setRestored(true); });
    return () => { alive = false; controller.current?.abort(); };
    // Resume once per account; later server snapshots must not restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Uploads the selfie and follows the attempt. `breedId` makes it a free regeneration of that breed. */
  const start = async (photo: string, breedId?: string) => {
    if (uploading || active.current) return;
    const id = newRequestId(breedId ? "again" : "breed");
    setUploading(true); setError(""); setJob(null);
    try {
      await AsyncStorage.setItem(key, id);
      track(id);
      setJob(await startBreed(id, photo, breedId));
      invalidate("lotus:");
      void poll(id);
    } catch (failure) {
      const problem = failure as Failure;
      // A refusal from the server starts nothing, so forget the id; a lost connection keeps it for Reconnect.
      if (problem.status && (problem.status < 500 || problem.status === 503)) await finish(id);
      setError(problem.message || t("lotusBreedFailed"));
    } finally { setUploading(false); }
  };
  const reconnect = () => { const id = active.current; if (id) void poll(id); };
  const clear = () => { setJob(null); setError(""); };
  /** True while an attempt is being followed or its upload result is uncertain (Reconnect checks it). */
  return { job, uploading, error, restored, start, reconnect, clear, pending: !!pending };
}
