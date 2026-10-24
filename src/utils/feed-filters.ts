import type { DateChoice, EventFilters } from "../state/Feeds";
import { sgDateTimeText } from "./sg-datetime";

/** Calendar boundaries are Singapore dates, independent of the phone's time zone. */
export function feedDateRange(when: DateChoice, date = "", now = Date.now()): { from: string; to: string } | null {
  const today = sgDateTimeText(now).slice(0, 10);
  if (when === "any") return null;
  if (when === "date") return /^\d{4}-\d{2}-\d{2}$/.test(date) ? { from: date, to: date } : null;
  if (when === "today") return { from: today, to: today };
  const day = new Date(today + "T00:00:00Z"), weekday = day.getUTCDay();
  // On Sunday, this weekend still includes today.
  day.setUTCDate(day.getUTCDate() + (weekday === 0 ? -1 : (6 - weekday + 7) % 7));
  const from = day.toISOString().slice(0, 10);
  day.setUTCDate(day.getUTCDate() + 1);
  return { from, to: day.toISOString().slice(0, 10) };
}
export function matchesEventFilters(item: { at: string; area: string; price: number | null; saved: boolean }, filter: EventFilters, now: number) {
  const range = feedDateRange(filter.when, filter.date, now), date = item.at.slice(0, 10);
  return (!range || date >= range.from && date <= range.to)
    && (!filter.area.trim() || item.area.toLowerCase().includes(filter.area.trim().toLowerCase()))
    && (filter.price === "any" || item.price !== null && (filter.price === "free" ? item.price === 0 : item.price > 0))
    && (!filter.savedOnly || item.saved);
}
