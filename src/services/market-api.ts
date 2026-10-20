import { communityRequest as call } from "./community-api";
import type {
  Conversation, ConversationSummary, ListingCard, ListingDetail, ListingInput, Order, OrderSummary, OwnListing, SellerProfile, SellerState, ShopFilter,
  ShopPage, ShopPhotoSlot, Slot, SlotPack,
} from "../types/community";

const sorts: Record<ShopFilter["sort"], string> = { "Newest": "", "Soonest": "soon", "Lowest first": "low", "Highest first": "high" };
export function browseKey(q: string, f: ShopFilter) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (f.category !== "All") params.set("category", f.category);
  if (sorts[f.sort]) params.set("sort", sorts[f.sort]);
  if (f.labels.length) params.set("labels", f.labels.join(","));
  if (f.practices.length) params.set("diets", f.practices.join(","));
  if (f.exclude.length) params.set("exclude", f.exclude.join(","));
  if (f.mode !== "Any") params.set("mode", f.mode);
  if (f.kind !== "Any") params.set("kind", f.kind);
  if (f.area.trim()) params.set("area", f.area.trim());
  if (f.savedOnly) params.set("saved", "1");
  if (f.available) params.set("available", "1");
  return "/api/market/listings?" + params.toString();
}
export const browse = (path: string, signal: AbortSignal) => call<{ items: ListingCard[]; next: number | null }>(path, { signal });
export const listing = (id: string, signal?: AbortSignal) => call<ListingDetail>("/api/market/listings/" + id, { signal });
export const shop = (id: string, signal: AbortSignal) => call<ShopPage>("/api/market/shops/" + id, { signal });
export const toggleSaved = (id: string) => call<{ saved: boolean }>("/api/market/saved/" + id, { method: "POST" });

export type OrderInput = { sellerId: string; slotId: string; items: { listingId: string; quantity: number }[]; address: string; contact: string; note: string; payment: "cash" | "paynow" };
export const placeOrder = (body: OrderInput) => call<{ id: string; conversationId: string }>("/api/market/orders", { method: "POST", body });
export const orders = (role: "buy" | "sell", signal: AbortSignal) => call<{ items: OrderSummary[] }>("/api/market/orders?role=" + role, { signal });
export const order = (id: string, signal: AbortSignal) => call<Order>("/api/market/orders/" + id, { signal });
export type OrderAction = { action: string; reason?: string; rating?: number; review?: string; dietMatched?: boolean; problem?: string; details?: string };
export const orderAction = (id: string, body: OrderAction) => call<{ status: string }>("/api/market/orders/" + id + "/actions", { method: "POST", body });

export const conversations = (signal: AbortSignal) => call<{ items: ConversationSummary[] }>("/api/market/conversations", { signal });
export const conversation = (id: string, signal: AbortSignal) => call<Conversation>("/api/market/conversations/" + id, { signal });
export const openConversation = (sellerId: string) => call<{ id: string }>("/api/market/conversations", { method: "POST", body: { sellerId } });
export const sendMessage = (id: string, text: string) => call("/api/market/conversations/" + id + "/messages", { method: "POST", body: { text } });
export const markRead = (id: string) => call("/api/market/conversations/" + id + "/read", { method: "POST" });
export const unread = (signal: AbortSignal) => call<{ count: number; messages: number; orders: number }>("/api/market/unread", { signal });

export const sellerState = (signal: AbortSignal) => call<SellerState>("/api/market/seller", { signal });
export type SellerInput = Omit<SellerProfile, "declarationsVersion" | "status" | "statusNote" | "openedAt">;
export const saveSeller = (seller: SellerInput) => call<{ seller: SellerProfile }>("/api/market/seller", { method: "PUT", body: { seller } });
/** Opens the shop straight away; the seller accepts the current declarations. */
export const openShop = (declarations: number) => call<{ seller: SellerProfile }>("/api/market/seller/open", { method: "POST", body: { declarations } });
export const ownListings = (signal: AbortSignal) => call<{ items: OwnListing[] }>("/api/market/seller/listings", { signal });
export const ownListing = (id: string, signal: AbortSignal) => call<OwnListing>("/api/market/seller/listings/" + id, { signal });
/** Photos: a data URI replaces a slot, null removes it, a missing slot stays unchanged. */
export type PhotoChanges = Partial<Record<ShopPhotoSlot, string | null>>;
export const saveListing = (id: string | null, body: { listing: ListingInput; photos: PhotoChanges; publish: boolean }) =>
  call<{ id: string }>(id ? "/api/market/seller/listings/" + id : "/api/market/seller/listings", { method: id ? "PUT" : "POST", body });
export const setListingStatus = (id: string, status: "active" | "paused") => call("/api/market/seller/listings/" + id + "/status", { method: "POST", body: { status } });
export const deleteListing = (id: string) => call("/api/market/seller/listings/" + id, { method: "DELETE" });
export const withdrawListing = (id: string, reason: string) => call<{ status: "paused"; notified: number }>("/api/market/seller/listings/" + id + "/withdraw", { method: "POST", body: { reason } });
export const ownSlots = (signal: AbortSignal) => call<{ items: Slot[] }>("/api/market/seller/slots", { signal });
export type SlotInput = { starts: string; ends: string; mode: "meetup" | "delivery"; place: string; capacity: number; cutoffHours: number; repeatWeeks?: number };
export const createSlot = (body: SlotInput) => call<{ id: string; ids: string[] }>("/api/market/seller/slots", { method: "POST", body });
export const slotPack = (id: string, signal: AbortSignal) => call<SlotPack>("/api/market/seller/slots/" + id, { signal });
export const setSlotStatus = (id: string, status: "open" | "closed" | "cancelled") => call("/api/market/seller/slots/" + id + "/status", { method: "POST", body: { status } });
