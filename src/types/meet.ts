import type { MarketIngredient } from "../config/market-ingredients";
export const groupSizes = [2, 4, 6] as const;
export type GroupSize = typeof groupSizes[number];
export const meetTimes = ["Weekday lunch", "Weekday dinner", "Weekends"] as const;
/** Self-declared dietary practice shown to tablemates; never verified. */
export const meetPractices = ["No five pungent", "No egg", "Lunar 1st & 15th"] as const;
export type MeetPractice = typeof meetPractices[number];
export const payOptions = ["own", "split", "organiser"] as const;
export type PayOption = typeof payOptions[number];
export const payLabels: Record<PayOption, string> = { own: "Each pays their own", split: "Split the bill", organiser: "Organiser covers" };
/** A profile kept on this device before Social had accounts; used only to prefill the account profile. */
export type MeetProfile = {
  name: string; diet: "Vegan" | "Vegetarian"; area: string; about: string; interests: string[]; times: string[]; size: GroupSize;
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
export type MeetFilters = { diet: "All" | "Vegan" | "Vegetarian"; time: string; prefers: "Any" | GroupSize; fivePungentFree: boolean };
/** A device reminder for a confirmed plan; refreshed from the group whenever it is opened. */
export type PlanReminder = { groupId: string; venue: string; starts: string; pay: PayOption };
/** What Social keeps on this device: browse filters, a dismissed observance chip and plan reminders. */
export type MeetNetwork = { version: 3; profile: MeetProfile; filters: MeetFilters; dismissedMoment: string; reminders: PlanReminder[] };
export const reminderLimit = 30;
export const emptyMeetProfile = (): MeetProfile => ({ name: "", diet: "Vegan", area: "", about: "", interests: [], times: [], size: 4, excluded: [], practices: [] });
export const defaultMeetFilters = (): MeetFilters => ({ diet: "All", time: "Any", prefers: "Any", fivePungentFree: false });
export const emptyMeet = (): MeetNetwork => ({ version: 3, profile: emptyMeetProfile(), filters: defaultMeetFilters(), dismissedMoment: "", reminders: [] });
