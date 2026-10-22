/**
 * Recipe levels trial (docs/game/RECIPE_LEVELS_PLAN.md §6, Phase 0): turns the app's live recipes into level packs with the code
 * steps of the pipeline (src/game/compile.ts) and reports which play with no new code. The AI shaping step is not run here; the code
 * shape (`codeShape`) only merges steps, so results are a floor for validity, not the pipeline's level quality. New ingredients go on
 * an in-memory shared list, as the server's game.item does, so two recipes never define the same ingredient differently.
 * Read-only: fetches the public recipe routes and writes nothing to the app.
 * Usage: npx tsx scripts/recipe-levels-trial.ts [--api https://…] [--offline] [--out .local/recipe-levels/trial-report.json]
 */
import { writeFileSync } from "node:fs";
import { STATIONS } from "../src/game/content/dishes";
import type { GameItem } from "../src/game/content/items";
import { packHash, PackError, registerPack } from "../src/game/content/pack";
import { buildPack, builtinFor, codeShape, compileRecipe, newItem, type RecipeInput, type Resolved } from "../src/game/compile";
import { missionFor } from "../src/game/mission";
import * as sim from "../src/game/sim/engine";
import { play } from "../src/game/sim/bot";
import { bundledRecipes } from "../src/data/recipes";

const arg = (k: string, d = "") => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const API = arg("api", "https://quintaste.srv1902914.hstgr.cloud"), OUT = arg("out", ".local/recipe-levels/trial-report.json");
type Recipe = RecipeInput & { source: string };
type Outcome = { id: string; name: string; source: string; result: "playable" | "needs technique" | "failed check"; needs: string[]; shortcuts: string[];
  stations: string[]; stages: number; newItems: string[]; unreviewed: number; clears: string; note: string };

async function recipes(): Promise<Recipe[]> {
  const out: Recipe[] = bundledRecipes(true).map(r => ({ id: r.id, name: r.name, categories: r.categories, ingredients: r.ingredients, steps: r.steps, source: "bundled" }));
  if (process.argv.includes("--offline")) return out;
  const get = async (path: string) => (await fetch(API + path)).json();
  for (const it of (await get("/api/editorial/recipes")).items) out.push({ ...await get("/api/editorial/recipes/" + it.id), source: "QuinTaste" });
  for (const it of (await get("/api/recipes")).items) { const r = await get("/api/recipes/" + it.id); out.push({ ...(r.recipe ?? r), source: "member" }); }
  return out;
}

async function main() {
  const shared = new Map<string, GameItem>(), outcomes: Outcome[] = [];
  // The shared list: a new ingredient is added once and every later recipe reuses that same entry.
  const resolve = (name: string): Resolved => {
    const built = builtinFor(name);
    if (built !== undefined) return built === null ? null : { id: built };
    const fresh = newItem(name), item = shared.get(fresh.id) ?? fresh;
    shared.set(item.id, item);
    return { id: item.id, item, unreviewed: true };
  };
  for (const r of await recipes()) {
    const base = { id: r.id, name: r.name, source: r.source };
    try {
      const c = compileRecipe(r, resolve);
      if (c.needs.length) { outcomes.push({ ...base, result: "needs technique", needs: c.needs, shortcuts: c.shortcuts, stations: [], stages: 0, newItems: [], unreviewed: 0, clears: "", note: "" }); continue; }
      const shape = codeShape(c), pack = buildPack(r, c, shape);
      registerPack(pack);
      const mission = missionFor(pack, "service"), clears = [1, 2, 3, 4, 5, 6].filter(seed => play(sim.createRun(mission, "sprout", [], undefined, seed), 2.2).cleared).length;
      outcomes.push({ ...base, result: clears >= 5 ? "playable" : "failed check", needs: [], shortcuts: c.shortcuts, stations: shape.parts.map(p => STATIONS[p.station].name),
        stages: shape.parts.reduce((n, p) => n + p.stages.length, 0), newItems: pack.items.map(i => i.name), unreviewed: pack.unreviewed?.length ?? 0, clears: clears + "/6", note: packHash(pack) });
    } catch (error) {
      outcomes.push({ ...base, result: "failed check", needs: [], shortcuts: [], stations: [], stages: 0, newItems: [], unreviewed: 0, clears: "",
        note: error instanceof PackError ? "pack: " + error.message : String((error as Error).message).slice(0, 120) });
    }
  }
  for (const o of outcomes) console.log([o.result.padEnd(15), o.name.slice(0, 38).padEnd(38), o.source.padEnd(9), o.needs.length ? "needs " + o.needs.join("+")
    : `${o.stations.join("+")} · ${o.stages} stages · ${o.newItems.length} new · ${o.clears}${o.shortcuts.length ? " · shortcut " + o.shortcuts.join("+") : ""}${o.note.startsWith("pack") ? " · " + o.note : ""}`].join(" | "));
  const count = (k: Outcome["result"]) => outcomes.filter(o => o.result === k).length, playable = outcomes.filter(o => o.result === "playable");
  const summary = { at: new Date().toISOString(), recipes: outcomes.length, playable: count("playable"), needsTechnique: count("needs technique"), failedCheck: count("failed check"),
    needs: Object.fromEntries([...new Set(outcomes.flatMap(o => o.needs))].map(t => [t, outcomes.filter(o => o.needs.includes(t)).length])),
    sharedIngredients: shared.size, newPicturesPerPlayable: playable.length ? +(playable.reduce((n, o) => n + o.newItems.length + 1, 0) / playable.length).toFixed(1) : 0,
    aiShaping: "not run (compile, code shape and checks only)" };
  console.log("\n" + JSON.stringify(summary));
  writeFileSync(OUT, JSON.stringify({ summary, outcomes }, null, 1));
}
main().catch(error => { console.error(error); process.exit(1); });
