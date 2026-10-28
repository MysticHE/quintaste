import type { CatalogueHours } from "../types/catalogue";
import { isPublicHoliday } from "../data/public-holidays";
import { isLunarFirstOrFifteenth } from "../data/lunar";

/**
 * Whether a place is open, read from its published schedule lines ("Mon–Thu: 11:00–15:00 and 17:30–21:00", "Sun: closed",
 * "Public holidays: 08:00–22:00", "Sun: closed except lunar days 1 and 15"). Only what the lines prove counts: a day that is not
 * listed or unconfirmed stays unknown, and so does a day a dated note ("17 October 2026: private event") or an exception without
 * hours touches. On a public holiday or lunar 1st/15th, the lines written for those days replace the weekday ones. A line with no
 * days ("Listed outlet hours: 10:00–21:00") is the whole week only when no line names a day. Shared by the catalogue search
 * (Open now) and the cards, so both always agree. Times are epoch ms; Singapore has no daylight saving.
 */
export type OpenState = { state: "open"; closesAt: number; soon: boolean } | { state: "closed"; opensAt?: number } | { state: "unknown" };
type Ranges = [number, number][];
type Day = { ranges: Ranges } | "closed" | "unknown";
type Line = {
  days: number[]; dated?: string; holiday: "also" | "except" | "none"; lunar: "also" | "none";
  value: Day; exceptHoliday: boolean; exceptLunar: boolean;
};

const dayNames = [["sun", "sunday"], ["mon", "monday"], ["tue", "tues", "tuesday"], ["wed", "wednesday"], ["thu", "thur", "thurs", "thursday"],
  ["fri", "friday"], ["sat", "saturday"]];
const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const dayIndex = (word: string) => dayNames.findIndex(names => names.includes(word));
const rangePattern = /(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/g;
const singaporeOffset = 8 * 3600000, dayMs = 86400000, minutesPerDay = 1440;
const holidayWords = /public holidays?|\bph\b/, lunarWords = /lunar/;

function headingDays(text: string): number[] {
  if (/\bdaily\b|every day|mon(day)?\s*[–-]\s*sun(day)?/.test(text)) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  if (/\bweekdays?\b/.test(text)) [1, 2, 3, 4, 5].forEach(day => days.add(day));
  if (/\bweekends?\b/.test(text)) [0, 6].forEach(day => days.add(day));
  for (const match of text.matchAll(/([a-z]+)\s*[–-]\s*([a-z]+)/g)) {
    const from = dayIndex(match[1]), to = dayIndex(match[2]);
    if (from < 0 || to < 0) continue;
    for (let day = from; ; day = (day + 1) % 7) { days.add(day); if (day === to) break; }
  }
  for (const word of text.split(/[^a-z]+/)) if (dayIndex(word) >= 0) days.add(dayIndex(word));
  return [...days];
}

function readLine(line: string): Line | null {
  // The heading ends at ": " ("Mon–Thu: 11:00…", "17 October 2026: private event") or right before a time ("Daily 11:00–21:00").
  const split = line.match(/^(.*?)(?::\s+|\s+(?=\d{1,2}[:.]\d{2}))(.*)$/);
  if (!split) return null;
  const heading = split[1].toLowerCase(), value = split[2].toLowerCase();
  const date = heading.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/), month = date ? months.indexOf(date[2]) : -1;
  const dated = date && month >= 0 ? date[3] + "-" + String(month + 1).padStart(2, "0") + "-" + date[1].padStart(2, "0") : undefined;
  const plain = heading.replace(/including public holidays/g, "");
  const holiday = /except public holidays/.test(heading) ? "except" : holidayWords.test(plain) ? "also" : "none";
  const ranges: Ranges = [...value.matchAll(rangePattern)].map(([, h1, m1, h2, m2]) => {
    const start = Number(h1) * 60 + Number(m1); let end = Number(h2) * 60 + Number(m2);
    if (end <= start) end += minutesPerDay;
    return [start, end] as [number, number];
  }).filter(([start, end]) => start < minutesPerDay && end - start <= 20 * 60);
  // "closed except lunar days 1 and 15": closed on other days; on the excepted days only a line written for them can tell.
  const except = value.match(/except(.*)$/)?.[1] ?? "";
  const unconfirmed = /unconfirmed|not listed/.test(value);
  const closed = !ranges.length && /closed/.test(value) && !(unconfirmed && !except);
  return { days: headingDays(plain.replace(holidayWords, " ")), dated, holiday, lunar: lunarWords.test(heading) ? "also" : "none",
    value: ranges.length ? { ranges } : closed ? "closed" : "unknown", exceptHoliday: closed && holidayWords.test(except), exceptLunar: closed && lunarWords.test(except) };
}

