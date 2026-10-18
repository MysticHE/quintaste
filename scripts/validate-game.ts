/**
 * Plays every Rush Hour level with a careful bot through the real simulation (GAME_PLAN §12.3 golden traces).
 * Proves each level can be cleared and reports the slack left, so difficulty can be tuned with evidence.
 * Usage: npx tsx scripts/validate-game.ts [--level N] [--mode rush|calm] [--react 0.7]
 */
import { DISHES, STATIONS, type StationKind } from "../src/game/content/dishes";
import { conflicts } from "../src/game/content/guests";
import { ITEMS } from "../src/game/content/items";
import { LEVELS } from "../src/game/content/levels";
import * as sim from "../src/game/sim/engine";

const arg = (k: string, d: string) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const only = +arg("level", "0"), mode = arg("mode", "rush") as "rush" | "calm", react = +arg("react", "0.7");
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

for (const level of LEVELS) {
  if (only && level.n !== only) continue;
  const sig = level.signature ? ["mapo-tofu", "laksa", "claypot"] : [];
  const r = sim.createRun(level.n, mode, "sprout", sig);
  sim.start(r);
  let next = 0, guard = 0;
  while (!r.ended && guard++ < 20000) {
    if (r.t >= next) { botStep(r); next = r.t + react; }
    sim.tick(r);
    r.events.length = 0;
  }
  const res = sim.results(r);
  if (process.env.DEBUG_GAME) {
    console.log(r.log.slice(-30).join("\n"));
    console.log(r.guests.map(g => g.guestId + ":" + g.dishId + ":" + g.order).join(" "), JSON.stringify(r.board));
    console.log(Object.values(r.stations).map(s => s!.kind + ":" + (s!.part ? s!.part.partId + "/" + s!.part.state + "/" + s!.part.stage : "-")).join(" "));
  }
  const left = r.mode === "rush" ? r.timeLeft.toFixed(0) + "s left" : "untimed";
  const minPatience = Math.min(...r.guests.filter(g => g.paid).map(g => g.paid!.quick));
  const ok = res.cleared && res.stamps.rules;
  if (!ok) failures++;
  console.log((ok ? "PASS" : "FAIL") + " L" + level.n + " " + level.name.padEnd(24) + " served " + res.v + "/" + res.n + " stars " + res.stars +
    " score " + res.score + " heat " + Math.round(res.hq * 100) + "% " + left + " t=" + r.t.toFixed(0) + "s returned " + r.stats.returned + " minQuick " + minPatience);
}
console.log(failures ? failures + " level(s) failed" : "All levels cleared");
process.exit(failures ? 1 : 0);
