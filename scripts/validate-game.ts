/**
 * Plays every Rush Hour level with a careful bot through the real simulation (GAME_PLAN §12.3 golden traces).
 * Proves each level can be cleared and reports the slack left, so difficulty can be tuned with evidence.
 * Every trace is then replayed the way the server settles it (sim/replay.ts): the replay must reach the same result,
 * and tampered logs (a claimed extra star, inputs out of order, a cut-off log, an input while paused) must be refused.
 * Usage: npx tsx scripts/validate-game.ts [--level N] [--mode rush|calm|both] [--react 0.7] [--traces out.json]
 * (or without tsx: node --import ./server/game/register-ts.mjs scripts/validate-game.ts ...). --traces writes each
 * level's setup, input log and result, for the API settlement tests. Also plays (and replays) every Today's special the
 * date seed can produce for players at several points on the path.
 */
import { DISHES, STATIONS, type StationKind } from "../src/game/content/dishes";
import { conflicts } from "../src/game/content/guests";
import { ITEMS } from "../src/game/content/items";
import { LEVELS } from "../src/game/content/levels";
import { writeFileSync } from "node:fs";
import * as sim from "../src/game/sim/engine";
import { replay, ReplayError, sameResult, type RunSetup } from "../src/game/sim/replay";
import { emptyGame } from "../src/game/progress";
import { specialFor } from "../src/game/special";

const arg = (k: string, d: string) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const only = +arg("level", "0"), modeArg = arg("mode", "rush"), react = +arg("react", "0.7");
const tracesOut = arg("traces", "");
const traces: { setup: RunSetup; actions: sim.Action[]; result: sim.Result; ticks: number }[] = [];
const modes: ("rush" | "calm")[] = modeArg === "both" ? ["rush", "calm"] : [modeArg === "calm" ? "calm" : "rush"];
let failures = 0;

function safeItem(accepts: string[], rules: sim.GuestRun["rules"]) { return accepts.find(id => ITEMS[id] && !conflicts([id], rules).length); }

function botStep(r: sim.Run) {
  // Heat: aim for the middle of the band, easing off early on slow-cooling stations.
  for (const st of Object.values(r.stations)) {
    if (!st || !STATIONS[st.kind].heat) continue;
    const pr = st.part, [lo, hi] = sim.bandOf(st, pr), mid = (lo + hi) / 2;
    const cooking = pr && (pr.state === "cooking" || pr.state === "loading" || pr.state === "waiting");
    const next = pr && sim.stageOf(pr), cool = next?.splitIfHot && pr!.state !== "cooking";
    const lead = st.kind === "pot" ? 0.12 : st.kind === "dessert" ? 0.06 : 0.03;
    const want = cooking && !cool ? st.H < mid - lead : cool ? st.H < lo : false;
    if (want !== st.heatOn) sim.toggleHeat(r, st.kind);
  }
  // Serve any complete plate to a waiting guest it suits.
  for (let i = 0; i < r.board.length; i++) {
    const p = r.board[i]; if (!p || !sim.plateComplete(p)) continue;
    const items = p.parts.flatMap(x => x.items);
    const g = sim.waiting(r).find(x => x.dishId === p.dishId && !conflicts(items, x.rules).length);
    if (g) { sim.serve(r, i, g.orderId); return; }
  }
  // Plate anything ready.
  for (const st of Object.values(r.stations)) if (st?.part?.state === "ready") { if (sim.plate(r, st.kind)) return; }
  for (const st of Object.values(r.stations)) if (st?.part && (st.part.state === "scorched" || st.part.state === "split")) { sim.restart(r, st.kind); return; }
  // Cook: for each waiting guest (oldest first), add the next safe item to a free or matching station.
  // How many of each part already exist (cooking or on the board), so each waiting guest gets exactly one.
  const have = (partId: string) => Object.values(r.stations).filter(s => s?.part?.partId === partId).length +
    r.board.filter(p => p && p.parts.some(x => x.partId === partId)).length;
  for (const g of sim.waiting(r)) {
    const dish = DISHES[g.dishId];
    const rank = sim.waiting(r).filter(x => x.dishId === g.dishId).indexOf(g) + 1;
    for (const part of dish.parts) {
      const st = r.stations[part.station as StationKind]; if (!st) continue;
      if (!st.part && have(part.id) >= rank) continue;
      if (st.part && st.part.dishId !== g.dishId) continue;
      if (st.part && st.part.state !== "loading" && st.part.state !== "waiting" && st.part.state !== "cooking") continue;
      const stage = st.part ? sim.stageOf(st.part) : part.stages[0], stageIdx = st.part ? st.part.stage : 0;
      if (stage.splitIfHot && st.H > (stage.band ?? STATIONS[st.kind].band)[1] - 0.04) continue;
      for (const slot of stage.slots) {
        if (slot.optional) continue;
        if (st.part?.items.some(x => x.stage === stageIdx && slot.accepts.includes(x.id))) continue;
        const item = safeItem(slot.accepts, g.rules); if (!item) { console.log("  no safe item for", g.guestId, slot.key); continue; }
        if (ITEMS[item].label) { sim.openLabel(r, item); sim.closeLabel(r); }
        sim.setFocus(r, g.orderId);
        if (sim.place(r, item, st.kind)) return;
      }
    }
  }
}

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

