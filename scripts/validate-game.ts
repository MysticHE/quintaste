/**
 * Plays every Rush Hour level with a careful bot through the real simulation (GAME_PLAN §12.3 golden traces).
 * Proves each level can be cleared and reports the slack left, so difficulty can be tuned with evidence. Each level is
 * played on several seeds (arrivals, shuffled jars and twists change with the seed) and the clear rate is reported.
 * Every trace is then replayed the way the server settles it (sim/replay.ts): the replay must reach the same result,
 * and tampered logs (a claimed extra star, inputs out of order, a cut-off log, an input while paused) must be refused.
 * Usage: npx tsx scripts/validate-game.ts [--level N] [--season ID] [--react 0.7] [--seeds 4] [--traces out.json]
 * (or without tsx: node --import ./server/game/register-ts.mjs scripts/validate-game.ts ...). --traces writes each
 * level's setup, input log and result, for the API settlement tests. Also plays (and replays) every Today's special the
 * date seed can produce for players at several points on the path.
 */
import { DISHES } from "../src/game/content/dishes";
import { LEVELS, MAX_STATIONS } from "../src/game/content/levels";
import { SEASONS } from "../src/game/content/seasons";
import { writeFileSync } from "node:fs";
import * as sim from "../src/game/sim/engine";
import { progressAt, replay, ReplayError, sameResult, type RunSetup } from "../src/game/sim/replay";
import { applyResult, emptyGame } from "../src/game/progress";
import { specialFor } from "../src/game/special";
import { play as playBot } from "./game-bot";

const arg = (k: string, d: string) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const only = +arg("level", "0"), react = +arg("react", "0.7"), seeds = Math.max(1, +arg("seeds", "4"));
const tracesOut = arg("traces", "");
// --special YYYY-MM-DD --top N plays just that day's special for a player who has cleared N levels (with --traces, for API tests).
const specialDay = arg("special", ""), specialTop = +arg("top", "8");
const traces: { setup: RunSetup; actions: sim.Action[]; result: sim.Result; ticks: number }[] = [];
let failures = 0;

const refused = (setup: RunSetup, actions: unknown) => { try { replay(setup, actions); return false; } catch (e) { return e instanceof ReplayError; } };
/** Server-side checks on one finished trace. Returns the reasons it failed, empty when the replay matches. */
function replayChecks(setup: RunSetup, r: sim.Run, res: sim.Result) {
  const bad: string[] = [], log = r.actions;
  try {
    const again = replay(setup, JSON.parse(JSON.stringify(log)));
    if (!sameResult(sim.results(again), res)) bad.push("replay result differs");
    if (again.ticks !== r.ticks) bad.push("replay ended on tick " + again.ticks + ", run on " + r.ticks);
  } catch (e) { bad.push("replay refused: " + (e as Error).message); }
  if (sameResult(sim.results(r), { ...res, stars: res.stars === 3 ? 2 : res.stars + 1 })) bad.push("a changed star count still matches");
  const swapped = log.map(a => [...a] as sim.Action); const i = swapped.findIndex((a, k) => k > 0 && a[0] > swapped[k - 1][0]);
  if (i > 0) { swapped[i][0] = swapped[i - 1][0] - 1; if (!refused(setup, swapped)) bad.push("out-of-order log accepted"); }
  const serves = log.filter(a => a[1] === "serve").length;
  if (serves > 0) {
    const cut = log.slice(0, log.findIndex(a => a[1] === "serve"));
    try { const part = sim.results(replay(setup, cut)); if (part.v >= res.v) bad.push("cut-off log kept every serve"); } catch { /* refusing it is also correct */ }
  }
  const paused: sim.Action[] = [[0, "start"], [1, "pause", true], [5, "heat", "pan"]];
  if (!refused(setup, paused)) bad.push("input while paused accepted");
  return bad;
}

// Numbered levels, then every season's levels (--season id plays one season only; --level then picks its number).
const seasonOnly = arg("season", "");
const plays = [...(seasonOnly ? [] : LEVELS.map(level => ({ level, label: "L" + String(level.n).padStart(2) }))),
  ...SEASONS.filter(s => !seasonOnly || s.id === seasonOnly).flatMap(s => s.levels.map(level => ({ level, label: "S " + s.id + " " + level.season!.n })))];
