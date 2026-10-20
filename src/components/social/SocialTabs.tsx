import type { IconTab } from "../BrowseControls";
export type SocialSection = "nearby" | "people" | "tables" | "plans";
/** Social sections in tab order; labels are read by screen readers. */
export const socialTabs: readonly IconTab<SocialSection>[] = [
  { id: "nearby", label: "Nearby", icon: "location-outline", activeIcon: "location" },
  { id: "people", label: "People", icon: "people-outline", activeIcon: "people" },
  { id: "tables", label: "Tables", icon: "restaurant-outline", activeIcon: "restaurant" },
  { id: "plans", label: "My plans", icon: "calendar-outline", activeIcon: "calendar" },
];
/** Links from before 20 Oct 2026: Events is now Tables and the Areas map lives in Nearby. */
export function readSection(tab: string | undefined): SocialSection {
  if (tab === "events") return "tables";
  if (tab === "areas") return "nearby";
  return tab === "people" || tab === "tables" || tab === "plans" ? tab : "nearby";
}
