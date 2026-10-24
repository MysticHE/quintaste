import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useFood } from "../state/Food";

// Await outstanding writes before a newly mounted search screen reads the same account's history.
const writes = new Map<string, Promise<void>>();
const normal = (text: string) => text.trim().toLocaleLowerCase();
function enqueue(key: string, operation: () => Promise<void>) {
  const task = (writes.get(key) ?? Promise.resolve()).then(operation).catch(() => {});
  writes.set(key, task);
  void task.then(() => { if (writes.get(key) === task) writes.delete(key); });
}
async function read(key: string, limit: number) {
  try {
    const raw = await AsyncStorage.getItem(key), parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map(v => v.slice(0, 100)).slice(0, limit) : [];
  } catch { return []; }
}

/** Submitted text only; no automatic GPS or private-place capture. Four removable entries per account/device. */
export function useRecentPlaceSearches(namespace = "place", limit = 4) {
  const { discoveryScope } = useFood(), key = "@quintaste/recent-" + namespace + "-searches/" + discoveryScope;
  const [stored, setStored] = useState<{ key: string; items: string[] } | null>(null);
  const latest = useRef(stored);
  const active = useRef("");
  useEffect(() => {
    active.current = key;
    enqueue(key, async () => {
      const items = await read(key, limit);
      if (active.current === key) { latest.current = { key, items }; setStored(latest.current); }
    });
    return () => { active.current = ""; };
  }, [key, limit]);
  const change = (edit: (items: string[]) => string[]) => {
    // A fast submit must merge with the pending read rather than overwrite unseen history.
    enqueue(key, async () => {
      const before = latest.current?.key === key ? latest.current.items : await read(key, limit);
      const items = edit(before);
      if (active.current === key) { latest.current = { key, items }; setStored(latest.current); }
      await AsyncStorage.setItem(key, JSON.stringify(items));
    });
  };
  return {
    items: stored?.key === key ? stored.items : [],
    remember: (value: string) => {
      const text = value.trim().slice(0, 100);
      if (text) change(items => [text, ...items.filter(item => normal(item) !== normal(text))].slice(0, limit));
    },
    remove: (value: string) => change(items => items.filter(item => normal(item) !== normal(value))),
    clear: () => change(() => []),
  };
}
