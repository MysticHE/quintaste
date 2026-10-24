import { translate, type Language } from "../i18n";
import { sgDateTile, sgDateTimeText, sgDay } from "./sg-datetime";

/** "Today 12:30", "Tomorrow 19:00" or "Sat 11:00". */
export function slotLabel(text: string, now: number, language: Language = "en") {
  const tile = sgDateTile(text, language), day = text.slice(0, 10);
  if (!tile) return text;
  const name = day === sgDay(now) ? translate(language, "social", "today") : day === sgDay(now + 86400000) ? translate(language, "social", "tomorrow") : tile.weekday;
  return translate(language, "social", "slotDay", { day: name, time: text.slice(11) });
}
/** Usual dinner times over the next week: 7 pm on weekdays, 12:30 and 7 pm at weekends, at least two hours from now. */
export function dinnerSlots(now: number, count = 4) {
  const out: string[] = [];
  for (let day = 0; day < 8 && out.length < count; day++) {
    const date = sgDay(now + day * 86400000), weekday = new Date(date + "T12:00:00+08:00").getUTCDay(), weekend = weekday === 0 || weekday === 6;
    for (const time of weekend ? ["12:30", "19:00"] : ["19:00"]) {
      if (Date.parse(date + "T" + time + ":00+08:00") - now >= 2 * 3600000 && out.length < count) out.push(date + " " + time);
    }
  }
  return out;
}
export const isToday = (text: string, now: number) => text.slice(0, 10) === sgDateTimeText(now).slice(0, 10);
