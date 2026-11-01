import type { Dinner } from "../types/community";
import { reminderLimit, type MeetNetwork, type PlanReminder } from "../types/meet";

export type Remindable = Pick<Dinner, "id" | "status" | "past" | "placeName" | "starts" | "pay" | "withName" | "reportOpen" | "reported">;
/**
 * A confirmed dinner's reminder, kept from before it until the member says how it went (or the 30 days to say so end); it follows
 * a changed time or place.
 */
export function reminderFor(d: Remindable): PlanReminder | null {
  return d.status === "accepted" && (!d.past || (d.reportOpen && !d.reported))
    ? { groupId: d.id, venue: d.placeName, starts: d.starts, pay: d.pay, with: d.withName } : null;
}
/**
 * The reminders to keep after loading the member's whole dinner list: every confirmed dinner gets one unless the member switched
 * it off for that dinner, and reminders for dinners no longer in the list go. Soonest dinners win when there are more than the
 * limit. Null when nothing changes.
 */
export function syncedReminders(dinners: Remindable[], network: Pick<MeetNetwork, "reminders" | "remindersOff">): PlanReminder[] | null {
  const byId = new Map(dinners.map(d => [d.id, d]));
  const kept = network.reminders.flatMap(reminder => {
    const dinner = byId.get(reminder.groupId), updated = dinner ? reminderFor(dinner) : null;
    return updated ? [updated] : [];
  });
  const added = dinners.flatMap(d => {
    const reminder = network.reminders.some(r => r.groupId === d.id) || network.remindersOff.includes(d.id) ? null : reminderFor(d);
    return reminder ? [reminder] : [];
  });
  const list = [...kept, ...added].sort((a, b) => a.starts.localeCompare(b.starts)).slice(0, reminderLimit);
  const same = list.length === network.reminders.length && list.every(r => JSON.stringify(r) === JSON.stringify(network.reminders.find(o => o.groupId === r.groupId)));
  return same ? null : list;
}
