/**
 * The shelf's press gesture, for fingers and the mouse: lift a card and drag it to a station, or swipe a long shelf sideways.
 *
 * Cards take every touch themselves (`touch-action: none`). With `pan-x` the browser claimed any finger drag that began even
 * slightly sideways as a shelf scroll and cancelled the pointer, so on phones no ingredient ever reached a station.
 * - One pointer at a time: while a card is held, other fingers (a thumb on the burner) never end or move the drag. A new
 *   first finger means every earlier one has lifted, so it replaces a gesture whose release the page never heard.
 * - A press becomes a gesture after SLOP pixels. Steeper than about 30 degrees down (DOWN_SLOPE) or 35 up (LIFT_SLOPE), or on a
 *   shelf that fits, it lifts the card; a flatter one swipes the shelf (a thumb's swipe curves a little, owner 23 Oct). A swipe
 *   that drifts down or leaves the shelf turns into a drag of that card after all, and the shelf goes back to where it was.
 * - The Label tab passes its presses here too: a press that moves drags its card's ingredient, a tap reads the label.
 * - The swipe follows the finger with snapping off and ends in a fling that slows down, then the shelf snaps as usual.
 * - The click a drag or swipe may still fire on the card is ignored for a short grace period (no stray "drag me" hint).
 */
import { useEffect, useRef, type PointerEvent as RPointerEvent } from "react";
import type { StationKind } from "../content/dishes";
import { ITEMS } from "../content/items";
import type { Point } from "./layout";

const SLOP = 10, LIFT_SLOPE = 0.7, DOWN_SLOPE = 0.58, SWIPE_DRIFT = 18;
const CLICK_GRACE = 400;
/** Fling: only the movement of the last FLING_WINDOW ms counts; slower than FLING_MIN px/ms does not fling. */
const FLING_WINDOW = 100, FLING_MIN = 0.3, FLING_DECAY = 0.94;

type Gesture = {
  pointerId: number; mouse: boolean; id: string; x0: number; y0: number; from: Point; mode: "wait" | "drag" | "scroll";
  ghost: HTMLImageElement | null; root: HTMLElement; over: StationKind | null;
  tray: HTMLElement | null; scroll0: number; band: { top: number; bottom: number } | null; samples: { x: number; t: number }[];
};
export type ShelfGestureOptions = {
  art: Record<string, string>; stationAt(p: Point): StationKind | null;
  onDrop(id: string, at: Point, from: Point): boolean; onHover(k: StationKind | null): void; onHint(id: string): void; onLabel(id: string): void;
  /** Where a carried card is (null once it is let go), so a card held at the station row's edge can slide the row. */
  onMove?(at: Point | null): void;
};

const rel = (e: { clientX: number; clientY: number }, root: HTMLElement): Point => { const b = root.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
const centre = (el: Element, root: HTMLElement): Point => { const b = el.getBoundingClientRect(), r = root.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }; };
/** Finger speed at release in px/ms (positive when the finger moved left, so the shelf scrolls right); 0 if it had stopped. */
function releaseSpeed(samples: Gesture["samples"], at: number) {
  const recent = samples.filter(s => at - s.t <= FLING_WINDOW);
  if (recent.length < 2) return 0;
  const a = recent[0], b = recent[recent.length - 1];
  return (a.x - b.x) / Math.max(1, b.t - a.t);
}

