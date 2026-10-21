import { Platform } from "react-native";

/**
 * AI Recipes plans (owner decision, 21 October 2026): the AI features on Cook (describe a dish, import a video link, upload a
 * video) are paid. Owner confirmed two tiers on 21 October 2026: AI Cook S$9.99 a month for 5 recipes and AI Cook Pro
 * S$24.99 a month for 20. Payments are not connected yet, so `paymentsLive` is false: the plans and checkout screens show
 * the flow, nothing is charged, and AI recipes stay usable under the existing 3-a-day limit.
 */
export type AiPlanId = "ai-cook" | "ai-cook-pro";
export type AiPlan = { id: AiPlanId; name: string; priceCents: number; recipesPerMonth: number };
export const aiPlans: readonly AiPlan[] = [
  { id: "ai-cook", name: "AI Cook", priceCents: 999, recipesPerMonth: 5 },
  { id: "ai-cook-pro", name: "AI Cook Pro", priceCents: 2499, recipesPerMonth: 20 },
];
/** What every plan includes, in as few words as possible (owner: clean, no platform names). */
export const aiPlanBenefits = [
  { icon: "restaurant-outline", label: "Any dish" },
  { icon: "videocam-outline", label: "From videos" },
  { icon: "nutrition-outline", label: "Nutrition" },
] as const;
export const paymentsLive = false;
export const aiPlan = (id: unknown) => aiPlans.find(plan => plan.id === id);
export const planPrice = (plan: AiPlan) => "S$" + (plan.priceCents / 100).toFixed(2);
/** The plan with the lowest price per recipe, labelled Best Value (the per-recipe figure itself is not shown). */
export const bestValue = aiPlans.reduce((best, plan) => plan.priceCents / plan.recipesPerMonth < best.priceCents / best.recipesPerMonth ? plan : best).id;
/** Apple's standard subscription terms apply on iOS; the owner's own Terms of Use page is still needed for Android and the web. */
export const termsUrl = Platform.OS === "ios" ? "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" : null;
/** Phone apps sell digital subscriptions through the store (Apple and Google rules); the web takes a card. */
export const paymentChannel = Platform.OS === "ios" ? "App Store" : Platform.OS === "android" ? "Google Play" : "Card";
export const cancelWhere = Platform.OS === "ios" ? "App Store settings" : Platform.OS === "android" ? "Google Play settings" : "Me > AI Recipes Plan";
