/**
 * Buying a paid gift in the App Store or Google Play (server/collection/stores.mjs confirms each purchase). The web and Expo
 * Go have no store; the phone version is gift-store.native.ts.
 */
export type StoreName = "apple" | "google";
export type GiftOrder = { to: string; gift: string; note: string };
/** The store this build buys from, or null (web, Expo Go). */
export const giftStore = (): StoreName | null => null;
/**
 * "sent"; "pending" (the store is still taking the payment; the gift goes once it completes); "refused" (the server won't
 * send it, so the purchase is left to be refunded); "cancelled" (the member closed the store sheet); "failed" (try later).
 */
export type BuyResult = "sent" | "pending" | "refused" | "cancelled" | "failed";
/** `account` is the member's account tag from the server (POST /api/gifts/check), which ties the receipt to them. */
export async function buyGift(_order: GiftOrder, _product: string, _account: string): Promise<BuyResult> { return "failed"; }
/** Sends gifts bought while the app closed before they went (their order was kept on the phone). */
export async function resumeGiftPurchases(): Promise<void> { /* No store on the web. */ }