export function useShelfGesture(options: ShelfGestureOptions) {
  const opts = useRef(options);
  useEffect(() => { opts.current = options; });
  const active = useRef<Gesture | null>(null), cleanup = useRef<(() => void) | null>(null), quietUntil = useRef(0);
  const fling = useRef<{ frame: number; tray: HTMLElement } | null>(null);
  const stopFling = () => { const f = fling.current; if (!f) return; cancelAnimationFrame(f.frame); f.tray.style.scrollSnapType = ""; fling.current = null; };
  useEffect(() => () => { cleanup.current?.(); stopFling(); }, []);

  function glide(tray: HTMLElement, speed: number) {
    const max = tray.scrollWidth - tray.clientWidth;
    let pos = tray.scrollLeft, v = speed, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last); last = now;
      pos = Math.max(0, Math.min(max, pos + v * dt)); tray.scrollLeft = pos; v *= Math.pow(FLING_DECAY, dt / 16);
      if (Math.abs(v) < 0.02 || pos <= 0 || pos >= max) { stopFling(); return; }
      fling.current = { frame: requestAnimationFrame(step), tray };
    };
    fling.current = { frame: requestAnimationFrame(step), tray };
  }
  function lift(g: Gesture) {
    g.mode = "drag";
    const img = document.createElement("img"); img.className = "dragghost"; img.src = opts.current.art[ITEMS[g.id].art]; img.alt = ""; g.root.appendChild(img); g.ghost = img;
  }

  function down(e: RPointerEvent<HTMLButtonElement>, id: string) {
    if (e.button) return;
    const held = active.current;
    // A second finger never takes over. A mouse can only be pressed once and a new first finger means the old one lifted,
    // so either replaces a leftover gesture.
    if (held && !e.isPrimary && !(held.mouse && e.pointerType === "mouse")) return;
    cleanup.current?.(); stopFling();
    const root = e.currentTarget.closest(".rh") as HTMLElement | null; if (!root) return;
    const tray = e.currentTarget.closest(".tray") as HTMLElement | null, card = e.currentTarget.closest(".cardwrap") ?? e.currentTarget;
    const g: Gesture = { pointerId: e.pointerId, mouse: e.pointerType === "mouse", id, x0: e.clientX, y0: e.clientY, from: centre(card, root),
      mode: "wait", ghost: null, root, over: null, tray, scroll0: tray?.scrollLeft ?? 0, band: null, samples: [] };
    active.current = g;
    const mine = (ev: PointerEvent) => ev.pointerId === g.pointerId && active.current === g;

    const move = (ev: PointerEvent) => {
      if (!mine(ev)) return;
      const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
      if (g.mode === "wait") {
        if (Math.hypot(dx, dy) < SLOP) return;
        const scrolls = !!tray && tray.scrollWidth > tray.clientWidth + 2;
        if (!scrolls || dy >= Math.abs(dx) * DOWN_SLOPE || -dy >= Math.abs(dx) * LIFT_SLOPE) lift(g);
        else { g.mode = "scroll"; const b = tray!.getBoundingClientRect(); g.band = { top: b.top - 4, bottom: b.bottom + 4 }; tray!.style.scrollSnapType = "none"; }
      }
      if (g.mode === "scroll") {
        if (Math.abs(dy) <= SWIPE_DRIFT && ev.clientY >= g.band!.top && ev.clientY <= g.band!.bottom) {
          tray!.scrollLeft = g.scroll0 - dx;
          g.samples.push({ x: ev.clientX, t: ev.timeStamp }); if (g.samples.length > 8) g.samples.shift();
          return;
        }
        tray!.scrollLeft = g.scroll0; tray!.style.scrollSnapType = ""; lift(g);
      }
      const p = rel(ev, g.root), over = opts.current.stationAt(p);
      g.ghost!.style.left = p.x + "px"; g.ghost!.style.top = p.y + "px";
      if (over !== g.over) { g.over = over; opts.current.onHover(over); }
      opts.current.onMove?.(p);
    };
    const finish = () => {
      opts.current.onMove?.(null);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      if (cleanup.current === abandon) cleanup.current = null;
      if (active.current === g) active.current = null;
    };
    const cancel = (ev: PointerEvent) => { if (mine(ev)) abandon(); };
    const abandon = () => {
      finish(); g.ghost?.remove(); if (g.over) opts.current.onHover(null);
      if (g.mode === "scroll") tray!.style.scrollSnapType = "";
    };
    const up = (ev: PointerEvent) => {
      if (!mine(ev)) return;
      finish(); if (g.mode === "wait") return;
      quietUntil.current = performance.now() + CLICK_GRACE;
      if (g.mode === "scroll") {
        const speed = releaseSpeed(g.samples, ev.timeStamp);
        if (Math.abs(speed) > FLING_MIN) glide(tray!, speed); else tray!.style.scrollSnapType = "";
        return;
      }
      if (g.over) opts.current.onHover(null);
      const at = rel(ev, g.root), ghost = g.ghost!;
      if (opts.current.onDrop(g.id, at, at)) { ghost.remove(); return; }
      // Dropped away from a station: the item floats back to its card.
      ghost.classList.add("home"); ghost.style.left = g.from.x + "px"; ghost.style.top = g.from.y + "px";
      setTimeout(() => ghost.remove(), 220);
    };
    cleanup.current = abandon;
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }
  /** A tap (no gesture) shows the "drag me" hint, or the label on the Label tab; the click left over from a drag or swipe does neither. */
  function click(id: string, label = false) {
    if (performance.now() < quietUntil.current) return;
    if (label) opts.current.onLabel(id); else opts.current.onHint(id);
  }
  return { down, click };
}
