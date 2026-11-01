import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useInbox } from "../InboxCounts";
import { useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { dinners } from "../../services/social-api";

/**
 * The one place that keeps dinner reminders on the device in step with the member's dinners, while they can use Dining, so a
 * dinner the other person confirms gets its reminders without opening Dining. The list loads on start and app resume (useRemote),
 * when a dinner screen changes it (invalidate), when a new chat line arrives (every dinner step writes one) or a dinner needs the
 * member, and otherwise every 10 minutes. Phones only: the web has no device alerts, so it stores none.
 */
export function DinnerReminderSync() {
  const inbox = useInbox(), on = Platform.OS !== "web" && !!inbox?.dining;
  const remote = useRemote(on ? "/api/social/dinners" : null, dinners, 600000), { refresh } = remote;
  const signal = on ? (inbox?.friends ?? 0) + ":" + (inbox?.dinners ?? 0) : "", seen = useRef("");
  // The first signal arrives with the first load, which useRemote already makes; only later changes ask again.
  useEffect(() => {
    if (signal && seen.current && signal !== seen.current) refresh();
    seen.current = signal;
  }, [signal, refresh]);
  useReminderSync(remote.data ? [...remote.data.upcoming, ...remote.data.past] : undefined);
  return null;
}
