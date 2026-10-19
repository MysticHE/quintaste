"use dom";
/**
 * Rush Hour service, an Expo DOM component: Phaser draws the playfield, React draws the panels, and the shared
 * simulation (src/game/sim) owns the rules. The native screen passes art URLs, Play your way settings and bridges,
 * and receives the result, haptics and bridge taps (GAME_PLAN §12.2).
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { DOMProps } from "expo/dom";
import { STATIONS, type StationKind } from "../content/dishes";
import { levelByNumber, levelDishes, type Level } from "../content/levels";
import { hintsFor, PACE_SPEED, type PlaySettings } from "../settings";
import * as sim from "../sim/engine";
import { Dialogue, HeatPanel } from "./Controls";
import { Bubbles, SeatTags, StationTags } from "./Counter";
import { Hud, RecipeCard } from "./Hud";
import type { Point } from "./layout";
import { Brief, LabelSheet, ListView, PauseSheet, Results, TooShort, type Reward } from "./Overlays";
import { Shelf } from "./Shelf";
import { RUSH_CSS } from "./styles";
import { useFeedback, type HapticKind } from "./useFeedback";
import { usePlayfield, type PlayfieldInput } from "./usePlayfield";
import { useServiceEvents } from "./useServiceEvents";

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
  if (!runRef.current) runRef.current = newRun(props.mode ?? "rush");
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const reduced = !!props.reduceMotion || settings.reduceMotion || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const fx = useFeedback(settings, props.onHaptic);
  const input = useRef<PlayfieldInput>({ onStation: noop, onPlate: noop, onGuest: noop, onServeDrag: noop, onPlateDrag: noop });
  const { rootRef, stageRef, sceneRef, L, reboot } = usePlayfield(runRef, runRef.current.level.seats, runRef.current.level.stations, art,
    { reduced, tapOnly: settings.tapOnly }, input, bump);
  const [plateSel, setPlateSel] = useState<number | null>(null), [list, setList] = useState(false), [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ev = useServiceEvents({ runRef, sceneRef, rootRef, fx, reduced, onPlated: slot => setPlateSel(slot), onEnd: () => void save() });
  const [reward, setReward] = useState<Reward | null>(null), [saveFailed, setSaveFailed] = useState(false);
  const run = runRef.current;

  // Simulation at 20 Hz of game time; Play your way pace stretches real time, so scores mean the same at every pace.
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { sim.tick(runRef.current); ev.drain(); fx.follow(runRef.current); if (++n % 2 === 0) bump(); }, sim.DT * 1000 / PACE_SPEED[settings.pace]);
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
  // The scene lifts the picked plate; a plate that left the board (served, or the run restarted) is no longer picked.
  const picked = plateSel !== null && run.board[plateSel] ? plateSel : null;
  useEffect(() => { if (sceneRef.current) sceneRef.current.plateSel = picked; }, [picked, sceneRef]);

  // A screen too short for the playfield (a phone on its side) pauses the service, and resumes it only if that pause was the game's own.
  const cramped = !!L && L.h < 520, autoPaused = useRef(false);
  useEffect(() => {
    const r = runRef.current;
    if (cramped && r.started && !r.ended && !r.paused) { autoPaused.current = true; doPause(true); }
    else if (!cramped && autoPaused.current) { autoPaused.current = false; doPause(false); }
  }, [cramped]); // eslint-disable-line react-hooks/exhaustive-deps

  const after = () => { ev.drain(); bump(); };
  /** Saves a finished service (and again from Results when the first save failed). */
  async function save() {
    const r = runRef.current; fx.audio.setSizzle(0); setPlateSel(null);
    if (r.endReason === "quit") return;
    try { setSaveFailed(false); setReward(await latest.current.onFinish({ ...info(r), result: sim.results(r), actions: r.actions })); }
    catch { setReward(null); setSaveFailed(true); }
  }
  const info = (r: sim.Run): RunInfo => ({ level: r.level.n, special: r.level.special?.day ?? null, top: r.level.special?.top ?? null, hints: r.level.hints, mode: r.mode, pet: r.pet,
    signature: r.level.signature ? signature ?? [] : [] });
  function doPause(on: boolean) { const r = runRef.current; if (!r.started || r.ended) return; sim.pause(r, on); setPaused(on); fx.audio.pause(on); bump(); }
  const exit = (to: "cafe" | "next" | "again") => latest.current.onExit(to);

  input.current = {
    onStation: k => { const r = runRef.current, pr = r.stations[k]?.part;
      if (pr?.state === "ready") sim.plate(r, k); else if (pr && (pr.state === "scorched" || pr.state === "split")) sim.restart(r, k); else sim.select(r, k);
      after(); },
    onPlate: i => { if (runRef.current.board[i]) { setPlateSel(p => (p === i ? null : i)); bump(); } },
    onGuest: id => { const r = runRef.current; if (picked !== null) sim.serve(r, picked, id); else sim.setFocus(r, id); setPlateSel(null); after(); },
    onServeDrag: (i, id) => { sim.serve(runRef.current, i, id); setPlateSel(null); after(); },
    onPlateDrag: k => { sim.plate(runRef.current, k); after(); },
  };
  // Shelf handlers are stable (the shelf is memoised) and read the current run and layout through refs.
  const latestLayout = useRef(L); latestLayout.current = L;
  const shelf = useRef({
    add: (id: string, from: Point) => { ev.origin.current = from; sim.place(runRef.current, id); ev.drain(); bump(); },
    drop: (id: string, at: Point, from: Point) => {
      const lay = latestLayout.current, k = lay && (Object.keys(lay.stations) as StationKind[]).find(s => { const r = lay.stations[s]!; return at.x >= r.x && at.x <= r.x + r.w && at.y >= r.y - 12 && at.y <= r.y + r.h; });
      if (!k) return false;
      ev.origin.current = from; sim.place(runRef.current, id, k); ev.drain(); bump(); return true;
    },
    hover: (k: StationKind | null) => { if (sceneRef.current) sceneRef.current.hover = k; },
    label: (id: string) => { sim.openLabel(runRef.current, id); bump(); },
  }).current;
  const act = {
    focus: (id: string) => { sim.setFocus(run, id); after(); }, add: (id: string, k: StationKind) => { sim.place(run, id, k); after(); },
    label: (id: string) => { sim.openLabel(run, id); bump(); }, heat: (k: StationKind) => { sim.toggleHeat(run, k); bump(); },
    plate: (k: StationKind) => { sim.plate(run, k); after(); }, restart: (k: StationKind) => { sim.restart(run, k); bump(); },
    lift: (k: StationKind, uid: number) => { sim.lift(run, k, uid); bump(); }, serve: (i: number, id: string) => { sim.serve(run, i, id); setPlateSel(null); after(); },
  };
  /** Hold to heat: only switches when the burner is not already in the wanted state. */
  const heatTo = (k: StationKind, on: boolean) => { const r = runRef.current; if (!!r.stations[k]?.heatOn !== on) { sim.toggleHeat(r, k); bump(); } };
  function again() { runRef.current = newRun(run.mode); reboot(); fx.audio.pause(false); ev.reset();
    setReward(null); setPaused(false); setPlateSel(null); }
  const setMode = (m: "rush" | "calm") => { if (m === run.mode) return; runRef.current = newRun(m); const sc = sceneRef.current; if (sc) { sc.run = runRef.current; sc.build(); } bump(); };
  /** The brief slides away, then the service starts with a banner. */
  function begin() {
    setLeaving(true);
    setTimeout(() => { sim.start(runRef.current); void latest.current.onStart?.(info(runRef.current)); setLeaving(false); ev.banner("Service!"); bump(); }, reduced ? 0 : 220);
  }

  // Results bridges (GAME_PLAN §11) for the dish the results remember, with the allium-free recipe when a guest kept no five pungent.
  const dish = levelDishes(run.level)[0]?.id ?? run.guests[0]?.dishId, offer = dish ? props.bridges?.[dish] : undefined;
  const alliumFree = run.guests.some(g => g.dishId === dish && g.rules.includes("five"));
  const bridge = (kind: BridgeKind) => () => { void props.onBridge?.(kind, dish!, alliumFree); };
  const result = ev.result, showResults = !!result && ev.showResults && run.endReason !== "quit";
  const overlay = !run.started || !!run.label || (paused && !run.ended) || showResults || cramped;
  const st = run.stations[run.selected], nudgeHeat = run.level.hints !== "none" && run.started && !!st?.part && st.part.state === "cooking" && !st.heatOn && STATIONS[run.selected].heat;
  return <div ref={rootRef} className={"rh" + (reduced ? " still" : "")} style={{ position: "fixed", inset: 0, "--ts": props.textScale } as CSSProperties}
    onPointerDownCapture={() => fx.audio.unlock()} onKeyDownCapture={() => fx.audio.unlock()}>
    <style dangerouslySetInnerHTML={{ __html: fontFaces(art) + RUSH_CSS }} />
    <div ref={stageRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
    {L && <div className="panels" inert={overlay || undefined} style={{ position: "absolute", inset: 0 }}>
      <Hud run={run} L={L} coins={ev.coins} eatKey={ev.eatKey} coinRef={ev.coinRef} list={list} onList={() => setList(v => !v)} onPause={() => doPause(true)} />
      <RecipeCard run={run} L={L} art={art} />
      <SeatTags L={L} />
      <Bubbles run={run} L={L} art={art} plateSel={picked} onGuest={id => input.current.onGuest(id)} />
      <StationTags run={run} L={L} plateSel={picked} onStation={k => input.current.onStation(k)} />
      <Shelf run={run} L={L} art={art} tapOnly={settings.tapOnly} nudge={ev.nudge} onAdd={shelf.add} onDrop={shelf.drop} onHover={shelf.hover} onLabel={shelf.label} />
      <HeatPanel run={run} L={L} art={art} petArt={petArt} hold={settings.burner === "hold"} nudge={nudgeHeat} onHeat={act.heat} onHeatTo={heatTo} onLift={act.lift}
        onRestart={act.restart} onPlate={act.plate} onSkill={() => { sim.useSkill(run); after(); }} />
      <Dialogue run={run} L={L} art={art} chefArt={chefArt} />
      {picked !== null && <div className="toast" style={{ left: L.col.x + L.col.w / 2, top: L.counter.y - 30 }}>Tap a guest to serve</div>}
      {list && <ListView run={run} L={L} act={act} onBack={() => setList(false)} />}
    </div>}
    {L && fx.caption && <div key={fx.caption.key} className="caption" style={{ top: L.recipe.y + L.recipe.h + 6, right: L.col.x + 12 }} aria-hidden="true">{fx.caption.text}</div>}
    {L && ev.bannerText && <div key={ev.bannerText.key} className="banner" style={{ left: L.col.x + L.col.w / 2, top: (L.recipe.y + L.counter.y) / 2 }} role="status">{ev.bannerText.text}</div>}
    {!run.started && <Brief run={run} art={art} petArt={petArt} leaving={leaving} onMode={setMode} onStart={begin} onExit={() => exit("cafe")} />}
    {run.label && <LabelSheet run={run} onClose={() => { sim.closeLabel(run); bump(); }} onUse={id => { sim.closeLabel(run); ev.origin.current = null; sim.place(run, id); after(); }} />}
    {paused && !run.ended && !cramped && <PauseSheet onResume={() => doPause(false)} onRestart={again} onQuit={() => { sim.quit(run); void exit("cafe"); }}
      onSettings={props.onSettings ? () => void props.onSettings?.() : undefined} />}
    {cramped && <TooShort />}
    {showResults && result && <Results run={run} res={result} reward={reward} saveFailed={saveFailed} onRetrySave={() => void save()}
      onAgain={() => exit("again")} onCafe={() => exit("cafe")} onNext={() => exit("next")}
      onCook={offer?.cook ? bridge("cook") : undefined} onNearby={offer?.nearby ? bridge("nearby") : undefined} />}
  </div>;
}
