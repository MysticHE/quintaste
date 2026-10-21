/**
 * Level pack checks (docs/game/RECIPE_LEVELS_PLAN.md §8, Phase 0): the built-in content round-trips through the pack
 * format, packs leave the rules version alone, a recipe pack plays through the real simulation with no new code, and
 * packs that would change built-in content or need a missing technique are refused.
 * Usage: npx tsx scripts/check-game-pack.ts [--expect <rulesVersion>]
 */
import { DISHES } from "../src/game/content/dishes";
import { ITEMS } from "../src/game/content/items";
import type { Level } from "../src/game/content/levels";
import { BUILTIN, builtinPack, packHash, PackError, readPack, registerPack, sameContent, type LevelPack } from "../src/game/content/pack";
import * as sim from "../src/game/sim/engine";
import { replay, ReplayError, rulesVersion, sameResult, type RunSetup } from "../src/game/sim/replay";
import { missionFor, TIERS, type Tier } from "../src/game/mission";
import { play } from "./game-bot";

const arg = (k: string) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : ""; };
let failures = 0;
const check = (ok: boolean, what: string) => { console.log((ok ? "ok   " : "FAIL ") + what); if (!ok) failures++; };
const refusedWith = (v: unknown, why: RegExp) => { try { registerPack(readPack(v)); return false; } catch (e) { return e instanceof PackError && why.test(e.message); } };

// 1. The built-in content written as a pack, read back, is the same content.
const before = rulesVersion, builtin = builtinPack();
check(sameContent(builtin.dishes, Object.values(BUILTIN.dishes)) && sameContent(builtin.items, Object.values(BUILTIN.items)) && sameContent(builtin.forms, BUILTIN.forms),
  `built-in content round-trips: ${builtin.dishes.length} dishes, ${builtin.items.length} items, ${Object.keys(builtin.forms).length} pan forms`);
check(registerPack(builtin) === packHash(builtin) && Object.keys(DISHES).length === builtin.dishes.length, "registering the built-in pack changes nothing");
const expect = arg("expect");
if (expect) check(rulesVersion === expect, `rules version ${rulesVersion} matches ${expect}`);