for (const { level, label } of plays) {
  const number = level.season?.n ?? level.n;
  if ((only && number !== only) || specialDay) continue;
  const sig = level.signature ? ["mapo-tofu", "laksa", "claypot"] : [];
  const rows: string[] = []; let cleared = 0, bonus = 0, minLeft = Infinity, lastBad = "", used = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = sim.createRun(level.season ? level : level.n, "sprout", sig, undefined, seed), unfit = r.guests.filter(g => !sim.dishFeasible(g.dishId, sim.tableRules(r, g), r.flip)).map(g => g.guestId + ":" + g.dishId);
    // A level whose dish no table can eat under this seed's jars cannot be cleared: fail it before playing.
    if (unfit.length) { rows.push("✗unfit"); lastBad = "no dish can suit " + unfit.join(", "); continue; }
    const res = playBot(r, react);
    if (process.env.DEBUG_GAME) {
      console.log(r.log.slice(-30).join("\n"));
      console.log(r.guests.map(g => g.guestId + ":" + g.dishId + ":" + g.order).join(" "), JSON.stringify(r.board));
      console.log(Object.values(r.stations).map(s => s!.kind + ":" + (s!.part ? s!.part.partId + "/" + s!.part.state + "/" + s!.part.stage : "-")).join(" "));
    }
    const setup: RunSetup = level.season ? { level: 0, season: level.season, pet: "sprout", signature: sig, seed } : { level: level.n, pet: "sprout", signature: sig, seed };
    const bad = replayChecks(setup, r, res);
    traces.push({ setup, actions: r.actions, result: res, ticks: r.ticks });
    if (res.cleared && res.stamps.rules && !bad.length) { cleared++; used += r.t; if (res.bonus?.done) bonus++; minLeft = Math.min(minLeft, r.timeLeft); }
    else if (!bad.length) lastBad = "served " + res.v + "/" + res.n + (res.stamps.rules ? "" : " returned " + r.stats.returned);
    else lastBad = bad.join("; ");
    rows.push(res.cleared ? res.stars + "★" : "✗" + res.v + "/" + res.n);
  }
  if (cleared < seeds) failures++;
  const twists = (level.twists ?? []).map(t => t.kind).join("+") || "none";
  console.log((cleared === seeds ? "PASS" : "FAIL") + " " + label + " " + level.name.padEnd(24) + " clear " + cleared + "/" + seeds + " [" + rows.join(" ") + "]" +
    (cleared ? " bonus " + bonus + "/" + cleared + " min " + minLeft.toFixed(0) + "s left, used " + (used / cleared).toFixed(0) + "s of " + level.round : "") + " twists " + twists + (lastBad ? "  last fail: " + lastBad : ""));
}
// Mechanics that the level playthroughs only touch indirectly.
if (!only && !specialDay) {
  const check = (name: string, ok: boolean, detail = "") => { if (!ok) failures++; console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " " + detail : "")); };
  // At most four cooking stations a level (two show at a time; the row slides to the rest), a signature service included.
  const crowded = plays.filter(p => !p.level.signature && p.level.stations.length > MAX_STATIONS).map(p => p.label.trim());
  check("every level uses at most " + MAX_STATIONS + " stations", !crowded.length, crowded.join(", "));
  const sigLevel = LEVELS.find(l => l.signature)!, learned = [...new Set(LEVELS.filter(l => l.n < sigLevel.n).flatMap(l => l.orders.map(o => o.dish)))];
  const menus = learned.flatMap((a, i) => learned.slice(i + 1).flatMap((b, j) => learned.slice(i + j + 2).map(c => [a, b, c])));
  const wide = menus.filter(m => sim.createRun(sigLevel.n, "sprout", m).level.stations.length > MAX_STATIONS);
  check("every signature menu plays on at most " + MAX_STATIONS + " stations", menus.length > 0 && !wide.length, menus.length + " menus" + (wide.length ? ", too wide: " + wide[0].join(",") : ""));
  // A menu that would need five (on a wider kitchen) loses dishes from the end until it fits.
  const wider = { ...sigLevel, stations: [...sigLevel.stations, "blender", "oven"] as typeof sigLevel.stations }, five = ["green-curry", "sugee-cake", "nasi-lemak"];
  check("a signature menu needing five stations is trimmed to fit", sim.signatureStations(wider, five).length > MAX_STATIONS && sim.signatureFit(wider, five).length === 2);
  // A shared pot: one cook feeds both guests, takes longer, must suit them both, and the plate stays until the second serve.
  const r = sim.createRun(15, "sprout", [], undefined, 1), pair = r.guests.filter(g => g.party).slice(0, 2);
  check("a party arrives together", pair.length === 2 && pair[0].party === pair[1].party && pair[0].at === pair[1].at && pair[0].dishId === pair[1].dishId);
  const sat = sim.createRun(15, "sprout", [], undefined, 1); sim.start(sat);
  for (let i = 0; i < 400 && sat.guests.filter(g => g.party && g.state === "walking").length < 2; i++) sim.tick(sat);
  const seated = sat.guests.filter(g => g.party && g.state === "walking");
  check("the shared pot must suit both guests", seated.length === 2 && sim.tableRules(sat, seated[0]).length >= 2 && [...sim.tableRules(sat, seated[0])].sort().join() === [...sim.tableRules(sat, seated[1])].sort().join(), seated[0] ? sim.tableRules(sat, seated[0]).join("+") : "no party seated");
  const ordered = playBot(r, 0.7), plates = r.log.filter(l => / plate /.test(l)).length;
  check("one cook fed two guests", ordered.cleared && plates < r.guests.length && plates >= r.guests.length - 3, plates + " plates for " + r.guests.length + " guests");
  const one = sim.createRun(15, "sprout", [], undefined, 1); sim.start(one);
  for (let i = 0; i < 400 && !sim.waiting(one).length; i++) sim.tick(one);
  const lead = sim.waiting(one)[0]; sim.setFocus(one, lead.orderId);
  const first = DISHES[lead.dishId].parts[0].stages[0].slots.map(sl => sl.accepts.find(a => !sim.runConflicts(one, [a], sim.tableRules(one, lead)).length)!);
  first.forEach(item => sim.place(one, item, DISHES[lead.dishId].parts[0].station));
  check("a pot started for a party feeds two", one.stations[DISHES[lead.dishId].parts[0].station]?.part?.portions === 2);
  const queued = sim.createRun(15, "sprout", [], undefined, 1), early = queued.guests.find(g => g.party)!;
  check("a mate still in the queue does not make a batch", sim.mates(queued, early).length === 0);
  // A plate cooked for two is cleared once nobody at the counter wants the dish any more, even with both portions left.
  one.board[0] = { uid: 999, dishId: lead.dishId, parts: [], portions: 2, shared: true };
  one.guests.forEach(g => { if (g.dishId === lead.dishId) g.order = "expired"; });
  sim.tick(one);
  check("a leftover shared plate is cleared when nobody wants it", one.board[0] === null);
  // Personal bests: a first clear sets them, a better one beats them, a worse one changes nothing; the bonus stamp sticks.
  const base = { stars: 2, score: 80, cleared: true, coins: 60, left: 30, stamps: { served: true, rules: true, steady: true }, bonus: { done: false } };
  const g0 = emptyGame(), a1 = applyResult(g0, 3, base), a2 = applyResult(a1.game, 3, { ...base, score: 90, coins: 70, left: 25, bonus: { done: true } });
  const a3 = applyResult(a2.game, 3, { ...base, score: 70, coins: 50, left: 10 }), a4 = applyResult(a3.game, 3, { ...base, left: 40 });
  check("a first clear is not a new best", a1.reward.beat.length === 0 && a1.game.best["3"].coins === 60 && a1.game.best["3"].left === 30);
  check("a better service beats score and takings, not time", a2.reward.beat.join() === "score,coins" && a2.reward.bonus && a2.game.best["3"].left === 30 && a2.game.best["3"].bonus);
  check("a worse service changes no best and the bonus stays", a3.reward.beat.length === 0 && !a3.reward.bonus && a3.game.best["3"].score === 90 && a3.game.best["3"].bonus);
  check("more time left beats the time record", a4.reward.beat.join() === "time" && a4.game.best["3"].left === 40);
  const lost = applyResult(a4.game, 3, { ...base, cleared: false, coins: 999, left: 0, score: 40, stars: 0 });
  check("an uncleared service records no takings or time", lost.game.best["3"].coins === a4.game.best["3"].coins && lost.reward.beat.length === 0);
  const legacy = { ...emptyGame(), best: { "3": { stars: 2, score: 80, served: true, rules: true, steady: true, mastered: false, clears: 1, bonus: false, coins: 0, left: 0 } } };
  check("a level cleared before bests were stored shows no new best for them", applyResult(legacy, 3, base).reward.beat.length === 0);
}
// Today's special: every distinct special over two years of dates, for players who have cleared 5, 8, 12, 16 and 20 levels.
if (specialDay) {
  const sp = specialFor(progressAt(specialTop), specialDay);
  if (!sp) { failures++; console.log("FAIL no special on " + specialDay + " at Level " + (specialTop + 1)); }
  else {
    const r = sim.createRun(sp.level, "sprout", [], undefined, 1), res = playBot(r, react);
    const setup: RunSetup = { level: 0, special: { day: specialDay, top: specialTop }, hints: r.level.hints, pet: "sprout", signature: [], seed: 1 };
    const bad = replayChecks(setup, r, res), ok = res.cleared && !bad.length;
    if (!ok) failures++;
    traces.push({ setup, actions: r.actions, result: res, ticks: r.ticks });
    console.log((ok ? "PASS" : "FAIL") + " special " + specialDay + " " + sp.dish + " served " + res.v + "/" + res.n + (bad.length ? " replay " + bad.join("; ") : " replay ok"));
  }
} else if (!only) {
  const seen = new Map<string, { ok: boolean; line: string }>();
  for (const top of [5, 8, 12, 16, 20]) {
    const game = emptyGame();
    for (let n = 1; n <= top; n++) game.best[n] = { stars: 3, score: 90, served: true, rules: true, steady: true, mastered: true, clears: 1, bonus: false, coins: 0, left: 0 };
    for (let t = Date.parse("2026-10-01T04:00:00Z"); t < Date.parse("2028-01-31T04:00:00Z"); t += 86400000) {
      const day = new Date(t + 8 * 3600000).toISOString().slice(0, 10), sp = specialFor(game, day);
      if (!sp) { failures++; console.log("FAIL no special for a player at Level " + (top + 1)); break; }
      const key = sp.dish + ":" + (sp.lunar ? "lunar" : "plain") + ":" + sp.level.orders.map(o => o.guest).join(",");
      if (seen.has(key)) continue;
      const r = sim.createRun(sp.level, "sprout", [], undefined, 1), res = playBot(r, react);
      // The server rebuilds the special from its date and the player's highest clear, then replays the inputs.
      const bad = replayChecks({ level: 0, special: { day, top }, hints: r.level.hints, pet: "sprout", signature: [], seed: 1 }, r, res);
      const ok = res.cleared && res.stamps.rules && r.guests.every(g => sim.dishFeasible(g.dishId, g.rules, r.flip)) && !bad.length;
      seen.set(key, { ok, line: (ok ? "PASS" : "FAIL") + " special " + key.padEnd(46) + " served " + res.v + "/" + res.n + " stars " + res.stars + (bad.length ? " replay " + bad.join("; ") : "") + " " + r.timeLeft.toFixed(0) + "s left" });
    }
  }
  const bad = [...seen.values()].filter(x => !x.ok);
  failures += bad.length;
  bad.forEach(x => console.log(x.line));
  if (process.env.DEBUG_GAME) seen.forEach(x => console.log(x.line));
  console.log((bad.length ? "FAIL " : "PASS ") + seen.size + " distinct specials, " + bad.length + " failed");
}
if (tracesOut) writeFileSync(tracesOut, JSON.stringify(traces));
console.log(failures ? failures + " check(s) failed" : "All levels and specials cleared");
process.exit(failures ? 1 : 0);
