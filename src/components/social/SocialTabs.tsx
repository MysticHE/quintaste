import type { IconTab } from "../BrowseControls";
export type SocialSection = "people" | "events" | "areas" | "plans";
/** Social sections in tab order; labels are read by screen readers. */
export const socialTabs: readonly IconTab<SocialSection>[] = [
  { id: "people", label: "People", icon: "people-outline", activeIcon: "people" },
  { id: "events", label: "Events", icon: "calendar-outline", activeIcon: "calendar" },
  { id: "areas", label: "Areas", icon: "map-outline", activeIcon: "map" },
  { id: "plans", label: "My plans", icon: "checkmark-done-circle-outline", activeIcon: "checkmark-done-circle" },
];
