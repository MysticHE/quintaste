import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { formatResearchRows, isRecord, menuLeadQuery, readMenuLeads, readMenuMatches, readResearchJson, researchCsvCell, validPlaceId, writeResearchFile, type MenuLeadFile } from "./menu-research-files";
import type { MenuCoverageRecord, MenuLead } from "./menu-research-types";
import { applyMenuIdentityReviews } from "./menu-identity-reviews";
import { applyMenuResearchOutcomes } from "./menu-research-outcomes";

function leadsIn(value: unknown): MenuLeadFile | undefined {
  if (!isRecord(value) || !Array.isArray(value.leads) || !Array.isArray(value.sources)) return undefined;
  return readMenuLeads(value);
}
function attachLead(record: MenuCoverageRecord, lead: MenuLead, sources: MenuLeadFile["sources"]) {
  if (!record.leadIds.includes(lead.id)) record.leadIds.push(lead.id);
  if (!record.candidateNames.includes(lead.name)) record.candidateNames.push(lead.name);
  if (lead.address && !record.candidateAddresses.includes(lead.address)) record.candidateAddresses.push(lead.address);
  const urls = sources.filter(source => lead.sourceIds.includes(source.id)).map(source => source.url);
  record.sourceUrls = [...new Set([...record.sourceUrls, ...urls])];
  record.status = "identity-candidate";
  record.gaps = ["Independent venue lead found; ID-only search or an unreviewed ID reference is not exact-branch confirmation. Menu availability is not yet assessed."];
}
async function main() {
  const root = resolve("data/menu-research");
  const directory = await readResearchJson(resolve("data/singapore-vegetarian-place-ids.json"));
  if (!isRecord(directory) || directory.version !== 1 || directory.country !== "SG" || typeof directory.collectedAt !== "string"
    || !Number.isFinite(Date.parse(directory.collectedAt)) || !Array.isArray(directory.records) || directory.records.length > 2400)
    throw new Error("Saved directory needs a reviewed inventory partition before expansion.");
  const records = new Map<string, MenuCoverageRecord>();
  for (const entry of directory.records) {
    if (!isRecord(entry) || !validPlaceId(entry.placeId) || records.has(entry.placeId)) throw new Error("Invalid or duplicate stored place ID.");
    records.set(entry.placeId, { placeId: entry.placeId, status: "identity-pending", leadIds: [], menuRows: 0,
      candidateNames: [], candidateAddresses: [],
      sourceUrls: [], gaps: ["Stored ID has no independently confirmed venue name/address; menu availability has not been assessed."] });
  }
  const files = (await readdir(root)).filter(file => file.endsWith(".json") && !file.endsWith("-matches.json") && file !== "location-coverage.json");
  for (const file of files) {
    const collection = leadsIn(await readResearchJson(resolve(root, file)));
    if (!collection) continue;
    const receipts = await readResearchJson(resolve(root, file.replace(/\.json$/, "-matches.json")), true);
    const matches = receipts === undefined ? [] : readMenuMatches(receipts, new Set(records.keys()));
    for (const lead of collection.leads) {
      if (lead.placeId && records.has(lead.placeId)) attachLead(records.get(lead.placeId)!, lead, collection.sources);
      const match = matches.find(item => item.leadId === lead.id && item.query === menuLeadQuery(lead));
      if (match?.status !== "candidate" || match.directoryIds.length !== 1) continue;
      const record = records.get(match.directoryIds[0]);
      if (record) attachLead(record, lead, collection.sources);
    }
  }
  const reviewedIdentities = await applyMenuIdentityReviews(root, records);
  const researchOutcomes = await applyMenuResearchOutcomes(root, records);
  const rows = [...records.values()].sort((a, b) => a.placeId.localeCompare(b.placeId));
  const counts = Object.fromEntries([...new Set(rows.map(row => row.status))].map(status => [status, rows.filter(row => row.status === status).length]));
  await writeResearchFile(resolve(root, "location-coverage.json"), formatResearchRows({ version: 1, generatedAt: new Date().toISOString(),
    directoryCollectedAt: directory.collectedAt, directoryCount: rows.length, complete: false, counts, reviewedIdentities, researchOutcomes,
    note: "Collection progress, not a claim that every stored ID is a vegetarian venue. Identity-pending is not menu-unavailable." }, "records", rows));
  const keys = ["placeId", "status", "name", "address", "menuRows", "sourceMenuIds", "menuPublication", "identityReviewedAt",
    "researchDataset", "researchBranchId", "identityEvidenceUrls", "candidateNames", "candidateAddresses", "leadIds", "sourceUrls", "gaps",
    "eligibility", "eligibilityReviewedAt", "eligibilityEvidenceUrls", "researchOutcomeBatch", "identityResearchStatus", "menuResearchStatus",
    "nextAction", "researchNotes"] as const;
  await writeResearchFile(resolve("docs/research/location-menu-coverage.csv"), keys.join(",") + "\n"
    + rows.map(row => keys.map(key => researchCsvCell(row[key])).join(",")).join("\n") + "\n");
  process.stdout.write(JSON.stringify({ directoryCount: rows.length, counts, reviewedIdentities, researchOutcomes, complete: false }) + "\n");
}
main().catch(error => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Coverage build stopped.\n"); process.exitCode = 1; });