function play(r: sim.Run) {
  sim.start(r);
  let next = 0, guard = 0;
  while (!r.ended && guard++ < 20000) {
    if (r.t >= next) { botStep(r); next = r.t + react; }
    sim.tick(r);
    r.events.length = 0;
  }
  return sim.results(r);
}

for (const mode of modes) for (const level of LEVELS) {
  if (only && level.n !== only) continue;
  const sig = level.signature ? ["mapo-tofu", "laksa", "claypot"] : [];
  const r = sim.createRun(level.n, mode, "sprout", sig);
  const res = play(r);
  if (process.env.DEBUG_GAME) {
    console.log(r.log.slice(-30).join("\n"));
    console.log(r.guests.map(g => g.guestId + ":" + g.dishId + ":" + g.order).join(" "), JSON.stringify(r.board));
    console.log(Object.values(r.stations).map(s => s!.kind + ":" + (s!.part ? s!.part.partId + "/" + s!.part.state + "/" + s!.part.stage : "-")).join(" "));
  }
  const left = r.mode === "rush" ? r.timeLeft.toFixed(0) + "s left" : "untimed";
  const minPatience = Math.min(...r.guests.filter(g => g.paid).map(g => g.paid!.quick));
  const bad = replayChecks({ level: level.n, mode, pet: "sprout", signature: sig }, r, res);
  traces.push({ setup: { level: level.n, mode, pet: "sprout", signature: sig }, actions: r.actions, result: res, ticks: r.ticks });
  const ok = res.cleared && res.stamps.rules && !bad.length;
  if (!ok) failures++;
  console.log((ok ? "PASS" : "FAIL") + " " + mode.padEnd(4) + " L" + level.n + " " + level.name.padEnd(24) + " served " + res.v + "/" + res.n + " stars " + res.stars +
    " score " + res.score + " heat " + Math.round(res.hq * 100) + "% " + left + " t=" + r.t.toFixed(0) + "s returned " + r.stats.returned + " minQuick " + minPatience +
    " replay " + (bad.length ? bad.join("; ") : "ok (" + r.actions.length + " inputs)"));
}
if (tracesOut) writeFileSync(tracesOut, JSON.stringify(traces));
// Today's special: every distinct special over two years of dates, for players who have cleared 5, 8, 12, 16 and 20 levels.
if (!only) {
  const seen = new Map<string, { ok: boolean; line: string }>();
  for (const top of [5, 8, 12, 16, 20]) {
    const game = emptyGame();
    for (let n = 1; n <= top; n++) game.best[n] = { stars: 3, score: 90, served: true, rules: true, steady: true, mastered: true, clears: 1 };
    for (let t = Date.parse("2026-10-01T04:00:00Z"); t < Date.parse("2028-01-31T04:00:00Z"); t += 86400000) {
      const day = new Date(t + 8 * 3600000).toISOString().slice(0, 10), sp = specialFor(game, day);
      if (!sp) { failures++; console.log("FAIL no special for a player at Level " + (top + 1)); break; }
      const key = sp.dish + ":" + (sp.lunar ? "lunar" : "plain") + ":" + sp.level.orders.map(o => o.guest).join(",");
      if (seen.has(key)) continue;
      const r = sim.createRun(sp.level, modes[0], "sprout"), res = play(r);
      // The server rebuilds the special from its date and the player's highest clear, then replays the inputs.
      const bad = replayChecks({ level: 0, special: { day, top }, hints: r.level.hints, mode: modes[0], pet: "sprout", signature: [] }, r, res);
      const ok = res.cleared && res.stamps.rules && r.guests.every(g => sim.dishFeasible(g.dishId, g.rules)) && !bad.length;
      seen.set(key, { ok, line: (ok ? "PASS" : "FAIL") + " special " + key.padEnd(46) + " served " + res.v + "/" + res.n + " stars " + res.stars + (bad.length ? " replay " + bad.join("; ") : "") +
        (r.mode === "rush" ? " " + r.timeLeft.toFixed(0) + "s left" : "") });
    }
  }
  const bad = [...seen.values()].filter(x => !x.ok);
  failures += bad.length;
  bad.forEach(x => console.log(x.line));
  if (process.env.DEBUG_GAME) seen.forEach(x => console.log(x.line));
  console.log((bad.length ? "FAIL " : "PASS ") + seen.size + " distinct specials, " + bad.length + " failed");
}
console.log(failures ? failures + " check(s) failed" : "All levels and specials cleared");
process.exit(failures ? 1 : 0);
