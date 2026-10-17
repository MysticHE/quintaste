import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { isRecord, readResearchJson, validPlaceId, validSourceUrl } from "./menu-research-files";
import type { MenuCoverageRecord, MenuCoverageStatus } from "./menu-research-types";

const statuses = new Set<MenuCoverageStatus>(["source-covered", "partial", "menu-pending", "menu-unavailable", "held"]);
const texts = (value: unknown): value is string[] => Array.isArray(value)
  && value.every(item => typeof item === "string" && item.trim().length > 0);
export type ReviewedMenuIdentity = { placeId: string; fingerprint: string };

function branchFingerprint(row: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify([
    row.dataset, row.branchId, row.name, row.address, [...row.sourceUrls as string[]].sort(),
  ])).digest("hex");
}

function placeEvidence(url: unknown, placeId: string): url is string {
  if (!validSourceUrl(url)) return false;
  const parsed = new URL(url);
  return parsed.protocol === "https:" && parsed.hostname === "www.google.com"
    && parsed.pathname === "/maps/search/" && parsed.searchParams.get("api") === "1"
    && parsed.searchParams.get("query_place_id") === placeId;
}

export async function applyMenuIdentityReviews(root: string, records: Map<string, MenuCoverageRecord>,
  identities?: Map<string, ReviewedMenuIdentity>) {
  const value = await readResearchJson(resolve(root, "venue-menu-identity-reviews.json"), true);
  if (value === undefined) return 0;
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.reviews) || value.reviews.length > records.size)
    throw new Error("Invalid explicit venue identity review file.");
  const index = await readResearchJson(resolve(root, "menu-collection-index.json"));
  if (!isRecord(index) || index.version !== 1 || !Array.isArray(index.records)) throw new Error("Research index is required for identity review.");
  const seenIds = new Set<string>(), seenBranches = new Set<string>();
  let applied = 0;
  for (const review of value.reviews) {
    if (!isRecord(review) || review.reviewStatus !== "approved" || !validPlaceId(review.placeId)
      || !records.has(review.placeId) || seenIds.has(review.placeId)
      || typeof review.dataset !== "string" || typeof review.branchId !== "string"
      || typeof review.name !== "string" || typeof review.address !== "string"
      || typeof review.reviewedAt !== "string" || !Number.isFinite(Date.parse(review.reviewedAt))
      || !placeEvidence(review.placeIdentityEvidenceUrl, review.placeId)
      || !texts(review.independentSourceUrls) || review.independentSourceUrls.length < 1
      || review.independentSourceUrls.some(url => !validSourceUrl(url) || /(^|\.)google\.com$/i.test(new URL(url).hostname)))
      throw new Error("Identity review needs a unique stored ID, explicit approval and independent branch evidence.");
    const branchKey = JSON.stringify([review.dataset, review.branchId]);
    if (seenBranches.has(branchKey)) throw new Error("Duplicate branch identity assignment needs a separate duplicate-ID review.");
    const matches = index.records.filter(row => isRecord(row) && row.dataset === review.dataset && row.branchId === review.branchId);
    if (matches.length !== 1 || !isRecord(matches[0])) throw new Error("Reviewed branch must resolve to exactly one research record.");
    const row = matches[0];
    if (row.name !== review.name || row.address !== review.address || !texts(row.sourceUrls)
      || row.sourceUrls.some(url => !validSourceUrl(url))
      || review.independentSourceUrls.some(url => !(row.sourceUrls as string[]).includes(url))
      || branchFingerprint(row) !== review.branchFingerprint
      || typeof row.coverage !== "string" || !statuses.has(row.coverage as MenuCoverageStatus)
      || !Number.isSafeInteger(row.foodRows) || Number(row.foodRows) < 0
      || !texts(row.menuIds) || !texts(row.menuPublication) || !texts(row.gaps))
      throw new Error("Reviewed identity or research evidence changed; renew the explicit branch review.");
    const record = records.get(review.placeId)!;
    Object.assign(record, {
      status: row.coverage, name: row.name, address: row.address, menuRows: row.foodRows,
      sourceMenuIds: [...row.menuIds], menuPublication: [...row.menuPublication],
      identityReviewedAt: review.reviewedAt,
      identityEvidenceUrls: [...new Set([...review.independentSourceUrls, review.placeIdentityEvidenceUrl])],
      researchDataset: review.dataset, researchBranchId: review.branchId,
      sourceUrls: [...new Set([...row.sourceUrls, review.placeIdentityEvidenceUrl])],
      gaps: [...row.gaps, "Reviewed branch identity and inspected-source coverage only; food rows may overlap and do not certify current stock, ingredients or app publication."],
    });
    seenIds.add(review.placeId);
    seenBranches.add(branchKey);
    identities?.set(branchKey, { placeId: review.placeId,
      fingerprint: createHash("sha256").update(JSON.stringify(review)).digest("hex") });
    applied += 1;
  }
  return applied;
}

export async function reviewedMenuPlaceIds(root: string) {
  const directory = await readResearchJson(resolve(root, "../singapore-vegetarian-place-ids.json"));
  if (!isRecord(directory) || directory.version !== 1 || directory.country !== "SG" || !Array.isArray(directory.records))
    throw new Error("Saved place directory is required for public identity mappings.");
  const records = new Map<string, MenuCoverageRecord>();
  for (const row of directory.records) {
    if (!isRecord(row) || !validPlaceId(row.placeId) || records.has(row.placeId))
      throw new Error("Invalid or duplicate saved place identity.");
    records.set(row.placeId, { placeId: row.placeId, status: "identity-pending", leadIds: [],
      candidateNames: [], candidateAddresses: [], menuRows: 0, sourceUrls: [], gaps: [] });
  }
  const identities = new Map<string, ReviewedMenuIdentity>();
  await applyMenuIdentityReviews(root, records, identities);
  return identities;
}
