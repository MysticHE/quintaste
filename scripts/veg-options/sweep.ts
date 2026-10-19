import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { queryFor } from "../collector-archive";
import { isRecord, readResearchJson, writeResearchFile } from "../menu-research-files";
import { placesKey, searchIds } from "../places-client";
import { searchAreas } from "../singapore-search-areas";
import { SpendLedger } from "./ledger";

// Text Search IDs Only is unlimited free; only place IDs are kept (Google allows storing them indefinitely).
const TERMS = ["vegetarian options", "vegan options", "vegetarian friendly restaurants", "plant-based food"] as const;
const root = resolve(process.cwd());
const statePath = resolve(root, ".local/veg-options/sweep.json");
type Sweep = { receipts: { query: string; pages: number; results: number; capped: boolean }[];
  ids: Record<string, { areas: string[]; terms: string[] }> };

async function load(): Promise<Sweep> {
  const raw = await readResearchJson(statePath, true);
  if (raw === undefined) return { receipts: [], ids: {} };
  if (!isRecord(raw) || !Array.isArray(raw.receipts) || !isRecord(raw.ids)) throw new Error("Sweep checkpoint is invalid.");
  return raw as Sweep;
}

async function main() {
  const limit = Number(process.argv.find(a => a.startsWith("--queries="))?.slice(10) ?? Infinity);
  const [key, ledger, sweep] = await Promise.all([placesKey(root), SpendLedger.open(resolve(root, ".local/veg-options/spend.jsonl")), load()]);
  let ran = 0;
  for (const area of searchAreas) for (const term of TERMS) {
    const query = queryFor(area, term);
    if (sweep.receipts.some(r => r.query === query)) continue;
    if (ran++ >= limit) return report(sweep, ledger);
    let token: string | undefined, pages = 0, results = 0;
    do {
      await ledger.reserve("search", query + "#" + pages);
      const page = await searchIds(key, query, token);
      pages += 1;
      for (const { id } of page.places ?? []) {
        results += 1;
        const row = sweep.ids[id] ??= { areas: [], terms: [] };
        if (!row.areas.includes(area)) row.areas.push(area);
        if (!row.terms.includes(term)) row.terms.push(term);
      }
      token = page.nextPageToken;
      await delay(250);
    } while (token && pages < 3);
    sweep.receipts.push({ query, pages, results, capped: !!token });
    await writeResearchFile(statePath, JSON.stringify(sweep) + "\n");
  }
  report(sweep, ledger);
}

function report(sweep: Sweep, ledger: SpendLedger) {
  process.stdout.write(JSON.stringify({ queries: sweep.receipts.length, uniqueIds: Object.keys(sweep.ids).length,
    searchRequests: ledger.used("search") }) + "\n");
}

main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Sweep stopped.") + "\n"); process.exitCode = 1; });
