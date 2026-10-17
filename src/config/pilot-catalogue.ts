import type { PilotCluster, PilotReviewStatus } from "../types/pilot-catalogue";
export const pilotClusters: { id: PilotCluster; label: string; short: string }[] = [
  { id: "outram-chinatown", label: "Outram / Chinatown", short: "Outram" },
  { id: "rochor-bugis", label: "Rochor / Bugis", short: "Bugis" },
  { id: "woodlands", label: "Woodlands", short: "Woodlands" },
];
export const pilotReviewLabels: Record<PilotReviewStatus, string> = {
  "source-reviewed": "Sources reviewed", "needs-information": "Needs information", withdrawn: "Withdrawn",
};
export const pilotEvidenceDays = 90;
