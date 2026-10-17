import { useEffect, useMemo, useRef } from "react";
import { useMeet } from "./useMeet";
import type { MeetAction } from "../state/meet-actions";
import type { Group } from "../types/community";
import type { PlanReminder } from "../types/meet";

/** A reminder stays only while you are in the group, have confirmed, and the plan is set; it follows plan changes. */
export function reminderFor(g: Group): PlanReminder | null {
  const confirmed = g.myStatus === "accepted" && !!g.members.find(m => m.isMe)?.confirmed;
  return confirmed && g.venue && g.starts ? { groupId: g.id, venue: g.venue, starts: g.starts, pay: g.pay } : null;
}
/**
 * Keeps device plan reminders in step with the groups just loaded. With `complete`, reminders for groups missing
 * from the list are dropped too; otherwise only the listed groups are checked.
 */
export function useReminderSync(groups: Group[] | undefined, complete: boolean) {
  const { network, commit } = useMeet(), latest = useRef(commit);
  useEffect(() => { latest.current = commit; });
  const changes = useMemo(() => {
    if (!groups) return [];
    return network.reminders.flatMap((reminder): MeetAction[] => {
      const group = groups.find(item => item.id === reminder.groupId);
      if (!group) return complete ? [{ type: "reminder", groupId: reminder.groupId, reminder: null }] : [];
      const next = reminderFor(group);
      return JSON.stringify(next) === JSON.stringify(reminder) ? [] : [{ type: "reminder", groupId: reminder.groupId, reminder: next }];
    });
  }, [groups, network.reminders, complete]);
  const key = JSON.stringify(changes);
  useEffect(() => { for (const change of JSON.parse(key) as MeetAction[]) void latest.current(change); }, [key]);
}
