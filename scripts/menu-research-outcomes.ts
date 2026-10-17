import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { isRecord, readResearchJson, validPlaceId, validSourceUrl } from "./menu-research-files";
import type { MenuCoverageRecord, MenuEligibility } from "./menu-research-types";

const eligibility = new Set<MenuEligibility>([
  "vegetarian-confirmed", "mixed-menu", "supplier", "food-court", "out-of-SG", "unresolved",
]);
function requiredText(value: unknown, label: string, limit = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value))
    throw new Error("Invalid research outcome " + label);
  return value;
}
function independentUrls(value: unknown, unresolved: boolean): string[] {
  if (!Array.isArray(value) || (!unresolved && !value.length) || value.length > 100
    || value.some(url => !validSourceUrl(url) || /(^|\.)google\.[a-z.]+$/i.test(new URL(url).hostname)))
    throw new Error("Research outcome needs independent evidence URLs.");
  return [...new Set(value)] as string[];
}

export async function applyMenuResearchOutcomes(root: string, records: Map<string, MenuCoverageRecord>) {
  const files = (await readdir(root)).filter(file => /^identity-completion-batch-\d+\.json$/.test(file)).sort();
  for (const file of files) {
    const packet = await readResearchJson(resolve(root, file));
    if (!isRecord(packet) || packet.version !== 1 || packet.status !== "frozen-outcome-batch"
      || !Array.isArray(packet.entries) || packet.entries.length > records.size)
      throw new Error("Expected a frozen identity outcome batch: " + file);
    const batch = requiredText(packet.batch, "batch", 100), seen = new Set<string>();
    for (const outcome of packet.entries) {
      if (!isRecord(outcome) || !validPlaceId(outcome.placeId) || !records.has(outcome.placeId)
        || seen.has(outcome.placeId) || !eligibility.has(outcome.eligibility as MenuEligibility)
        || !isRecord(outcome.menu)) throw new Error("Invalid or duplicate per-place research outcome.");
      seen.add(outcome.placeId);
      const date = requiredText(outcome.retrievedAt, "checked date", 100);
      if (!Number.isFinite(Date.parse(date))) throw new Error("Invalid outcome check date.");
      const reviewedAt = new Date(date).toISOString();
      const evidence = independentUrls(outcome.sourceUrls, outcome.eligibility === "unresolved");
      const record = records.get(outcome.placeId)!;
      const fields = {
        eligibility: outcome.eligibility as MenuEligibility, eligibilityReviewedAt: reviewedAt,
        eligibilityEvidenceUrls: evidence, researchOutcomeBatch: batch,
        identityResearchStatus: requiredText(outcome.identityStatus, "identity status", 200),
        menuResearchStatus: requiredText(outcome.menu.status, "menu status", 200),
        nextAction: requiredText(outcome.nextAction, "next action"),
        researchNotes: requiredText(outcome.eligibilityReason, "evidence reason"),
      };
      if (record.eligibilityReviewedAt && Date.parse(record.eligibilityReviewedAt) > Date.parse(reviewedAt)) continue;
      if (record.eligibilityReviewedAt === reviewedAt && record.researchOutcomeBatch !== batch)
        throw new Error("Two research outcomes need an explicit latest review.");
      Object.assign(record, fields, { sourceUrls: [...new Set([...record.sourceUrls, ...evidence])] });
    }
  }
  const reviewed = [...records.values()].filter(record => record.eligibility !== undefined);
  return { reviewed: reviewed.length, counts: Object.fromEntries([...eligibility].map(status =>
    [status, reviewed.filter(record => record.eligibility === status).length])) };
}
