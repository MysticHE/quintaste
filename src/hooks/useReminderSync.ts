import { useEffect, useMemo, useRef } from "react";
import { useMeet } from "./useMeet";
import { syncedReminders, type Remindable } from "../utils/dinner-reminders";
import type { PlanReminder } from "../types/meet";

export { reminderFor } from "../utils/dinner-reminders";
/**
 * Keeps device dinner reminders in step with the member's whole dinner list (see syncedReminders). Only DinnerReminderSync calls
 * it: one writer, so two screens holding different copies of a dinner can never undo each other's reminders.
 */
export function useReminderSync(dinners: Remindable[] | undefined) {
  const { network, commit, ready } = useMeet(), latest = useRef(commit);
  useEffect(() => { latest.current = commit; });
  const next = useMemo(() => dinners && ready ? syncedReminders(dinners, network) : null, [dinners, ready, network]);
  const key = next ? JSON.stringify(next) : "";
  useEffect(() => { if (key) void latest.current({ type: "reminders", reminders: JSON.parse(key) as PlanReminder[] }); }, [key]);
}
