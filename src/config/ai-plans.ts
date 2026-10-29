import { Platform } from "react-native";
import { translate, type Language } from "../i18n";
import type { CookKey } from "../i18n/en/cook";

/**
 * AI Recipes plans (owner decisions, 21 October 2026): AI recipes are paid only, no free tries. Two plans of the one feature,
 * named by size so the terms stay simple: "AI Recipes" is the feature, "AI recipes" are what a plan gives each month.
 * Starter S$9.99 a month for 5, Pro S$24.99 a month for 20. Payments are not connected yet (`paymentsLive` false): the plans
 * and checkout screens show the flow and nothing is charged; the server lets only the master account start a job until then.
 */
export type AiPlanId = "ai-cook" | "ai-cook-pro";
export type AiPlan = { id: AiPlanId; name: string; priceCents: number; recipesPerMonth: number };
// The ids stay as first released (links and future store products); only the names changed.
export const aiPlans: readonly AiPlan[] = [
  { id: "ai-cook", name: "Starter", priceCents: 999, recipesPerMonth: 5 },
  { id: "ai-cook-pro", name: "Pro", priceCents: 2499, recipesPerMonth: 20 },
];
/**
 * What AI recipes include, shown once below the plans (not promised for every recipe: nutrition needs the ingredients to
 * be recognised, badges are earned, and photos need a video). Nutrition wording follows docs/NUTRITION_HEALTH_PLAN.md:
 * figures per serving and claim badges ("High in fibre"), never a score, "healthy" or disease wording.
 */
export const aiRecipeFeatures: readonly { icon: string; label: CookKey; detail: CookKey }[] = [
  { icon: "list-outline", label: "featSteps", detail: "featStepsDetail" },
  { icon: "nutrition-outline", label: "featNutrition", detail: "featNutritionDetail" },
  { icon: "ribbon-outline", label: "featHighlights", detail: "featHighlightsDetail" },
  { icon: "leaf-outline", label: "featDiet", detail: "featDietDetail" },
  { icon: "images-outline", label: "featVideo", detail: "featVideoDetail" },
];
export const paymentsLive = false;
export const aiPlan = (id: unknown) => aiPlans.find(plan => plan.id === id);
export const planPrice = (plan: AiPlan) => "S$" + (plan.priceCents / 100).toFixed(2);
/** The plan's name as shown; `name` stays the English product name. */
export const planName = (plan: AiPlan, language: Language) => translate(language, "cook", plan.id === "ai-cook-pro" ? "planPro" : "planStarter");
/** The plan with the lowest price per recipe, labelled Best Value (the per-recipe figure itself is not shown). */
export const bestValue = aiPlans.reduce((best, plan) => plan.priceCents / plan.recipesPerMonth < best.priceCents / best.recipesPerMonth ? plan : best).id;
/** Apple's standard subscription terms apply on iOS; the owner's own Terms of Use page is still needed for Android and the web. */
export const termsUrl = Platform.OS === "ios" ? "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" : null;
/** Phone apps sell digital subscriptions through the store (Apple and Google rules); the web takes a card. */
const store = Platform.OS === "ios" ? "App Store" : Platform.OS === "android" ? "Google Play" : null;
export const paymentChannel = (language: Language) => store ?? translate(language, "cook", "payCard");
export const cancelWhere = (language: Language) => store ? translate(language, "cook", "cancelStore", { store }) : translate(language, "cook", "cancelInApp");
