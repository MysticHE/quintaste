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
export const aiPlanFeatures = ["Describe a dish", "Import a video link", "Upload a video"] as const;
export const paymentsLive = false;
export const aiPlan = (id: unknown) => aiPlans.find(plan => plan.id === id);
export const planPrice = (plan: AiPlan) => "S$" + (plan.priceCents / 100).toFixed(2);
/** Phone apps sell digital subscriptions through the store (Apple and Google rules); the web takes a card. */
export const paymentChannel = Platform.OS === "ios" ? "App Store" : Platform.OS === "android" ? "Google Play" : "Card";
export const cancelWhere = Platform.OS === "ios" ? "App Store settings" : Platform.OS === "android" ? "Google Play settings" : "Me > AI Recipes Plan";
