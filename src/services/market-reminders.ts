import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderSummary } from "../types/community";
import { formatSgDateTime, parseSgDateTime } from "../utils/sg-datetime";
import type { TimerAlert } from "./timer-alerts";
import { timerAlertPrefix } from "./timer-alert-sync";

/** A buyer's confirmed Market order to collect; kept on the device so reminders survive going offline. */
export type OrderReminder = { orderId: string; starts: string; shop: string; place: string; delivery: boolean };
const limit = 40, key = (userId: string) => "@quintaste/market-reminders/" + userId;
const isReminder = (value: unknown): value is OrderReminder => {
  const r = value as OrderReminder;
  return !!r && typeof r.orderId === "string" && typeof r.starts === "string" && typeof r.shop === "string" && typeof r.place === "string" && typeof r.delivery === "boolean";
};
/** Orders the seller confirmed (or marked ready) and that the buyer still has to collect. */
export function orderRemindersFrom(orders: OrderSummary[], now = Date.now()): OrderReminder[] {
  return orders.filter(o => (o.status === "confirmed" || o.status === "ready") && (parseSgDateTime(o.starts) ?? 0) > now)
    .map(o => ({ orderId: o.id, starts: o.starts, shop: o.otherName, place: o.place, delivery: o.mode === "delivery" }))
    .sort((a, b) => a.starts.localeCompare(b.starts)).slice(0, limit);
}
export async function loadOrderReminders(userId: string): Promise<OrderReminder[]> {
  try {
    const parsed: unknown = JSON.parse(await AsyncStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isReminder).slice(0, limit) : [];
  } catch { return []; }
}
export async function saveOrderReminders(userId: string, reminders: OrderReminder[]) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(reminders.slice(0, limit)));
}
const offsets = [{ key: "day", ms: 86400000, title: "Market collection tomorrow" }, { key: "hour", ms: 3600000, title: "Market collection in 1 hour" }];
/** Reminders 1 day and 1 hour before each confirmed collection or delivery. */
export function orderAlertsFor(owner: string, reminders: OrderReminder[], now = Date.now()): TimerAlert[] {
  return reminders.flatMap(r => {
    const at = parseSgDateTime(r.starts);
    return at === null ? [] : offsets.filter(o => at - o.ms > now).map(o => ({ id: timerAlertPrefix + owner + "/order/" + r.orderId + "/" + o.key + "/" + at, owner, timerId: r.orderId,
      endsAt: at - o.ms, kind: "order" as const, title: o.title, label: [r.shop, r.delivery ? "Delivery" : r.place, formatSgDateTime(at)].filter(Boolean).join(" · ") }));
  });
}
