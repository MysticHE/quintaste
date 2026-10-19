/**
 * Fictional adult regulars (GAME_PLAN §7). Reasons are self-stated, never inferred; allergies are never ticket rules.
 * The kitchen is vegetarian, so every guest refuses hidden animal ingredients.
 */
import { factsOf, ITEMS, type Flip, type ItemTag } from "./items";

export type Rule = "vegan" | "five" | "jain" | "nomeat" | "nomush" | "mild";
export type Guest = { id: string; name: string; art: string; artNo?: string; rules: Rule[]; first: number;
  quote: string; hello: string; thanks: string; notes: string[] };

/** `chip` is the full label; `short` fits an order bubble over a narrow seat. */
export const RULES: Record<Rule, { chip: string; short: string; spoken: string; tags: ItemTag[] }> = {
  vegan: { chip: "Vegan", short: "Vegan", spoken: "vegan", tags: ["egg", "dairy", "honey"] },
  five: { chip: "No five pungent 五辛", short: "No pungent", spoken: "no five pungent", tags: ["allium"] },
  jain: { chip: "Jain", short: "Jain", spoken: "Jain", tags: ["allium", "root", "mushroom", "egg", "honey"] },
  nomeat: { chip: "No meat or seafood", short: "No meat", spoken: "no meat or seafood", tags: [] },
  nomush: { chip: "No mushrooms", short: "No mushroom", spoken: "no mushrooms", tags: ["mushroom"] },
  mild: { chip: "Less spicy", short: "Less spicy", spoken: "less spicy", tags: ["hot"] },
};

export const GUESTS: Record<string, Guest> = Object.fromEntries(([
  { id: "office", name: "Office lunch", art: "guest-office", rules: [], first: 1, quote: "Same seat, every weekday at noon.",
    hello: "One {dish}, please. Anything goes.", thanks: "Shiok. Thank you!", notes: ["Always orders before checking the menu.", "Saves the last bite for later.", "Brought a colleague once; now they both come."] },
  { id: "daniel", name: "Daniel", art: "guest-daniel", rules: ["vegan"], first: 2, quote: "Started for the planet, stayed for the food.",
    hello: "{dish}, please. I'm vegan, so no egg, dairy or honey.", thanks: "Perfect, thank you!", notes: ["Went vegan after a climate talk.", "Bakes egg-free cakes for friends.", "Asks for the recipe every time."] },
  { id: "mei", name: "Auntie Mei", art: "guest-mei", artNo: "guest-mei-no", rules: ["five"], first: 5, quote: "My mother kept the lunar days. Now I do.",
    hello: "{dish}. Today no five pungent, ah.", thanks: "Smells right. Thank you, ah.", notes: ["Keeps no five pungent on the 1st and 15th.", "Brings her own tea some days.", "Taught her grandson to read labels."] },
  { id: "jia", name: "Jia Hui", art: "guest-jia", rules: ["nomeat"], first: 7, quote: "Trying one new dish a week.",
    hello: "One {dish}, please! Meat-free weekdays for me.", thanks: "So good, thanks!", notes: ["Started meat-free weekdays in January.", "Keeps a list of every new dish.", "Now cooks one of them at home."] },
  { id: "lim", name: "Uncle Lim", art: "guest-lim", rules: ["nomush"], first: 8, quote: "Since young, cannot.",
    hello: "{dish}. No mushrooms, ah.", thanks: "Very nice. Thank you.", notes: ["Has never liked mushrooms.", "Reads the newspaper with lunch.", "Tips the cook in compliments."] },
  { id: "nurul", name: "Nurul", art: "guest-nurul", rules: ["mild"], first: 8, quote: "I like taste, not pain.",
    hello: "{dish}, less spicy please.", thanks: "Just right. Thank you!", notes: ["Loves sambal, in tiny amounts.", "Always orders a drink first.", "Brings her nephews on Saturdays."] },
  { id: "asha", name: "Asha", art: "guest-asha", rules: ["jain"], first: 17, quote: "No roots, no onions, no mushrooms, no eggs.",
    hello: "{dish}, Jain please.", thanks: "Thank you for taking care.", notes: ["Keeps Jain food every day.", "Eats before sunset when she can.", "Shares recipes from her grandmother."] },
] as Guest[]).map(g => [g.id, g]));

/** The rules of everyone who shares one pot (a party, plus any rules every guest keeps): a dish for them must respect all of them. */
export const unionRules = (...lists: Rule[][]): Rule[] => [...new Set(lists.flat())];

/** Items in a list that break a guest's rules. Hidden animal ingredients break every order in a vegetarian kitchen. */
export function conflicts(itemIds: string[], rules: Rule[], flip?: Flip): string[] {
  const banned = new Set<ItemTag>(["animal", ...rules.flatMap(r => RULES[r].tags)]);
  return itemIds.filter(id => (factsOf(id, flip)?.tags ?? []).some(t => banned.has(t)));
}

/** One short reason, used in the dialogue panel and saved to the pantry book. */
export function reason(itemId: string, rules: Rule[], flip?: Flip): string {
  const shown = ITEMS[itemId]; if (!shown) return "";
  const it = factsOf(itemId, flip), tags = it.tags ?? [], name = shown.name + (shown.variant ? " " + shown.variant : "");
  if (tags.includes("animal")) return name + " lists " + (it.label?.flagged ?? "an animal ingredient") + ". This is a vegetarian kitchen.";
  if (tags.includes("allium") && (rules.includes("five") || rules.includes("jain")))
    return it.label ? name + " lists " + it.label.flagged + ", one of the five pungent." : name + " is one of the five pungent." + (rules.includes("jain") ? "" : " Ginger is a common swap.");
  if (tags.includes("root") && rules.includes("jain")) return name + " is a root vegetable, which Jain food avoids.";
  if (tags.includes("mushroom") && (rules.includes("nomush") || rules.includes("jain"))) return name + " is a mushroom." + (rules.includes("nomush") ? " Black beans or tempeh give the same savoury bite." : "");
  if (tags.includes("egg")) return it.label ? name + " lists egg, so it isn't vegan." : "Egg is vegetarian, but not vegan.";
  if (tags.includes("honey")) return "Honey is not vegan.";
  if (tags.includes("dairy")) return "Milk is dairy, so it isn't vegan.";
  if (tags.includes("hot")) return name + " is extra heat. Leave it out for a less spicy order.";
  return "";
}
