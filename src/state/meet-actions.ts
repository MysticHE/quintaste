import { reminderLimit, remindersOffLimit, type MeetFilters, type MeetNetwork, type PlanReminder } from "../types/meet";
import { translate, type Language } from "../i18n";
export type MeetAction =
  | { type: "filters"; filters: MeetFilters } | { type: "dismiss-moment"; day: string }
  /** The member's switch: a reminder turns it on, null turns it off and remembers that for this dinner. */
  | { type: "reminder"; groupId: string; reminder: PlanReminder | null }
  /** Background sync with the loaded dinners: the whole list, already within the limit. */
  | { type: "reminders"; reminders: PlanReminder[] };
/** `language` words the reminder-limit error; pass useLanguage() from the caller. */
export function reduceMeet(n: MeetNetwork, a: MeetAction, language: Language = "en"): MeetNetwork {
  switch (a.type) {
    case "filters": return { ...n, filters: a.filters };
    case "dismiss-moment": return { ...n, dismissedMoment: a.day };
    case "reminder": {
      const rest = n.reminders.filter(r => r.groupId !== a.groupId), off = n.remindersOff.filter(id => id !== a.groupId);
      if (a.reminder && rest.length >= reminderLimit) throw new Error(translate(language, "me", "reminderLimit", { limit: reminderLimit }));
      return { ...n, reminders: a.reminder ? [...rest, a.reminder] : rest, remindersOff: a.reminder ? off : [...off, a.groupId].slice(-remindersOffLimit) };
    }
    case "reminders": return { ...n, reminders: a.reminders.slice(0, reminderLimit) };
  }
}
