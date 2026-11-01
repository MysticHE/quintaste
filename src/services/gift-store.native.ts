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
 * the order kept on the phone sends it next time (iOS repeats unfinished purchases; Google refunds one left unfinished for
 * three days). expo-iap loads only when used, as Expo Go has no store module.
 */
type Iap = typeof import("expo-iap");
type Purchase = import("expo-iap").Purchase;
const ordersKey = "@quintaste/gift-orders";
let iap: Promise<Iap> | null = null, connected: Promise<unknown> | null = null;
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
/** Sends the gift for a purchase, then finishes it in the store. A refused gift (blocked meanwhile) stays unfinished. */
async function complete(module: Iap, purchase: Purchase, order: GiftOrder) {
  const store = giftStore();
  if (!store) return false;
  try { await sendGift(order.to, order.gift, order.note, { store, receipt: receiptOf(purchase) }); }
  catch (failure) {
    // Refused for good (the person became unavailable): the order is dropped and Google refunds the purchase in 3 days.
    if (failure instanceof ApiError && failure.status < 500 && failure.status !== 429) await keepOrder(purchase.productId, null);
    return false;
  }
  await module.finishTransaction({ purchase, isConsumable: true });
  await keepOrder(purchase.productId, null);
  return true;
}

export async function buyGift(order: GiftOrder, product: string): Promise<BuyResult> {
  const module = await ready();
  const found = await module.fetchProducts({ skus: [product], type: "in-app" });
  if (!found?.length) return "failed";
  await keepOrder(product, order);
  const purchase = await new Promise<Purchase | null>((resolve, reject) => {
    const done = () => { bought.remove(); failed.remove(); };
    const bought = module.purchaseUpdatedListener(p => { if (p.productId === product) { done(); resolve(p); } });
    const failed = module.purchaseErrorListener(error => { done(); if (module.isUserCancelledError(error)) resolve(null); else reject(error); });
    module.requestPurchase({ request: { apple: { sku: product }, google: { skus: [product] } }, type: "in-app" }).catch(error => { done(); reject(error); });
  }).catch(() => undefined);
  if (purchase === null) { await keepOrder(product, null); return "cancelled"; }
  if (!purchase) return "failed";
  return await complete(module, purchase, order) ? "sent" : "failed";
}

export async function resumeGiftPurchases() {
  if (!giftStore()) return;
  const waiting = await orders();
  if (!Object.keys(waiting).length) return;
  const module = await ready();
  for (const purchase of await module.getAvailablePurchases()) {
    const order = waiting[purchase.productId];
    if (order) await complete(module, purchase, order).catch(() => undefined);
  }
}
