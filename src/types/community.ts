import type { DietLabel } from "../config/diet-labels";
import type { MarketIngredient } from "../config/market-ingredients";
import type { GroupSize, MeetPractice, PayOption } from "./meet";

export type ListingKind = "made" | "prepacked";
/** Stored listing diets. "vegan" and "five-pungent-free" are derived from the ingredient tags (src/utils/market.ts listingLabels). */
export type Diet = "vegan" | "no-egg" | "five-pungent-free" | "jain";
/** What a seller may still declare: practices beyond the Vegan and Vegetarian labels. */
export type MarketPractice = Extract<Diet, "no-egg" | "jain">;
/** Labels buyers can filter by; Plant-Based applies to every Market item. */
export type MarketLabel = Exclude<DietLabel, "Plant-Based">;
export type ShopCategory = "Bakes" | "Kueh & sweets" | "Savoury" | "Frozen" | "Sauces & pantry" | "Drinks";
export type ShopPhotoSlot = "item" | "detail" | "label";
export type SlotMode = "meetup" | "delivery";
export type ListingCard = {
  id: string; name: string; priceCents: number; portion: string; category: ShopCategory; kind: ListingKind; diets: Diet[];
  sellerId: string; sellerName: string; area: string; nextSlot: string | null; leadDays: number; maxPerOrder: number; saved: boolean; photo: string | null;
};
export type Slot = { id: string; starts: string; ends: string; mode: SlotMode; place: string; capacity: number; cutoffHours: number; status: "open" | "closed" | "cancelled"; remaining?: number; booked?: number };
/** What buyers see about a seller: their shop, how they hand over and their order history. QuinTaste doesn't pre-check sellers. */
export type ShopTrust = {
  id: string; tradingName: string; area: string; about: string; meetup: boolean; delivery: boolean; deliveryFeeCents: number; deliveryAreas: string; payCash: boolean; payPaynow: boolean;
  since: string | null; completed: number; ratings: number; rating: number | null;
};
export type ListingDetail = ListingCard & {
  description: string; ingredients: string; contains: MarketIngredient[]; mayContain: MarketIngredient[]; storage: string; dateMark: string | null; lot: string;
  photos: Partial<Record<ShopPhotoSlot, string>>; seller: ShopTrust; own: boolean; slots: Slot[];
};
export type ShopPage = ShopTrust & { own: boolean; items: ListingCard[]; reviews: { rating: number; review: string; dietMatched: boolean | null; at: string }[]; slots: Slot[] };
export type SellerStatus = "draft" | "active" | "suspended" | "removed";
export type SellerProfile = {
  tradingName: string; about: string; area: string; meetup: boolean; delivery: boolean; deliveryFeeCents: number; deliveryAreas: string; payCash: boolean; payPaynow: boolean;
  declarationsVersion: number; status: SellerStatus; statusNote: string; openedAt: string | null;
};
export type SellerState = { seller: SellerProfile | null; declarationsVersion: number };
export type ListingInput = {
  kind: ListingKind; name: string; category: ShopCategory; priceCents: number; portion: string; description: string; ingredients: string;
  contains: MarketIngredient[]; mayContain: MarketIngredient[]; diets: Diet[]; storage: string; dateMark: string | null; lot: string; leadDays: number; maxPerOrder: number;
};
export type OwnListing = ListingInput & { id: string; status: "draft" | "active" | "paused" | "removed"; removedReason: string; updatedAt: string; photos: Partial<Record<ShopPhotoSlot, string>> };
export type OrderStatus = "requested" | "confirmed" | "ready" | "completed" | "declined" | "cancelled" | "no_show" | "disputed";
export type OrderSummary = { id: string; status: OrderStatus; totalCents: number; starts: string; mode: SlotMode; place: string; createdAt: string; summary: string; otherName: string; rating: number };
export type Order = {
  id: string; role: "buyer" | "seller"; status: OrderStatus; statusReason: string; starts: string; ends: string; mode: SlotMode; place: string; address: string; contact: string;
  note: string; payment: "cash" | "paynow"; subtotalCents: number; deliveryFeeCents: number; totalCents: number; rating: number; review: string; dietMatched: boolean | null;
  createdAt: string; completedAt: string | null; cutoffPassed: boolean; seller: { id: string; name: string }; buyer: { name: string }; conversationId: string | null; closed: boolean;
  items: { listingId: string | null; name: string; priceCents: number; quantity: number; dateMark: string | null; lot: string }[];
};
export type ChatMessage = { id: string; senderId: string | null; senderName?: string; kind: "text" | "event"; body: string; createdAt: string; mine: boolean; orderId?: string | null };
export type ConversationSummary = { id: string; sellerId: string; role: "buyer" | "seller"; otherName: string; last: string | null; unread: boolean; updatedAt: string };
export type Conversation = { id: string; role: "buyer" | "seller"; sellerId: string; other: { id: string; name: string }; blocked: boolean;
  openOrders: { id: string; status: OrderStatus; totalCents: number; starts: string }[]; messages: ChatMessage[] };
export type ShopFilter = {
  category: "All" | ShopCategory; sort: "Newest" | "Soonest" | "Lowest first" | "Highest first"; labels: MarketLabel[]; practices: MarketPractice[]; exclude: MarketIngredient[];
  mode: "Any" | SlotMode; kind: "Any" | ListingKind; area: string; savedOnly: boolean; available: boolean;
};
export const defaultShopFilter = (): ShopFilter => ({ category: "All", sort: "Newest", labels: [], practices: [], exclude: [], mode: "Any", kind: "Any", area: "", savedOnly: false, available: false });

export type SocialProfile = {
  firstName: string; area: string; diets: DietLabel[]; practices: MeetPractice[]; times: string[]; size: GroupSize;
  about: string; interests: string[]; excluded: MarketIngredient[]; visible: boolean;
};
export type Person = SocialProfile & { id: string; groupId?: string | null };
export type MemberStatus = "invited" | "accepted" | "declined" | "left";
export type GroupMember = { id: string; name: string; status: MemberStatus; confirmed: boolean; isMe: boolean; diets: DietLabel[] | null; practices: string[] | null; excluded: string[] | null };
export type Group = {
  id: string; size: GroupSize; intro: string; venue: string; starts: string; food: string; pay: PayOption; createdAt: string; createdBy: string;
  myStatus: MemberStatus; members: GroupMember[]; last?: string | null; unread?: boolean; updatedAt?: string; messages?: ChatMessage[];
};
export type Gathering = {
  id: string; title: string; area: string; venue: string; starts: string | null; seats: number; diets: DietLabel[]; food: string; pay: PayOption;
  alcoholFree: boolean; state: "draft" | "posted" | "cancelled"; organiserId: string; organiserName: string; going: number; past: boolean; joined: boolean; mine: boolean;
  attendees?: { id: string; name: string }[];
};
export type GatheringInput = Pick<Gathering, "title" | "area" | "venue" | "seats" | "diets" | "food" | "pay" | "alcoholFree"> & { starts: string };
export type HostApplication = {
  id?: string; kind: "Cooking class" | "Home dining"; name: string; email: string; area: string; experience: string; menu: string; ingredients: string; details: string;
  premises: "HDB flat" | "Private home" | "Commercial kitchen" | ""; capacity: string; halal: "Not halal-certified" | "Halal-certified" | "";
  declarations: string[]; consent: boolean; state?: "draft" | "submitted"; updatedAt?: string;
};
export type Unread = { invitations: number; messages: number };
