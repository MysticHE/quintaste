import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { STATIONS } from "../content/dishes";
import { itemName } from "../content/items";
import * as sim from "../sim/engine";
import type { Point } from "./layout";
import type { Playfield } from "./scene";
import type { useFeedback } from "./useFeedback";

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
  const [result, setResult] = useState<sim.Result | null>(null), [showResults, setShowResults] = useState(false);
  const coinRef = useRef<HTMLSpanElement>(null), origin = useRef<Point | null>(null);
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
    reset() { setCoins(0); setResult(null); setShowResults(false); setBanner(null); setHint(null); setNudge(null); origin.current = null; },
    drain() {
      const { runRef, sceneRef, fx, reduced } = opt.current, r = runRef.current, sc = sceneRef.current;
      for (const e of r.events.splice(0)) {
        if (e.type === "placed") {
          const L = sc?.L, from = origin.current ?? (L ? { x: L.shelves.x + L.shelves.w / 2, y: L.shelves.y + L.shelves.h / 2 } : { x: 0, y: 0 });
          sc?.itemIn(e.item, e.uid, e.station, from); origin.current = null; fx.cue("place");
          const st = r.stations[e.station];
          if (st && STATIONS[e.station].heat && st.H >= sim.bandOf(st, st.part)[0]) fx.cue("sizzle");
        }
        if (e.type === "rejected") { setNudge({ id: e.item, key: Date.now() }); origin.current = null; fx.haptic("warning"); }
        if (e.type === "plated") {
          const p = r.board[e.slot]; fx.cue("plate");
          if (p) sc?.plateIn(e.station, e.slot, p.dishId);
        }
        if (e.type === "served") a.pay(e.seat, e.slot, e.coins);
        if (e.type === "returned") { sc?.shake(e.seat); sc?.wobblePlate(e.slot); fx.cue("returned"); }
        if (e.type === "scorched" || e.type === "split") { sc?.puff(e.station); fx.cue("scorch"); }
        if (e.type === "ready") sc?.sparkleReady(e.station);
        if (e.type === "arrived") fx.cue("ticket");
        if (e.type === "bell") { a.banner("Lunch crowd!"); fx.cue("ticket"); }
        if (e.type === "flare") {
          sc?.flare(e.station, e.phase);
          if (e.phase === "warn") { a.banner("Flare-up!"); fx.haptic("warning"); } else fx.cue("scorch");
        }
        if (e.type === "stock") a.banner(e.phase === "low" ? itemName(e.item) + " running low" : itemName(e.item) + " is out!");
        if (e.type === "changed") { a.banner("Order changed!"); fx.cue("ticket"); }
        if (e.type === "end") a.end(r, reduced);
      }
    },
    /** The plate glides to the guest, then the coins fly to the takings; the count always settles on the run's total. */
    pay(seat: number, slot: number, total: number) {
      const { runRef, sceneRef, fx, reduced } = opt.current, r = runRef.current, sc = sceneRef.current;
      const g = r.guests.find(x => x.seat === seat && x.state === "eating"), n = Math.ceil(total / 2);
      fx.cue("serve");
      const coinsOut = () => {
        let k = 0;
        if (sc) sc.coins(seat, n, a.coinTarget(), () => { setCoins(c => Math.min(runRef.current.coins, c + 2)); setEat(x => x + 1); fx.cue("coin", k++); });
        else { setCoins(r.coins); fx.cue("coin"); }
      };
      if (sc && g) sc.serveTo(slot, seat, g.dishId, coinsOut); else coinsOut();
      a.later(() => setCoins(runRef.current.coins), reduced ? 50 : 2200);
    },
    end(r: sim.Run, reduced: boolean) {
      setResult(sim.results(r));
      if (r.endReason !== "quit") {
        setBanner({ text: r.endReason === "time" ? "Time's up!" : "Service done!", key: Date.now() });
        a.later(() => { setCoins(r.coins); setShowResults(true); }, reduced ? 300 : 1400);
      }
      opt.current.onEnd();
    },
  }; return a; });
  return { coins, eatKey, nudge, hint, bannerText, result, showResults, coinRef, origin, drain: api.drain, banner: api.banner, nudgeCard: api.nudgeCard, reset: api.reset };
}
