import AsyncStorage from "@react-native-async-storage/async-storage";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import { sendGift } from "./gifts-api";
import { ApiError } from "./community-api";
import type { BuyResult, GiftOrder, StoreName } from "./gift-store";

export type { BuyResult, GiftOrder, StoreName } from "./gift-store";

/**
 * The App Store and Google Play through expo-iap (openiap.dev). A purchase is sent to the server with its receipt; only once
 * the server has sent the gift is the purchase finished (consumed), so a gift is never lost: if the app closes in between,
 * or the payment is still pending, the order kept on the phone sends it when the store reports the purchase again (a
 * listener stays on while orders wait, and getAvailablePurchases is asked at launch). A purchase the server refuses for
 * good is left unfinished, so Google refunds it after three days; Apple has no such refund, so the member is sent to Apple.
 * Each purchase carries the member's account tag from the server, so its receipt only works for them. expo-iap loads only
 * when used, as Expo Go has no store module.
 */
type Iap = typeof import("expo-iap");
type Purchase = import("expo-iap").Purchase;
const ordersKey = "@quintaste/gift-orders";
let iap: Promise<Iap> | null = null, connected: Promise<unknown> | null = null, listening = false;
/** Products a buyGift call is waiting on; the background listener leaves those to it. */
const buying = new Set<string>();
const load = () => (iap ??= import("expo-iap"));
async function ready() {
  const module = await load();
  connected ??= module.initConnection().catch(error => { connected = null; throw error; });
  await connected;
  return module;
}
export const giftStore = (): StoreName | null => isRunningInExpoGo() ? null : Platform.OS === "ios" ? "apple" : Platform.OS === "android" ? "google" : null;

async function orders(): Promise<Record<string, GiftOrder>> {
  try { return JSON.parse((await AsyncStorage.getItem(ordersKey)) ?? "{}"); } catch { return {}; }
}
async function keepOrder(product: string, order: GiftOrder | null) {
  const all = await orders();
  if (order) all[product] = order; else delete all[product];
  await AsyncStorage.setItem(ordersKey, JSON.stringify(all));
}
const receiptOf = (purchase: Purchase) => Platform.OS === "ios" ? { transactionId: purchase.transactionId ?? purchase.id } : { purchaseToken: purchase.purchaseToken ?? "" };

/**
 * Sends the gift for a purchase, then finishes it in the store. "sent" also when only the finishing failed (the order stays,
 * so the next launch finishes it; the server answers a repeated receipt with the same gift). "pending" while the store is
 * still taking the payment; "refused" when the server won't send it (the order is dropped); "failed" to try again later.
 */
async function complete(module: Iap, purchase: Purchase, order: GiftOrder): Promise<BuyResult> {
  const store = giftStore();
  if (!store) return "failed";
  if (purchase.purchaseState === "pending") return "pending";
  try { await sendGift(order.to, order.gift, order.note, { store, receipt: receiptOf(purchase) }); }
  catch (failure) {
    if (failure instanceof ApiError && failure.status < 500 && failure.status !== 429 && failure.status !== 401) {
      await keepOrder(purchase.productId, null);
      return "refused";
    }
    return "failed";
  }
  try {
    await module.finishTransaction({ purchase, isConsumable: true });
    await keepOrder(purchase.productId, null);
  } catch { /* Sent; finishing is retried at the next launch. */ }
  return "sent";
}

/** While orders wait, purchases the store reports later (a pending payment completing, an iOS replay) are sent here. */
function listen(module: Iap) {
  if (listening) return;
  listening = true;
  module.purchaseUpdatedListener(async purchase => {
    if (buying.has(purchase.productId)) return;
    const order = (await orders())[purchase.productId];
    if (order) await complete(module, purchase, order).catch(() => undefined);
  });
}

export async function buyGift(order: GiftOrder, product: string, account: string): Promise<BuyResult> {
  const module = await ready();
  listen(module);
  const found = await module.fetchProducts({ skus: [product], type: "in-app" });
  if (!found?.length) return "failed";
  await keepOrder(product, order);
  buying.add(product);
  try {
    const purchase = await new Promise<Purchase | null>((resolve, reject) => {
      const done = () => { bought.remove(); failed.remove(); };
      const bought = module.purchaseUpdatedListener(p => { if (p.productId === product) { done(); resolve(p); } });
      const failed = module.purchaseErrorListener(error => { done(); if (module.isUserCancelledError(error)) resolve(null); else reject(error); });
      module.requestPurchase({ type: "in-app", request: {
        apple: { sku: product, appAccountToken: account }, google: { skus: [product], obfuscatedAccountId: account } } }).catch(error => { done(); reject(error); });
    }).catch(() => undefined);
    if (purchase === null) { await keepOrder(product, null); return "cancelled"; }
    if (!purchase) return "failed";
    return await complete(module, purchase, order);
  } finally { buying.delete(product); }
}

export async function resumeGiftPurchases() {
  if (!giftStore()) return;
  const waiting = await orders();
  if (!Object.keys(waiting).length) return;
  const module = await ready();
  // The listener first: on iOS, unfinished purchases arrive through it once the connection is up.
  listen(module);
  for (const purchase of await module.getAvailablePurchases({ onlyIncludeActiveItemsIOS: false, alsoPublishToEventListenerIOS: false })) {
    const order = waiting[purchase.productId];
    if (order && !buying.has(purchase.productId)) await complete(module, purchase, order).catch(() => undefined);
  }
}
