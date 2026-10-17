export const palettes = ["coral", "cobalt", "lavender"] as const;
export const displayModes = ["light", "dark", "system"] as const;
export const diets = ["Vegan", "Vegetarian", "Plant-based"] as const;
export const alliums = ["Garlic", "Onion", "Leeks", "Chives", "Scallions", "Shallots", "Asafoetida"] as const;
export const animalExclusions = ["Eggs", "Dairy", "Honey"] as const;
export const otherExclusions = ["Peanuts", "Tree nuts", "Gluten", "Mushrooms"] as const;
/** Kept separate from otherExclusions so Market ingredient choices are unchanged. */
export const traditionExclusions = ["Root vegetables"] as const;
export const exclusions = [...alliums, ...animalExclusions, ...otherExclusions, ...traditionExclusions] as const;
export type Palette = (typeof palettes)[number];
export type DisplayMode = (typeof displayModes)[number];
export type Diet = (typeof diets)[number];
export type Exclusion = (typeof exclusions)[number];
/** Named starting points that expand into editable chips; observance varies, so none is a certification. */
export const exclusionPresets: { label: string; items: readonly Exclusion[] }[] = [
  { label: "Five pungent-free", items: alliums },
  { label: "Jain", items: [...alliums, "Root vegetables", "Mushrooms", "Eggs", "Honey"] },
];
export type Preferences = {
  displayName: string; bio: string; diet: Diet; palette: Palette; mode: DisplayMode;
  excluded: Exclusion[]; reduceMotion: boolean; readerHints: boolean;
  textSize: "system" | "large" | "larger";
  activityUpdates: boolean; socialRequests: boolean; productSuggestions: boolean;
};
export const defaults: Preferences = {
  displayName: "Food friend", bio: "", diet: "Plant-based", palette: "coral", mode: "system",
  excluded: [], reduceMotion: false, readerHints: true, textSize: "system",
  activityUpdates: false, socialRequests: false, productSuggestions: false,
};
function inList<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback;
}
export function readPreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved preferences");
  const p = value as Record<string, unknown>;
  return {
    displayName: typeof p.displayName === "string" && p.displayName.trim()
      ? p.displayName.trim().slice(0, 50) : defaults.displayName,
    bio: typeof p.bio === "string" ? p.bio.slice(0, 160) : "",
    diet: inList(p.diet, diets, defaults.diet), palette: inList(p.palette, palettes, defaults.palette),
    mode: inList(p.mode, displayModes, defaults.mode),
    excluded: Array.isArray(p.excluded) ? [...new Set(p.excluded.filter((x): x is Exclusion =>
      typeof x === "string" && exclusions.includes(x as Exclusion)))] : [],
    reduceMotion: p.reduceMotion === true, readerHints: p.readerHints !== false,
    textSize: inList(p.textSize, ["system", "large", "larger"], "system"),
    activityUpdates: p.activityUpdates === true, socialRequests: p.socialRequests === true,
    productSuggestions: p.productSuggestions === true,
  };
}
