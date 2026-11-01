import type { DietLabel } from "../config/diet-labels";
import type { MarketIngredient } from "../config/market-ingredients";
import type { Gender, HideableField } from "../config/social-profile";

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
  /** Most units one collection slot takes (null: no item limit); `left` is what the next slot still has; `soldOut` when every open slot is full of it. */
  perSlot: number | null; left: number | null; soldOut: boolean;
};
export type Slot = { id: string; starts: string; ends: string; mode: SlotMode; place: string; capacity: number; cutoffHours: number; status: "open" | "closed" | "cancelled"; remaining?: number; booked?: number;
  /** On an item page: units of that item this slot still takes (null: no item limit). */
  itemLeft?: number | null };
/** What buyers see about a seller: their shop, how they hand over and their order history. QuinTaste doesn't pre-check sellers. */
export type ShopTrust = {
  id: string; tradingName: string; area: string; about: string; meetup: boolean; delivery: boolean; deliveryFeeCents: number; deliveryMinCents: number; deliveryAreas: string; payCash: boolean; payPaynow: boolean;
  since: string | null; completed: number; ratings: number; rating: number | null;
};
export type ListingDetail = ListingCard & {
  description: string; ingredients: string; contains: MarketIngredient[]; mayContain: MarketIngredient[]; storage: string; dateMark: string | null; lot: string;
  photos: Partial<Record<ShopPhotoSlot, string>>; seller: ShopTrust; own: boolean; slots: Slot[];
};
export type ShopPage = ShopTrust & { own: boolean; items: ListingCard[]; reviews: { rating: number; review: string; dietMatched: boolean | null; at: string }[]; slots: Slot[];
  /** Units left of each limited item per slot: stock[slotId][listingId]. */
  stock: Record<string, Record<string, number>> };
export type SellerStatus = "draft" | "active" | "suspended" | "removed";
export type SellerProfile = {
  tradingName: string; about: string; area: string; meetup: boolean; delivery: boolean; deliveryFeeCents: number; deliveryMinCents: number; deliveryAreas: string; payCash: boolean; payPaynow: boolean;
  declarationsVersion: number; status: SellerStatus; statusNote: string; openedAt: string | null;
};
export type SellerState = { seller: SellerProfile | null; declarationsVersion: number };
export type ListingInput = {
  kind: ListingKind; name: string; category: ShopCategory; priceCents: number; portion: string; description: string; ingredients: string;
  contains: MarketIngredient[]; mayContain: MarketIngredient[]; diets: Diet[]; storage: string; dateMark: string | null; lot: string; leadDays: number; maxPerOrder: number;
  perSlot: number | null;
};
export type OwnListing = ListingInput & { id: string; status: "draft" | "active" | "paused" | "removed"; removedReason: string; updatedAt: string; photos: Partial<Record<ShopPhotoSlot, string>> };
/** A seller's collection slot with what to make and every order in it. */
export type SlotPack = {
  slot: Slot; toMake: { key: string; name: string; quantity: number; perSlot: number | null }[];
  orders: { id: string; status: OrderStatus; buyerName: string; totalCents: number; note: string; address: string; summary: string }[];
};
export type OrderStatus = "requested" | "confirmed" | "ready" | "completed" | "declined" | "cancelled" | "no_show" | "disputed";
export type OrderSummary = { id: string; status: OrderStatus; totalCents: number; starts: string; mode: SlotMode; place: string; createdAt: string; summary: string; otherName: string; rating: number };
export type Order = {
  id: string; role: "buyer" | "seller"; status: OrderStatus; statusReason: string; starts: string; ends: string; mode: SlotMode; place: string; address: string; contact: string;
  note: string; payment: "cash" | "paynow"; subtotalCents: number; deliveryFeeCents: number; totalCents: number; rating: number; review: string; dietMatched: boolean | null;
  createdAt: string; completedAt: string | null; cutoffPassed: boolean; seller: { id: string; name: string }; buyer: { name: string }; conversationId: string | null; closed: boolean;
  items: { listingId: string | null; name: string; priceCents: number; quantity: number; dateMark: string | null; lot: string }[];
};
export type ChatMessage = { id: string; senderId: string | null; senderName?: string; kind: "text" | "event"; body: string; createdAt: string; mine: boolean; orderId?: string | null };
/** One Market chat in Messages, with the latest order between the pair (its status, day and first item photo). */
export type ConversationSummary = { id: string; sellerId: string; role: "buyer" | "seller"; otherName: string; context?: string | null; last: string | null; unread: boolean; updatedAt: string;
  orderStatus: OrderStatus | null; orderStarts: string | null; photo: string | null };
