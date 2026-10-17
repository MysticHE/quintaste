import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Debounce text edits; serialize writes and flush the latest valid value on exit.
export function useAutosave<T>(write: (value: T) => Promise<boolean>) {
  const writer = useRef(write), latest = useRef<T | undefined>(undefined), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef(Promise.resolve(true)), alive = useRef(true), revision = useRef(0);
  const [saving, setSaving] = useState(false), [failed, setFailed] = useState(false);
  useLayoutEffect(() => { writer.current = write; }, [write]);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (latest.current === undefined) return queue.current;
    const value = latest.current, commit = writer.current, serial = ++revision.current;
    latest.current = undefined;
    if (alive.current) { setSaving(true); setFailed(false); }
    const operation = queue.current.catch(() => false).then(() => commit(value)).catch(() => false).then(okay => {
      if (alive.current && serial === revision.current && latest.current === undefined) {
        setSaving(false); setFailed(!okay);
        if (!okay) latest.current = value;
      }
      return okay;
    });
    queue.current = operation;
    return operation;
  }, []);
  const change = useCallback((value: T, immediate = false) => {
    latest.current = value;
    clearTimeout(timer.current);
    setSaving(true); setFailed(false);
    if (immediate) void flush(); else timer.current = setTimeout(() => void flush(), 400);
  }, [flush]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); void flush(); };
  }, [flush]);
  return { change, flush, saving, failed };
}
