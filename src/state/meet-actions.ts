import { reminderLimit, type MeetFilters, type MeetNetwork, type PlanReminder } from "../types/meet";
import { translate, type Language } from "../i18n";
export type MeetAction =
  | { type: "filters"; filters: MeetFilters } | { type: "dismiss-moment"; day: string }
  | { type: "reminder"; groupId: string; reminder: PlanReminder | null };
/** `language` words the reminder-limit error; pass useLanguage() from the caller. */
export function reduceMeet(n: MeetNetwork, a: MeetAction, language: Language = "en"): MeetNetwork {
  switch (a.type) {
    case "filters": return { ...n, filters: a.filters };
    case "dismiss-moment": return { ...n, dismissedMoment: a.day };
    case "reminder": {
      const rest = n.reminders.filter(r => r.groupId !== a.groupId);
      if (a.reminder && rest.length >= reminderLimit) throw new Error(translate(language, "me", "reminderLimit", { limit: reminderLimit }));
      return { ...n, reminders: a.reminder ? [...rest, a.reminder] : rest };
    }
  }
}
