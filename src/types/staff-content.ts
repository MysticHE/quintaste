import type { CatalogueHours, CataloguePhoto, CatalogueVenue } from "./catalogue";
import type { MenuItem } from "./menus";

/** content.item: a staff change (origin "edit") over packaged or bot content, or a staff-created item (origin "staff"). Staff wins until cleared. */
export type StaffKind = "place" | "menu" | "recipe" | "event";
export type StaffItem = { kind: StaffKind; id: string; origin: "edit" | "staff"; hidden: boolean; data: Record<string, unknown>; version: number; updated_at: string };
export type StaffContent = { revision: string; catalogueRevision: string; items: ReadonlyMap<string, StaffItem> };

/** Edited place fields; null clears the photo, hours, veg options kitchen or full-menu count. A staff-created place carries every identity field plus sourceUrl. */
export type StaffPlaceData = Partial<Pick<CatalogueVenue, "name" | "branch" | "address" | "postalCode" | "aliases" | "point" | "venueDiet" | "alliumFreeClaim">> & {
  photo?: CataloguePhoto | null; hours?: CatalogueHours | null; kitchen?: "options" | null; menuTotal?: number | null; sourceUrl?: string; base?: string;
};
/** Menu items are keyed "sectionId/itemId". Added dishes appear in one "Added by QuinTaste" section. */
export type StaffMenuEdit = { name?: string; category?: string; price?: MenuItem["price"]; diet?: MenuItem["diet"]; hidden?: boolean };
export type StaffMenuData = { items?: Record<string, StaffMenuEdit>; added?: MenuItem[]; sourceUrl?: string; base?: string };

export const staffKey = (kind: StaffKind, id: string) => kind + ":" + id;
