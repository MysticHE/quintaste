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
/** "Sat 25 Oct 2026, 7:00 pm" */
export function formatSgDateTime(at: number) {
  const parts = Object.fromEntries(display.formatToParts(at).map(part => [part.type, part.value]));
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${(parts.dayPeriod ?? "").toLowerCase()}`.trim();
}
/** "Sat 25 Oct, 7:00 pm" for lists, where the year is implied. */
export function formatSgShort(text: string) {
  const at = parseSgDateTime(text);
  return at === null ? "" : formatSgDateTime(at).replace(/ \d{4},/, ",");
}
/** Parts for a list date tile: day, short month, weekday and time. */
export function sgDateTile(text: string) {
  const at = parseSgDateTime(text);
  if (at === null) return null;
  const parts = Object.fromEntries(display.formatToParts(at).map(part => [part.type, part.value]));
  return { day: parts.day, month: parts.month, weekday: parts.weekday, time: `${parts.hour}:${parts.minute} ${(parts.dayPeriod ?? "").toLowerCase()}`.trim() };
}
export function formatSgText(text: string) {
  const at = parseSgDateTime(text);
  return at === null ? "" : formatSgDateTime(at);
}
/** A plan date must be in the future and within the planning horizon. */
export function planDateIssue(text: string, now: number) {
  const at = parseSgDateTime(text);
  if (at === null) return "Choose a Singapore date and time.";
  if (at <= now) return "Choose a future date and time.";
  if (at - now > planHorizonMs) return "Choose a date within the next two years.";
  return null;
}
export function sgDay(at: number) { return sgDateTimeText(at).slice(0, 10); }
