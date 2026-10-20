import type { MarketIngredient } from "../config/market-ingredients";
import { readLabels, type DietLabel } from "../config/diet-labels";
export const groupSizes = [2, 4, 6] as const;
export type GroupSize = typeof groupSizes[number];
export const meetTimes = ["Weekday lunch", "Weekday dinner", "Weekends"] as const;
/** Self-declared dietary practice shown to tablemates; never verified. No five pungent is now the Vegetarian label. */
export const meetPractices = ["No egg", "Lunar 1st & 15th"] as const;
export type MeetPractice = typeof meetPractices[number];
/** A practice before 20 Oct 2026, folded into the Vegetarian label. The server still sends it for older apps; screens hide it. */
export const legacyFivePungent = "No five pungent";
export const shownPractices = (practices: readonly string[]) => practices.filter(practice => practice !== legacyFivePungent);
/** Labels a person keeps: Plant-Based alone, or Vegan and/or Vegetarian (src/config/diet-labels.ts). */
export const keptLabels = (value: unknown): DietLabel[] => {
  const strict = readLabels(value).filter(label => label !== "Plant-Based");
  return strict.length ? strict : ["Plant-Based"];
};
/** Labels from the single diet kept before 20 Oct 2026: Vegan stays Vegan, old Vegetarian (eggs and dairy) is Plant-Based, No five pungent adds Vegetarian. */
export function legacyLabels(diet: unknown, practices: unknown): DietLabel[] {
  const pungentFree = Array.isArray(practices) && practices.includes(legacyFivePungent);
  return diet === "Vegan" ? (pungentFree ? ["Vegan", "Vegetarian"] : ["Vegan"]) : pungentFree ? ["Vegetarian"] : ["Plant-Based"];
}
export const payOptions = ["own", "split", "organiser"] as const;
export type PayOption = typeof payOptions[number];
export const payLabels: Record<PayOption, string> = { own: "Each pays their own", split: "Split the bill", organiser: "Organiser covers" };
/** A profile kept on this device before Social had accounts; used only to prefill the account profile. */
export type MeetProfile = {
  name: string; diets: DietLabel[]; area: string; about: string; interests: string[]; times: string[]; size: GroupSize;
  excluded: MarketIngredient[]; practices: MeetPractice[];
};
export const premisesTypes = ["HDB flat", "Private home", "Commercial kitchen"] as const;
/** Singapore home-food rules the applicant declares; wording pending legal review. */
export const hostDeclarations = [
  "Only residents prepare the food",
  "No catering, buffets or packed meals for sale",
  "No raw ready-to-eat seafood",
  "Ingredients come from licensed sources",
  "No signage at the premises",
  "No alcohol is sold",
] as const;
/** `diets`: people must keep every chosen label (Vegan and/or Vegetarian); none = everyone. */
export type MeetFilters = { diets: Exclude<DietLabel, "Plant-Based">[]; time: string; prefers: "Any" | GroupSize };
/** A device reminder for a confirmed plan; refreshed from the group whenever it is opened. */
export type PlanReminder = { groupId: string; venue: string; starts: string; pay: PayOption };
/** What Social keeps on this device: browse filters, a dismissed observance chip and plan reminders. */
export type MeetNetwork = { version: 3; profile: MeetProfile; filters: MeetFilters; dismissedMoment: string; reminders: PlanReminder[] };
export const reminderLimit = 30;
export const emptyMeetProfile = (): MeetProfile => ({ name: "", diets: ["Plant-Based"], area: "", about: "", interests: [], times: [], size: 4, excluded: [], practices: [] });
export const defaultMeetFilters = (): MeetFilters => ({ diets: [], time: "Any", prefers: "Any" });
export const emptyMeet = (): MeetNetwork => ({ version: 3, profile: emptyMeetProfile(), filters: defaultMeetFilters(), dismissedMoment: "", reminders: [] });