export type Conversation = { id: string; role: "buyer" | "seller"; sellerId: string; other: { id: string; name: string }; blocked: boolean;
  openOrders: ChatOrder[]; messages: ChatMessage[] };
/** An open order shown as a card at the top of its chat. */
export type ChatOrder = { id: string; items?: string | null; status: OrderStatus; totalCents: number; starts: string; ends: string; mode: SlotMode; place: string;
  payment: "cash" | "paynow"; photo: string | null };
export type ShopFilter = {
  category: "All" | ShopCategory; sort: "Newest" | "Soonest" | "Lowest first" | "Highest first"; labels: MarketLabel[]; practices: MarketPractice[]; exclude: MarketIngredient[];
  price?: "any" | "under10" | "10to20" | "over20"; collection?: "any" | "today" | "weekend" | "date"; date?: string;
  mode: "Any" | SlotMode; kind: "Any" | ListingKind; area: string; savedOnly: boolean; available: boolean;
};
export const defaultShopFilter = (): ShopFilter => ({ category: "All", sort: "Newest", labels: [], practices: [], exclude: [], mode: "Any", kind: "Any", area: "", savedOnly: false, available: false });

export type ProfilePrompt = { q: string; a: string };
/** The member's own Social profile (server/social/profile.mjs). The birth date never leaves the server except to its owner. */
export type SocialProfile = {
  firstName: string; gender: Gender; birthDate: string | null; area: string; diets: DietLabel[]; excluded: MarketIngredient[];
  /** Up to three catalogue place ids. */
  spots: string[]; about: string; opening: string; visible: boolean;
  religion: string; ethnicity: string; why: string[]; hobbies: string[]; languages: string[]; education: string; work: string; grewUp: string;
  height: number | null; drinking: string; smoking: string; pets: string[]; prompts: ProfilePrompt[]; hidden: HideableField[];
};
/** The first thing still missing on Social: photos, basics, age (under 21: Events only), verify, waiting (staff checking) or ready. */
export type SocialStep = "photos" | "basics" | "age" | "verify" | "waiting" | "ready";
export type Verification = "none" | "pending" | "approved" | "rejected" | "paused";
export type Standing = { step: SocialStep; age: number | null; gender: Gender; verified: boolean; verification: Verification; reason: string; public: boolean;
  pausedUntil: string | null; canMeet: boolean };
export type SocialPhoto = { id: string; position: number; url: string; thumb: string };
/** `handle` is the member's public handle (made from their name on first use), separate from the private sign-in username. */
/** What a member shows from their Collection (docs/COLLECTION_PLAN.md): the border they wear and up to three badges; null while Collection is off. */
export type Worn = { border: string | null; badges: string[] } | null;
export type SocialMe = { id: string; accountName: string; handle: string; hasProfile: boolean; profile: SocialProfile; birthDateFixed?: boolean; photos: SocialPhoto[]; standing: Standing; worn?: Worn };
export type PhotoLink = { url: string; thumb: string };
/** Another member as the server shares them: hidden fields come back empty, the birth date as `age`. */
export type Person = Omit<SocialProfile, "birthDate" | "hidden" | "visible" | "excluded"> & { id: string; age: number | null; photos: PhotoLink[]; km: number | null };
export type PersonPage = Person & { handle: string | null; verified: boolean; friend: boolean; request: { id: string; mine: boolean; note: string } | null; openInvite: boolean; canInvite: boolean; worn?: Worn;
  /** The invite waiting or the confirmed dinner not yet over (until an hour after it starts) between you, one at a time; `openInvite` mirrors it for older builds. */
  dinnerId?: string | null };
