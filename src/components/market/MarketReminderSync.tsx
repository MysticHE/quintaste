import { useEffect } from "react";
import { useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { useFood } from "../../state/Food";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { orders } from "../../services/market-api";
import { orderRemindersFrom } from "../../services/market-reminders";

/** Keeps the device's Market collection reminders in step with the buyer's orders while Notifications is on. */
export function MarketReminderSync() {
  const { member, userId } = useMember(), { doc } = useFood(), { setOrderReminders } = useTimerAlerts();
  // Keyed by account, so right after a switch the previous account's cached orders are never read as this account's.
  const data = useRemote(member && userId && doc.notifications.cooking ? "/api/market/orders?role=buy&for=" + userId : null, signal => orders("buy", signal)).data;
  useEffect(() => { if (data) setOrderReminders(orderRemindersFrom(data.items)); }, [data, setOrderReminders]);
  return null;
}
