/**
 * Ingredient shelf: Fresh and Pantry side by side in two rows, scrolling sideways when a level has more than fits.
 * Play is a drag: an ingredient is carried to a station of the player's choice, which lights up while the item is over it. A
 * tap (or any other activation) never adds it: the card only shakes and says "drag me". The Label tab sits on the
 * card but is its own button. Memoised: the shelf changes only with the level, layout or a refused item.
 *
 * Cards take every touch themselves (`touch-action: none`): with `pan-x` a finger drag that started even slightly sideways
 * was claimed by the browser as a shelf scroll, which cancels the pointer, so on phones ingredients never reached a station.
 * A clearly sideways swipe on a shelf that scrolls still scrolls it, by hand; any other movement lifts the card, and so does a
 * swipe that then leaves the shelf (the shelf goes back to where it was).
 */
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { DISHES, type StationKind } from "../content/dishes";
import { ITEMS, itemName } from "../content/items";
import type * as sim from "../sim/engine";
import { box, type Art } from "./Hud";
import type { Layout, Point } from "./layout";

export function shelfItems(run: sim.Run): string[] {
  const ids = new Set<string>();
  run.guests.forEach(g => DISHES[g.dishId].parts.forEach(p => p.stages.forEach(s => s.slots.forEach(sl => sl.accepts.forEach(a => ids.add(a))))));
  run.level.distractors.forEach(d => ids.add(d));
  return [...ids].filter(id => ITEMS[id]);
}

type Props = {
  run: sim.Run; L: Layout; art: Art; nudge: { id: string; key: number } | null;
  /** The ingredient that is running low or out this service, if any. */
  stock: { item: string; state: "low" | "out" } | null;
  onHint(id: string): void; onDrop(id: string, at: Point, from: Point): boolean; onHover(k: StationKind | null): void; onLabel(id: string): void;
};
/** `wait` until the finger has moved far enough to tell a swipe along the shelf (`scroll`) from lifting the card (`drag`). */
type Drag = { id: string; x0: number; y0: number; from: Point; mode: "wait" | "drag" | "scroll"; ghost: HTMLImageElement | null; root: HTMLElement; over: StationKind | null;
  tray: HTMLElement | null; scroll0: number };

