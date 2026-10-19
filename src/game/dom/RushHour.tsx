"use dom";
/**
 * Rush Hour service, an Expo DOM component: Phaser draws the playfield, React draws the panels, and the shared
 * simulation (src/game/sim) owns the rules. The native screen passes art URLs, Play your way settings and bridges,
 * and receives the result, haptics and bridge taps (GAME_PLAN §12.2).
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { DOMProps } from "expo/dom";
import { STATIONS, type StationKind } from "../content/dishes";
import { ITEMS } from "../content/items";
import { levelByNumber, levelDishes, type Level } from "../content/levels";
import { hintsFor, PACE_SPEED, type PlaySettings } from "../settings";
import * as sim from "../sim/engine";
import { Bubbles, Dialogue, HeatPanel, Hud, RecipeStrip, Shelves } from "./Panels";
import { Brief, LabelSheet, ListView, PauseSheet, Results, type Reward } from "./Overlays";
import { RUSH_CSS } from "./styles";
import { usePlayfield, type PlayfieldInput } from "./usePlayfield";
import { useFeedback, type HapticKind } from "./useFeedback";

/** What the native screen needs to save a run: the setup and input log let the server replay it (sim/replay.ts). */
export type RunInfo = { level: number; special: string | null; top: number | null; hints: Level["hints"]; mode: "rush" | "calm"; pet: string; signature: string[] };
export type FinishPayload = RunInfo & { result: sim.Result; actions: sim.Action[] };
export type BridgeKind = "cook" | "nearby";
type Props = {
  level: number; special?: Level; mode?: "rush" | "calm"; pet: string; petArt: string; chefArt: string; art: Record<string, string>;
  signature?: string[]; reduceMotion?: boolean; settings: PlaySettings; textScale: number;
  /** Which bridges the app can open for each dish. */
  bridges?: Record<string, { cook: boolean; nearby: boolean }>;
  onStart?: (run: RunInfo) => Promise<void>; onFinish: (payload: FinishPayload) => Promise<Reward>; onExit: (to: "cafe" | "next" | "again") => Promise<void>;
  onHaptic?: (kind: HapticKind) => Promise<void>; onBridge?: (kind: BridgeKind, dish: string, alliumFree: boolean) => Promise<void>; onSettings?: () => Promise<void>;
  dom?: DOMProps;
};
const noop = () => {};
/** Nunito for the webview (phones): expo-font registers it only for native text. */
const fontFaces = (art: Record<string, string>) => [["Nunito_800ExtraBold", "font-nunito-800"], ["Nunito_700Bold", "font-nunito-700"]]
  .filter(([, k]) => art[k]).map(([family, k]) => `@font-face{font-family:"${family}";src:url("${art[k]}") format("truetype");font-display:swap;}`).join("");

