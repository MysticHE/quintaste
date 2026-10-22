/**
 * The careful bot that plays Rush Hour through the real simulation, for the validator and for tuning experiments.
 * It rides each burner to the middle of its band, reads the flare warning, serves the most urgent guest first,
 * swaps out an ingredient that ran out and clears a dish nobody is waiting for any more. A pot cooked for a party that
 * shares it counts for both guests, and its plate is served to each in turn.
 */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { ITEMS } from "../content/items";
import * as sim from "./engine";

/** An item the guest can eat, that is in stock, under this run's shuffled jars. */
const safeItem = (r: sim.Run, accepts: string[], rules: sim.GuestRun["rules"]) => accepts.find(id => ITEMS[id] && sim.stockOf(r, id) !== "out" && !sim.runConflicts(r, [id], rules).length);

export function botStep(r: sim.Run) {
  // Gather round: one needed ingredient into the basket per action.
  if (sim.gathering(r)) { const g = r.gather!, i = g.got.findIndex(x => x === null); sim.gatherItem(r, g.need[i][0]); return; }
  // Heat: aim for the middle of the band, easing off early on slow-cooling stations.
  for (const st of Object.values(r.stations)) {
    if (!st || !STATIONS[st.kind].heat) continue;
    const pr = st.part, [lo, hi] = sim.bandOf(st, pr), mid = (lo + hi) / 2;
    const cooking = pr && (pr.state === "cooking" || pr.state === "loading" || pr.state === "waiting");
    const next = pr && sim.stageOf(pr), cool = next?.splitIfHot && pr!.state !== "cooking";
    const lead = st.kind === "pot" ? 0.12 : st.kind === "dessert" ? 0.06 : 0.03;
    // A flare warning: a player who reads it turns the burner off to ride it out.
    const bracing = r.sched.flares.some(f => f.station === st.kind && f.warned && !f.hit);
    const want = bracing ? false : cooking && !cool ? st.H < mid - lead : cool ? st.H < lo : false;
    if (want !== st.heatOn) sim.toggleHeat(r, st.kind);
  }
  // Serve any complete plate to a waiting guest it suits, the most urgent guest first.
  const urgent = () => sim.waiting(r).sort((a, b) => a.patience - b.patience);
  for (let i = 0; i < r.board.length; i++) {
    const p = r.board[i]; if (!p || !sim.plateComplete(p)) continue;
    const items = p.parts.flatMap(x => x.items);
    const g = urgent().find(x => x.dishId === p.dishId && !sim.runConflicts(r, items, x.rules).length);
    if (g) { sim.serve(r, i, g.orderId); return; }
  }
  // Plate anything ready.
  for (const st of Object.values(r.stations)) if (st?.part?.state === "ready") { if (sim.plate(r, st.kind)) return; }
  for (const st of Object.values(r.stations)) if (st?.part && (st.part.state === "scorched" || st.part.state === "split")) { sim.restart(r, st.kind); return; }
  // A dish nobody is waiting for any more (the guest changed their mind or left) is cleared so the station is free.
  for (const st of Object.values(r.stations)) {
    if (st?.part && st.part.state !== "ready" && !sim.waiting(r).some(g => g.dishId === st.part!.dishId)) { sim.restart(r, st.kind); return; }
  }
  // Cook: for each waiting guest (most urgent first), add the next safe item to a free or matching station.
  // How many of each part already exist (cooking or on the board), so each waiting guest gets exactly one.
  const have = (partId: string) => Object.values(r.stations).reduce((n, s) => n + (s?.part?.partId === partId ? s.part.portions : 0), 0) +
    r.board.reduce((n, p) => n + (p && p.parts.some(x => x.partId === partId) ? p.portions : 0), 0);
  for (const g of urgent()) {
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
        const item = safeItem(r, slot.accepts, sim.tableRules(r, g)); if (!item) { console.log("  no safe item for", g.guestId, slot.key); continue; }
        if (ITEMS[item].label) { sim.openLabel(r, item); sim.closeLabel(r); }
        sim.setFocus(r, g.orderId);
        if (sim.place(r, item, st.kind)) return;
      }
    }
  }
}

/** Plays a whole service; `react` is the seconds the bot takes between actions. */
export function play(r: sim.Run, react: number) {
  sim.start(r);
  // The bot keeps its own clock: the service clock (r.t) waits during a Gather round. It adds up the same way, so a level without
  // one plays exactly as before.
  let next = 0, guard = 0, clock = 0;
  while (!r.ended && guard++ < 20000) {
    if (clock >= next) { botStep(r); next = clock + react; }
    sim.tick(r); clock += sim.DT;
    r.events.length = 0;
  }
  return sim.results(r);
}

