import { communityRequest as call } from "./community-api";

/** Gifts (server/collection/gifts.mjs): paid in the store build; the master account sends them free. */
export type GiftTier = "little" | "sweet" | "grand" | "signature";
/** What the gift picker needs (`GET /api/gifts/catalog`). */
export type GiftCatalog = {
  catalog: { id: string; tier: GiftTier; priceCents: number; burst: number }[];
  /** "free" for the master account; "store" means a store purchase, which needs the store build. */
  sending: "free" | "store";
  /** This week's free gift (the Rose) while it is still unused; null once sent, and for the master account. */
  weekly: string | null;
};
/** Collection › Gifts (`GET /api/gifts`): the picker's data plus gifts received and sent. */
export type Gifts = GiftCatalog & {
  received: { id: string; gift: string; note: string; at: string; opened: boolean; liked: boolean; fromId: string | null; fromName: string }[];
  sent: { id: string; gift: string; note: string; at: string; opened: boolean; liked: boolean; toId: string; toName: string }[];
  receiving: boolean;
};
export const giftsKey = "/api/gifts";
export const loadGifts = (signal: AbortSignal) => call<Gifts>(giftsKey, { signal });
export const giftCatalogKey = giftsKey + "/catalog";
export const loadGiftCatalog = (signal: AbortSignal) => call<GiftCatalog>(giftCatalogKey, { signal });
export const sendGift = (to: string, gift: string, note: string) => call<{ id: string }>(giftsKey, { method: "POST", body: { to, gift, note } });
export const openGift = (id: string) => call<{ ok: boolean }>(giftsKey + "/" + encodeURIComponent(id) + "/open", { method: "POST" });
export const likeGift = (id: string, on: boolean) => call<{ liked: boolean }>(giftsKey + "/" + encodeURIComponent(id) + "/like", { method: "PUT", body: { on } });
export const setReceiving = (on: boolean) => call<{ receiving: boolean }>(giftsKey + "/receiving", { method: "PUT", body: { on } });
/** S$ with two decimals, from cents. */
export const sgd = (cents: number) => (cents / 100).toFixed(2);
