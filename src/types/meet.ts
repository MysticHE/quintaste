import type { MarketIngredient } from "../config/market-ingredients";
import { readLabels, type DietLabel } from "../config/diet-labels";
import type { AgeBand, Distance } from "../config/social-profile";
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
/** Who pays for a dinner (server/social/dinners.mjs); "host" is "I'll pay the bill" for the person who invited. */
export const payOptions = ["split", "host", "own"] as const;
export type PayOption = typeof payOptions[number];
/** A profile kept on this device before Social had accounts; used only to prefill the account profile. */
export type MeetProfile = {
  name: string; diets: DietLabel[]; area: string; about: string; interests: string[]; times: string[]; size: GroupSize;
  excluded: MarketIngredient[]; practices: MeetPractice[];
};
/** People filters. `diets`: people must keep every chosen label (Vegan and/or Vegetarian); none = everyone. Lists match any chosen value; `km` 0 is anywhere. */
export type MeetFilters = { diets: Exclude<DietLabel, "Plant-Based">[]; ages: AgeBand[]; languages: string[]; hobbies: string[]; km: Distance };
/**
 * A device reminder for an accepted dinner (`groupId` is the dinner id): before it, and afterwards to ask how it went. `with` is
 * the other person's first name. Refreshed whenever the dinners load.
 */
export type PlanReminder = { groupId: string; venue: string; starts: string; pay: PayOption; with: string };
/**
 * What Social keeps on this device: People filters, dinner reminders (on for every confirmed dinner) and `remindersOff`, the dinners
 * whose reminders the member switched off. `dismissedMoment` and `profile` are kept for older data.
 */
export type MeetNetwork = { version: 3; profile: MeetProfile; filters: MeetFilters; dismissedMoment: string; reminders: PlanReminder[]; remindersOff: string[] };
export const reminderLimit = 30;
export const remindersOffLimit = 60;
export const emptyMeetProfile = (): MeetProfile => ({ name: "", diets: ["Plant-Based"], area: "", about: "", interests: [], times: [], size: 4, excluded: [], practices: [] });
export const defaultMeetFilters = (): MeetFilters => ({ diets: [], ages: [], languages: [], hobbies: [], km: 0 });
export const emptyMeet = (): MeetNetwork => ({ version: 3, profile: emptyMeetProfile(), filters: defaultMeetFilters(), dismissedMoment: "", reminders: [], remindersOff: [] });
