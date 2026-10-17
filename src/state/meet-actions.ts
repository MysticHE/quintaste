import { reminderLimit, type MeetFilters, type MeetNetwork, type PlanReminder } from "../types/meet";
export type MeetAction =
  | { type: "filters"; filters: MeetFilters } | { type: "dismiss-moment"; day: string }
  | { type: "reminder"; groupId: string; reminder: PlanReminder | null };
export function reduceMeet(n: MeetNetwork, a: MeetAction): MeetNetwork {
  switch (a.type) {
    case "filters": return { ...n, filters: a.filters };
    case "dismiss-moment": return { ...n, dismissedMoment: a.day };
    case "reminder": {
      const rest = n.reminders.filter(r => r.groupId !== a.groupId);
      if (a.reminder && rest.length >= reminderLimit) throw new Error(`You have ${reminderLimit} plan reminders. Turn one off first.`);
      return { ...n, reminders: a.reminder ? [...rest, a.reminder] : rest };
    }
  }
}
