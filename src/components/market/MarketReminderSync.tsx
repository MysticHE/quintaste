import { useEffect } from "react";
import { useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { useFood } from "../../state/Food";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { orders } from "../../services/market-api";
import { orderRemindersFrom } from "../../services/market-reminders";

/** Keeps the device's Market collection reminders in step with the buyer's orders while Notifications is on. */
export function MarketReminderSync() {
  const { member } = useMember(), { doc } = useFood(), { setOrderReminders } = useTimerAlerts();
  const data = useRemote(member && doc.notifications.cooking ? "/api/market/orders?role=buy" : null, signal => orders("buy", signal)).data;
  useEffect(() => { if (data) setOrderReminders(orderRemindersFrom(data.items)); }, [data, setOrderReminders]);
  return null;
}
