import type { IconName } from "../components/ui";
import type { MarketKey } from "../i18n/en/market";
import type { ListingKind, MarketLabel, MarketPractice, OrderStatus, ShopCategory } from "../types/community";

/** Category ids are stored values; `label` is the message key that names each one. */
export const shopCategories: { id: ShopCategory; icon: IconName; label: MarketKey }[] = [
  { id: "Bakes", icon: "cafe-outline", label: "categoryBakes" }, { id: "Kueh & sweets", icon: "ice-cream-outline", label: "categoryKueh" },
  { id: "Savoury", icon: "restaurant-outline", label: "categorySavoury" }, { id: "Frozen", icon: "snow-outline", label: "categoryFrozen" },
  { id: "Sauces & pantry", icon: "basket-outline", label: "categoryPantry" }, { id: "Drinks", icon: "water-outline", label: "categoryDrinks" },
];
/** Vegan and Vegetarian come from the ingredient tags; these practices are optional seller declarations on top. */
export const practiceKeys: Record<MarketPractice, MarketKey> = { "no-egg": "practiceNoEgg", "jain": "practiceJain" };
export const practices = Object.keys(practiceKeys) as MarketPractice[];
export const marketLabels: MarketLabel[] = ["Vegan", "Vegetarian"];
/** Food the seller cooks at home, or a sealed item bought from a shop in Singapore. */
export const kindKeys: Record<ListingKind, MarketKey> = { made: "kindMade", prepacked: "kindPrepacked" };
const orderKeys: Record<OrderStatus, MarketKey> = {
  requested: "orderRequested", confirmed: "orderConfirmed", ready: "orderReady", completed: "orderCompleted", declined: "orderDeclined", cancelled: "orderCancelled", no_show: "orderNoShow", disputed: "orderDisputed",
};
/** Sellers see a new order as theirs to act on; buyers see it as waiting. Returns the message key. */
export const orderLabelKey = (status: OrderStatus, role: "buyer" | "seller"): MarketKey => role === "seller" && status === "requested" ? "orderNew" : orderKeys[status];
/** Stored values sent with a problem report; `problemKeys` names them on screen. */
export const problemReasons = ["Wrong diet label", "Made me unwell", "Not as described", "Seller did not turn up", "Other"] as const;
export const problemKeys: Record<typeof problemReasons[number], MarketKey> = {
  "Wrong diet label": "problemWrongLabel", "Made me unwell": "problemUnwell", "Not as described": "problemNotDescribed", "Seller did not turn up": "problemNoShow", "Other": "problemOther",
};
/**
 * Declarations every seller accepts before their shop opens, modelled on the seller duties in Shopee's Terms of Service and
 * Prohibited Items Policy and Carousell's listing rules, plus SFA's guidance for home-based and online food sellers.
 * The wording lives in the Market messages (English and Chinese); bump the version with any wording change, and the server
 * must match. Pending legal review.
 */
export const declarationsVersion = 3;
export const declarationKeys: MarketKey[] = ["declaration1", "declaration2", "declaration3", "declaration4", "declaration5", "declaration6", "declaration7", "declaration8"];
/** Home cooking stays small-scale; the server enforces the same limits. */
export const marketLimits = { perOrder: 10, perSlot: 20 };
