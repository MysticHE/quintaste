import { resolve } from "node:path";
import { isRecord, readMenuLeads, readResearchJson, validPlaceId } from "../menu-research-files";
import type { IdentityLead } from "./types";

export async function identityInputs(root: string) {
  const directory = await readResearchJson(resolve(root, "data/menu-research/location-coverage.json"));
  if (!isRecord(directory) || directory.version !== 1 || !Array.isArray(directory.records))
    throw new Error("Expected saved location coverage records.");
  const placeIds: string[] = [], seenIds = new Set<string>();
  for (const row of directory.records) {
    if (!isRecord(row) || !validPlaceId(row.placeId) || seenIds.has(row.placeId))
      throw new Error("Invalid or duplicate stored place ID.");
    seenIds.add(row.placeId);
    if (["identity-pending", "identity-candidate"].includes(String(row.status))) placeIds.push(row.placeId);
  }
  const leads: IdentityLead[] = [];
  for (const name of ["directory-leads.json", "menu-source-leads.json", "pilot-leads.json"]) {
    const leadFile = "data/menu-research/" + name;
    const value = readMenuLeads(await readResearchJson(resolve(root, leadFile)));
    const sources = new Map(value.sources.map(source => [source.id, source.url]));
    for (const lead of value.leads) {
      const sourceUrls = [...new Set(lead.sourceIds.map(id => sources.get(id)!))]
        .filter(url => !/(^|\.)google\.[a-z.]+$/i.test(new URL(url).hostname));
      if (sourceUrls.length) leads.push({ ...lead, leadFile, sourceUrls });
    }
  }
  return { placeIds, leads };
}
