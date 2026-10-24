import type { Language } from "../config/preferences";

/** Calendar days stored as YYYY-MM-DD, read and shown in Singapore time. */
const sgOffset = 8 * 3600000;
export function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const at = Date.parse(value + "T00:00:00+08:00");
  return Number.isFinite(at) && dateText(new Date(at)) === value ? new Date(at) : null;
}
export const dateText = (day: Date) => new Date(day.getTime() + sgOffset).toISOString().slice(0, 10);
const display = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric" });
/** "12 Mar 2027"; Chinese "2027年3月12日". */
export function formatDay(value: string, language: Language = "en") {
  const day = parseDay(value);
  if (!day) return "";
  return language === "zh" ? `${+value.slice(0, 4)}年${+value.slice(5, 7)}月${+value.slice(8, 10)}日` : display.format(day);
}
/** The first day at least `days` full days after `now`, as YYYY-MM-DD. */
export const dayAfter = (now: number, days: number) => dateText(new Date(now + days * 86400000));