/** Another member's posts on their profile (GET /api/social/people/:id?posts=1): recipes, items on sale and classes, plus their friend count. */
export type PersonPosts = { friends: number; recipes: { id: string; name: string; image: string | null }[];
  items: { id: string; name: string; priceCents: number; photo: string | null }[]; classes: { id: string; title: string; starts: string }[] };
/** Their profile page: the person with their posts. */
export type PersonWithPosts = PersonPage & { posts: PersonPosts };
export type LineKind = "text" | "event" | "dinner" | "gift";
/** A gift on a chat line (server/collection/gifts.mjs); null once refunded. */
export type LineGift = { id: string; gift: string; note: string; opened: boolean; liked?: boolean; thanked?: boolean };
export type Friend = { id: string; firstName: string; handle: string | null; area: string; since: string; photo: string | null; verified: boolean; threadId: string | null; updatedAt: string;
  last: { kind: LineKind; body: string; mine: boolean; at: string } | null; unread: number; opposite: boolean; border?: string | null };
export type FriendRequest = { id: string; note: string; createdAt: string; userId: string; firstName: string; handle: string | null; area: string; verified: boolean; photo: string | null };
/** An Add friend search result and how the member stands with them. */
export type HandleMatch = { id: string; handle: string; firstName: string; area: string; verified: boolean; photo: string | null;
  state: "friend" | "sent" | "received" | "none"; requestId: string | null };
export type Friends = { friends: Friend[]; received: FriendRequest[]; sent: FriendRequest[] };
/** Event and dinner lines carry keys (friends, invited, suggested, accepted, declined, cancelled, again) the app words. */
export type ChatLine = { id: string; kind: LineKind; body: string; dinnerId: string | null; mine: boolean; createdAt: string; gift?: LineGift | null };
export const dinnerPays = ["split", "host", "own"] as const;
export type DinnerPay = typeof dinnerPays[number];
export type DinnerStatus = "invited" | "accepted" | "declined" | "cancelled" | "expired";
export type Dinner = { id: string; hosting: boolean; placeId: string; placeName: string; starts: string; pay: DinnerPay; message: string; status: DinnerStatus;
  yourTurn: boolean; suggested: boolean; expiresAt: string; past: boolean; youCancelled: boolean; withId: string; withName: string; photo: string | null; reported: boolean;
  /** Accepted, started and within the 30 days each person can say how it went. */
  reportOpen: boolean };
export type Met = "yes" | "no_show" | "didnt_go";
export type DinnerDetail = Dinner & { mine: { met: Met; eatAgain: boolean | null; note: string } | null; theirNote: string | null; again: boolean };
export type Badges = { requests: number; messages: number; dinners: number };
/** A catalogue place as Social shows it. */
export type SocialPlace = { id: string; name: string; branch: string; address: string; photo: string | null; hours: string; point: { latitude: number; longitude: number } | null };
export type CookingClass = { id: string; title: string; makes: string; starts: string; ends: string; venue: string; area: string; seats: number; priceCents: number;
  diets: DietLabel[]; status: "draft" | "posted" | "cancelled"; taken: number; hosting: boolean; joined: boolean; hidden?: boolean; unread?: number;
  teacher: { id: string; name: string; classes: number } };
export type ClassInput = Pick<CookingClass, "title" | "makes" | "starts" | "ends" | "venue" | "area" | "seats" | "priceCents" | "diets">;
export type TeacherStatus = "pending" | "approved" | "rejected" | "suspended";
export type Teacher = { status: TeacherStatus; displayName: string; area: string; experience: string; teaches: string; reason: string; appliedAt: string; decidedAt: string | null };
export type TeacherApplication = { displayName: string; area: string; experience: string; teaches: string; consent: boolean };
export type ClassLine = { id: string; kind: "text" | "event"; body: string; mine: boolean; createdAt: string };
/** A member's seat in a class; null when they only asked about it. */
export type ClassSeat = "joined" | "left" | "removed";
export type ClassPerson = { id: string; name: string; seat: "joined" | "left" | "removed" | null; joinedAt: string | null; lastMessage: string | null; unread: number };
