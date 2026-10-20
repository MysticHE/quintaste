import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import coordinates from "../data/menus/catalogue-locations.json";
import pilot from "../data/pilot/catalogue.json";
import publication from "../data/menus/research-publication.json";
import photos from "../data/menus/catalogue-photos.json";
import hours from "../data/menus/catalogue-hours.json";
import { publishedMenuIndex } from "../src/server/menu-delivery";
import { researchMenuPackets } from "../src/server/research-menu-packets";
import type { CatalogueVenue } from "../src/types/catalogue";
import { inSingapore } from "../src/utils/discovery-search";
import { readCatalogueVenue } from "../src/utils/catalogue-page";

async function main() {
  if (new Set(hours.entries.map(entry => entry.venueId)).size !== hours.entries.length) throw new Error("Duplicate hours branch");
  for (const entry of hours.entries) {
    if (!publishedMenuIndex().venues.some(venue => venue.id === entry.venueId && venue.address === entry.address)) throw new Error("Hours branch mismatch");
  }
  if (new Set(photos.entries.map(entry => entry.venueId)).size !== photos.entries.length) throw new Error("Duplicate photo branch");
  for (const entry of photos.entries) {
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || entry.photo.path !== `/api/catalogue-photos/${entry.sha256}.jpg`) throw new Error("Invalid photo asset path");
    const bytes = await readFile(`server-assets/catalogue/${entry.sha256}.jpg`);
    if (bytes.length !== entry.bytes || bytes.length > 512 * 1024 || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error("Photo asset integrity mismatch");
    if (!publishedMenuIndex().venues.some(venue => venue.id === entry.venueId && venue.address === entry.address)) throw new Error("Photo branch mismatch");
  }
  const points = new Map(coordinates.entries.map(entry => [entry.id, entry]));
  const venues: CatalogueVenue[] = publishedMenuIndex().venues.map(summary => {
    const review = publication.entries.find(entry => "research-" + entry.branchId === summary.id);
    const packet = review ? researchMenuPackets[review.dataset] as { branches: Record<string, unknown>[] } : undefined;
    const branch = review ? packet?.branches.find(branch => branch.id === review.branchId)
      : pilot.venues.find(branch => branch.id === summary.id) as Record<string, unknown> | undefined;
    const claims = Array.isArray(branch?.claims) ? branch.claims as { kind?: string; wholeVenue?: boolean }[] : [];
    const eligibility = branch?.venueEligibility as { status?: string } | undefined;
    const vegan = branch?.eligibility === "vegan-confirmed" || eligibility?.status === "vegan-confirmed"
      || claims.some(claim => claim.kind === "vegan" && claim.wholeVenue === true);
    const alliumFree = claims.some(claim => claim.kind === "no-alliums" || claim.kind === "no-onion-garlic" || claim.kind === "no-onion-no-garlic");
    const entry = points.get(summary.id), point = entry?.point;
    const valid = entry?.address === summary.address && entry?.postalCode === summary.postalCode && point && inSingapore(point);
    const photo = photos.entries.find(entry => entry.venueId === summary.id && entry.address === summary.address)?.photo;
    const schedule = hours.entries.find(entry => entry.venueId === summary.id && entry.address === summary.address)?.hours;
    return readCatalogueVenue({ ...summary, point: valid ? point : null, venueDiet: vegan ? "Vegan" : "Vegetarian", alliumFreeClaim: alliumFree, ...(photo ? { photo } : {}), ...(schedule ? { hours: schedule } : {}) });
  });
  const revision = createHash("sha256").update(JSON.stringify(venues)).digest("hex");
  const data = JSON.stringify({ version: 1, revision, venues }) + "\n", file = "data/menus/catalogue-index.json";
  if (process.argv[2] === "--check") {
    if (await readFile(file, "utf8") !== data) throw new Error("Venue catalogue needs regeneration after reviewed menu changes");
  } else if (process.argv[2] === "--write") await writeFile(file, data, "utf8");
  else throw new Error("Use --write or --check");
  console.log(JSON.stringify({ action: process.argv[2], venues: venues.length, located: venues.filter(v => v.point).length, bytes: Buffer.byteLength(data), revision }));
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
