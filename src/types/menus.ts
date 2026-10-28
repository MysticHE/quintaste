import type { PilotDish, PilotMenu } from "./pilot-catalogue";
import type { CataloguePhoto } from "./catalogue";

export type MenuItem = Pick<PilotDish, "id" | "name" | "category"> & {
  price: PilotDish["price"] & { maxAmount?: number };
  qualifier: string;
  photo?: CataloguePhoto | null;
  availability?: string;
  details?: string[];
  /** The venue's own label; required on every dish of a veg options place. */
  diet?: "V" | "VG";
};
export type PublishedMenu = {
  id: string;
  name: string;
  branch: string;
  address: string;
  postalCode: string;
  aliases: string[];
  googlePlaceId: string | null;
  sections: {
    id: string;
    title?: string;
    itemNotice?: string;
    scope: PilotMenu["scope"];
    coverage?: PilotMenu["coverage"];
    checkedAt: string;
    sourceUrl: string;
    sourceLabel: string;
    notice: string;
    charges: string;
    items: MenuItem[];
  }[];
};
export type MenuCatalogue = { version: 1; generatedAt: number; venues: PublishedMenu[] };
export type MenuSummary = Omit<PublishedMenu, "sections"> & {
  fingerprint: string;
  checkedAt: string;
  sectionCount: number;
  itemCount: number;
};
export type MenuIndex = { version: 2; generatedAt: number; venues: MenuSummary[] };
export type MenuDetail = MenuCatalogue & { fingerprint: string };
