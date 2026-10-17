import { sgDay } from "../utils/sg-datetime";

/** Lunar 1st/15th and Nine Emperor Gods days (Singapore dates), generated from the Intl Chinese calendar on 17 Oct 2026.
 *  Embedded because native Intl calendar support varies; extend before 2028. */
const lunarDays: Record<string, 1 | 15> = Object.fromEntries(([
  "2026-10-10:1", "2026-10-24:15", "2026-11-09:1", "2026-11-23:15", "2026-12-09:1", "2026-12-23:15", "2027-01-08:1", "2027-01-22:15",
  "2027-02-07:1", "2027-02-21:15", "2027-03-08:1", "2027-03-22:15", "2027-04-07:1", "2027-04-21:15", "2027-05-06:1", "2027-05-20:15",
  "2027-06-05:1", "2027-06-19:15", "2027-07-04:1", "2027-07-18:15", "2027-08-02:1", "2027-08-16:15", "2027-09-01:1", "2027-09-15:15",
  "2027-09-30:1", "2027-10-14:15", "2027-10-29:1", "2027-11-12:15", "2027-11-28:1", "2027-12-12:15", "2027-12-28:1", "2028-01-11:15", "2028-01-26:1",
] as const).map(entry => [entry.slice(0, 10), Number(entry.slice(11)) as 1 | 15]));
const nineEmperorGods = new Set(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
  "2027-09-30", "2027-10-01", "2027-10-02", "2027-10-03", "2027-10-04", "2027-10-05", "2027-10-06", "2027-10-07", "2027-10-08"]);
export type LunarMoment = { day: string; label: string };
/** A plant-based observance today, if any; many people keep allium-free meals on these days. */
export function lunarMoment(now: number): LunarMoment | null {
  const day = sgDay(now);
  if (nineEmperorGods.has(day)) return { day, label: "Nine Emperor Gods" };
  const lunar = lunarDays[day];
  return lunar ? { day, label: lunar === 1 ? "Lunar 1st" : "Lunar 15th" } : null;
}
