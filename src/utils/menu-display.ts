import type { Language } from "../config/preferences";
import type { MenuItem, PublishedMenu } from "../types/menus";
import { exploreWords } from "./location-feedback";

const key = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
const portion = /\s+(?:—|–|-)\s*(?:small|medium|large|regular|s|m|l)$/i;
const rank = { "branch-ordering": 0, "branch-delivery": 1, "branch-dine-in": 2, "brand-menu": 3 };

// One short availability qualification for a wholly imported menu. Never apply
// an addition's note to other sources, or expose packaged research audit prose.
export function menuAvailabilityNote(menu: PublishedMenu): string | undefined {
  const sections = menu.sections.filter(section => section.items.length > 0);
  if (!sections.length || sections.some(section => section.id !== "quintaste-additions")) return;
  const items = sections.flatMap(section => section.items);
  const note = items[0].qualifier.trim();
  if (note && note.length <= 400 && items.every(item => item.qualifier.trim() === note)) return note;
}

// Select one source per dish; different channels are not add-on price ranges.
export function menuDisplayItems(menu: PublishedMenu): MenuItem[] {
  const result = new Map<string, MenuItem>();
  const sections = [...menu.sections].sort((a, b) => Number(a.coverage === "historical") - Number(b.coverage === "historical")
    || rank[a.scope] - rank[b.scope] || b.checkedAt.localeCompare(a.checkedAt));
  for (const section of sections) {
    const groups = new Map<string, MenuItem[]>();
    const portionNames = new Map<string, Set<string>>();
    for (const item of section.items) {
      const base = key(item.name.replace(portion, "")), names = portionNames.get(base) ?? new Set<string>();
      names.add(key(item.name)); portionNames.set(base, names);
    }
    for (const item of section.items) {
      if (/^add[ -]?ons?(?:\s|$)/i.test(item.category ?? "")) continue;
      const base = item.name.replace(portion, "");
      const hasSiblings = base !== item.name && (portionNames.get(key(base))?.size ?? 0) > 1;
      const name = hasSiblings ? base : item.name, id = key(name);
      groups.set(id, [...(groups.get(id) ?? []), { ...item, name }]);
    }
    for (const [id, items] of groups) {
      if (result.has(id)) continue;
      const first = items[0], prices = items.map(item => item.price);
      // A merged dish is Vegan only when every listing of it is VG; anything else proves no diet label, so it stays untagged.
      const diet = items.every(item => item.diet === "VG") ? "VG" as const : undefined;
      const valid = prices.every(price => price.amount !== null && price.currency === first.price.currency);
      const amount = valid ? Math.min(...prices.map(price => price.amount!)) : first.price.amount;
      const bounded = valid && prices.every(price => price.type !== "from" || price.maxAmount !== undefined);
      const maxAmount = bounded ? Math.max(...prices.map(price => price.maxAmount ?? price.amount!)) : undefined;
      result.set(id, { id: first.id, name: first.name, category: first.category, qualifier: "", ...(diet ? { diet } : {}),
        price: { amount, currency: first.price.currency, type: bounded ? "displayed" : prices.some(price => price.type === "from") ? "from" : first.price.type,
          ...(maxAmount !== undefined && amount !== null && maxAmount > amount ? { maxAmount } : {}) } });
    }
  }
  return [...result.values()];
}

export function menuDisplayPrice({ price }: Pick<MenuItem, "price">, language: Language = "en") {
  const words = exploreWords(language);
  if (price.amount === null || price.currency !== "SGD") return words.priceUnavailable;
  if (price.maxAmount !== undefined && price.maxAmount > price.amount) return "S$" + price.amount.toFixed(2) + "–" + price.maxAmount.toFixed(2);
  const amount = "S$" + price.amount.toFixed(2);
  return price.type === "from" ? words.priceFrom({ price: amount }) : amount;
}

/** A matched dish as a search result shows it: "Char Kway Teow · S$6.00", without a price when the menu has none. */
export function matchedDish(dish: Pick<MenuItem, "name" | "price">, language: Language = "en") {
  return dish.price.amount === null || dish.price.currency !== "SGD" ? dish.name : dish.name + " · " + menuDisplayPrice(dish, language);
}
