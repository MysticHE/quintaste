/**
 * Level pack checks (docs/game/RECIPE_LEVELS_PLAN.md §8, Phase 0): the built-in content round-trips through the pack
 * format, packs leave the rules version alone, a recipe pack plays through the real simulation with no new code, and
 * packs that would change built-in content or need a missing technique are refused.
 * Usage: npx tsx scripts/check-game-pack.ts [--expect <rulesVersion>]
 */
import { builtinFor, compileRecipe, shapeProblem, type Shape } from "../src/game/compile";
import { chanceFor, forYou, newest, type ShelfLevel } from "../src/game/kitchen-rows";
import { readGame } from "../src/game/progress";
import { DISHES } from "../src/game/content/dishes";
import { ITEMS } from "../src/game/content/items";
import type { Level } from "../src/game/content/levels";
import { BUILTIN, builtinPack, packHash, PackError, readPack, registerPack, sameContent, type LevelPack } from "../src/game/content/pack";
import * as sim from "../src/game/sim/engine";
import { replay, ReplayError, rulesVersion, sameResult, type RunSetup } from "../src/game/sim/replay";
import { cafeFor, missionFor, TIERS, type Tier } from "../src/game/mission";
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

// 2. A real recipe as a pack: Cabbage, pea and coconut poriyal (live QuinTaste recipe), wok only, four new ingredients (green chilli and grated coconut are built in).
const fresh = (id: string, name: string, extra: object = {}) => ({ id, name, art: "card-" + id, tray: "fresh", ...extra });
const poriyal = {
  format: 1, id: "recipe-cabbage-peas-coconut-poriyal-r1", techniques: ["pan"],
  items: [fresh("x-mustard-seeds", "Mustard seeds"), fresh("x-curry-leaves", "Curry leaves")],
  forms: { "x-mustard-seeds": { form: "sprinkle", tone: "dark" } },
  dishes: [{
    id: "poriyal", name: "Cabbage poriyal", art: "dish-poriyal", recipeId: "cabbage-peas-coconut-poriyal",
    remember: "Let the mustard seeds pop before the dal goes in; fold the coconut in off the heat.",
    parts: [{ id: "poriyal", name: "Cabbage poriyal", station: "pan", stages: [
      { slots: [{ key: "oil", label: "Oil", accepts: ["cooking-oil"] }, { key: "seeds", label: "Mustard seeds", accepts: ["x-mustard-seeds"] }, { key: "dal", label: "Urad dal", accepts: ["urad-dal"] }], secs: 3, hint: "oil, mustard seeds and dal", scorchSecs: 1.5 },
      { slots: [{ key: "leaves", label: "Curry leaves", accepts: ["x-curry-leaves"] }, { key: "heat", label: "Chilli", accepts: ["green-chilli"], optional: true }], secs: 2, hint: "the curry leaves" },
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
  check(!!DISHES.poriyal && !!ITEMS["x-curry-leaves"] && !BUILTIN.dishes.poriyal, "registering adds the dish and items, not to the built-in set");
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
  // The Gather round (From memory only): the recipe's ingredients fill the basket, look-alikes are refused, and guests wait for it.
  const mem = missionFor(pack, "memory"), g = sim.createRun(mem, "sprout", [], undefined, 3);
  check(!missionFor(pack, "service").gather && !!mem.gather && mem.gather.need.length >= 4 && mem.gather.decoys.length > 0 && mem.gather.decoys.every(d => !mem.gather!.need.flat().includes(d)),
    `From memory alone has a Gather round (${mem.gather?.need.length} ingredients, look-alikes ${mem.gather?.decoys.join(", ")})`);
  sim.start(g);
  check(!sim.place(g, mem.gather!.need[0][0], "pan"), "nothing goes on a station while gathering");
  check(!sim.gatherItem(g, mem.gather!.decoys[0]) && g.stats.mistakes === 1, "a look-alike is refused and counts as a mistake");
  check(!sim.gatherItem(g, "green-chilli") && g.stats.mistakes === 1 && /optional/.test(g.say.text), "an optional ingredient isn't needed and isn't a mistake");
  for (let i = 0; i < 40; i++) sim.tick(g);
  check(g.t === 0 && g.timeLeft < mem.round && g.guests.every(x => x.state === "queue"), "the clock runs while gathering and guests wait");
  mem.gather!.need.forEach(group => sim.gatherItem(g, group[0]));
  sim.tick(g);
  check(!sim.gathering(g) && g.t > 0, "a full basket starts the service");
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
check(refusedWith({ ...base(), id: "x-pressure", techniques: ["pan", "pressure-cooker"] }, /needs pressure-cooker/), "a pack needing an unbuilt technique says what it needs");
const ghost = base(); ghost.id = "x-ghost"; ghost.dishes[0].parts[0].stages[0].slots[0].accepts = ["lard"];
check(refusedWith(ghost, /unknown item lard/), "a slot naming an unknown item is refused");
check(refusedWith({ ...base(), id: "x-extra", script: "alert(1)" }, /unknown field script/), "unknown fields are refused");
const wrongStation = base(); wrongStation.id = "x-station"; wrongStation.dishes[0].parts[0].station = "pot";
check(refusedWith(wrongStation, /station not in techniques/), "a part on a station the pack doesn't declare is refused");

// 5. Recipe Kitchen rows (kitchen-rows.ts): For you sits in the 60-80% band, saved recipes first; New covers what few have played.
{
  const game = readGame({ best: { "1": { stars: 1, clears: 1 } } });
  const lv = (hash: string, rating: number, extra: Partial<ShelfLevel> = {}): ShelfLevel => ({ hash, recipeId: "r-" + hash, techniques: ["pan"], best: {},
    ratings: { learn: { rating, players: 0 } }, added: "2026-10-0" + hash.length, ...extra });
  const shelf = [lv("a", 1500), lv("bb", 1350), lv("ccc", 1330), lv("dddd", 1100), lv("e", 1340, { techniques: ["pot"] }), lv("f", 1340, { held: true }),
    lv("g", 1340, { best: { learn: { clears: 1 }, service: { clears: 1 }, memory: { clears: 1 } } })];
  const mine = forYou(shelf, 1500, game, new Set(["r-ccc"])).map(l => l.hash);
  check(mine.join() === "ccc,bb", `For you keeps the 60-80% band with saved recipes first, and leaves out locked, held and finished levels (${mine.join()})`);
  check(forYou([lv("a", 1500), lv("dddd", 1100)], 1500, game, new Set()).map(l => l.hash).join() === "a,dddd", "with nothing in the band, the closest levels still show");
  check(Math.abs(chanceFor(lv("x", 1500), null) - 0.5) < 1e-9, "a player with no rating yet counts as average");
  const fresh = newest([...shelf, lv("hhhhh", 1500, { ratings: { learn: { rating: 1500, players: 12 } } })], game, new Set(mine)).map(l => l.hash);
  check(fresh.join() === "dddd,a", `New lists levels few have played, newest first, without the For you picks (${fresh.join()})`);
}

// 6. Review fixes: shapes name real stations, and a pour feeds only as many guests as both halves were made for.
{
  const c = { needs: [], shortcuts: [], stages: [{ station: "pan" as const, items: ["tofu"], step: 0 }], items: new Map(), unreviewed: new Set<string>() };
  const shape = (station: string) => ({ remember: "Fry it hot.", parts: [{ station, stages: [{ items: ["tofu"], hint: "the tofu" }] }] }) as unknown as Shape;
  check(/not one the game has/.test(shapeProblem(c, shape("blend")) ?? "") && shapeProblem(c, shape("pan")) === null, "a shape naming the word blend, not a station, is refused");
  const r = sim.createRun(22, "sprout", [], undefined, 1); sim.start(r);
  for (let i = 0; i < 80 && !sim.waiting(r).length; i++) sim.tick(r);
  const g = sim.waiting(r)[0]; sim.setFocus(r, g.orderId);
  r.stations.blender!.part = { dishId: "sambal-tempeh", partId: "sambal-blend", stage: 0, items: [{ uid: 900, id: "red-chilli", stage: 0, warn: false }], progress: 1, state: "ready", exposure: 0, inBand: 0, prog: 0, portions: 1, turned: false, wait: 0, over: 0 };
  r.stations.pan!.part = { dishId: "sambal-tempeh", partId: "sambal-tempeh", stage: 0, items: [{ uid: 901, id: "cooking-oil", stage: 0, warn: false }], progress: 0, state: "loading", exposure: 0, inBand: 0, prog: 0, portions: 2, turned: false, wait: 0, over: 0 };
  check(sim.transfer(r, "blender", "pan") && r.stations.pan!.part!.portions === 1 && /makes one portion/.test(r.say.text), "a paste for one poured into a wok started for two makes one portion, and says so");
}

// 7. Review fixes: prep steps and loose words don't pick a station, packs can't misplace a turn or make a shelf item, and a café's
// reshuffle never deals a dish with an unchecked ingredient to a guest who keeps a rule.
{
  const steps = ["Soak the urad dal overnight", "Toast mustard seeds and the dal", "Stir-fry the cabbage, then fold in the coconut"];
  const c = compileRecipe({ id: "p", name: "Poriyal", categories: ["mains"], ingredients: [{ id: "c", name: "cabbage" }],
    steps: steps.map(instruction => ({ instruction, ingredientIds: ["c"] })) }, n => ({ id: builtinFor(n)! }));
  check(c.stages.length === 1 && c.stages[0].station === "pan" && c.stages[0].step === 1, `a poriyal's soak drops out and its toast and fold stay in the wok (${c.stages.map(s => s.station + "@" + s.step).join(", ")})`);
  check(["soy milk", "oat milk", "rice flour", "glutinous rice flour"].map(builtinFor).join() === "soy-milk,oat-milk,rice-flour,glutinous-flour", "plant milks and rice flours map to their own items");
  const one = (station: string, turn: string, secs: number, makes?: string) => ({ format: 1, id: "x-turn-" + station, techniques: [station], items: [], forms: {},
    dishes: [{ id: "x-turn", name: "Turn", art: "dish-x", remember: "Turn it.", parts: [{ id: "x-turn", name: "Turn", station, ...(makes ? { makes } : {}), stages: [{ slots: [{ key: "a", label: "Tofu", accepts: ["tofu"] }], secs, hint: "tofu", ...(turn ? { turn } : {}) }] }] }] });
  check(refusedWith(one("oven", "flip", 4), /bad turn/) && refusedWith(one("pan", "fold", 0), /bad turn/) && refusedWith(one("dough", "fold", 3), /bad turn/), "a flip off a burner and a fold that isn't one move on a cold board are refused");
  check(refusedWith(one("pan", "", 3, "tofu"), /shelf item/), "a pack can't make a built-in shelf item");
  const dish = (id: string, accepts: string) => ({ id, name: id, art: "dish-" + id, recipeId: id, remember: "Cook it.", parts: [{ id, name: id, station: "pan",
    stages: [{ slots: [{ key: "a", label: "Oil", accepts: ["cooking-oil"] }, { key: "b", label: "Main", accepts: [accepts] }], secs: 3, hint: "oil" }] }] });
  const a = readPack({ format: 1, id: "x-cafe-a", techniques: ["pan"], items: [fresh("x-mystery", "Mystery")], forms: {}, unreviewed: ["x-mystery"], dishes: [dish("x-cafe-a", "x-mystery")] });
  const b = readPack({ format: 1, id: "x-cafe-b", techniques: ["pan"], items: [], forms: {}, dishes: [dish("x-cafe-b", "cabbage")] });
  registerPack(a); registerPack(b);
  const cafe = cafeFor([a, b], "host"), dealt = [...Array(60).keys()].filter(s => sim.createRun(cafe, "sprout", [], undefined, s + 1).guests.some(g => g.dishId === "x-cafe-a" && g.rules.length)).length;
  check(dealt === 0, `a café never deals the unchecked dish to a guest with a rule (${dealt}/60 seeds)`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll pack checks passed");
process.exit(failures ? 1 : 0);
