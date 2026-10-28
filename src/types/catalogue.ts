import type { MenuItem, MenuSummary } from "./menus";
import type { SearchPoint } from "./location-search";

export type CataloguePhoto = {
  path: string; width: number; height: number; author: string;
  sourceUrl: string; license: string; licenseUrl: string | null;
  capturedAt: string | null; checkedAt: string; changes: string;
  provider?: "Google Maps";
  /** Base64 ThumbHash of the photo, drawn as a soft preview while the photo loads (packaged photos only). */
  thumbhash?: string;
};

export type CatalogueHours = {
  summary: string;
  schedule: string[];
  notes: string;
  sourceUrl: string;
  checkedAt: string;
  timezone: "Asia/Singapore";
};

export type CatalogueVenue = MenuSummary & {
  point: SearchPoint | null;
  distanceKm?: number;
  venueDiet: "Vegetarian" | "Vegan";
  alliumFreeClaim: boolean;
  /** "options": not a vegetarian kitchen; only its venue-labelled vegetarian/vegan dishes are published. Absent: fully vegetarian/vegan. */
  kitchen?: "options";
  /** Dishes on the venue's full menu, when known ("6 of 38"). */
  menuTotal?: number;
  photo?: CataloguePhoto;
  hours?: CatalogueHours;
  research?: { sourceUrls: string[]; notes: string[]; checkedAt: string };
  /** The dish that matched a keyword search, which the card shows. */
  match?: Pick<MenuItem, "name" | "price">;
  /** How many dishes on the menu matched the keyword, when more than the one shown. */
  matchCount?: number;
  /** Typical dish price in whole SGD: the middle half of priced dishes (25th to 75th percentile), from three priced dishes up. */
  priceRange?: { low: number; high: number };
};
export type CataloguePage = {
  version: 1;
  revision: string;
  venues: CatalogueVenue[];
  nextCursor: string | null;
  total: number;
  locationGaps: number;
};
