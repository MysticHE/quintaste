import type { PilotCatalogue } from "../src/types/pilot-catalogue";

export function formatPilotCatalogue(catalogue: PilotCatalogue) {
  const keys = ["sources", "venues", "menus", "dishes", "candidates"] as const;
  const { sources: _sources, venues: _venues, menus: _menus, dishes: _dishes, candidates: _candidates, ...meta } = catalogue;
  const lines = ["{", ...Object.entries(meta).map(([key, value]) => "  " + JSON.stringify(key) + ": " + JSON.stringify(value) + ",")];
  keys.forEach((key, index) => {
    lines.push("  " + JSON.stringify(key) + ": [");
    catalogue[key].forEach((record, i, records) => lines.push("    " + JSON.stringify(record) + (i < records.length - 1 ? "," : "")));
    lines.push("  ]" + (index < keys.length - 1 ? "," : ""));
  });
  return lines.concat("}", "").join("\n");
}
