/**
 * Ingredient shelf: Fresh and Pantry side by side in two rows, scrolling sideways when a level has more than fits.
 * Play is a drag: an ingredient is carried to a station of the player's choice, which lights up while the item is over it. A
 * pointer tap only nudges the card ("drag me"); a key press or assistive-tech activation, or a tap with the "Tap only"
 * accessibility option on, adds the item to the station it belongs in. The Label tab sits on the
 * card but is its own button. Memoised: the shelf changes only with the level, layout, input mode or a refused item.
 */
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from "react";
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
  run: sim.Run; L: Layout; art: Art; tapOnly: boolean; nudge: { id: string; key: number } | null;
  /** The ingredient that is running low or out this service, if any. */
  stock: { item: string; state: "low" | "out" } | null;
  onHint(id: string): void; onAdd(id: string, from: Point): void; onDrop(id: string, at: Point, from: Point): boolean; onHover(k: StationKind | null): void; onLabel(id: string): void;
};
type Drag = { id: string; x0: number; y0: number; from: Point; moved: boolean; ghost: HTMLImageElement | null; root: HTMLElement; over: StationKind | null };

export const Shelf = memo(function Shelf({ run, L, art, tapOnly, nudge, stock, onAdd, onHint, onDrop, onHover, onLabel }: Props) {
  const drag = useRef<Drag | null>(null), suppressClick = useRef(false), cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  const all = useMemo(() => shelfItems(run), [run]);
  const groups = useMemo(() => (["fresh", "pantry"] as const).map(t => ({ tray: t, ids: all.filter(id => ITEMS[id].tray === t) })).filter(g => g.ids.length), [all]);
  const rel = (e: { clientX: number; clientY: number }, root: HTMLElement): Point => { const b = root.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const stationAt = (p: Point) => (Object.keys(L.stations) as StationKind[]).find(k => { const r = L.stations[k]!; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 12 && p.y <= r.y + r.h; }) ?? null;
  const centre = (el: Element, root: HTMLElement): Point => { const b = el.getBoundingClientRect(), r = root.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }; };

  function down(e: RPointerEvent<HTMLButtonElement>, id: string) {
    if (e.button || tapOnly) return;
    const root = e.currentTarget.closest(".rh") as HTMLElement | null; if (!root) return;
    drag.current = { id, x0: e.clientX, y0: e.clientY, from: centre(e.currentTarget, root), moved: false, ghost: null, root, over: null };
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 8) return;
      if (!d.moved) { d.moved = true; const g = document.createElement("img"); g.className = "dragghost"; g.src = art[ITEMS[id].art]; g.alt = ""; d.root.appendChild(g); d.ghost = g; }
      const p = rel(ev, d.root), over = stationAt(p); d.ghost!.style.left = p.x + "px"; d.ghost!.style.top = p.y + "px";
      if (over !== d.over) { d.over = over; onHover(over); }
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); cleanup.current = null; };
    const cancel = () => { stop(); const d = drag.current; drag.current = null; d?.ghost?.remove(); if (d?.over) onHover(null); };
    const up = (ev: PointerEvent) => {
      stop(); const d = drag.current; drag.current = null; if (!d || !d.moved) return;
      if (d.over) onHover(null);
      // Swallow only the click this same gesture may fire on the card; it arrives before any timer runs.
      suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0);
      const at = rel(ev, d.root), ghost = d.ghost!;
      if (onDrop(d.id, at, at)) { ghost.remove(); return; }
      // Dropped away from a station: the item floats back to its card.
      ghost.classList.add("home"); ghost.style.left = d.from.x + "px"; ghost.style.top = d.from.y + "px";
      setTimeout(() => ghost.remove(), 220);
    };
    cleanup.current?.(); cleanup.current = cancel;
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }
  function click(e: RMouseEvent<HTMLButtonElement>, id: string) {
    if (suppressClick.current) { suppressClick.current = false; return; }
    // detail 0 is a key press or assistive-tech activation: never lock those out of a drag.
    if (!tapOnly && e.detail !== 0) { onHint(id); return; }
    const root = e.currentTarget.closest(".rh") as HTMLElement | null;
    onAdd(id, root ? centre(e.currentTarget, root) : { x: L.shelves.x + L.shelves.w / 2, y: L.shelves.y });
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
          <button key={nope ? nudge!.key : 0} className={"card" + (nope ? " nope" : "") + (short ? " " + short : "")} onPointerDown={e => down(e, id)} onClick={e => click(e, id)}
            aria-label={"Add " + itemName(id)}>
            <img src={art[it.art]} alt="" draggable={false} /><span className="nm">{it.name}</span>{it.variant && <span className="ab">{it.variant}</span>}{short && <span className="stk">{short === "out" ? "Out" : "Low"}</span>}
          </button>
          {it.label && <button className="lab" onClick={() => onLabel(id)} aria-label={"Read the label of " + itemName(id)}>Label</button>}
        </div>;
      })}</div>
    </div>)}</div>
  </div>;
}, (a, b) => a.run === b.run && a.L === b.L && a.tapOnly === b.tapOnly && a.nudge === b.nudge && a.stock?.item === b.stock?.item && a.stock?.state === b.stock?.state);
