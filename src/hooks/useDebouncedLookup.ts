import { useEffect, useRef, useState } from "react";

/**
 * Runs `load` 300 ms after `key` stops changing, cancels the previous request and gives up after 10 seconds. Nothing runs
 * while disabled or with an empty key; results are returned only for the current key.
 */
export function useDebouncedLookup<T>(key: string, enabled: boolean, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: unknown; timedOut?: boolean; busy: boolean }>({ key: "", busy: false });
  const [retry, setRetry] = useState(0), latest = useRef(load);
  useEffect(() => { latest.current = load; });
  useEffect(() => {
    if (!enabled || !key) return;
    const controller = new AbortController();
    let current = true, timeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      setState({ key, busy: true });
      timeout = setTimeout(() => controller.abort(), 10000);
      void latest.current(controller.signal)
        .then(data => { if (current) setState({ key, data, busy: false }); })
        .catch(error => { if (current) setState({ key, error, timedOut: controller.signal.aborted, busy: false }); })
        .finally(() => clearTimeout(timeout));
    }, 300);
    return () => { current = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [key, enabled, retry]);
  const settled = enabled && key === state.key;
  return { data: settled ? state.data : undefined, error: settled ? state.error : undefined, timedOut: settled && !!state.timedOut,
    busy: enabled && !!key && (key !== state.key || state.busy), retry: () => setRetry(count => count + 1) };
}
