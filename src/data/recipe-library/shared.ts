import type { Dietary, Evidence } from "../../types/food";

export const editorial = (checkedAt: string): Evidence => ({ kind: "editorial", source: "QuinTaste editorial sample · preview", checkedAt });
export const sampleMeta = (updatedAt: string) => ({ author: "QuinTaste sample kitchen", language: "English", revision: 1, updatedAt });
export const vegan = (contains: Dietary["contains"], checkedAt = "2026-10-17"): Dietary => ({ diet: "Vegan", contains, ingredientsKnown: true, evidence: editorial(checkedAt) });
export const minutes = (value: number) => value * 60;
