/**
 * Plays every Rush Hour level with a careful bot through the real simulation (GAME_PLAN §12.3 golden traces).
 * Proves each level can be cleared and reports the slack left, so difficulty can be tuned with evidence. Each level is
 * played on several seeds (arrivals, shuffled jars and twists change with the seed) and the clear rate is reported.
 * Every trace is then replayed the way the server settles it (sim/replay.ts): the replay must reach the same result,
 * and tampered logs (a claimed extra star, inputs out of order, a cut-off log, an input while paused) must be refused.
 * Usage: npx tsx scripts/validate-game.ts [--level N] [--react 0.7] [--seeds 4] [--traces out.json]
 * (or without tsx: node --import ./server/game/register-ts.mjs scripts/validate-game.ts ...). --traces writes each
 * level's setup, input log and result, for the API settlement tests. Also plays (and replays) every Today's special the
 * date seed can produce for players at several points on the path.
 */
import { LEVELS } from "../src/game/content/levels";
import { writeFileSync } from "node:fs";
import * as sim from "../src/game/sim/engine";
import { progressAt, replay, ReplayError, sameResult, type RunSetup } from "../src/game/sim/replay";
import { emptyGame } from "../src/game/progress";
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

for (const level of LEVELS) {
  if ((only && level.n !== only) || specialDay) continue;
  const sig = level.signature ? ["mapo-tofu", "laksa", "claypot"] : [];
  const rows: string[] = []; let cleared = 0, bonus = 0, minLeft = Infinity, lastBad = "", used = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = sim.createRun(level.n, "sprout", sig, undefined, seed), res = playBot(r, react);
    if (process.env.DEBUG_GAME) {
      console.log(r.log.slice(-30).join("\n"));
      console.log(r.guests.map(g => g.guestId + ":" + g.dishId + ":" + g.order).join(" "), JSON.stringify(r.board));
      console.log(Object.values(r.stations).map(s => s!.kind + ":" + (s!.part ? s!.part.partId + "/" + s!.part.state + "/" + s!.part.stage : "-")).join(" "));
    }
    const setup: RunSetup = { level: level.n, pet: "sprout", signature: sig, seed };
    const bad = replayChecks(setup, r, res);
    traces.push({ setup, actions: r.actions, result: res, ticks: r.ticks });
    if (res.cleared && res.stamps.rules && !bad.length) { cleared++; used += r.t; if (res.bonus?.done) bonus++; minLeft = Math.min(minLeft, r.timeLeft); }
    else if (!bad.length) lastBad = "served " + res.v + "/" + res.n + (res.stamps.rules ? "" : " returned " + r.stats.returned);
    else lastBad = bad.join("; ");
    rows.push(res.cleared ? res.stars + "★" : "✗" + res.v + "/" + res.n);
  }
  if (cleared < seeds) failures++;
  const twists = (level.twists ?? []).map(t => t.kind).join("+") || "none";
  console.log((cleared === seeds ? "PASS" : "FAIL") + " L" + String(level.n).padStart(2) + " " + level.name.padEnd(24) + " clear " + cleared + "/" + seeds + " [" + rows.join(" ") + "]" +
    (cleared ? " bonus " + bonus + "/" + cleared + " min " + minLeft.toFixed(0) + "s left, used " + (used / cleared).toFixed(0) + "s of " + level.round : "") + " twists " + twists + (lastBad ? "  last fail: " + lastBad : ""));
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
    for (let n = 1; n <= top; n++) game.best[n] = { stars: 3, score: 90, served: true, rules: true, steady: true, mastered: true, clears: 1 };
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
