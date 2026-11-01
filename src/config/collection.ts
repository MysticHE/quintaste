import { COLLECTION_ART, type CollectionArt } from "./collection-art";

/**
 * Collection items (owner decisions, 1 Nov 2026; docs/COLLECTION_PLAN.md). The list, prices and tasks come from the server
 * (server/collection/catalog.mjs); the app only needs the art (collection-art.ts) and the names (src/i18n, collection).
 */
export type Rarity = "common" | "rare" | "epic" | "legend";
export type BadgeTier = "bronze" | "silver" | "gold" | "mythic";

export const borderArt = (id: string): CollectionArt | undefined => COLLECTION_ART["border-" + id];
export const badgeArt = (id: string): CollectionArt | undefined => COLLECTION_ART["badge-" + id];
export const giftArt = (id: string): CollectionArt | undefined => COLLECTION_ART["gift-" + id];
/** Most badges a member shows on their profile (server SHOWN_MAX). */
export const SHOWN_MAX = 3;
