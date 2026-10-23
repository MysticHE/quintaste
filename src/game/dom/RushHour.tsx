"use dom";
/**
 * Rush Hour service, an Expo DOM component: Phaser draws the playfield, React draws the panels, and the shared
 * simulation (src/game/sim) owns the rules. The native screen passes art URLs, Play your way settings and bridges,
 * and receives the result, haptics and bridge taps (GAME_PLAN §12.2).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DOMProps } from "expo/dom";
import { STATIONS, type StationKind } from "../content/dishes";
import { levelByNumber, levelDishes, type Level } from "../content/levels";
import { packByHash, packHash, readPack, registerPack } from "../content/pack";
import { cafeFor, missionFor, type Tier } from "../mission";
import type { LevelBest } from "../progress";
import { hintsFor, knobFor, PACE_SPEED, type PlaySettings } from "../settings";
import * as sim from "../sim/engine";
import { PETS } from "../content/cosmetics";
import { HeatPanel, SayToast } from "./Controls";
import { takePhase } from "./Knob";
import { Bubbles, PlateTags, SeatTags, StationTags } from "./Counter";
import { Hud, RecipeCard } from "./Hud";
import { nearestStation, stationsBox, type Point } from "./layout";
import { Basket } from "./Basket";
import { ToolChips } from "./Tools";
import { Brief, LabelSheet, PauseSheet, Results, TooShort, type Reward } from "./Overlays";
import { Shelf } from "./Shelf";
import { withSketches } from "./sketch";
import { RUSH_CSS } from "./styles";
import { useFeedback, type HapticKind } from "./useFeedback";
import { usePlayfield, type PlayfieldInput } from "./usePlayfield";
import { useServiceEvents } from "./useServiceEvents";

/** What the native screen needs to save a run: the setup and input log let the server replay it (sim/replay.ts). */
export type RunInfo = { id: string; level: number; special: string | null; top: number | null; hints: Level["hints"]; pet: string; signature: string[]; pack: string | null; tier: Tier | null;
  season: { id: string; n: number } | null; cafe: { host: string; menu: string[] } | null; pace: PlaySettings["pace"] };
export type FinishPayload = RunInfo & { result: sim.Result; actions: sim.Action[] };
export type BridgeKind = "cook" | "nearby";
type Props = {
  level: number; special?: Level; pet: string; petArt: string; chefArt: string; art: Record<string, string>;
  /** A Recipe Kitchen mission: the level pack (plain JSON) and the tier. The game's web view keeps its own copy of the content, so the
   *  pack is registered here as well as in the app. */
  mission?: { pack: unknown; tier: Tier };
  /** A café visit (GAME_CONTENT_PLAN §9): the host and their menu's level packs (plain JSON), registered here as in the app. */
  cafe?: { host: string; packs: unknown[] };
  signature?: string[]; reduceMotion?: boolean; settings: PlaySettings; textScale: number;
  /** The player's record on this level (not for Today's special), shown on the brief and the results. */
  best?: LevelBest | null;
  /** Which bridges the app can open for each dish. */
  bridges?: Record<string, { cook: boolean; nearby: boolean }>;
  onStart?: (run: RunInfo) => Promise<void>; onFinish: (payload: FinishPayload) => Promise<Reward>; onExit: (to: "cafe" | "next" | "again") => Promise<void>;
  onHaptic?: (kind: HapticKind) => Promise<void>; onBridge?: (kind: BridgeKind, dish: string, alliumFree: boolean) => Promise<void>; onSettings?: () => Promise<void>;
  /** A member's reaction to the Recipe Kitchen level just finished (the pack hash; null clears it). */
  onReact?: (pack: string, liked: boolean | null) => Promise<void>;
  dom?: DOMProps;
};
const noop = () => {};
/** Knob mode's stamp over a station: how a step came off, or how a flip or fold was timed (a late fold gets none). */
const STAMP = { take: { perfect: "Perfect!", early: "A bit early", late: "Overcooked" }, flip: { perfect: "Perfect flip!", early: "Perfect flip!", late: "Late flip" },
  fold: { perfect: "Neat fold!", early: "Neat fold!", late: "Folded" } } as const;
/** A new run's id. It names the attempt on the account and, through `seedOf`, decides this service's arrivals, jars and twists. */
const newRunId = () => globalThis.crypto?.randomUUID?.() ??
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (+c ^ Math.floor(Math.random() * 16) >> +c / 4).toString(16));
/** Nunito for the webview (phones): expo-font registers it only for native text. */
const fontFaces = (art: Record<string, string>) => [["Nunito_800ExtraBold", "font-nunito-800"], ["Nunito_700Bold", "font-nunito-700"]]
  .filter(([, k]) => art[k]).map(([family, k]) => `@font-face{font-family:"${family}";src:url("${art[k]}") format("truetype");font-display:swap;}`).join("");

