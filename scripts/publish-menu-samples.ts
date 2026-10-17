import { readFileSync, writeFileSync } from "node:fs";
import { pilotCatalogue, currentPilotFingerprint } from "../src/server/pilot-catalogue";

const aliases: Record<string, string[]> = {
  "teng-bespoke-sunshine-plaza": ["Teng Bespoke"],
  "daily-green-woodlands-street-31": ["Daily Green"],
  "nomvnom-clarke-quay-central": ["nomVnom"],
  "lian-xin-buddha-tooth-relic-temple": ["Lian Xin"],
  "living-wholesome-fortune-centre": ["Living Wholesome"],
  "zhen-xiang-woodlands-street-32": ["Zheng Xiang Vegetarian", "Zhen Xiang Su Shi"],
};
const notices: Record<string, string> = {
  "daily-green-woodlands-street-31": "Historical PDF · current branch menu unconfirmed",
  "teng-bespoke-sunshine-plaza": "Ordering channel unavailable · branch status unconfirmed",
  "living-wholesome-fortune-centre": "Shared brand menu · branch availability unconfirmed",
  "bodhi-deli-fortune-centre": "Takeaway charges included",
};
const catalogue = pilotCatalogue();
const [action, ...ids] = process.argv.slice(2);
if (!["--publish", "--withdraw"].includes(action) || !ids.length || new Set(ids).size !== ids.length)
  throw new Error("Use --publish or --withdraw followed by explicitly reviewed venue IDs.");
const publication = JSON.parse(readFileSync("data/pilot/publication.json", "utf8")) as {
  version: number; venues: { id: string; status: string; fingerprint: string; aliases: string[]; notice: string }[];
};
if (publication.version !== 1 || !Array.isArray(publication.venues)) throw new Error("Invalid publication manifest");
const updates = ids.map(id => {
  const venue = catalogue.venues.find(venue => venue.id === id);
  if (!venue || !catalogue.dishes.some(dish => dish.venueId === id)) throw new Error("No menu for " + id);
  const previous = publication.venues.find(entry => entry.id === id);
  return { id, status: action === "--publish" ? "published" : "withdrawn", fingerprint: currentPilotFingerprint(venue),
    aliases: previous?.aliases ?? aliases[id] ?? [], notice: previous?.notice ?? notices[id] ?? "" };
});
publication.venues = [...publication.venues.filter(entry => !ids.includes(entry.id)), ...updates];
writeFileSync("data/pilot/publication.json", JSON.stringify(publication, null, 2) + "\n");
