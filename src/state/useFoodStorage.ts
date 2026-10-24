import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FoodDocument } from "../types/food";
import { emptyFoodDocument, readFoodDocument } from "./food-schema";
import { FoodCapacityError, serializeFoodDocument } from "./food-capacity";
import { useT } from "../i18n";

export const foodKey = (owner: "guest" | "profile", accountId?: string) =>
  "@quintaste/food-v1/" + (owner === "profile" && accountId ? "account/" + accountId : owner);
type StorageError = { key: string; kind: "load" | "write"; code: "foodReadFailed" | "prepareFailed" | "storageFull" | "writeFailed" } | null;
export function useFoodStorage(key: string) {
  const t = useT("me");
  const [document, setDocument] = useState<FoodDocument>(emptyFoodDocument);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<StorageError>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [switching, setSwitching] = useState(false);
  const locked = useRef(false), unwritten = useRef(false);
  const active = useRef(key), alive = useRef(true), revision = useRef(0), generation = useRef(0);
  const current = useRef({ key, document, readable: false });
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const pendingCommit = useRef<{ key: string; next: FoodDocument } | null>(null), committing = useRef(false);
  useLayoutEffect(() => { active.current = key; }, [key]);
  const load = useCallback(async () => {
    const captured = key, token = ++generation.current;
    if (pendingCommit.current?.key !== key) { pendingCommit.current = null; locked.current = false; }
    setLoadedKey(null);
    setError(null);
    setSaving(false);
    setDirty(false); unwritten.current = false;
    setSwitching(false);
    current.current = { key: captured, document: emptyFoodDocument(), readable: false };
    try {
      await queue.current;
      const raw = await AsyncStorage.getItem(captured);
      const next = raw ? readFoodDocument(JSON.parse(raw)) : emptyFoodDocument();
      if (alive.current && active.current === captured && generation.current === token) {
        current.current = { key: captured, document: next, readable: true };
        setDocument(next); setLoadedKey(captured);
      }
    } catch {
      if (alive.current && active.current === captured) {
        setDocument(emptyFoodDocument()); setLoadedKey(captured);
        setError({ key: captured, kind: "load", code: "foodReadFailed" });
      }
    }
  }, [key]);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(load);
    return () => { alive.current = false; };
  }, [load]);
  const persist = useCallback((next: FoodDocument) => {
    let serialized: string;
    try { serialized = serializeFoodDocument(next); }
    catch (error) {
      setError({ key, kind: "write", code: error instanceof FoodCapacityError ? "storageFull" : "prepareFailed" });
      return Promise.resolve(false);
    }
    const captured = key, serial = ++revision.current;
    setSaving(true); setDirty(true); unwritten.current = true;
    const operation = queue.current.catch(() => false).then(async () => {
      try {
        await AsyncStorage.setItem(captured, serialized);
        if (alive.current && active.current === captured && revision.current === serial) {
          setError(null); setDirty(false); unwritten.current = false;
        }
        return true;
      } catch {
        if (alive.current && active.current === captured) setError({
          key: captured, kind: "write", code: "writeFailed",
        });
        return false;
      } finally {
        if (alive.current && active.current === captured && revision.current === serial) setSaving(false);
      }
    });
    queue.current = operation;
    return operation;
  }, [key]);
  const update = useCallback((change: (document: FoodDocument) => FoodDocument) => {
    if (locked.current || !current.current.readable || current.current.key !== key) return Promise.resolve(false);
    const next = readFoodDocument(change(current.current.document));
    serializeFoodDocument(next);
    current.current.document = next;
    setDocument(next);
    return persist(next);
  }, [key, persist]);
  // Critical transitions publish only after persistence. A failed transition stays queued for the banner's Retry.
  const saveCommit = useCallback(async () => {
    const pending = pendingCommit.current;
    if (!pending || pending.key !== key || committing.current) return false;
    committing.current = true;
    try {
      const okay = await persist(pending.next);
      if (!alive.current || active.current !== key || current.current.key !== key || pendingCommit.current !== pending) return false;
      if (okay) {
        current.current.document = pending.next; setDocument(pending.next);
        pendingCommit.current = null; locked.current = false; setSwitching(false);
      }
      return okay;
    } finally { committing.current = false; }
  }, [key, persist]);
  const commit = useCallback((change: (document: FoodDocument) => FoodDocument) => {
    if (locked.current || !current.current.readable || current.current.key !== key) return Promise.resolve(false);
    const next = readFoodDocument(change(current.current.document));
    serializeFoodDocument(next);
    pendingCommit.current = { key, next }; locked.current = true; setSwitching(true);
    return saveCommit();
  }, [key, saveCommit]);
  const retry = useCallback(() => {
    if (pendingCommit.current?.key === key) return saveCommit();
    if (error?.kind === "load") return load();
    return persist(current.current.document);
  }, [error, key, load, persist, saveCommit]);
  const withScopeLock = useCallback(async <T>(action: (snapshot: FoodDocument) => Promise<T>, allowUnreadable = false): Promise<T | null> => {
    if (locked.current || (!current.current.readable && !allowUnreadable) || current.current.key !== key) return null;
    locked.current = true; setSwitching(true);
    try {
      if (!await queue.current || unwritten.current) return null;
      return await action(current.current.document);
    } finally {
      locked.current = false;
      if (alive.current && active.current === key) setSwitching(false);
    }
  }, [key]);
  const shownError = useMemo(() => error?.key === key ? { ...error, message: t(error.code) } : null, [error, key, t]);
  return {
    document: loadedKey === key ? document : emptyFoodDocument(), ready: loadedKey === key,
    readable: loadedKey === key && error?.kind !== "load" && !switching, error: shownError,
    saving, dirty, update, commit, retry, switching, withScopeLock,
  };
}
