import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { avatarAvailability, avatarProgress, avatarRequest, removeAvatarJob } from "../utils/avatar-api";
import { readAvatar } from "../utils/avatar-schema";
import { avatarConsentVersion, type Avatar, type AvatarAvailability, type AvatarJob } from "../types/avatar";
import type { LocalOwner } from "../types/explore-local";
export function useAvatarGeneration(owner: LocalOwner, onResult: (avatar: Avatar) => Promise<void>, onAccepted: () => void, scope: string) {
  const storageKey = '@quintaste/avatar-request/' + scope;
  const [availability, setAvailability] = useState<AvatarAvailability>(), [checking, setChecking] = useState(false);
  const [job, setJob] = useState<AvatarJob>(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const requestId = useRef(""), controller = useRef<AbortController | null>(null), running = useRef(false);
  const alive = useRef(true), handler = useRef(onResult), accepted = useRef(onAccepted);
  const [canRetry, setCanRetry] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const restoreFailed = useRef(false);
  const resume = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { handler.current = onResult; accepted.current = onAccepted; }, [onResult, onAccepted]);
  const check = useCallback(async () => {
    setChecking(true);
    try { const result = await avatarAvailability(owner); if (alive.current) setAvailability(result); }
    catch { if (alive.current) setAvailability({ available: false, reason: "setup" }); }
    finally { if (alive.current) setChecking(false); }
  }, [owner]);
  useEffect(() => {
    alive.current = true; void Promise.resolve().then(check);
    return () => { alive.current = false; controller.current?.abort(); };
  }, [owner, check]);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then(raw => {
      if (!active) return;
      restoreFailed.current = false;
      setCanRetry(false); setError('');
      if (!raw) return;
      const saved = JSON.parse(raw) as { id?: string };
      if (saved.id && /^[A-Za-z0-9-]{16,80}$/.test(saved.id)) {
        requestId.current = saved.id; setCanRetry(true); void resume.current();
      }
    }).catch(() => { if (active) { restoreFailed.current = true; setCanRetry(true); setError('Could not restore the last request. Reconnect to try again.'); } })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [storageKey, restoreAttempt]);
  const poll = async (id: string, signal: AbortSignal) => {
    const until = Date.now() + 14 * 60 * 1000;
    while (!signal.aborted && alive.current && Date.now() < until) {
      const progress = await avatarProgress(owner, id, signal);
      if (signal.aborted || !alive.current) return;
      setJob(progress); accepted.current();
      if (progress.status === "complete") {
        const avatar = readAvatar(progress.avatar);
        if (!avatar || ["base", "blink", "mid", "open"].some(state => !avatar.frames[state as keyof typeof avatar.frames])) throw new Error("The avatar preview could not be read.");
        await handler.current(avatar); setCanRetry(false); return;
      }
      if (progress.status !== "working") {
        await AsyncStorage.removeItem(storageKey); requestId.current = ''; setCanRetry(false);
        throw new Error(progress.message || "Generation stopped. Your saved avatar is unchanged.");
      }
      await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); };
        const timer = setTimeout(done, 3000); signal.addEventListener("abort", done, { once: true });
      });
    }
    if (!signal.aborted) throw new Error("Preview timed out. Check its status before trying again.");
  };
  const execute = async (photo?: string) => {
    if (running.current || restoreFailed.current) return;
    running.current = true;
    controller.current?.abort(); const active = new AbortController(); controller.current = active;
    setBusy(true); setError("");
    try {
      if (photo) {
        if (requestId.current) throw new Error('Check the existing request before creating another avatar.');
        if (active.signal.aborted || !alive.current) return;
        const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-avatar";
        await AsyncStorage.setItem(storageKey, JSON.stringify({ id }));
        requestId.current = id;
        setCanRetry(true); setJob(undefined);
        const started = await avatarRequest<AvatarJob>(owner, "jobs", { method: "POST", signal: active.signal,
          body: JSON.stringify({ photo, consent: avatarConsentVersion, requestId: requestId.current }) });
        photo = undefined;
        if (active.signal.aborted || !alive.current) return;
        setJob(started); accepted.current();
      }
      await poll(requestId.current, active.signal);
    } catch (failure) {
      if (alive.current && !active.signal.aborted) {
        // A definitive rejection/not-found ends recovery; uncertain network/server
        // failures keep the request ID and never automatically buy another attempt.
        if (failure instanceof Error && 'status' in failure && [400, 404, 410, 413, 422, 429].includes(Number(failure.status))) {
          await AsyncStorage.removeItem(storageKey); requestId.current = ''; setCanRetry(false);
        }
        setError(failure instanceof Error ? failure.message : "Connection interrupted. Check the preview status.");
      }
    }
    finally { photo = undefined; if (controller.current === active) { running.current = false; if (alive.current) setBusy(false); } }
  };
  useLayoutEffect(() => { resume.current = () => execute(); });
  const clear = async () => {
    if (running.current || (canRetry && job?.status !== 'complete')) return;
    controller.current?.abort(); controller.current = null;
    running.current = true; setBusy(true);
    try {
      if (requestId.current) await removeAvatarJob(owner, requestId.current);
      await AsyncStorage.removeItem(storageKey);
      requestId.current = ""; if (alive.current) { setCanRetry(false); setJob(undefined); setError(""); }
    } catch (failure) {
      if (alive.current) setError('Could not confirm cancellation. Check the existing request before starting another.');
      throw failure;
    } finally { running.current = false; if (alive.current) setBusy(false); }
  };
  const release = async () => {
    if (running.current) return;
    const id = requestId.current;
    await AsyncStorage.removeItem(storageKey);
    requestId.current = '';
    if (alive.current) { setCanRetry(false); setJob(undefined); }
    if (id) await removeAvatarJob(owner, id);
  };
  return { availability, checking, check, job, busy: busy || restoring, error, start: (photo: string) => execute(photo), retry: () => {
    if (restoreFailed.current) { setRestoring(true); setRestoreAttempt(value => value + 1); }
    else void execute();
  },
    canRetry, clear, release };
}
