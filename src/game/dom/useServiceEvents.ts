import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { STATIONS, type StationKind } from "../content/dishes";
import { itemName } from "../content/items";
import * as sim from "../sim/engine";
import { coinFlight, flyCoins, SERVE_GLIDE } from "./coinsFx";
import type { Point } from "./layout";
import type { Playfield } from "./scene";
import type { useFeedback } from "./useFeedback";

/** How long the combo chip stays up after a serve, in ms. */
const COMBO_SHOW = 2600;

type Options = {
  runRef: MutableRefObject<sim.Run>; sceneRef: MutableRefObject<Playfield | null>; rootRef: RefObject<HTMLDivElement | null>;
  fx: ReturnType<typeof useFeedback>; reduced: boolean;
  /** The service ended (time, every guest done, or quit). */
  onEnd(): void;
};

/**
 * Turns simulation events into feedback (GAME_PLAN §13): ingredient, plate and coin flights, sounds, captions and
 * haptics, banners at the start and end of service, and a nudge on a refused ingredient. Every handler reads refs,
 * so the 20 Hz interval and the memoised shelf can hold on to them across renders.
 */
export function useServiceEvents(options: Options) {
  const [coins, setCoins] = useState(0), [eatKey, setEat] = useState(0);
  const [nudge, setNudge] = useState<{ id: string; key: number } | null>(null);
  const [bannerText, setBanner] = useState<{ text: string; key: number } | null>(null);
  const [hint, setHint] = useState<{ text: string; key: number } | null>(null);
  // Knob mode: how the last step came off (C), stamped over its station for a moment.
  // Knob mode: how the last step came off, or a flip or fold was timed, stamped over its station for a moment.
  const [took, setTook] = useState<{ station: StationKind; what: "take" | "flip" | "fold"; grade: "perfect" | "early" | "late"; key: number } | null>(null);
  useEffect(() => { if (!took) return; const t = setTimeout(() => setTook(null), 1100); return () => clearTimeout(t); }, [took]);
  const [result, setResult] = useState<sim.Result | null>(null), [showResults, setShowResults] = useState(false);
  // Good serves in a row build a combo; a returned plate or a spoilt dish ends it. Feedback only: it never changes the coins.
  const [combo, setCombo] = useState<{ n: number; key: number } | null>(null), streak = useRef(0);
  useEffect(() => { if (!combo) return; const t = setTimeout(() => setCombo(null), COMBO_SHOW); return () => clearTimeout(t); }, [combo]);
  const coinRef = useRef<HTMLSpanElement>(null), origin = useRef<Point | null>(null);
  // When the last coins in the air will have landed (Date.now), so the results wait for the last serve's takings to count up.
  const landsBy = useRef(0);
  const opt = useRef(options);
  useEffect(() => { opt.current = options; });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (!bannerText) return; const t = setTimeout(() => setBanner(null), 1300); return () => clearTimeout(t); }, [bannerText]);
  useEffect(() => { if (!hint) return; const t = setTimeout(() => setHint(null), 1500); return () => clearTimeout(t); }, [hint]);

  const [api] = useState(() => { const a = {
    later(fn: () => void, ms: number) { timers.current.push(setTimeout(fn, ms)); },
    /** The takings coin in the HUD, in playfield coordinates. */
    coinTarget(): Point {
      const el = coinRef.current, root = opt.current.rootRef.current, L = opt.current.sceneRef.current?.L;
      if (!el || !root) return { x: L ? L.hud.x + L.hud.w * 0.4 : 0, y: L ? L.hud.y + 16 : 0 };
      const a = el.getBoundingClientRect(), b = root.getBoundingClientRect();
      return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
    },
    banner(text: string) { setBanner({ text, key: Date.now() }); },
    /** A tap on a shelf card: play is a drag, so the card shakes and says so. */
    nudgeCard(id: string) { setNudge({ id, key: Date.now() }); setHint({ text: "Drag " + itemName(id) + " onto a station", key: Date.now() }); },
    reset() { setCoins(0); setResult(null); setShowResults(false); setBanner(null); setHint(null); setNudge(null); setCombo(null); setTook(null); streak.current = 0; origin.current = null; },
    drain() {
      const { runRef, sceneRef, fx, reduced } = opt.current, r = runRef.current, sc = sceneRef.current;
      for (const e of r.events.splice(0)) {
        if (e.type === "placed") {
          const L = sc?.L, from = origin.current ?? (L ? { x: L.shelves.x + L.shelves.w / 2, y: L.shelves.y + L.shelves.h / 2 } : { x: 0, y: 0 });
          sc?.itemIn(e.item, e.uid, e.station, from); origin.current = null; fx.cue("place");
          const st = r.stations[e.station];
          if (st && STATIONS[e.station].heat && st.H >= sim.bandOf(st, st.part)[0]) fx.cue("sizzle");
        }
        if (e.type === "poured") {
          // The paste flies from its station's bowl into the next one, or from where it was let go when its station slid out of view.
          const b = sc?.stationOnScreen(e.from)?.bowl, to = sc?.stationOnScreen(e.station)?.bowl;
          const from = b ? { x: b.x, y: b.y } : sc?.pasteFrom ?? origin.current ?? (to ? { x: to.x, y: to.y - 60 } : { x: 0, y: 0 });
          sc?.itemIn(e.item, e.uid, e.station, from); if (sc) sc.pasteFrom = null; origin.current = null; fx.cue("place");
        }
        if (e.type === "turnDue") fx.haptic("warning");
        if (e.type === "took") { sc?.took(e.station, e.grade); setTook({ station: e.station, what: "take", grade: e.grade, key: Date.now() }); fx.cue(e.grade === "perfect" ? "perfect" : "take"); }
        if (e.type === "turned") {
          fx.haptic("success");
          // A late fold costs nothing, so it gets no stamp.
          if (e.grade && (e.grade === "perfect" || e.how === "flip")) { sc?.took(e.station, e.grade); setTook({ station: e.station, what: e.how, grade: e.grade, key: Date.now() }); if (e.grade === "perfect") fx.cue("perfect"); }
        }
        if (e.type === "rejected") { setNudge({ id: e.item, key: Date.now() }); origin.current = null; fx.haptic("warning"); }
        if (e.type === "plated") {
          const p = r.board[e.slot]; fx.cue("plate");
          if (p) sc?.plateIn(e.station, e.slot, p.dishId);
          // Half a dish plated (the coconut rice of a nasi lemak): the selection moves on to the station that cooks the rest, so the heat
          // panel shows the station you need next instead of the empty one. Selecting is a recorded input, so a replay matches.
          const rest = p && !sim.plateComplete(p) ? sim.platedParts(p.dishId).find(pt => !p.parts.some(x => x.partId === pt.id))?.station : undefined;
          if (rest && r.selected === e.station && rest !== e.station && r.stations[rest]) sim.select(r, rest);
        }
        if (e.type === "served") a.pay(e.seat, e.slot, e.coins);
        if (e.type === "returned") { sc?.shake(e.seat); sc?.wobblePlate(e.slot); fx.cue("returned"); streak.current = 0; setCombo(null); }
        if (e.type === "scorched" || e.type === "split") { sc?.puff(e.station); fx.cue("scorch"); streak.current = 0; setCombo(null); }
        if (e.type === "ready") { sc?.sparkleReady(e.station); fx.cue("ready"); }
        if (e.type === "arrived") fx.cue("ticket");
        if (e.type === "bell") { a.banner("Lunch crowd!"); fx.cue("ticket"); }
        if (e.type === "flare") {
          sc?.flare(e.station, e.phase);
          if (e.phase === "warn") { a.banner("Flare-up!"); fx.haptic("warning"); } else fx.cue("scorch");
        }
        if (e.type === "stock") a.banner(e.phase === "low" ? itemName(e.item) + " running low" : itemName(e.item) + " is out!");
        if (e.type === "changed") { a.banner("Order changed!"); fx.cue("ticket"); }
        if (e.type === "gathered") { origin.current = null; fx.cue("place"); }
        if (e.type === "gatherDone") { a.banner("Service!"); fx.cue("ticket"); }
        if (e.type === "end") a.end(r, reduced);
      }
    },
    /**
     * The plate glides to the guest, then the coins fly to the takings, each landing adding its share: the last one brings the count
     * to the takings after this serve (`after`), never before it lands. A serve still on its way when the next one pays never jumps ahead,
     * and coins still landing after Play again leave the new service's count alone.
     */
    pay(seat: number, slot: number, total: number) {
      const { runRef, sceneRef, fx, reduced } = opt.current, r = runRef.current, sc = sceneRef.current, after = r.coins;
      const g = r.guests.find(x => x.seat === seat && x.state === "eating"), count = Math.min(10, Math.ceil(total / 2)), each = count ? Math.ceil(total / count) : 0;
      if (!reduced) landsBy.current = Math.max(landsBy.current, Date.now() + SERVE_GLIDE + coinFlight(count));
      const run = ++streak.current;
      if (run >= 2) setCombo({ n: run, key: Date.now() });
      // A combo raises the serve chime, and the coins climb on from higher up.
      fx.cue("serve", run - 1);
      const mine = () => opt.current.runRef.current === r, settle = () => { if (mine()) setCoins(c => Math.max(c, after)); };
      let out = false;
      const coinsOut = () => {
        out = true;
        let k = (run - 1) * 2, landed = 0;
        const root = opt.current.rootRef.current, s = sc?.L.seats[seat - 1];
        if (root && s && !reduced) {
          const ms = flyCoins(root, { x: s.mat.x + s.mat.w / 2, y: s.mat.y }, a.coinTarget(), count, () => {
            const last = ++landed >= count;
            if (!mine()) return;
            setCoins(c => (last ? Math.max(c, after) : Math.min(after, c + each))); setEat(x => x + 1); fx.cue("coin", k++);
          }, total);
          // In case the page was hidden and a landing never fired.
          a.later(settle, ms + 400);
        } else { settle(); fx.cue("coin"); }
      };
      if (sc && g) sc.serveTo(slot, seat, g.dishId, coinsOut); else coinsOut();
      // In case the plate never reached the guest (the scene was rebuilt mid-flight), so its coins never set off.
      a.later(() => { if (!out) settle(); }, reduced ? 50 : 1500);
    },
    end(r: sim.Run, reduced: boolean) {
      setResult(sim.results(r));
      if (r.endReason !== "quit") {
        setBanner({ text: r.endReason === "time" ? "Time's up!" : "Service done!", key: Date.now() });
        a.later(() => { setCoins(c => Math.max(c, r.coins)); setShowResults(true); }, reduced ? 300 : Math.max(1400, landsBy.current - Date.now() + 250));
      }
      opt.current.onEnd();
    },
  }; return a; });
  return { coins, eatKey, combo, took, nudge, hint, bannerText, result, showResults, coinRef, origin, drain: api.drain, banner: api.banner, nudgeCard: api.nudgeCard, reset: api.reset };
}
