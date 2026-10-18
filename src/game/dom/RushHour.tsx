"use dom";
/**
 * Rush Hour service, an Expo DOM component: Phaser draws the playfield, React draws the panels, and the shared
 * simulation (src/game/sim) owns the rules. The native screen passes art URLs and settings, and receives the result.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { DOMProps } from "expo/dom";
import type { StationKind } from "../content/dishes";
import { ITEMS } from "../content/items";
import * as sim from "../sim/engine";
import { Bubbles, Dialogue, HeatPanel, Hud, RecipeStrip, Shelves } from "./Panels";
import { Brief, LabelSheet, ListView, PauseSheet, Results, type Reward } from "./Overlays";
import { RUSH_CSS } from "./styles";
import { usePlayfield, type PlayfieldInput } from "./usePlayfield";

export type FinishPayload = { level: number; mode: "rush" | "calm"; result: sim.Result; log: string[] };
type Props = {
  level: number; mode?: "rush" | "calm"; pet: string; petArt: string; chefArt: string; art: Record<string, string>;
  signature?: string[]; reduceMotion?: boolean;
  onFinish: (payload: FinishPayload) => Promise<Reward>; onExit: (to: "cafe" | "next" | "again") => Promise<void>;
  dom?: DOMProps;
};
const noop = () => {};

export default function RushHour(props: Props) {
  const { level, pet, petArt, chefArt, art, signature } = props;
  // The interval and Phaser callbacks outlive renders, so they read the latest props and handlers through refs.
  const latest = useRef(props); latest.current = props;
  const runRef = useRef<sim.Run>(null as unknown as sim.Run);
  if (!runRef.current) runRef.current = sim.createRun(level, props.mode ?? "rush", pet, signature);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const reduced = !!props.reduceMotion || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const input = useRef<PlayfieldInput>({ onStation: noop, onPlate: noop, onGuest: noop, onServeDrag: noop, onPlateDrag: noop });
  const { rootRef, stageRef, sceneRef, layoutRef, L, reboot } = usePlayfield(runRef, runRef.current.level.seats, runRef.current.level.stations, art, reduced, input, bump);
  const [tab, setTab] = useState<"fresh" | "pantry">("fresh");
  const [selected, setSelected] = useState<string | null>(null), [plateSel, setPlateSel] = useState<number | null>(null);
  const [list, setList] = useState(false), [paused, setPaused] = useState(false);
  const [coins, setCoins] = useState(0), [eat, setEat] = useState(0);
  const [result, setResult] = useState<sim.Result | null>(null), [reward, setReward] = useState<Reward | null>(null), [saveFailed, setSaveFailed] = useState(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const run = runRef.current;

  // Simulation loop at 20 Hz; panels redraw every other tick and after every action.
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { sim.tick(runRef.current); drain(); if (++n % 2 === 0) bump(); }, sim.DT * 1000);
    const vis = () => { if (document.hidden) doPause(true); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function drain() {
    const r = runRef.current, sc = sceneRef.current, lay = layoutRef.current;
    for (const e of r.events.splice(0)) {
      if (e.type === "placed" && sc) { sc.arc(ITEMS[e.item]?.art, origin.current ?? { x: lay ? lay.w / 2 : 0, y: lay ? lay.shelves.y + lay.shelves.h / 2 : 0 }, sc.stationCentre(e.station)); origin.current = null; }
      if (e.type === "served") { if (sc) sc.coins(e.seat, Math.ceil(e.coins / 2), () => { setCoins(c => Math.min(runRef.current.coins, c + 2)); setEat(k => k + 1); }); else setCoins(r.coins); }
      if (e.type === "returned") sc?.shake(e.seat);
      if (e.type === "scorched" || e.type === "split") sc?.puff(e.station);
      if (e.type === "ready") sc?.sparkleReady(e.station);
      if (e.type === "end") void finish();
    }
  }
  const after = () => { drain(); bump(); };
  async function finish() {
    const r = runRef.current, res = sim.results(r); setResult(res); setCoins(r.coins);
    if (r.endReason === "quit") return;
    try { setSaveFailed(false); setReward(await latest.current.onFinish({ level: r.level.n, mode: r.mode, result: res, log: r.log.slice(-400) })); }
    catch { setReward(null); setSaveFailed(true); }
  }
  function doPause(on: boolean) { const r = runRef.current; if (!r.started || r.ended) return; sim.pause(r, on); setPaused(on); bump(); }
  const exit = (to: "cafe" | "next" | "again") => latest.current.onExit(to);

  input.current = {
    onStation: k => { const r = runRef.current, st = r.stations[k];
      if (selected) { sim.place(r, selected, k); setSelected(null); } else if (st?.part?.state === "ready") sim.plate(r, k); else sim.select(r, k); after(); },
    onPlate: i => { if (runRef.current.board[i]) { setPlateSel(p => (p === i ? null : i)); bump(); } },
    onGuest: id => { const r = runRef.current; if (plateSel !== null && r.board[plateSel]) sim.serve(r, plateSel, id); else sim.setFocus(r, id); setPlateSel(null); after(); },
    onServeDrag: (i, id) => { sim.serve(runRef.current, i, id); setPlateSel(null); after(); },
    onPlateDrag: k => { sim.plate(runRef.current, k); after(); },
  };
  function dropAt(id: string, x: number, y: number, at: { x: number; y: number }) {
    if (!L) return;
    const k = (Object.keys(L.stations) as StationKind[]).find(s => { const r = L.stations[s]; return x >= r.x && x <= r.x + r.w && y >= r.y - 20 && y <= r.y + r.h; });
    origin.current = at; sim.place(runRef.current, id, k ?? sim.targetStation(runRef.current, id)); setSelected(null); after();
  }
  const act = {
    focus: (id: string) => { sim.setFocus(run, id); after(); }, add: (id: string, k: StationKind) => { sim.place(run, id, k); after(); },
    label: (id: string) => { sim.openLabel(run, id); bump(); }, heat: (k: StationKind) => { sim.toggleHeat(run, k); bump(); },
    plate: (k: StationKind) => { sim.plate(run, k); after(); }, restart: (k: StationKind) => { sim.restart(run, k); bump(); },
    lift: (k: StationKind, uid: number) => { sim.lift(run, k, uid); bump(); }, serve: (i: number, id: string) => { sim.serve(run, i, id); setPlateSel(null); after(); },
  };
  function again() { runRef.current = sim.createRun(level, run.mode, pet, signature); reboot();
    setResult(null); setReward(null); setCoins(0); setPaused(false); setSelected(null); setPlateSel(null); }
  const setMode = (m: "rush" | "calm") => { runRef.current = sim.createRun(level, m, pet, signature); if (sceneRef.current) { sceneRef.current.run = runRef.current; sceneRef.current.build(); } bump(); };

  const overlay = !run.started || !!run.label || (paused && !run.ended) || (!!result && run.endReason !== "quit");
  return <div ref={rootRef} className="rh" style={{ position: "fixed", inset: 0 }}>
    <style dangerouslySetInnerHTML={{ __html: RUSH_CSS }} />
    <div ref={stageRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
    {L && <div className="panels" inert={overlay || undefined} style={{ position: "absolute", inset: 0 }}>
      <Hud run={run} L={L} coins={coins} eatKey={eat} onPause={() => doPause(true)} />
      <RecipeStrip run={run} L={L} art={art} />
      <Bubbles run={run} L={L} art={art} selectedPlate={plateSel} onGuest={id => input.current.onGuest(id)} />
      <Shelves run={run} L={L} art={art} tab={tab} setTab={setTab} selected={selected} listMode={list} setList={setList}
        onPick={(id, at) => { setSelected(id); origin.current = at ?? null; }} onDrop={dropAt} onLabel={act.label} />
      <HeatPanel run={run} L={L} art={art} petArt={petArt} onHeat={act.heat} onLift={act.lift} onRestart={act.restart} onPlate={act.plate} onSkill={() => { sim.useSkill(run); after(); }} />
      <Dialogue run={run} L={L} art={art} chefArt={chefArt} />
      {plateSel !== null && <div className="floater" style={{ left: L.w / 2, top: L.guests.y + 24, animation: "none" }}>Tap the guest to serve</div>}
      {selected && <div className="floater" style={{ left: L.w / 2, top: L.shelves.y - 6, animation: "none" }}>Tap a station for {ITEMS[selected]?.name}</div>}
      {list && <ListView run={run} L={L} act={act} onBack={() => setList(false)} />}
    </div>}
    {!run.started && <Brief run={run} art={art} petArt={petArt} onMode={setMode} onStart={() => { sim.start(runRef.current); bump(); }} onExit={() => exit("cafe")} />}
    {run.label && <LabelSheet run={run} onClose={() => { sim.closeLabel(run); bump(); }} onUse={id => { sim.closeLabel(run); sim.place(run, id); after(); }} />}
    {paused && !run.ended && <PauseSheet onResume={() => doPause(false)} onRestart={again} onQuit={() => { sim.quit(run); void exit("cafe"); }} />}
    {result && run.endReason !== "quit" && <Results run={run} res={result} reward={reward} saveFailed={saveFailed} onRetrySave={() => void finish()}
      onAgain={() => exit("again")} onCafe={() => exit("cafe")} onNext={() => exit("next")} />}
  </div>;
}