export const Shelf = memo(function Shelf({ run, L, art, nudge, stock, onHint, onDrop, onHover, onLabel }: Props) {
  const drag = useRef<Drag | null>(null), suppressClick = useRef(false), cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  const all = useMemo(() => shelfItems(run), [run]);
  const groups = useMemo(() => (["fresh", "pantry"] as const).map(t => ({ tray: t, ids: all.filter(id => ITEMS[id].tray === t) })).filter(g => g.ids.length), [all]);
  const rel = (e: { clientX: number; clientY: number }, root: HTMLElement): Point => { const b = root.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const stationAt = (p: Point) => (Object.keys(L.stations) as StationKind[]).find(k => { const r = L.stations[k]!; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 12 && p.y <= r.y + r.h; }) ?? null;
  const centre = (el: Element, root: HTMLElement): Point => { const b = el.getBoundingClientRect(), r = root.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }; };

  const lift = (d: Drag) => {
    d.mode = "drag";
    const g = document.createElement("img"); g.className = "dragghost"; g.src = art[ITEMS[d.id].art]; g.alt = ""; d.root.appendChild(g); d.ghost = g;
  };
  function down(e: RPointerEvent<HTMLButtonElement>, id: string) {
    if (e.button) return;
    const root = e.currentTarget.closest(".rh") as HTMLElement | null; if (!root) return;
    const tray = e.currentTarget.closest(".tray") as HTMLElement | null;
    drag.current = { id, x0: e.clientX, y0: e.clientY, from: centre(e.currentTarget, root), mode: "wait", ghost: null, root, over: null, tray, scroll0: tray?.scrollLeft ?? 0 };
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
      if (d.mode === "wait") {
        if (Math.hypot(dx, dy) < 8) return;
        const scrolls = !!d.tray && d.tray.scrollWidth > d.tray.clientWidth + 2;
        if (scrolls && Math.abs(dx) > 2 * Math.abs(dy)) d.mode = "scroll"; else lift(d);
      }
      if (d.mode === "scroll") {
        // A swipe that leaves the shelf was a drag after all: put the shelf back and lift the card.
        const box = d.tray!.getBoundingClientRect();
        if (ev.clientY >= box.top - 4 && ev.clientY <= box.bottom + 4) { d.tray!.scrollLeft = d.scroll0 - dx; return; }
        d.tray!.scrollLeft = d.scroll0; lift(d);
      }
      const p = rel(ev, d.root), over = stationAt(p); d.ghost!.style.left = p.x + "px"; d.ghost!.style.top = p.y + "px";
      if (over !== d.over) { d.over = over; onHover(over); }
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); cleanup.current = null; };
    const cancel = () => { stop(); const d = drag.current; drag.current = null; d?.ghost?.remove(); if (d?.over) onHover(null); };
    const up = (ev: PointerEvent) => {
      stop(); const d = drag.current; drag.current = null; if (!d || d.mode === "wait") return;
      // Swallow only the click this same gesture may fire on the card; it arrives before any timer runs.
      suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0);
      if (d.mode === "scroll") return;
      if (d.over) onHover(null);
      const at = rel(ev, d.root), ghost = d.ghost!;
      if (onDrop(d.id, at, at)) { ghost.remove(); return; }
      // Dropped away from a station: the item floats back to its card.
      ghost.classList.add("home"); ghost.style.left = d.from.x + "px"; ghost.style.top = d.from.y + "px";
      setTimeout(() => ghost.remove(), 220);
    };
    cleanup.current?.(); cleanup.current = cancel;
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }
  function click(id: string) {
    if (suppressClick.current) { suppressClick.current = false; return; }
    onHint(id);
  }
  // Six columns fit exactly; a longer shelf scrolls, so its cards widen to show five and a half and hint at the rest.
  const cols = groups.reduce((n, g) => n + Math.ceil(g.ids.length / 2), 0), avail = L.shelves.w - 16 - 14;
  const wide = (avail - 5 * L.card.gap) / 5.5, cw = cols <= 6 ? L.card.w : Math.floor(wide >= 56 ? wide : (avail - 4 * L.card.gap) / 4.5);
  const vars = { "--cw": cw + "px", "--ch": L.card.h + "px", "--gap": L.card.gap + "px" } as CSSProperties;
  const trayRef = useRef<HTMLDivElement>(null), [more, setMore] = useState(false);
  useEffect(() => {
    const el = trayRef.current; if (!el) return;
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 3);
    check(); el.addEventListener("scroll", check, { passive: true }); const ro = new ResizeObserver(check); ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [cw, all]);
  return <div className="layer shelf panel" style={{ ...box(L.shelves), ...vars }}>
    <div className="tray" ref={trayRef} data-more={more || undefined}>{groups.map((g, gi) => <div key={g.tray} style={{ display: "contents" }}>
      {gi > 0 && <span className="divider" aria-hidden="true" />}
      <div className="group" role="group" aria-label={g.tray === "fresh" ? "Fresh" : "Pantry"}>{g.ids.map(id => {
        const it = ITEMS[id], nope = nudge?.id === id, short = stock?.item === id ? stock.state : null;
        return <div key={id} className="cardwrap">
          <button key={nope ? nudge!.key : 0} className={"card" + (nope ? " nope" : "") + (short ? " " + short : "")} onPointerDown={e => down(e, id)} onClick={() => click(id)}
            aria-label={"Drag " + itemName(id)}>
            <img src={art[it.art]} alt="" draggable={false} /><span className="nm">{it.name}</span>{it.variant && <span className="ab">{it.variant}</span>}{short && <span className="stk">{short === "out" ? "Out" : "Low"}</span>}
          </button>
          {it.label && <button className="lab" onClick={() => onLabel(id)} aria-label={"Read the label of " + itemName(id)}>Label</button>}
        </div>;
      })}</div>
    </div>)}</div>
  </div>;
}, (a, b) => a.run === b.run && a.L === b.L && a.nudge === b.nudge && a.stock?.item === b.stock?.item && a.stock?.state === b.stock?.state);
