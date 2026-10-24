import { readLabels, type DietLabel } from "./diet-labels";
export const palettes = ["coral", "cobalt", "lavender"] as const;
export const displayModes = ["light", "dark", "system"] as const;
/** Interface language (a device setting, see src/i18n): "system" follows the phone; content keeps its own language. */
export const languageChoices = ["system", "en", "zh"] as const;
export const alliums = ["Garlic", "Onion", "Leeks", "Chives", "Scallions", "Shallots", "Asafoetida"] as const;
export const animalExclusions = ["Eggs", "Dairy", "Honey"] as const;
export const otherExclusions = ["Peanuts", "Tree nuts", "Gluten", "Mushrooms"] as const;
/** Kept separate from otherExclusions so Market ingredient choices are unchanged. */
export const traditionExclusions = ["Root vegetables"] as const;
export const exclusions = [...alliums, ...animalExclusions, ...otherExclusions, ...traditionExclusions] as const;
export type Palette = (typeof palettes)[number];
export type DisplayMode = (typeof displayModes)[number];
export type LanguageChoice = (typeof languageChoices)[number];
export type Language = Exclude<LanguageChoice, "system">;
/** One name everywhere for avoiding garlic, onion, leek, chives and asafoetida; screen readers hear the English. */
export const fivePungentLabel = "No five pungent (五辛)", fivePungentSpoken = "No five pungent";
/** The labels someone keeps, as one line ("Vegan · Vegetarian"). */
export const dietSummary = (labels: readonly DietLabel[]) => labels.join(" · ");
export type Exclusion = (typeof exclusions)[number];
/** Display names for each exclusion (keys in the common messages); the stored values above stay English. */
export const exclusionNameKeys = {
  Garlic: "exGarlic", Onion: "exOnion", Leeks: "exLeeks", Chives: "exChives", Scallions: "exScallions", Shallots: "exShallots",
  Asafoetida: "exAsafoetida", Eggs: "exEggs", Dairy: "exDairy", Honey: "exHoney", Peanuts: "exPeanuts", "Tree nuts": "exTreeNuts",
  Gluten: "exGluten", Mushrooms: "exMushrooms", "Root vegetables": "exRootVegetables",
} as const satisfies Record<Exclusion, string>;
/** Named starting points that expand into editable chips; observance varies, so none is a certification. */
export const exclusionPresets: { label: string; nameKey: "presetFivePungent" | "presetJain"; items: readonly Exclusion[] }[] = [
  { label: "No five pungent (五辛)", nameKey: "presetFivePungent", items: alliums },
  { label: "Jain", nameKey: "presetJain", items: [...alliums, "Root vegetables", "Mushrooms", "Eggs", "Honey"] },
];
export type Preferences = {
  /** Labels this person keeps (src/config/diet-labels.ts): Plant-Based alone, or Vegan and/or Vegetarian. */
  displayName: string; bio: string; diets: DietLabel[]; palette: Palette; mode: DisplayMode;
  excluded: Exclusion[]; reduceMotion: boolean; readerHints: boolean; sounds: boolean;
  textSize: "system" | "large" | "larger";
  activityUpdates: boolean; socialRequests: boolean; productSuggestions: boolean;
};
export const defaults: Preferences = {
  displayName: "Food friend", bio: "", diets: ["Plant-Based"], palette: "coral", mode: "system",
  excluded: [], reduceMotion: false, readerHints: true, sounds: true, textSize: "system",
  activityUpdates: false, socialRequests: false, productSuggestions: false,
};
function inList<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback;
}
/**
 * Labels from saved preferences. Before 20 Oct 2026 one `diet` was stored: Vegan stays Vegan; the old Vegetarian (eggs
 * and dairy allowed, onion and garlic not asked) and "Mostly plant-based" become Plant-Based; anyone who excluded all
 * five pungent also keeps the new Vegetarian.
 */
function readDiets(p: Record<string, unknown>): DietLabel[] {
  const saved = readLabels(p.diets);
  if (saved.length) return saved.includes("Plant-Based") ? ["Plant-Based"] : saved;
  const excluded = Array.isArray(p.excluded) ? p.excluded : [];
  const noPungent = alliums.every(item => excluded.includes(item));
  const labels: DietLabel[] = [...(p.diet === "Vegan" ? ["Vegan" as const] : []), ...(noPungent ? ["Vegetarian" as const] : [])];
  return labels.length ? labels : ["Plant-Based"];
}
export function readPreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved preferences");
  const p = value as Record<string, unknown>;
  return {
    displayName: typeof p.displayName === "string" && p.displayName.trim()
      ? p.displayName.trim().slice(0, 50) : defaults.displayName,
    bio: typeof p.bio === "string" ? p.bio.slice(0, 160) : "",
    diets: readDiets(p), palette: inList(p.palette, palettes, defaults.palette),
    mode: inList(p.mode, displayModes, defaults.mode),
    excluded: Array.isArray(p.excluded) ? [...new Set(p.excluded.filter((x): x is Exclusion =>
      typeof x === "string" && exclusions.includes(x as Exclusion)))] : [],
    reduceMotion: p.reduceMotion === true, readerHints: p.readerHints !== false, sounds: p.sounds !== false,
    textSize: inList(p.textSize, ["system", "large", "larger"], "system"),
    activityUpdates: p.activityUpdates === true, socialRequests: p.socialRequests === true,
    productSuggestions: p.productSuggestions === true,
  };
}
