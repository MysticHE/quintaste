import type { MenuItem } from "../../src/types/menus";

type Row = Record<string, unknown>;
const record = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);
const list = (v: unknown): Row[] => Array.isArray(v) ? v.filter(record) : [];
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const active = (r: Row) => r.disabled !== true && r.inStock !== false && r.availableAtSource !== false
  && r.catalogueAvailable !== false && (r.sourceStatusCode === undefined || r.sourceStatusCode === 0);
const cents = (n: number) => Math.round(n * 100) / 100;
function money(v: unknown, currency: string): number | undefined {
  return record(v) && number(v.amount) && v.currency === currency ? v.amount : undefined;
}
function groupsRange(groups: Row[], currency: string): [number, number] | undefined {
  let low = 0, high = 0;
  for (const group of groups) {
    const choices = list(group.options ?? group.choices).filter(active);
    if (!choices.length) return;
    const amounts = choices.map(choice => {
      if (list(choice.groups).length || list(choice.modifierGroups).length) return undefined;
      return money(choice.additionalPrice, currency) ?? (choice.currency === currency
        ? [choice.additionalAmount, choice.increment].find(number) : undefined);
    });
    if (amounts.some(value => value === undefined)) return;
    const values = (amounts as number[]).sort((a, b) => a - b);
    if (values.every(value => value === 0)) continue;
    const max = [group.maximumChoices, group.maxChoices, group.maxSelection, group.maxSelections,
      group.maximumSelections, group.maximumQuantity, group.maximum].find(number);
    let min = [group.minimumChoices, group.minChoices, group.minSelection, group.minSelections,
      group.minimumSelections, group.minimumQuantity, group.minimum].find(number);
    if (min === undefined && group.required === false) min = 0;
    if (min === undefined && group.required === true && max === 1) min = 1;
    if (min === undefined || max === undefined || !Number.isInteger(min) || !Number.isInteger(max) || min > max) return;
    // More than one choice needs an explicit no-repeat constraint. Never infer
    // an unlimited quantity or combine unrelated order-channel prices.
    if (max > 1 && group.selectableOnce !== true && group.selectableOnce !== 1 && group.limitPerChoice !== 1) return;
    if (max > values.length) return;
    low += values.slice(0, min).reduce((a, b) => a + b, 0);
    high += max ? values.slice(-max).reduce((a, b) => a + b, 0) : 0;
  }
  return [low, high];
}

export function displayPriceRange(item: Row, base: MenuItem["price"]): MenuItem["price"] {
  if (base.amount === null) return base;
  const variants = [...list(item.priceVariants), ...list(item.portionOptions), ...list(item.unlabelledVariationPrices), ...list(item.packagePriceOptions)].filter(active);
  const groups = [...list(item.modifierGroups), ...list(item.optionGroups), ...list(item.foodChoiceGroups)];
  const incomplete = item.hasUnreadChoices === true || !!item.conditionalPrices || !!item.conditionalAlternatePrice || !!item.printedExtras;
  const candidates = variants.length ? variants.map(variant => ({
    amount: money(variant.price, base.currency) ?? money(variant, base.currency),
    groups: [...groups, ...list(variant.modifierGroups), ...list(variant.optionGroups)],
  })) : [{ amount: base.amount, groups }];
  let lower = Infinity, upper = -Infinity;
  for (const candidate of candidates) {
    if (candidate.amount === undefined) return { ...base, type: "from" };
    const range = groupsRange(candidate.groups, base.currency);
    if (!range || incomplete) return { ...base, type: "from" };
    lower = Math.min(lower, candidate.amount + range[0]);
    upper = Math.max(upper, candidate.amount + range[1]);
  }
  if (!variants.length && !groups.length) return incomplete ? { ...base, type: "from" } : base;
  return { amount: cents(lower), currency: base.currency, type: "displayed",
    ...(upper > lower ? { maxAmount: cents(upper) } : {}) };
}
