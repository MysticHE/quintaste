import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { ID_FIELDS } from "./places-client";
import { searchAreas, searchTerms } from "./singapore-search-areas";

export type RecordEntry = { placeId: string; searchAreas: string[]; searchTerms: string[]; discoveredAt: string };
export type QueryReceipt = { query: string; pages: number; results: number; capped: boolean };
export type CollectionState = {
  collectedAt: string; complete: boolean; requests: number;
  records: Map<string, RecordEntry>; receipts: QueryReceipt[];
};
export const queryFor = (area: string, term: string) => term + " in " + area + (area === "Singapore" ? "" : ", Singapore");
const validDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const allowedAreas = new Set<string>(searchAreas);
const allowedTerms = new Set<string>(searchTerms);
const allQueries = new Set(searchAreas.flatMap(area => searchTerms.map(term => queryFor(area, term))));
function assertArchive(directory: unknown, coverage: unknown): asserts directory is Record<string, unknown> {
  if (!isObject(directory) || !isObject(coverage) || directory.version !== 1 || directory.country !== "SG"
    || directory.fieldMask !== ID_FIELDS || !validDate(directory.collectedAt) || typeof directory.complete !== "boolean"
    || directory.complete !== coverage.complete || directory.collectedAt !== coverage.collectedAt
    || !Array.isArray(directory.records) || !Array.isArray(coverage.receipts) || !isObject(directory.coverage)
    || !Number.isInteger(coverage.requests) || (coverage.requests as number) < 0
    || directory.coverage.requests !== coverage.requests || directory.coverage.queries !== coverage.receipts.length) {
    throw new Error("The saved collection and coverage do not agree. Existing files were preserved.");
  }
  const ids = new Set<string>();
  for (const entry of directory.records) {
    if (!isObject(entry) || typeof entry.placeId !== "string" || !/^[A-Za-z0-9_-]{10,200}$/.test(entry.placeId)
      || ids.has(entry.placeId) || !validDate(entry.discoveredAt)
      || !Array.isArray(entry.searchAreas) || !entry.searchAreas.every(area => typeof area === "string" && allowedAreas.has(area))
      || !Array.isArray(entry.searchTerms) || !entry.searchTerms.every(term => typeof term === "string" && allowedTerms.has(term))) {
      throw new Error("The saved collection contains invalid records. Existing files were preserved.");
    }
    ids.add(entry.placeId);
  }
  const done = new Set<string>();
  let completedRequests = 0;
  for (const receipt of coverage.receipts) {
    if (!isObject(receipt) || typeof receipt.query !== "string" || !allQueries.has(receipt.query) || done.has(receipt.query)
      || !Number.isInteger(receipt.pages) || (receipt.pages as number) < 1 || (receipt.pages as number) > 3
      || !Number.isInteger(receipt.results) || (receipt.results as number) < 0 || (receipt.results as number) > 60
      || typeof receipt.capped !== "boolean") throw new Error("The saved coverage is invalid. Existing files were preserved.");
    completedRequests += receipt.pages as number;
    done.add(receipt.query);
  }
  if (completedRequests > (coverage.requests as number) || (directory.complete && done.size !== allQueries.size)) {
    throw new Error("The saved coverage is incomplete. Existing files were preserved.");
  }
}
async function readOptional(path: string) {
  try { return JSON.parse(await readFile(path, "utf8")) as unknown; }
  catch (error) {
    if (isObject(error) && error.code === "ENOENT") return undefined;
    throw new Error("A saved collection file could not be read. Existing files were preserved.");
  }
}
export async function loadCollection(root: string): Promise<CollectionState> {
  const canonical = await readOptional(root + "/data/singapore-collection-checkpoint.json");
  if (canonical !== undefined) {
    if (!isObject(canonical)) throw new Error("The resume archive is invalid. Existing files were preserved.");
    assertArchive(canonical.directory, canonical.coverage);
    const data = canonical.directory;
    const report = canonical.coverage as { requests: number; receipts: QueryReceipt[] };
    return { collectedAt: data.collectedAt as string, complete: data.complete as boolean,
      requests: report.requests, records: new Map((data.records as RecordEntry[]).map(entry => [entry.placeId, entry])), receipts: report.receipts };
  }
  const directory = await readOptional(root + "/src/data/google-place-directory.json");
  const coverage = await readOptional(root + "/data/singapore-search-coverage.json");
  if (directory === undefined && coverage === undefined) {
    return { collectedAt: new Date().toISOString(), complete: false, requests: 0, records: new Map(), receipts: [] };
  }
  assertArchive(directory, coverage);
  const report = coverage as { requests: number; receipts: QueryReceipt[] };
  return { collectedAt: directory.collectedAt as string, complete: directory.complete as boolean,
    requests: report.requests, records: new Map((directory.records as RecordEntry[]).map(entry => [entry.placeId, entry])),
    receipts: report.receipts };
}
async function atomicWrite(path: string, content: string) {
  await writeFile(path + ".tmp", content);
  await rename(path + ".tmp", path);
}
const csv = (value: string) => '"' + value.replace(/"/g, '""') + '"';
function archiveContents(state: CollectionState) {
  const entries = [...state.records.values()].sort((a, b) => a.placeId.localeCompare(b.placeId));
  const directory = { version: 1, country: "SG", collectedAt: state.collectedAt, complete: state.complete, exhaustive: false,
    source: "Google Places API (New), ID-only queries", fieldMask: ID_FIELDS,
    billingSku: "Text Search Essentials (IDs Only)", freeUsage: "Unlimited no-charge tier",
    coverage: { areas: searchAreas.length, terms: searchTerms.length, queries: state.receipts.length,
      requests: state.requests, cappedQueries: state.receipts.filter(item => item.capped).length },
    note: "Search-matched candidates. Google search is capped and non-exhaustive; dietary ingredients require separate review.",
    records: entries };
  const coverage = { collectedAt: state.collectedAt, complete: state.complete, requests: state.requests, receipts: state.receipts };
  const json = JSON.stringify(directory, null, 2) + "\n";
  const rows = entries.map(item => [item.placeId, "https://www.google.com/maps/search/?api=1&query=vegetarian+food&query_place_id="
    + encodeURIComponent(item.placeId), item.searchAreas.join(" | "), item.searchTerms.join(" | "), item.discoveredAt].map(csv).join(","));
  return { canonical: JSON.stringify({ directory, coverage }, null, 2) + "\n", files: {
    "/data/singapore-vegetarian-place-ids.json": json,
    "/data/singapore-vegetarian-place-ids.csv": "place_id,google_maps_url,matched_search_areas,matched_search_terms,discovered_at\n" + rows.join("\n") + "\n",
    "/src/data/google-place-directory.json": json,
    "/data/singapore-search-coverage.json": JSON.stringify(coverage, null, 2) + "\n",
  } };
}
export async function repairExports(root: string, state: CollectionState) {
  let changed = false;
  for (const [path, content] of Object.entries(archiveContents(state).files)) {
    let existing: string | undefined;
    try { existing = await readFile(root + path, "utf8"); }
    catch (error) { if (!isObject(error) || error.code !== "ENOENT") throw error; }
    if (existing !== content) { await atomicWrite(root + path, content); changed = true; }
  }
  return changed;
}
export async function checkpoint(root: string, state: CollectionState) {
  await mkdir(root + "/data", { recursive: true });
  await atomicWrite(root + "/data/singapore-collection-checkpoint.json", archiveContents(state).canonical);
  await repairExports(root, state);
}
