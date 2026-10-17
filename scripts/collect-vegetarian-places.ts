import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { placesKey, searchIds } from "./places-client";
import { searchAreas, searchTerms } from "./singapore-search-areas";
import { checkpoint, loadCollection, queryFor, repairExports, type CollectionState } from "./collector-archive";

const root = resolve(process.cwd());
let state: CollectionState | undefined;
let collecting = false;
async function collectQuery(key: string, area: string, term: string, collection: CollectionState) {
  const query = queryFor(area, term);
  if (collection.receipts.some(receipt => receipt.query === query)) return;
  let pageToken: string | undefined, pages = 0, results = 0;
  do {
    const page = await searchIds(key, query, pageToken);
    collection.requests += 1; pages += 1;
    for (const item of page.places ?? []) {
      results += 1;
      const entry = collection.records.get(item.id) ?? { placeId: item.id, searchAreas: [], searchTerms: [], discoveredAt: collection.collectedAt };
      if (!entry.searchAreas.includes(area)) entry.searchAreas.push(area);
      if (!entry.searchTerms.includes(term)) entry.searchTerms.push(term);
      collection.records.set(item.id, entry);
    }
    pageToken = page.nextPageToken;
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  } while (pageToken && pages < 3);
  collection.receipts.push({ query, pages, results, capped: results >= 60 || !!pageToken });
  await checkpoint(root, collection);
}
async function main() {
  const pkg = JSON.parse(await readFile(root + "/package.json", "utf8"));
  if (pkg.name !== "quintaste") throw new Error("Run this collector from the QuinTaste project.");
  state = await loadCollection(root);
  if (state.complete) {
    process.stdout.write(JSON.stringify({ complete: true, alreadyCollected: true, uniquePlaceIds: state.records.size,
      newRequests: 0, filesChanged: await repairExports(root, state) }) + "\n");
    return;
  }
  const key = await placesKey(root);
  collecting = true;
  for (const area of searchAreas) {
    for (const term of searchTerms) await collectQuery(key, area, term, state);
    process.stdout.write(JSON.stringify({ area, uniquePlaceIds: state.records.size, queries: state.receipts.length, requests: state.requests }) + "\n");
  }
  state.complete = true;
  await checkpoint(root, state);
  collecting = false;
  process.stdout.write(JSON.stringify({ complete: true, uniquePlaceIds: state.records.size,
    requests: state.requests, billedFieldsRequested: false }) + "\n");
}
main().catch(async error => {
  if (collecting && state && !state.complete) {
    try { await checkpoint(root, state); }
    catch { process.stderr.write("Progress could not be saved. The last valid checkpoint will be checked on resume.\n"); }
  }
  process.stderr.write(error instanceof Error ? error.message + "\n" : "Collection interrupted.\n");
  process.exitCode = 1;
});
