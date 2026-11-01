import { useEffect, useState } from "react";
import { ownedApiRequest } from "../services/owned-api";
import type { RecipeDish } from "../types/catalogue";

// The answer changes only with the catalogue, so it is asked once per recipe name and kept in memory for half an hour.
const freshMs = 30 * 60_000, known = new Map<string, { value: RecipeDish | null; at: number }>();
const fresh = (name: string) => { const saved = known.get(name); return saved && Date.now() - saved.at < freshMs ? saved : undefined; };

async function fetchRecipeDish(name: string, signal: AbortSignal): Promise<RecipeDish | null> {
  const response = await ownedApiRequest(`/api/dish-search?recipe=${encodeURIComponent(name)}`, { signal });
  if (!response.ok) throw new Error("Places unavailable");
  const { dish } = await response.json() as { dish?: unknown };
  if (!dish || typeof dish !== "object") return null;
  const { dish: term, places } = dish as Record<string, unknown>;
  return typeof term === "string" && !!term.trim() && term.length <= 100 && typeof places === "number" && places > 0 ? { dish: term, places } : null;
}
/** The dish a recipe's name names that Veg Kitchen places serve, for Find It Nearby. Null while loading, offline or when none does. */
export function useRecipeDish(name: string | undefined) {
  const key = name?.trim() ?? "";
  const [result, setResult] = useState<{ key: string; value: RecipeDish | null } | null>(null);
  useEffect(() => {
    if (!key || fresh(key)) return;
    const controller = new AbortController();
    fetchRecipeDish(key, controller.signal).then(value => {
      known.delete(key); known.set(key, { value, at: Date.now() });
      while (known.size > 100) known.delete(known.keys().next().value!);
      if (!controller.signal.aborted) setResult({ key, value });
    }, () => { /* The link stays hidden when places cannot be checked. */ });
    return () => controller.abort();
  }, [key]);
  if (!key) return null;
  return fresh(key)?.value ?? (result?.key === key ? result.value : null);
}
