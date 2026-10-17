import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import type { PilotCatalogue } from "../src/types/pilot-catalogue";
import { formatPilotCatalogue } from "./format-pilot-catalogue";
import { readPilotCatalogue } from "../src/utils/pilot-schema";

const [action, ...names] = process.argv.slice(2);
if (!["--check", "--merge"].includes(action) || !names.length || names.some(name => !/^menu-expansion-[a-z-]+$/.test(name))
  || new Set(names).size !== names.length) throw new Error("Use --check or --merge followed by menu-expansion research names.");
const read = (file: string) => readPilotCatalogue(JSON.parse(readFileSync(file, "utf8")));
const target = resolve("data/pilot/catalogue.json"), initial = read(target);
const fragments = names.map(name => read(resolve("data/pilot/research", name + ".json")));
const ids = fragments.flatMap(fragment => fragment.venues.map(venue => venue.id));
if (new Set(ids).size !== ids.length) throw new Error("Research fragments overlap branches. Resolve ownership before merging.");
const replace = <T extends { id: string }>(old: T[], added: T[]) => [...new Map([...old, ...added].map(item => [item.id, item])).values()];
const owned = new Set(ids);
const merged = readPilotCatalogue({ ...initial,
  checkedAt: [initial.checkedAt, ...fragments.map(fragment => fragment.checkedAt)].sort().at(-1),
  sources: replace(initial.sources, fragments.flatMap(fragment => fragment.sources)),
  venues: replace(initial.venues, fragments.flatMap(fragment => fragment.venues)),
  menus: [...initial.menus.filter(menu => !owned.has(menu.venueId)), ...fragments.flatMap(fragment => fragment.menus)],
  dishes: [...initial.dishes.filter(dish => !owned.has(dish.venueId)), ...fragments.flatMap(fragment => fragment.dishes)],
  candidates: replace(initial.candidates, fragments.flatMap(fragment => fragment.candidates)).filter(candidate => !owned.has(candidate.id)),
});
const beverageCategories = /^(?:beverages?|drinks?|hot beverages?|cold drinks?|smoothies|juices?|coffee|tea|wine|beer|spirits)$/i;
if (merged.dishes.some(dish => beverageCategories.test(dish.category?.trim() ?? "")))
  throw new Error("Beverage category found in dish research. Review before merging.");
const identity = (dish: PilotCatalogue["dishes"][number]) => JSON.stringify([dish.menuId, dish.name.toLocaleLowerCase(), dish.price, dish.qualifier ?? ""]);
if (new Set(merged.dishes.map(identity)).size !== merged.dishes.length) throw new Error("Duplicate dishes within a source menu.");
if (action === "--merge") {
  const temporary = target + "." + randomUUID() + ".tmp";
  try { writeFileSync(temporary, formatPilotCatalogue(merged), { flag: "wx" }); renameSync(temporary, target); }
  finally { if (existsSync(temporary)) unlinkSync(temporary); }
}
console.info(JSON.stringify({ action, venues: merged.venues.length, menus: merged.menus.length, sources: merged.sources.length,
  dishRows: merged.dishes.length, previousDishRows: initial.dishes.length, pendingCandidates: merged.candidates.length }));
