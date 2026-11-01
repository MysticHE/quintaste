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
  /** Which stores the server can confirm purchases from (older servers leave it out). */
  stores?: { apple: boolean; google: boolean };
};
/** Collection › Gifts (`GET /api/gifts`): the picker's data plus gifts received and sent. */
export type Gifts = GiftCatalog & {
  received: { id: string; gift: string; note: string; at: string; opened: boolean; liked: boolean; thanked: boolean; fromId: string | null; fromName: string }[];
  sent: { id: string; gift: string; note: string; at: string; opened: boolean; liked: boolean; thanked: boolean;
    /** A like or thank-you you haven't looked at yet, from someone who isn't a friend (friends' come as chat lines). */
    news: boolean; toId: string; toName: string }[];
  receiving: boolean;
};
export const giftsKey = "/api/gifts";
export const loadGifts = (signal: AbortSignal) => call<Gifts>(giftsKey, { signal });
export const giftCatalogKey = giftsKey + "/catalog";
export const loadGiftCatalog = (signal: AbortSignal) => call<GiftCatalog>(giftCatalogKey, { signal });
/** A store purchase's receipt: Apple's transaction id or Google's purchase token. */
export type GiftReceipt = { store: "apple" | "google"; receipt: { transactionId: string } | { purchaseToken: string } };
export const sendGift = (to: string, gift: string, note: string, paid?: GiftReceipt) => call<{ id: string }>(giftsKey, { method: "POST", body: { to, gift, note, ...paid } });
/** The checks before paying for a gift in the store; `product` is its store product id. */
export const checkGift = (to: string, gift: string) => call<{ pay: "free" | "weekly" | "store"; product: string; account: string }>(giftsKey + "/check", { method: "POST", body: { to, gift } });
export const openGift = (id: string) => call<{ ok: boolean }>(giftsKey + "/" + encodeURIComponent(id) + "/open", { method: "POST" });
export const likeGift = (id: string, on: boolean) => call<{ liked: boolean }>(giftsKey + "/" + encodeURIComponent(id) + "/like", { method: "PUT", body: { on } });
export const thankGift = (id: string) => call<{ thanked: boolean }>(giftsKey + "/" + encodeURIComponent(id) + "/thanks", { method: "PUT" });
/** You looked at your sent gifts: their likes and thank-yous stop counting as new. */
export const seeSentGifts = () => call<{ ok: boolean }>(giftsKey + "/sent/seen", { method: "POST" });
export const setReceiving = (on: boolean) => call<{ receiving: boolean }>(giftsKey + "/receiving", { method: "PUT", body: { on } });
/** S$ with two decimals, from cents. */
export const sgd = (cents: number) => (cents / 100).toFixed(2);