export default function RushHour(props: Props) {
  const { level, pet, petArt, chefArt, signature, settings } = props;
  // A mission's pack is registered before anything reads the content, so its dishes and ingredients exist in this web view.
  const mission = useMemo(() => {
    if (!props.mission) return undefined;
    const pack = readPack(props.mission.pack);
    registerPack(pack);
    return missionFor(packByHash(packHash(pack))!, props.mission.tier);
  }, [props.mission]);
  const cafe = useMemo(() => {
    if (!props.cafe) return undefined;
    const packs = props.cafe.packs.map(json => { const pack = readPack(json); registerPack(pack); return packByHash(packHash(pack))!; });
    return cafeFor(packs, props.cafe.host);
  }, [props.cafe]);
  // A recipe level's ingredient or dish with no approved picture yet plays as a Sketch card.
  const art = useMemo(() => withSketches(props.art), [props.art, mission, cafe]); // eslint-disable-line react-hooks/exhaustive-deps
  // The interval and Phaser callbacks outlive renders, so they read the latest props and handlers through refs.
  const latest = useRef(props); latest.current = props;
  const base = mission ?? cafe ?? props.special ?? levelByNumber(level);
  const runId = useRef("");
  const newRun = () => { runId.current = newRunId(); return sim.createRun(mission ?? cafe ?? props.special ?? level, pet, signature, hintsFor(settings, base.hints), sim.seedOf(runId.current), knobFor(settings, base), settings.knobAssist); };
  const runRef = useRef<sim.Run>(null as unknown as sim.Run);
  if (!runRef.current) runRef.current = newRun();
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  // Already resolved by the app (Play your way over the app and phone setting), so a WebView's own media query never overrides it.
  const reduced = !!props.reduceMotion;
  const fx = useFeedback(settings, props.onHaptic);
  const input = useRef<PlayfieldInput>({ onStation: noop, onGuest: noop, onServeDrag: noop, onPlateDrag: noop, onTransfer: noop });
  const { rootRef, stageRef, sceneRef, L, reboot } = usePlayfield(runRef, runRef.current.level.seats, runRef.current.level.stations, art,
    { reduced, knob: !!runRef.current.knob, ts: props.textScale, pet: art[petArt] ? petArt : PETS[pet]?.art ?? "" }, input, bump);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ev = useServiceEvents({ runRef, sceneRef, rootRef, fx, reduced, onEnd: () => void save() });
  const [reward, setReward] = useState<Reward | null>(null), [saveFailed, setSaveFailed] = useState(false), [basketOver, setBasketOver] = useState(false);
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
    const r = runRef.current; fx.audio.setSizzle(0);
    if (r.endReason === "quit") return;
    // The knob and ring prototype is practice: the server's game doesn't have it yet, so nothing is sent.
    if (r.knob) { setReward({ credits: 0, first: false, mastered: false, unlocks: [], status: "practice", note: "Prototype heat controls: practice, not saved." }); return; }
    try { setSaveFailed(false); setReward(await latest.current.onFinish({ ...info(r), result: sim.results(r), actions: r.actions })); }
    catch { setReward(null); setSaveFailed(true); }
  }
  /** A Recipe Kitchen service the player quits still reaches the account: quits count toward a level's quality and rating. */
  function reportQuit() {
    const r = runRef.current;
    if (r.level.mission && r.started) void latest.current.onFinish({ ...info(r), result: sim.results(r), actions: r.actions }).catch(() => {});
  }
  const info = (r: sim.Run): RunInfo => ({ id: runId.current, level: r.level.n, special: r.level.special?.day ?? null, top: r.level.special?.top ?? null, hints: r.level.hints, pet: r.pet,
    signature: r.level.signature ? signature ?? [] : [], pack: r.level.mission?.pack ?? null, tier: r.level.mission?.tier ?? null, season: r.level.season ?? null, cafe: r.level.cafe ?? null, pace: settings.pace });
  function doPause(on: boolean) { const r = runRef.current; if (!r.started || r.ended) return; sim.pause(r, on); setPaused(on); fx.audio.pause(on); bump(); }
  const exit = (to: "cafe" | "next" | "again") => latest.current.onExit(to);

  // Play is drag and drop: ingredients go onto a station, a ready dish is dragged to the plates, a plate to its guest. A tap
  // never moves food: on a station it selects it (to see its heat), on a guest it picks who to cook for, and the state tag under
  // a scorched or split dish restarts it.
  input.current = {
    // With the knob, a tap on a step that is nearly done takes it off the heat (the cook timer); otherwise it selects the station.
    // Knob mode: a tap on a heated station that can come off takes it off; any other tap selects the station.
    onStation: k => { const r = runRef.current, ph = takePhase(r.stations[k]?.part ?? null, r.knob), cfg = STATIONS[k];
      if (cfg.heat && !cfg.thermostat && (ph === "near" || ph === "now" || ph === "over")) sim.take(r, k); else sim.select(r, k); after(); },
    onGuest: id => { sim.setFocus(runRef.current, id); after(); },
    onServeDrag: (i, id) => { sim.serve(runRef.current, i, id); after(); },
    onPlateDrag: k => { sim.plate(runRef.current, k); after(); },
    onTransfer: (from, to) => { sim.transfer(runRef.current, from, to); after(); },
  };
  // Shelf handlers are stable (the shelf is memoised) and read the current run and layout through refs.
  const latestLayout = useRef(L); latestLayout.current = L;
  const shelf = useRef({
    hint: (id: string) => ev.nudgeCard(id),
    drop: (id: string, at: Point, from: Point) => {
      const lay = latestLayout.current, r = runRef.current;
      // While gathering, the basket covers the counter: anything dropped on it goes into the basket.
      if (lay && sim.gathering(r)) {
        const c = stationsBox(lay); setBasketOver(false);
        if (at.x < c.x || at.x > c.x + c.w || at.y < c.y - 12 || at.y > c.y + c.h) return false;
        sim.gatherItem(r, id); ev.drain(); bump(); return true;
      }
      const k = lay && nearestStation(lay, at);
      if (!k) return false;
      ev.origin.current = from; sim.place(r, id, k); ev.drain(); bump(); return true;
    },
    hover: (k: StationKind | null) => { if (sim.gathering(runRef.current)) setBasketOver(k !== null); else if (sceneRef.current) sceneRef.current.hover = k; },
    label: (id: string) => { sim.openLabel(runRef.current, id); bump(); },
  }).current;
  const act = {
    heat: (k: StationKind) => { sim.toggleHeat(run, k); bump(); }, restart: (k: StationKind) => { sim.restart(run, k); bump(); },
    lift: (k: StationKind, uid: number) => { sim.lift(run, k, uid); bump(); },
  };
  /** Hold to heat: only switches when the burner is not already in the wanted state. */
  const heatTo = (k: StationKind, on: boolean) => { const r = runRef.current; if (!!r.stations[k]?.heatOn !== on) { sim.toggleHeat(r, k); bump(); } };
  function again() { runRef.current = newRun(); reboot(); fx.audio.pause(false); ev.reset();
    setReward(null); setPaused(false); }
  /** The brief slides away, then the service starts with a banner. */
  function begin() {
    setLeaving(true);
    setTimeout(() => { sim.start(runRef.current); if (!runRef.current.knob) void latest.current.onStart?.(info(runRef.current)); setLeaving(false); ev.banner(sim.gathering(runRef.current) ? "Gather!" : "Service!"); bump(); }, reduced ? 0 : 220);
  }

  // Results bridges (GAME_PLAN §11) for the dish the results remember, with the allium-free recipe when a guest kept no five pungent.
  const dish = levelDishes(run.level)[0]?.id ?? run.guests[0]?.dishId, offer = dish ? props.bridges?.[dish] : undefined;
  const alliumFree = run.guests.some(g => g.dishId === dish && g.rules.includes("five"));
  const bridge = (kind: BridgeKind) => () => { void props.onBridge?.(kind, dish!, alliumFree); };
  const result = ev.result, showResults = !!result && ev.showResults && run.endReason !== "quit";
  const overlay = !run.started || !!run.label || (paused && !run.ended) || showResults || cramped;
  const shortStock = run.sched.low && run.plan.stock ? { item: run.plan.stock.item, state: run.sched.out ? "out" as const : "low" as const } : null;
  const st = run.stations[run.selected], nudgeHeat = run.level.hints !== "none" && run.started && !!st?.part && st.part.state === "cooking" && !st.heatOn && STATIONS[run.selected].heat;
  return <div ref={rootRef} lang="en" className={"rh" + (reduced ? " still" : settings.motion === "full" ? " full" : "")} style={{ position: "fixed", inset: 0, "--ts": props.textScale } as CSSProperties}
    onPointerDownCapture={() => fx.audio.unlock()} onKeyDownCapture={() => fx.audio.unlock()}>
    <style dangerouslySetInnerHTML={{ __html: fontFaces(art) + RUSH_CSS }} />
    <div ref={stageRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
    {L && <div className="panels" inert={overlay || undefined} style={{ position: "absolute", inset: 0 }}>
      <Hud run={run} L={L} coins={ev.coins} eatKey={ev.eatKey} combo={ev.combo} coinRef={ev.coinRef} onPause={() => doPause(true)} />
      <RecipeCard run={run} L={L} art={art} />
      <SeatTags L={L} />
      <Bubbles run={run} L={L} art={art} plateSel={sceneRef.current?.dragSlot ?? null} onGuest={id => input.current.onGuest(id)} />
      <ToolChips run={run} L={L} art={art} onTurn={k => { sim.turn(runRef.current, k); after(); }} />
      <StationTags run={run} L={L} plateSel={sceneRef.current?.dragSlot ?? null} dragging={sceneRef.current?.dragPaste ? null : sceneRef.current?.dragKind ?? null} onSelect={k => input.current.onStation(k)} onRestart={act.restart} />
      <PlateTags run={run} L={L} incoming={sceneRef.current?.incomingSlots} />
      <Basket run={run} L={L} art={art} over={basketOver} />
      <Shelf run={run} L={L} art={art} nudge={ev.nudge} stock={shortStock} onHint={shelf.hint} onDrop={shelf.drop} onHover={shelf.hover} onLabel={shelf.label} />
      <HeatPanel run={run} L={L} art={art} petArt={petArt} hold={settings.burner === "hold"} nudge={nudgeHeat} onHeat={act.heat} onHeatTo={heatTo} onLift={act.lift}
        onKnob={(k, v, perfect) => { sim.setKnob(runRef.current, k, v); fx.cue(perfect ? "perfect" : "click"); after(); }} onTick={() => fx.haptic("select")}
        onPreview={(k, v) => { const sc = sceneRef.current; if (sc) sc.heatPreview = v === null ? null : { kind: k, v }; }}
        onTake={k => { sim.take(runRef.current, k); after(); }}
        onRestart={act.restart} onSkill={() => { sim.useSkill(run); after(); }} />
      <SayToast run={run} L={L} art={art} chefArt={chefArt} />
      {ev.took && L.stations[ev.took.station] && <div key={ev.took.key} className={"stamp " + ev.took.grade} aria-hidden="true"
        style={{ left: L.stations[ev.took.station]!.art.x + L.stations[ev.took.station]!.art.w / 2, top: L.stations[ev.took.station]!.art.y + 4 }}>
        {STAMP[ev.took.what][ev.took.grade]}</div>}
      {ev.hint && <div key={ev.hint.key} className="toast" style={{ left: L.col.x + L.col.w / 2, top: L.shelves.y - 30 }}>{ev.hint.text}</div>}
    </div>}
    {L && fx.caption && <div key={fx.caption.key} className="caption" style={{ top: L.recipe.y + L.recipe.h + 6, right: L.col.x + 12 }} aria-hidden="true">{fx.caption.text}</div>}
    {L && ev.bannerText && <div key={ev.bannerText.key} className="banner" style={{ left: L.col.x + L.col.w / 2, top: L.recipe.y + L.recipe.h + 24 }} role="status">{ev.bannerText.text}</div>}
    {!run.started && <Brief run={run} art={art} petArt={petArt} best={props.best} leaving={leaving} onStart={begin} onExit={() => exit("cafe")} />}
    {run.label && <LabelSheet run={run} onClose={() => { sim.closeLabel(run); bump(); }} />}
    {paused && !run.ended && !cramped && <PauseSheet onResume={() => doPause(false)} onRestart={again} onQuit={() => { sim.quit(run); reportQuit(); void exit("cafe"); }}
      onSettings={props.onSettings ? () => void props.onSettings?.() : undefined} />}
    {cramped && <TooShort />}
    {showResults && result && <Results run={run} res={result} reward={reward} best={props.best} saveFailed={saveFailed} still={reduced} cue={fx.cue} onRetrySave={() => void save()}
      onAgain={() => exit("again")} onCafe={() => exit("cafe")} onNext={() => exit("next")}
      onCook={offer?.cook ? bridge("cook") : undefined} onNearby={offer?.nearby ? bridge("nearby") : undefined}
      onReact={run.level.mission && props.onReact ? liked => void props.onReact!(run.level.mission!.pack, liked) : undefined} />}
  </div>;
}
