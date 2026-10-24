import type { DateChoice, EventFilters } from "../state/Feeds";
import type { SearchPoint } from "../types/location-search";
import { distanceKm } from "./discovery-search";
import { sgDateTimeText } from "./sg-datetime";

/** Near me in Events: events within this distance of the member. */
export const nearKm = 5;

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
/**
 * `point` is an event's map point, or for a cooking class the centre of its named area. Near me keeps anything with a point
 * within nearKm; without one it falls back to the member's planning area in the item's area text, like an area choice.
 */
export function matchesEventFilters(item: { at: string; area: string; point: SearchPoint | null; price: number | null; saved: boolean }, filter: EventFilters, now: number) {
  const range = feedDateRange(filter.when, filter.date, now), date = item.at.slice(0, 10), area = item.area.toLowerCase();
  const near = filter.near, place = near ? (item.point ? distanceKm(near, item.point) <= nearKm : !!near.area && area.includes(near.area.toLowerCase()))
    : !filter.area.trim() || area.includes(filter.area.trim().toLowerCase());
  return (!range || date >= range.from && date <= range.to) && place
    && (filter.price === "any" || item.price !== null && (filter.price === "free" ? item.price === 0 : item.price > 0))
    && (!filter.savedOnly || item.saved);
}
