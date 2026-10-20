import type { IconName } from "../components/ui";
import type { ListingKind, MarketLabel, MarketPractice, OrderStatus, ShopCategory } from "../types/community";

export const shopCategories: { id: ShopCategory; icon: IconName }[] = [
  { id: "Bakes", icon: "cafe-outline" }, { id: "Kueh & sweets", icon: "ice-cream-outline" }, { id: "Savoury", icon: "restaurant-outline" },
  { id: "Frozen", icon: "snow-outline" }, { id: "Sauces & pantry", icon: "basket-outline" }, { id: "Drinks", icon: "water-outline" },
];
/** Vegan and Vegetarian come from the ingredient tags; these practices are optional seller declarations on top. */
export const practiceLabels: Record<MarketPractice, string> = { "no-egg": "No egg", "jain": "Jain" };
export const practices = Object.keys(practiceLabels) as MarketPractice[];
export const marketLabels: MarketLabel[] = ["Vegan", "Vegetarian"];
/** Food the seller cooks at home, or a sealed item bought from a shop in Singapore. */
export const kindLabels: Record<ListingKind, string> = { made: "Home-cooked", prepacked: "Sealed pack" };
export const orderLabels: Record<OrderStatus, string> = {
  requested: "Waiting for seller", confirmed: "Confirmed", ready: "Ready", completed: "Collected", declined: "Declined", cancelled: "Cancelled", no_show: "Not collected", disputed: "Problem reported",
};
/** Sellers see a new order as theirs to act on; buyers see it as waiting. */
export const orderLabel = (status: OrderStatus, role: "buyer" | "seller") => role === "seller" && status === "requested" ? "New order" : orderLabels[status];
export const problemReasons = ["Wrong diet label", "Made me unwell", "Not as described", "Seller did not turn up", "Other"] as const;
/**
 * Declarations every seller accepts before their shop opens, modelled on the seller duties in Shopee's Terms of Service and
 * Prohibited Items Policy and Carousell's listing rules, plus SFA's guidance for home-based and online food sellers.
 * Bump the version with any wording change; the server must match. Pending legal review.
 */
export const declarationsVersion = 3;
export const declarations = [
  "I sell as myself, with one QuinTaste account. Each sale is between me and my buyer; QuinTaste only connects us and doesn't take payment.",
  "Before I list anything, I make sure it is legal to sell in Singapore and follows the Market rules.",
  "Food I cook is made in my own home, in small quantities, following SFA's food safety and hygiene guidelines. I don't take catering, group or wholesale orders.",
  "Sealed packs are unopened, within their date mark and bought from shops in Singapore, never brought in from overseas. I show the date mark and lot from the pack.",
  "My photos and descriptions show the actual item, and I list every ingredient and allergen truthfully. Diet tags are my own declaration.",
  "I pack and keep food safely, at the right temperature, until I hand it over.",
  "I don't sell alcohol, supplements, raw seafood or raw milk, and I keep phone numbers, links and payment details out of listings and chat.",
  "I'm responsible for the food I sell and for any refund I agree with a buyer. If SFA tells me to stop selling or recall an item, I will, and I'll tell my buyers. QuinTaste doesn't check sellers or their food, and may remove my items or suspend my shop.",
];
/** Home cooking stays small-scale; the server enforces the same limits. */
export const marketLimits = { perOrder: 10, perSlot: 20 };
