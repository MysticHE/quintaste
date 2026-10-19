/**
 * Ingredient shelf: Fresh and Pantry side by side in two rows, scrolling sideways when a level has more than fits.
 * Play is a drag: an ingredient is carried to a station of the player's choice, which lights up while the item is over it. A
 * tap (or any other activation) never adds it: the card only shakes and says "drag me". The Label tab sits on the
 * card but is its own button. Memoised: the shelf changes only with the level, layout or a refused item. Pressing, dragging,
 * swiping a long shelf and the tap hint for fingers and the mouse live in ./shelfGesture.
 */
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DISHES, type StationKind } from "../content/dishes";
import { ITEMS, itemName } from "../content/items";
import type * as sim from "../sim/engine";
import { box, type Art } from "./Hud";
import type { Layout, Point } from "./layout";
import { useShelfGesture } from "./shelfGesture";

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
export const Shelf = memo(function Shelf({ run, L, art, nudge, stock, onHint, onDrop, onHover, onLabel }: Props) {
  const all = useMemo(() => shelfItems(run), [run]);
  const groups = useMemo(() => (["fresh", "pantry"] as const).map(t => ({ tray: t, ids: all.filter(id => ITEMS[id].tray === t) })).filter(g => g.ids.length), [all]);
  const stationAt = (p: Point) => (Object.keys(L.stations) as StationKind[]).find(k => { const r = L.stations[k]!; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 12 && p.y <= r.y + r.h; }) ?? null;
  const { down, click } = useShelfGesture({ art, stationAt, onDrop, onHover, onHint });
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
