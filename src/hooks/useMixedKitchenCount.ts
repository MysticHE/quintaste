import { useEffect, useMemo, useState } from "react";
import type { DiscoverySearch } from "../types/discovery";
import { ownedApiRequest } from "../services/owned-api";
import { catalogueFreshMs, cataloguePageByteLimit, readCataloguePage } from "../utils/catalogue-page";
import { utf8Bytes } from "../state/food-capacity";
import { useExploreLocal } from "../state/ExploreLocal";
import { catalogueRequestKey } from "./useCatalogueDiscovery";

// Bounded memory only, like the catalogue pages: private search coordinates are never persisted.
const counts = new Map<string, { total: number; checkedAt: number }>();

/** How many Mixed Kitchen places match the same search, from one first-page request. Null while unknown or after a failure. */
export function useMixedKitchenCount(search: DiscoverySearch, enabled: boolean) {
  const { offline } = useExploreLocal();
  const mixed = useMemo(() => enabled && !offline ? { ...search, kitchen: "mixed" as const } : null, [search, enabled, offline]);
  const key = mixed ? catalogueRequestKey(mixed) : "";
  const [result, setResult] = useState<{ key: string; total: number | null } | null>(null);
  useEffect(() => {
    if (!mixed) return;
    const requestKey = catalogueRequestKey(mixed);
    if (fresh(requestKey) !== undefined) return;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    void (async () => {
      let total: number | null = null;
      try {
        const response = await ownedApiRequest("/api/catalogue", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ search: mixed, cursor: null }), signal: controller.signal });
        if (!response.ok) throw new Error("Places unavailable");
        const text = await response.text();
        if (utf8Bytes(text) > cataloguePageByteLimit) throw new Error("Results too large");
        total = readCataloguePage(JSON.parse(text)).total;
        counts.delete(requestKey); counts.set(requestKey, { total, checkedAt: Date.now() });
        while (counts.size > 8) counts.delete(counts.keys().next().value!);
      } catch { /* The nudge stays hidden when the count cannot be loaded. */ }
      finally { clearTimeout(timeout); }
      if (!controller.signal.aborted) setResult({ key: requestKey, total });
    })();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [mixed]);
  if (!key) return null;
  return fresh(key) ?? (result?.key === key ? result.total : null);
}
function fresh(key: string) {
  const saved = counts.get(key);
  return saved && Date.now() - saved.checkedAt < catalogueFreshMs ? saved.total : undefined;
}
