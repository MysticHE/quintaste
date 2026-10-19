import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { isRecord, readResearchJson, validPlaceId, writeResearchFile } from "../menu-research-files";
import { placesKey } from "../places-client";
import { SpendLedger } from "./ledger";

// Place Details Enterprise + Atmosphere. Google content is used to sort the research queue and is not
// published. Kept: place ID (allowed indefinitely), our triage label and the venue website as a pointer
// for QT Explorer, which expires after 30 days. Names, addresses and ratings are never stored.
const FIELDS = "id,businessStatus,primaryType,types,servesVegetarianFood,websiteUri";
const KEEP_DAYS = 30;
const SKIP = new Set(["vegetarian-confirmed", "supplier", "food-court", "out-of-SG"]);
const FOOD = /restaurant|cafe|coffee|food|meal|bakery|bar|deli|dessert|tea|juice|hawker|diner|bistro/;
const root = resolve(process.cwd());
const outPath = resolve(root, ".local/veg-options/enrichment.json");

type Triage = "priority" | "normal" | "low" | "fully-veg-check" | "skip-closed" | "skip-not-food" | "id-obsolete" | "error";
type Row = { placeId: string; checkedAt: string; expiresAt: string; source: string; triage: Triage;
  status?: string; vegFlag?: boolean | null; website?: string | null; currentId?: string };

function csvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

async function seeds() {
  const [head, ...rows] = csvRows(await readFile(resolve(root, "docs/research/location-menu-coverage.csv"), "utf8"));
  const id = head.indexOf("placeId"), elig = head.indexOf("eligibility");
  const rank = (e: string) => (e === "mixed-menu" ? 0 : e === "unresolved" ? 2 : 3);
  const list = rows.filter(r => validPlaceId(r[id]) && !SKIP.has(r[elig]))
    .map(r => ({ placeId: r[id], source: "seed:" + (r[elig] || "unassessed"), rank: rank(r[elig]) }));
  const sweep = await readResearchJson(resolve(root, ".local/veg-options/sweep.json"), true);
  const known = new Set(rows.map(r => r[id]));
  if (isRecord(sweep) && isRecord(sweep.ids)) for (const placeId of Object.keys(sweep.ids)) {
    if (validPlaceId(placeId) && !known.has(placeId)) list.push({ placeId, source: "sweep", rank: 1 });
  }
  return list.sort((a, b) => a.rank - b.rank);
}

function triage(body: Record<string, unknown>, source: string): Pick<Row, "triage" | "status" | "vegFlag" | "website" | "currentId"> {
  const types = Array.isArray(body.types) ? body.types.map(String) : [];
  const status = typeof body.businessStatus === "string" ? body.businessStatus : undefined;
  const vegFlag = typeof body.servesVegetarianFood === "boolean" ? body.servesVegetarianFood : null;
  const website = typeof body.websiteUri === "string" && /^https:\/\//.test(body.websiteUri) ? body.websiteUri : null;
  const base = { status, vegFlag, website, ...(body.id !== undefined ? { currentId: String(body.id) } : {}) };
  if (status === "CLOSED_PERMANENTLY") return { ...base, triage: "skip-closed" };
  // Our own research outranks Google's category: a reviewed mixed-menu place stays a veg-options lead.
  if (source !== "seed:mixed-menu" && types.some(t => t === "vegetarian_restaurant" || t === "vegan_restaurant")) return { ...base, triage: "fully-veg-check" };
  if (!types.some(t => FOOD.test(t))) return { ...base, triage: "skip-not-food" };
  return { ...base, triage: vegFlag === true ? "priority" : vegFlag === false ? "low" : "normal" };
}

async function lookup(key: string, placeId: string, source: string): Promise<Partial<Row>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS }, signal: AbortSignal.timeout(20000), redirect: "error" });
    if (response.status === 401 || response.status === 403) throw new Error("Google rejected Places access (HTTP " + response.status + "); stopped.");
    if (response.status === 404) return { triage: "id-obsolete" };
    if (response.status === 429 || response.status === 503) { await response.body?.cancel(); await delay(60000); continue; }
    if (!response.ok) { await response.body?.cancel(); return { triage: "error", status: "HTTP " + response.status }; }
    const body: unknown = await response.json();
    return isRecord(body) ? triage(body, source) : { triage: "error", status: "invalid-response" };
  }
  return { triage: "error", status: "rate-limited" };
}

async function main() {
  const limit = Number(process.argv.find(a => a.startsWith("--limit="))?.slice(8) ?? Infinity);
  const [key, ledger, list] = await Promise.all([placesKey(root), SpendLedger.open(resolve(root, ".local/veg-options/spend.jsonl")), seeds()]);
  const saved = await readResearchJson(outPath, true);
  const records: Record<string, Row> = isRecord(saved) && isRecord(saved.records) ? saved.records as Record<string, Row> : {};
  const save = () => writeResearchFile(outPath, JSON.stringify({ version: 1, fields: FIELDS, note:
    "Private research queue. Not published. Websites expire after " + KEEP_DAYS + " days.", records }) + "\n");
  for (const row of Object.values(records)) if (Date.parse(row.expiresAt) < Date.now()) row.website = null;
  let done = 0;
  try {
    for (const seed of list) {
      if (records[seed.placeId] && records[seed.placeId].triage !== "error") continue;
      if (done >= limit || ledger.left("details") <= 0) break;
      await ledger.reserve("details", seed.placeId);
      const checkedAt = new Date();
      const result = await lookup(key, seed.placeId, seed.source);
      records[seed.placeId] = { placeId: seed.placeId, source: seed.source, checkedAt: checkedAt.toISOString(),
        expiresAt: new Date(checkedAt.getTime() + KEEP_DAYS * 86400000).toISOString(), triage: "error", ...result };
      done += 1;
      if (done % 25 === 0) await save();
      await delay(150);
    }
  } finally { await save(); }
  const counts: Record<string, number> = {};
  for (const row of Object.values(records)) counts[row.triage] = (counts[row.triage] ?? 0) + 1;
  process.stdout.write(JSON.stringify({ queue: list.length, enriched: Object.keys(records).length, detailsRequests: ledger.used("details"),
    detailsLeft: ledger.left("details"), counts }) + "\n");
}

main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Enrichment stopped.") + "\n"); process.exitCode = 1; });
