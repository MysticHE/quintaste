import type { Language } from "../config/preferences";
import type { Ingredient } from "../types/food";
import { exploreWords, type ExploreKey } from "./location-feedback";

export function money(price: number | null, language: Language = "en") {
  return price === null ? exploreWords(language).priceNotListed : "S$" + new Intl.NumberFormat("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
}
export function quantity(value: number) {
  return new Intl.NumberFormat("en-SG", { maximumSignificantDigits: 12 }).format(value);
}
const metric = /^(g|ml|kg|l)$/i;
const fractions: { value: number; glyph: string; spoken: ExploreKey }[] = [
  { value: 1 / 4, glyph: "¼", spoken: "fractionQuarter" }, { value: 1 / 3, glyph: "⅓", spoken: "fractionThird" },
  { value: 1 / 2, glyph: "½", spoken: "fractionHalf" }, { value: 2 / 3, glyph: "⅔", spoken: "fractionTwoThirds" },
  { value: 3 / 4, glyph: "¾", spoken: "fractionThreeQuarters" },
];
const plain = (value: number) => { const text = quantity(value); return { text, spoken: text }; };
/** Kitchen-friendly amounts: metric weights round sensibly, spoons and counts use common fractions. A positive amount never displays as 0. */
export function formatAmount(value: number, unit: string, language: Language = "en"): { text: string; spoken: string } {
  const visible = (rounded: number) => rounded > 0 || value <= 0 ? rounded : Number(value.toPrecision(2));
  if (metric.test(unit)) {
    return plain(visible(/^(kg|l)$/i.test(unit) ? Math.round(value * 100) / 100 : value >= 100 ? Math.round(value / 5) * 5 : value >= 10 ? Math.round(value) : Math.round(value * 10) / 10));
  }
  const whole = Math.floor(value + 0.04), rest = value - whole;
  const match = rest < 0.04 ? null : fractions.find(f => Math.abs(rest - f.value) < 0.05);
  if (rest >= 0.04 && !match) return plain(visible(Math.round(value * 10) / 10));
  if (!match) return plain(visible(whole));
  const words = exploreWords(language), part = String(words[match.spoken]);
  return whole ? { text: whole + match.glyph, spoken: words.amountAnd({ whole, part }) } : { text: match.glyph, spoken: part };
}
/** `lead` is the amount and unit ("1½ cup") and `rest` the name, for lines that set the amount in bold; empty lead when to taste. */
export type IngredientLine = { text: string; spoken: string; toTaste: boolean; lead: string; rest: string };
export function ingredientLine(item: Pick<Ingredient, "name" | "amount" | "unit">, scale = 1, language: Language = "en"): IngredientLine {
  if (item.amount === null) {
    const text = item.name + exploreWords(language).toTaste;
    return { text, spoken: text, toTaste: true, lead: "", rest: text };
  }
  const amount = formatAmount(item.amount * scale, item.unit, language);
  const lead = [amount.text, item.unit].filter(Boolean).join(" ");
  return { text: [lead, item.name].filter(Boolean).join(" "), spoken: [amount.spoken, item.unit, item.name].filter(Boolean).join(" "), toTaste: false, lead, rest: item.name };
}
export function timerRemaining(timer: { endsAt: number | null; remaining: number }, now = Date.now()) {
  return Math.max(0, Math.ceil(timer.endsAt === null ? timer.remaining : (timer.endsAt - now) / 1000));
}
export function duration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = (total % 60).toString().padStart(2, "0");
  return hours ? hours + ":" + minutes.toString().padStart(2, "0") + ":" + secs : minutes + ":" + secs;
}
export function shortDate(time: number) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short" }).format(time);
}
const singaporeParts = (time: number | Date) => {
  const parts = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", year: "numeric", month: "numeric", day: "numeric",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(time);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return { year: part("year"), month: Number(part("month")), day: Number(part("day")), weekday: part("weekday"), hour: Number(part("hour")) % 24, minute: part("minute") };
};
const zhWeekdays: Record<string, string> = { Sun: "周日", Mon: "周一", Tue: "周二", Wed: "周三", Thu: "周四", Fri: "周五", Sat: "周六" };
/** "2026年10月24日" on the Singapore calendar. */
export const zhDate = (time: number | Date) => { const p = singaporeParts(time); return p.year + "年" + p.month + "月" + p.day + "日"; };
/** "2026年10月24日" on the phone's own calendar, matching toLocaleDateString(). */
export const zhLocalDate = (time: number | Date) => { const d = new Date(time); return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日"; };
/** "周六" in Singapore time. */
export const zhWeekday = (time: number | Date) => zhWeekdays[singaporeParts(time).weekday] ?? "";
/** "晚上7:00" in Singapore time. */
export function zhTime(time: number | Date) {
  const { hour, minute } = singaporeParts(time);
  const period = hour < 6 ? "凌晨" : hour < 12 ? "上午" : hour === 12 ? "中午" : hour < 18 ? "下午" : "晚上";
  return period + (hour % 12 || 12) + ":" + minute;
}