/** One Singapore day's hours from the schedule, judged for that exact date (weekday, public holiday, lunar 1st/15th, dated notes). */
export function dayHours(hours: Pick<CatalogueHours, "schedule">, day: string): Day {
  const lines = hours.schedule.map(readLine).filter((line): line is Line => !!line);
  const weekday = new Date(day + "T00:00:00Z").getUTCDay();
  if (lines.some(line => line.dated === day)) return "unknown";
  const dayless = (line: Line) => !line.dated && !line.days.length && line.holiday === "none" && line.lunar === "none";
  const named = lines.some(line => line.days.length);
  const holidayMatters = lines.some(line => line.holiday !== "none" || line.exceptHoliday);
  const lunarMatters = lines.some(line => line.lunar !== "none" || line.exceptLunar);
  const holiday = holidayMatters ? isPublicHoliday(day) : false, lunar = lunarMatters ? isLunarFirstOrFifteenth(day) : false;
  if (holiday === null || lunar === null) return "unknown";
  // Lines written for public holidays or lunar days replace the weekday lines on those days.
  const special = lines.filter(line => !line.dated && (holiday && line.holiday === "also" || lunar && line.lunar === "also"));
  const applying = special.length ? special : lines.filter(line => !line.dated && line.lunar === "none" && (line.holiday !== "except" || !holiday)
    && (line.days.includes(weekday) || dayless(line) && !named));
  let result: Day | undefined;
  for (const line of applying) {
    const excepted = holiday && line.exceptHoliday || lunar && line.exceptLunar;
    const value: Day = excepted ? "unknown" : line.value;
    // Lunch and dinner seatings on separate lines add up; anything unknown about the day makes the whole day unknown.
    if (result === "unknown" || value === "unknown") result = "unknown";
    else if (typeof result === "object" && typeof value === "object") result = { ranges: [...result.ranges, ...value.ranges] };
    else if (!result || result === "closed") result = value;
  }
  return result ?? "unknown";
}

const sgDayText = (at: number) => new Date(at + singaporeOffset).toISOString().slice(0, 10);
/** Open or closed at `at` (epoch ms) in Singapore, with when it closes, or when it next opens later the same day. */
export function openState(hours: Pick<CatalogueHours, "schedule"> | undefined, at: number): OpenState {
  if (!hours) return { state: "unknown" };
  const local = at + singaporeOffset, midnight = at - (local % dayMs), minute = Math.floor((local % dayMs) / 60000);
  // Last night's hours that run past midnight ("11:00–02:00 next day").
  const yesterday = dayHours(hours, sgDayText(at - dayMs));
  if (typeof yesterday === "object") for (const [, end] of yesterday.ranges)
    if (end > minutesPerDay && minute < end - minutesPerDay) return { state: "open", closesAt: midnight + (end - minutesPerDay) * 60000, soon: end - minutesPerDay - minute <= 30 };
  const today = dayHours(hours, sgDayText(at));
  if (today === "unknown") return { state: "unknown" };
  if (today === "closed") return { state: "closed" };
  for (const [start, end] of today.ranges) if (minute >= start && minute < end) return { state: "open", closesAt: midnight + end * 60000, soon: end - minute <= 30 };
  const next = today.ranges.map(([start]) => start).filter(start => start > minute).sort((a, b) => a - b)[0];
  return next === undefined ? { state: "closed" } : { state: "closed", opensAt: midnight + next * 60000 };
}