export default function RushHour(props: Props) {
  const { level, pet, petArt, chefArt, art, signature, settings } = props;
  // The interval and Phaser callbacks outlive renders, so they read the latest props and handlers through refs.
  const latest = useRef(props); latest.current = props;
  const base = props.special ?? levelByNumber(level);
  const newRun = (m: "rush" | "calm") => sim.createRun(props.special ?? level, m, pet, signature, hintsFor(settings, base.hints));
  const runRef = useRef<sim.Run>(null as unknown as sim.Run);
  if (!runRef.current) runRef.current = sim.createRun(props.special ?? level, props.mode ?? "rush", pet, signature, hintsFor(settings, base.hints));
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const reduced = !!props.reduceMotion || settings.reduceMotion || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const fx = useFeedback(settings, props.onHaptic);
  const input = useRef<PlayfieldInput>({ onStation: noop, onPlate: noop, onGuest: noop, onServeDrag: noop, onPlateDrag: noop });
  const { rootRef, stageRef, sceneRef, layoutRef, L, reboot } = usePlayfield(runRef, runRef.current.level.seats, runRef.current.level.stations, art,
    { reduced, tapOnly: settings.tapOnly }, input, bump);
  const [tab, setTab] = useState<"fresh" | "pantry">("fresh");
  const [selected, setSelected] = useState<string | null>(null), [plateSel, setPlateSel] = useState<number | null>(null);
  const [list, setList] = useState(false), [paused, setPaused] = useState(false);
  const [coins, setCoins] = useState(0), [eat, setEat] = useState(0);
  const [result, setResult] = useState<sim.Result | null>(null), [reward, setReward] = useState<Reward | null>(null), [saveFailed, setSaveFailed] = useState(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const run = runRef.current;

  // Simulation at 20 Hz of game time; Play your way pace stretches real time, so scores mean the same at every pace.
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { sim.tick(runRef.current); drain(); fx.follow(runRef.current); if (++n % 2 === 0) bump(); }, sim.DT * 1000 / PACE_SPEED[settings.pace]);
    return () => clearInterval(id);
  }, [settings.pace]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const vis = () => { if (document.hidden) doPause(true); };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (process.env.NODE_ENV !== "production") (globalThis as { __rushAudio?: unknown }).__rushAudio = fx.audio; }, [fx.audio]);
  // Hints follow Play your way during the service too.
  useEffect(() => { const r = runRef.current; r.level = { ...r.level, hints: hintsFor(settings, base.hints) }; }, [settings.hints]); // eslint-disable-line react-hooks/exhaustive-deps

  function drain() {
    const r = runRef.current, sc = sceneRef.current, lay = layoutRef.current;
    for (const e of r.events.splice(0)) {
      if (e.type === "placed") {
        if (sc) { sc.arc(ITEMS[e.item]?.art, origin.current ?? { x: lay ? lay.w / 2 : 0, y: lay ? lay.shelves.y + lay.shelves.h / 2 : 0 }, sc.stationCentre(e.station)); origin.current = null; }
        const st = r.stations[e.station]; fx.cue("place");
        if (st && STATIONS[e.station].heat && st.H >= sim.bandOf(st, st.part)[0]) fx.cue("sizzle");
      }
      if (e.type === "plated") fx.cue("plate");
      if (e.type === "served") {
        fx.cue("serve");
        let n = 0;
        if (sc) sc.coins(e.seat, Math.ceil(e.coins / 2), () => { setCoins(c => Math.min(runRef.current.coins, c + 2)); setEat(k => k + 1); fx.cue("coin", n++); });
        else { setCoins(r.coins); fx.cue("coin"); }
      }
      if (e.type === "returned") { sc?.shake(e.seat); fx.cue("returned"); }
      if (e.type === "scorched" || e.type === "split") { sc?.puff(e.station); fx.cue("scorch"); }
      if (e.type === "ready") sc?.sparkleReady(e.station);
      if (e.type === "arrived") fx.cue("ticket");
      if (e.type === "end") void finish();
    }
  }
  const after = () => { drain(); bump(); };
  async function finish() {
    const r = runRef.current, res = sim.results(r); setResult(res); setCoins(r.coins); fx.audio.setSizzle(0);
    if (r.endReason === "quit") return;
    try { setSaveFailed(false); setReward(await latest.current.onFinish({ ...info(r), result: res, actions: r.actions })); }
    catch { setReward(null); setSaveFailed(true); }
  }
  const info = (r: sim.Run): RunInfo => ({ level: r.level.n, special: r.level.special?.day ?? null, top: r.level.special?.top ?? null, hints: r.level.hints, mode: r.mode, pet: r.pet,
    signature: r.level.signature ? signature ?? [] : [] });
  function doPause(on: boolean) { const r = runRef.current; if (!r.started || r.ended) return; sim.pause(r, on); setPaused(on); fx.audio.pause(on); bump(); }
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
  /** Hold to heat: only switches when the burner is not already in the wanted state. */
  const heatTo = (k: StationKind, on: boolean) => { const r = runRef.current; if (!!r.stations[k]?.heatOn !== on) { sim.toggleHeat(r, k); bump(); } };
  function again() { runRef.current = newRun(run.mode); reboot(); fx.audio.pause(false);
    setResult(null); setReward(null); setCoins(0); setPaused(false); setSelected(null); setPlateSel(null); }
  const setMode = (m: "rush" | "calm") => { runRef.current = newRun(m); if (sceneRef.current) { sceneRef.current.run = runRef.current; sceneRef.current.build(); } bump(); };

  // Results bridges (GAME_PLAN §11) for the dish the results remember, with the allium-free recipe when a guest kept no five pungent.
  const dish = levelDishes(run.level)[0]?.id ?? run.guests[0]?.dishId, offer = dish ? props.bridges?.[dish] : undefined;
  const alliumFree = run.guests.some(g => g.dishId === dish && g.rules.includes("five"));
  const bridge = (kind: BridgeKind) => () => { void props.onBridge?.(kind, dish!, alliumFree); };
  const overlay = !run.started || !!run.label || (paused && !run.ended) || (!!result && run.endReason !== "quit");
  return <div ref={rootRef} className={"rh" + (reduced ? " still" : "")} style={{ position: "fixed", inset: 0, "--ts": props.textScale } as CSSProperties}
    onPointerDownCapture={() => fx.audio.unlock()} onKeyDownCapture={() => fx.audio.unlock()}>
    <style dangerouslySetInnerHTML={{ __html: fontFaces(art) + RUSH_CSS }} />
    <div ref={stageRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
    {L && <div className="panels" inert={overlay || undefined} style={{ position: "absolute", inset: 0 }}>
      <Hud run={run} L={L} coins={coins} eatKey={eat} onPause={() => doPause(true)} />
      <RecipeStrip run={run} L={L} art={art} />
      <Bubbles run={run} L={L} art={art} selectedPlate={plateSel} onGuest={id => input.current.onGuest(id)} />
      <Shelves run={run} L={L} art={art} tab={tab} setTab={setTab} selected={selected} listMode={list} setList={setList} tapOnly={settings.tapOnly}
        onPick={(id, at) => { setSelected(id); origin.current = at ?? null; }} onDrop={dropAt} onLabel={act.label} />
      <HeatPanel run={run} L={L} art={art} petArt={petArt} hold={settings.burner === "hold"} onHeat={act.heat} onHeatTo={heatTo} onLift={act.lift} onRestart={act.restart} onPlate={act.plate}
        onSkill={() => { sim.useSkill(run); after(); }} />
      <Dialogue run={run} L={L} art={art} chefArt={chefArt} />
      {plateSel !== null && <div className="floater" style={{ left: L.w / 2, top: L.guests.y + 24, animation: "none" }}>Tap the guest to serve</div>}
      {selected && <div className="floater" style={{ left: L.w / 2, top: L.shelves.y - 6, animation: "none" }}>Tap a station for {ITEMS[selected]?.name}</div>}
      {list && <ListView run={run} L={L} act={act} onBack={() => setList(false)} />}
    </div>}
    {L && fx.caption && <div key={fx.caption.key} className="caption" style={{ top: L.hud.h + 4 }} aria-hidden="true">{fx.caption.text}</div>}
    {!run.started && <Brief run={run} art={art} petArt={petArt} onMode={setMode} onStart={() => { sim.start(runRef.current); void latest.current.onStart?.(info(runRef.current)); bump(); }} onExit={() => exit("cafe")} />}
    {run.label && <LabelSheet run={run} onClose={() => { sim.closeLabel(run); bump(); }} onUse={id => { sim.closeLabel(run); sim.place(run, id); after(); }} />}
    {paused && !run.ended && <PauseSheet onResume={() => doPause(false)} onRestart={again} onQuit={() => { sim.quit(run); void exit("cafe"); }}
      onSettings={props.onSettings ? () => void props.onSettings?.() : undefined} />}
    {result && run.endReason !== "quit" && <Results run={run} res={result} reward={reward} saveFailed={saveFailed} onRetrySave={() => void finish()}
      onAgain={() => exit("again")} onCafe={() => exit("cafe")} onNext={() => exit("next")}
      onCook={offer?.cook ? bridge("cook") : undefined} onNearby={offer?.nearby ? bridge("nearby") : undefined} />}
  </div>;
}
