import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { isRecord, readResearchJson, writeResearchFile } from "../menu-research-files";
import { placesKey } from "../places-client";
import { SpendLedger } from "./ledger";
import { oneMap, websiteConfirms, type OneMapAddress } from "./sources";

// Google's name and postcode are a lookup key only. Kept: the OneMap address and point, and the name when the
// venue's own website shows it. A name nothing else confirms yet is kept privately for 30 days, marked
// google-unverified, until QT Explorer confirms it from the venue's own pages.
const FIELDS = "id,displayName,addressComponents,formattedAddress";
const ORDER = ["priority", "fully-veg-check", "normal", "low", "skip-not-food"];  // Google's category can be wrong
const RETRY = new Set(["no-postcode", "postcode-not-on-onemap", "no-google-identity", "lookup-failed"]);
// Places checked from this time on already tried the street-address fallback; asking Google again gives the same answer.
const STREET_FALLBACK_FROM = "2026-10-19T09:36:23.195Z";
const needsGoogleRetry = (r: Identity) => r.status === "lookup-failed"
  || RETRY.has(r.status) && !r.pendingPostal && r.checkedAt < STREET_FALLBACK_FROM;
const KEEP_DAYS = 30;
const root = resolve(process.cwd());
const outPath = resolve(root, ".local/veg-options/identities.json");

type Identity = { placeId: string; checkedAt: string; triage: string;
  name: { value: string; source: "website" | "google-unverified"; expiresAt?: string } | null;
  unit: string | null; address: OneMapAddress | null; website: string | null; status: string;
  /** Google's postcode, kept only while OneMap has not matched it (30 days), so a retry needs no new Google call. */
  pendingPostal?: { value: string; expiresAt: string } };

async function google(key: string, placeId: string) {
  const response = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS }, signal: AbortSignal.timeout(20000), redirect: "error" });
  if (response.status === 401 || response.status === 403) throw new Error("Google rejected Places access (HTTP " + response.status + "); stopped.");
  if (!response.ok) { await response.body?.cancel(); return null; }
  const body: unknown = await response.json();
  if (!isRecord(body)) return null;
  const name = isRecord(body.displayName) && typeof body.displayName.text === "string" ? body.displayName.text.trim() : "";
  const parts = Array.isArray(body.addressComponents) ? body.addressComponents.filter(isRecord) : [];
  const postal = parts.find(p => Array.isArray(p.types) && p.types.includes("postal_code"))?.longText;
  const unit = typeof body.formattedAddress === "string" ? body.formattedAddress.match(/#\s?[A-Z]?\d{1,2}-\d{1,4}[A-Z]?/)?.[0] ?? null : null;
  const street = typeof body.formattedAddress === "string"
    ? body.formattedAddress.split(",")[0].replace(/#\s?[A-Z]?\d{1,2}-\d{1,4}[A-Z]?/, "").trim() : "";
  return { name, postal: typeof postal === "string" && /^\d{6}$/.test(postal) ? postal : null, unit, street };
}

async function identify(key: string, ledger: SpendLedger, row: { placeId: string; triage: string; website?: string | null }): Promise<Identity> {
  const now = new Date();
  await ledger.reserve("identity", row.placeId);
  const found = await google(key, row.placeId);
  const base = { placeId: row.placeId, checkedAt: now.toISOString(), triage: row.triage, website: row.website ?? null };
  if (!found?.name) return { ...base, name: null, unit: null, address: null, status: "no-google-identity" };
  const [byPostal, site] = await Promise.all([found.postal ? oneMap(found.postal) : null,
    websiteConfirms(row.website, found.name, found.postal)]);
  const address = byPostal ?? (/^\d/.test(found.street) ? await oneMap("", found.street) : null);
  const confirmed = !!site && (site.byName || site.byPostal);
  return { ...base, address, unit: site?.byPostal || confirmed ? found.unit : null,
    name: confirmed ? { value: found.name, source: "website" }
      : { value: found.name, source: "google-unverified", expiresAt: new Date(now.getTime() + KEEP_DAYS * 86400000).toISOString() },
    status: address ? (confirmed ? "matched" : "address-only") : found.postal ? "postcode-not-on-onemap" : "no-postcode",
    ...(!address && found.postal ? { pendingPostal: { value: found.postal, expiresAt: new Date(now.getTime() + KEEP_DAYS * 86400000).toISOString() } } : {}) };
}

/** Places whose postcode OneMap did not match (often a rate limit): OneMap again, no new Google call. */
async function retryOneMap(records: Record<string, Identity>, save: () => Promise<void>) {
  for (const row of Object.values(records)) {
    if (!row.pendingPostal || Date.parse(row.pendingPostal.expiresAt) < Date.now()) continue;
    const address = await oneMap(row.pendingPostal.value);
    if (!address) continue;
    Object.assign(row, { address, status: row.name?.source === "website" ? "matched" : "address-only" });
    delete row.pendingPostal;
  }
  await save();
}

async function main() {
  const enrichment = await readResearchJson(resolve(root, ".local/veg-options/enrichment.json"));
  if (!isRecord(enrichment) || !isRecord(enrichment.records)) throw new Error("Run enrich.ts first.");
  const queue = Object.values(enrichment.records as Record<string, { placeId: string; triage: string; website?: string | null }>)
    .filter(r => ORDER.includes(r.triage)).sort((a, b) => ORDER.indexOf(a.triage) - ORDER.indexOf(b.triage));
  const [key, ledger, saved] = await Promise.all([placesKey(root), SpendLedger.open(resolve(root, ".local/veg-options/spend.jsonl")),
    readResearchJson(outPath, true)]);
  const records: Record<string, Identity> = isRecord(saved) && isRecord(saved.records) ? saved.records as Record<string, Identity> : {};
  for (const r of Object.values(records)) if (r.name?.expiresAt && Date.parse(r.name.expiresAt) < Date.now()) r.name = null;
  const save = () => writeResearchFile(outPath, JSON.stringify({ version: 1, note:
    "Private research queue. Addresses from OneMap; names confirmed on the venue's website or pending QT Explorer.", records }) + "\n");
  const limit = Number(process.argv.find(a => a.startsWith("--limit="))?.slice(8) ?? Infinity);
  const retry = process.argv.includes("--retry");
  if (retry) await retryOneMap(records, save);
  const todo = queue.filter(r => !records[r.placeId] || retry && needsGoogleRetry(records[r.placeId])).slice(0, limit);
  try {
    for (let i = 0; i < todo.length && ledger.left("identity") >= 8; i += 8) {
      // A timeout or network failure marks only that place for the retry pass; the run carries on.
      const batch = await Promise.all(todo.slice(i, i + 8).map(r => identify(key, ledger, r).catch((error: unknown): Identity => {
        if (error instanceof Error && /rejected Places access|Hard cap/.test(error.message)) throw error;
        return { placeId: r.placeId, checkedAt: new Date().toISOString(), triage: r.triage, website: r.website ?? null,
          name: null, unit: null, address: null, status: "lookup-failed" };
      })));
      for (const row of batch) records[row.placeId] = row;
      await save();
      await delay(300);
    }
  } finally { await save(); }
  const counts: Record<string, number> = {};
  for (const r of Object.values(records)) counts[r.status] = (counts[r.status] ?? 0) + 1;
  process.stdout.write(JSON.stringify({ queue: queue.length, identified: Object.keys(records).length,
    remaining: queue.length - Object.keys(records).length, identityRequests: ledger.used("identity"), counts }) + "\n");
}

main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Identity run stopped.") + "\n"); process.exitCode = 1; });
