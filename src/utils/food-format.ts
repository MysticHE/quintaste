import type { Ingredient } from "../types/food";

export function money(price: number | null) {
  return price === null ? "Price not listed" : "S$" + new Intl.NumberFormat("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
}
export function quantity(value: number) {
  return new Intl.NumberFormat("en-SG", { maximumSignificantDigits: 12 }).format(value);
}
const metric = /^(g|ml|kg|l)$/i;
const fractions: { value: number; glyph: string; spoken: string }[] = [
  { value: 1 / 4, glyph: "¼", spoken: "a quarter" }, { value: 1 / 3, glyph: "⅓", spoken: "a third" },
  { value: 1 / 2, glyph: "½", spoken: "a half" }, { value: 2 / 3, glyph: "⅔", spoken: "two thirds" },
  { value: 3 / 4, glyph: "¾", spoken: "three quarters" },
];
const plain = (value: number) => { const text = quantity(value); return { text, spoken: text }; };
/** Kitchen-friendly amounts: metric weights round sensibly, spoons and counts use common fractions. A positive amount never displays as 0. */
export function formatAmount(value: number, unit: string): { text: string; spoken: string } {
  const visible = (rounded: number) => rounded > 0 || value <= 0 ? rounded : Number(value.toPrecision(2));
  if (metric.test(unit)) {
    return plain(visible(/^(kg|l)$/i.test(unit) ? Math.round(value * 100) / 100 : value >= 100 ? Math.round(value / 5) * 5 : value >= 10 ? Math.round(value) : Math.round(value * 10) / 10));
  }
  const whole = Math.floor(value + 0.04), rest = value - whole;
  const match = rest < 0.04 ? null : fractions.find(f => Math.abs(rest - f.value) < 0.05);
  if (rest >= 0.04 && !match) return plain(visible(Math.round(value * 10) / 10));
  if (!match) return plain(visible(whole));
  return whole ? { text: whole + match.glyph, spoken: whole + " and " + match.spoken } : { text: match.glyph, spoken: match.spoken };
}
export type IngredientLine = { text: string; spoken: string; toTaste: boolean };
export function ingredientLine(item: Pick<Ingredient, "name" | "amount" | "unit">, scale = 1): IngredientLine {
  if (item.amount === null) return { text: item.name + ", to taste", spoken: item.name + ", to taste", toTaste: true };
  const amount = formatAmount(item.amount * scale, item.unit);
  return { text: [amount.text, item.unit, item.name].filter(Boolean).join(" "), spoken: [amount.spoken, item.unit, item.name].filter(Boolean).join(" "), toTaste: false };
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
