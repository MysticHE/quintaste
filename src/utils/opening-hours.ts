import type { Language } from "../config/preferences";
import type { Venue } from "../types/food";
import { exploreWords } from "./location-feedback";

export type OpeningState = "open" | "closed" | "unknown";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function openingState(venue: Venue, now = Date.now()): OpeningState {
  const schedule = venue.schedule;
  if (!schedule || !venue.hours) return "unknown";
  const checked = Date.parse(schedule.checkedAt + "T00:00:00Z");
  if (!Number.isFinite(checked) || now < checked || now - checked > 90 * 86400000) return "unknown";
  try {
    const parts = new Intl.DateTimeFormat("en-SG", {
      timeZone: "Asia/Singapore", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(now));
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
    const day = weekdays.indexOf(part("weekday"));
    const minute = Number(part("hour")) * 60 + Number(part("minute"));
    if (day < 0 || !Number.isFinite(minute) || !schedule.periods.length) return "unknown";
    for (const period of schedule.periods) {
      if (!Number.isInteger(period.opens) || !Number.isInteger(period.closes) || period.opens < 0 || period.opens >= 1440 || period.closes < 0 || period.closes > 1440 ||
        !period.days.length || period.days.some(value => !Number.isInteger(value) || value < 0 || value > 6)) return "unknown";
    }
    const open = schedule.periods.some(period => period.closes > period.opens
      ? period.days.includes(day) && minute >= period.opens && minute < period.closes
      : (period.days.includes(day) && minute >= period.opens) || (period.days.includes((day + 6) % 7) && minute < period.closes));
    return open ? "open" : "closed";
  } catch { return "unknown"; }
}
export function openingLabel(venue: Venue, now = Date.now(), language: Language = "en") {
  const state = openingState(venue, now), words = exploreWords(language);
  return state === "unknown" ? words.hoursUnknown : state === "open" ? words.openSampleHours : words.closedSampleHours;
}
