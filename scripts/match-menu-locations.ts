import { resolve } from "node:path";
import { lock as acquireLock } from "proper-lockfile";
import { ID_FIELDS, placesKey, searchIds } from "./places-client";
import { formatResearchRows, isRecord, menuLeadQuery, readMenuLeads, readMenuMatches, readResearchJson, validPlaceId, writeResearchFile } from "./menu-research-files";
async function main() {
  const [name, limitText = "50"] = process.argv.slice(2);
  const limit = Number(limitText);
  if (!name || !/^[a-z0-9-]+$/.test(name) || !/^\d{1,4}$/.test(limitText) || limit < 1 || limit > 1000)
    throw new Error("Use a menu-research lead filename and an explicit 1–1000 request bound.");
  const root = resolve("data/menu-research"), target = resolve(root, name + "-matches.json");
  const leads = readMenuLeads(await readResearchJson(resolve(root, name + ".json"))).leads.filter(lead => lead.address);
  const directory = await readResearchJson(resolve("data/singapore-vegetarian-place-ids.json"));
  if (!isRecord(directory) || !Array.isArray(directory.records)
    || directory.records.some(record => !isRecord(record) || !validPlaceId(record.placeId))) throw new Error("Invalid saved place directory.");
  const ids = new Set(directory.records.map(record => (record as { placeId: string }).placeId));
  const release = await acquireLock(target, { realpath: false, stale: 60000, update: 10000, retries: 0 });
  try {
    const saved = await readResearchJson(target, true);
    const matches = saved === undefined ? [] : readMenuMatches(saved, ids);
    const key = await placesKey(resolve("."));
    let requests = 0;
    for (const lead of leads) {
      const query = menuLeadQuery(lead);
      if (matches.some(match => match.leadId === lead.id && match.query === query)) continue;
      if (requests >= limit) break;
      const page = await searchIds(key, query);
      requests += 1;
      const resultIds = [...new Set((page.places ?? []).map(place => place.id))];
      const directoryIds = resultIds.filter(id => ids.has(id));
      matches.push({ leadId: lead.id, query, queriedAt: new Date().toISOString(), fieldMask: ID_FIELDS,
        resultIds, directoryIds, status: page.nextPageToken || resultIds.length > 1 ? "ambiguous" : directoryIds.length === 1 ? "candidate" : "no-match" });
      await writeResearchFile(target, formatResearchRows({ version: 1, fieldMask: ID_FIELDS,
        billingSku: "Text Search Essentials (IDs Only)", freeUsage: "Unlimited no-charge tier",
        pricingVerifiedAt: "2026-10-15", pricingUrl: "https://developers.google.com/maps/billing-and-pricing/pricing",
        note: "Search candidates, not confirmed branch identity; no name/address/photo fields requested." }, "matches", matches));
      if (requests % 50 === 0) process.stdout.write(JSON.stringify({ requests, receipts: matches.length, paidFieldsRequested: false }) + "\n");
      await new Promise(done => setTimeout(done, 250));
    }
    process.stdout.write(JSON.stringify({ requests, receipts: matches.length,
      candidates: matches.filter(match => match.status === "candidate").length,
      ambiguous: matches.filter(match => match.status === "ambiguous").length, paidFieldsRequested: false }) + "\n");
  } finally { await release(); }
}
main().catch(error => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Matching stopped.\n"); process.exitCode = 1; });
