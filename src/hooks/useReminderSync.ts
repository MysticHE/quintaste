import { useEffect, useMemo, useRef } from "react";
import { useMeet } from "./useMeet";
import type { MeetAction } from "../state/meet-actions";
import type { Dinner } from "../types/community";
import type { PlanReminder } from "../types/meet";

/** A reminder stays only while the dinner is accepted and still ahead; it follows a changed time or place. */
export function reminderFor(d: Pick<Dinner, "id" | "status" | "past" | "placeName" | "starts" | "pay">): PlanReminder | null {
  return d.status === "accepted" && !d.past ? { groupId: d.id, venue: d.placeName, starts: d.starts, pay: d.pay } : null;
}
/**
 * Keeps device dinner reminders in step with the dinners just loaded. With `complete`, reminders for dinners missing
 * from the list are dropped too; otherwise only the listed dinners are checked.
 */
export function useReminderSync(dinners: Dinner[] | undefined, complete: boolean) {
  const { network, commit } = useMeet(), latest = useRef(commit);
  useEffect(() => { latest.current = commit; });
  const changes = useMemo(() => {
    if (!dinners) return [];
    return network.reminders.flatMap((reminder): MeetAction[] => {
      const dinner = dinners.find(item => item.id === reminder.groupId);
      if (!dinner) return complete ? [{ type: "reminder", groupId: reminder.groupId, reminder: null }] : [];
      const next = reminderFor(dinner);
      return JSON.stringify(next) === JSON.stringify(reminder) ? [] : [{ type: "reminder", groupId: reminder.groupId, reminder: next }];
    });
  }, [dinners, network.reminders, complete]);
  const key = JSON.stringify(changes);
  useEffect(() => { for (const change of JSON.parse(key) as MeetAction[]) void latest.current(change); }, [key]);
}
