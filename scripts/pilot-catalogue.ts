import { pilotCatalogue } from "../src/server/pilot-catalogue";
import { pilotClusters } from "../src/config/pilot-catalogue";
import { sourceAge } from "../src/utils/pilot-evidence";

try {
  const catalogue = pilotCatalogue(), summary = {
    mode: catalogue.mode, checkedAt: catalogue.checkedAt, venues: catalogue.venues.length, menus: catalogue.menus.length,
    dishes: catalogue.dishes.length, sources: catalogue.sources.length, pendingCandidates: catalogue.candidates.length,
    sourceChecksComplete: catalogue.venues.filter(item => item.sourceCheck === "source-checked").length,
    needsInformation: catalogue.venues.filter(item => item.sourceCheck === "needs-information").length,
    staleSources: catalogue.sources.filter(item => sourceAge(item.checkedAt) > 90).map(item => item.id),
    googlePlaceIdsLinked: catalogue.venues.filter(item => item.googlePlaceId !== null).length,
    dishSuitabilityConfirmed: 0, publicationApproved: false,
    clusters: pilotClusters.map(cluster => ({ name: cluster.label,
      venues: catalogue.venues.filter(item => item.clusterId === cluster.id).length,
      dishes: catalogue.dishes.filter(dish => catalogue.venues.some(venue => venue.id === dish.venueId && venue.clusterId === cluster.id)).length })),
  };
  console.info(JSON.stringify(summary, null, 2));
  if (process.argv.includes("--release-check")) {
    console.error("Publication is not approved: local research, branch/place links and release rights still need review.");
    process.exitCode = 2;
  }
} catch {
  console.error("Pilot catalogue validation failed. Check source records and branch references.");
  process.exitCode = 1;
}
