import type { Language } from "../config/preferences";

/** Singapore wall-clock date-times stored as "YYYY-MM-DD HH:mm"; every plan and gathering uses this one format. */
const hour = 3600000;
export const planHorizonMs = 2 * 365 * 86400000;
export function parseSgDateTime(text: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return null;
  const date = Date.parse(text.replace(" ", "T") + ":00+08:00");
  if (!Number.isFinite(date)) return null;
  return sgDateTimeText(date) === text ? date : null;
}
export function sgDateTimeText(at: number) {
  return new Date(at + 8 * hour).toISOString().slice(0, 16).replace("T", " ");
}
const display = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const zhWeekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
/** The Chinese name for part of the day; one rule for every area of the app. */
export const zhPeriod = (h: number) => h < 5 ? "凌晨" : h < 12 ? "上午" : h < 13 ? "中午" : h < 18 ? "下午" : "晚上";
/** Chinese parts worked out from Singapore wall-clock time: "10月25日", "周六", "晚上", "7:00". */
export function zhParts(at: number) {
  const d = new Date(at + 8 * hour), h = d.getUTCHours();
  const clock = (h % 12 || 12) + ":" + String(d.getUTCMinutes()).padStart(2, "0");
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: zhWeekdays[d.getUTCDay()],
    period: zhPeriod(h), clock, time: zhPeriod(h) + clock };
}
/** "Sat 25 Oct 2026, 7:00 pm"; Chinese "2026年10月25日（周六）晚上7:00". */
export function formatSgDateTime(at: number, language: Language = "en") {
  if (language === "zh") { const p = zhParts(at); return `${p.year}年${p.month}月${p.day}日（${p.weekday}）${p.time}`; }
  const parts = Object.fromEntries(display.formatToParts(at).map(part => [part.type, part.value]));
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${(parts.dayPeriod ?? "").toLowerCase()}`.trim();
}
/** "Sat 25 Oct, 7:00 pm" for lists, where the year is implied; Chinese "10月25日（周六）晚上7:00". */
export function formatSgShort(text: string, language: Language = "en") {
  const at = parseSgDateTime(text);
  if (at === null) return "";
  if (language === "zh") { const p = zhParts(at); return `${p.month}月${p.day}日（${p.weekday}）${p.time}`; }
  return formatSgDateTime(at).replace(/ \d{4},/, ",");
}
/** Parts for a list date tile: day, short month, weekday and time. */
export function sgDateTile(text: string, language: Language = "en") {
  const at = parseSgDateTime(text);
  if (at === null) return null;
  if (language === "zh") { const p = zhParts(at); return { day: String(p.day), month: p.month + "月", weekday: p.weekday, time: p.time }; }
  const parts = Object.fromEntries(display.formatToParts(at).map(part => [part.type, part.value]));
  return { day: parts.day, month: parts.month, weekday: parts.weekday, time: `${parts.hour}:${parts.minute} ${(parts.dayPeriod ?? "").toLowerCase()}`.trim() };
}
export function formatSgText(text: string, language: Language = "en") {
  const at = parseSgDateTime(text);
  return at === null ? "" : formatSgDateTime(at, language);
}
/** Why a plan date cannot be used, as a Social message key (Market maps it to its own): it must be in the future and within the planning horizon. */
export function planDateProblem(text: string, now: number): "dateIssueInvalid" | "dateIssuePast" | "dateIssueHorizon" | null {
  const at = parseSgDateTime(text);
  if (at === null) return "dateIssueInvalid";
  if (at <= now) return "dateIssuePast";
  return at - now > planHorizonMs ? "dateIssueHorizon" : null;
}
export function sgDay(at: number) { return sgDateTimeText(at).slice(0, 10); }