// 2. A real recipe as a pack: Cabbage, pea and coconut poriyal (live QuinTaste recipe), wok only, six new ingredients.
const fresh = (id: string, name: string, extra: object = {}) => ({ id, name, art: "card-" + id, tray: "fresh", ...extra });
const poriyal = {
  format: 1, id: "recipe-cabbage-peas-coconut-poriyal-r1", techniques: ["pan"],
  items: [fresh("mustard-seeds", "Mustard seeds"), fresh("urad-dal", "Urad dal"), fresh("curry-leaves", "Curry leaves"),
    fresh("green-chilli", "Green chilli", { tags: ["hot"] }), fresh("green-peas", "Green peas"), fresh("grated-coconut", "Grated coconut")],
  forms: { "mustard-seeds": { form: "sprinkle", tone: "dark" }, "urad-dal": { form: "sprinkle", tone: "white" } },
  dishes: [{
    id: "poriyal", name: "Cabbage poriyal", art: "dish-poriyal", recipeId: "cabbage-peas-coconut-poriyal",
    remember: "Let the mustard seeds pop before the dal goes in; fold the coconut in off the heat.",
    parts: [{ id: "poriyal", name: "Cabbage poriyal", station: "pan", stages: [
      { slots: [{ key: "oil", label: "Oil", accepts: ["cooking-oil"] }, { key: "seeds", label: "Mustard seeds", accepts: ["mustard-seeds"] }, { key: "dal", label: "Urad dal", accepts: ["urad-dal"] }], secs: 3, hint: "oil, mustard seeds and dal", scorchSecs: 1.5 },
      { slots: [{ key: "leaves", label: "Curry leaves", accepts: ["curry-leaves"] }, { key: "heat", label: "Chilli", accepts: ["green-chilli"], optional: true }], secs: 2, hint: "the curry leaves" },
      { slots: [{ key: "veg", label: "Cabbage", accepts: ["cabbage"] }, { key: "peas", label: "Peas", accepts: ["green-peas"] }, { key: "salt", label: "Salt", accepts: ["salt"] }], secs: 4, hint: "cabbage, peas and salt" },
      { slots: [{ key: "coconut", label: "Coconut", accepts: ["grated-coconut"] }], secs: 2, hint: "the coconut", band: [0.2, 0.45] },
    ] }],
  }],
};
let pack: LevelPack | null = null;
try { pack = readPack(JSON.parse(JSON.stringify(poriyal))); check(true, `poriyal pack is valid (${packHash(pack)})`); }
catch (e) { check(false, "poriyal pack is valid: " + (e as Error).message); }
if (pack) {
  check(packHash(readPack(JSON.parse(JSON.stringify(pack)))) === packHash(pack), "a pack hashes the same after a JSON round trip");
  registerPack(pack);
  check(!!DISHES.poriyal && !!ITEMS["curry-leaves"] && !BUILTIN.dishes.poriyal, "registering adds the dish and items, not to the built-in set");
  const level: Level = { n: 0, name: "Cabbage poriyal", brief: "Practice the poriyal.", teach: "Pop the seeds first.", stations: ["pan"], seats: 2, maxOpen: 2,
    round: 150, patience: 95, hints: "full", distractors: ["garlic"], unlocks: [],
    orders: [{ id: "a", guest: "office", dish: "poriyal", at: 1 }, { id: "b", guest: "daniel", dish: "poriyal", at: 14 }, { id: "c", guest: "nurul", dish: "poriyal", at: 40 }] };
  for (const react of [0.7, 2.2]) {
    const clears = [1, 2, 3, 4].filter(seed => play(sim.createRun(level, "sprout", [], undefined, seed), react).cleared).length;
    check(clears === 4, `the test player clears the poriyal level at ${react} s per action on ${clears}/4 seeds`);
  }

  // 3. Missions built from the pack, played and replayed the way the server settles them.
  const hash = packHash(pack);
  for (const tier of TIERS) {
    const mission = missionFor(pack, tier), guests = [...new Set(mission.orders.map(o => o.guest))].join(", ");
    for (const react of [2.2, 3.2]) {
      let clears = 0, replays = 0;
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const run = sim.createRun(mission, "sprout", [], undefined, seed), result = play(run, react);
        if (result.cleared) clears++;
        const setup: RunSetup = { level: 0, mission: { pack: hash, tier }, pet: "sprout", signature: [], seed };
        try { if (sameResult(sim.results(replay(setup, JSON.parse(JSON.stringify(run.actions)))), result)) replays++; } catch { /* counted as a failed replay */ }
      }
      check(replays === 6, `${tier}: ${replays}/6 replays match (${react} s)`);
      if (react === 2.2) check(clears >= 5, `${tier}: the test player clears ${clears}/6 seeds at 2.2 s (${mission.orders.length} orders for ${guests}, ${mission.round} s)`);
      else console.log(`info ${tier}: ${clears}/6 seeds cleared at 3.2 s`);
    }
  }
  const one = sim.createRun(missionFor(pack, "service"), "sprout", [], undefined, 7), res = play(one, 0.7);
  const setup: RunSetup = { level: 0, mission: { pack: hash, tier: "service" }, pet: "sprout", signature: [], seed: 7 };
  check(!sameResult(sim.results(replay(setup, one.actions)), { ...res, stars: res.stars === 3 ? 2 : res.stars + 1 }), "a claimed extra star does not match the replay");
  const refusesReplay = (s: RunSetup) => { try { replay(s, one.actions); return false; } catch (e) { return e instanceof ReplayError; } };
  check(refusesReplay({ ...setup, mission: { pack: "punknown", tier: "service" } }), "a run naming an unknown pack is refused");
  check(refusesReplay({ ...setup, mission: { pack: hash, tier: "expert" as Tier } }), "a run naming an unknown tier is refused");
}
check(rulesVersion === before, "registering packs leaves the rules version unchanged");

// 4. Packs that must be refused.
const base = () => JSON.parse(JSON.stringify(poriyal));
check(refusedWith({ ...base(), id: "x-garlic", items: [...base().items, { id: "garlic", name: "Garlic", art: "garlic", tray: "fresh" }] }, /already exists/), "a pack cannot redefine a built-in item (garlic without its allium tag)");
check(refusedWith({ ...base(), id: "x-oven", techniques: ["pan", "oven"] }, /needs oven/), "a pack needing an unbuilt technique says what it needs");
const ghost = base(); ghost.id = "x-ghost"; ghost.dishes[0].parts[0].stages[0].slots[0].accepts = ["lard"];
check(refusedWith(ghost, /unknown item lard/), "a slot naming an unknown item is refused");
check(refusedWith({ ...base(), id: "x-extra", script: "alert(1)" }, /unknown field script/), "unknown fields are refused");
const wrongStation = base(); wrongStation.id = "x-station"; wrongStation.dishes[0].parts[0].station = "pot";
check(refusedWith(wrongStation, /station not in techniques/), "a part on a station the pack doesn't declare is refused");

console.log(failures ? `\n${failures} check(s) failed` : "\nAll pack checks passed");
process.exit(failures ? 1 : 0);
