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
import * as sim from "../sim/engine";
import { box, type Art } from "./Hud";
import type { Layout, Point } from "./layout";
import { useShelfGesture } from "./shelfGesture";

const VOWEL = /[aeiouy]/i;
/**
 * A card name with a soft hyphen in each word too wide for the card (`fits` letters a line), so a narrow card wraps "Dump-ling"
 * rather than cutting it off: between two consonants nearest the middle (Cab-bage, Lemon-grass), else after the vowel nearest it.
 * A word that fits stays whole: a soft hyphen breaks greedily, so "Bean sprouts" would otherwise read "Bean spro-uts".
 */
export function breakable(name: string, fits = 6): string {
  return name.split(" ").map(w => {
    if (w.length <= fits) return w;
    let at = -1;
    for (let d = 0; d < w.length / 2 && at < 0; d++) for (const i of [Math.ceil(w.length / 2) + d, Math.ceil(w.length / 2) - d]) {
      if (i > 2 && i < w.length - 2 && !VOWEL.test(w[i - 1]) && !VOWEL.test(w[i]) && /[a-z]/i.test(w[i - 1] + w[i])) { at = i; break; }
    }
    if (at < 0) for (let d = 0; d < w.length / 2 && at < 0; d++) for (const i of [Math.ceil(w.length / 2) + d, Math.ceil(w.length / 2) - d]) {
      if (i > 2 && i < w.length - 2 && VOWEL.test(w[i - 1])) { at = i; break; }
    }
    return at < 0 ? w : w.slice(0, at) + "­" + w.slice(at);
  }).join(" ");
}

export function shelfItems(run: sim.Run): string[] {
  // A Gather round's shelf (the recipe's ingredients and its look-alikes, in the seed's order) comes first.
  const ids = new Set<string>(run.gather?.shelf ?? []);
  run.guests.forEach(g => DISHES[g.dishId].parts.forEach(p => p.stages.forEach(s => s.slots.forEach(sl => sl.accepts.forEach(a => ids.add(a))))));
  run.level.distractors.forEach(d => ids.add(d));
  // A blended paste comes from the blender, never the shelf.
  const made = sim.madeItems();
  return [...ids].filter(id => ITEMS[id] && !made.has(id));
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
  // Six columns fit exactly; a shorter shelf widens its cards into the spare room (up to half again, so long names fit) and a
  // longer one scrolls, its cards widened to show five and a half and hint at the rest.
  const cols = groups.reduce((n, g) => n + Math.ceil(g.ids.length / 2), 0), avail = L.shelves.w - 16 - 14;
  const fill = Math.floor((avail + 14 - (cols - 1) * L.card.gap - (groups.length - 1) * (6 + L.card.gap)) / Math.max(1, cols));
  const wide = (avail - 5 * L.card.gap) / 5.5;
  const cw = cols <= 6 ? Math.max(L.card.w, Math.min(fill, Math.round(L.card.w * 1.5))) : Math.floor(wide >= 56 ? wide : (avail - 4 * L.card.gap) / 4.5);
  const vars = { "--cw": cw + "px", "--ch": L.card.h + "px", "--gap": L.card.gap + "px" } as CSSProperties;
  // Letters that fit a card's line: the name is 11 px Nunito ExtraBold (about 7 px a letter at the largest text size) in 3 px padding.
  const fits = Math.max(5, Math.floor((cw - 8) / 7.2));
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
            <img src={art[it.art]} alt="" draggable={false} /><span className="nm">{breakable(it.name, fits)}</span>{it.variant && <span className="ab">{it.variant}</span>}{short && <span className="stk">{short === "out" ? "Out" : "Low"}</span>}
          </button>
          {it.label && <button className="lab" onClick={() => onLabel(id)} aria-label={"Read the label of " + itemName(id)}>Label</button>}
        </div>;
      })}</div>
    </div>)}</div>
  </div>;
}, (a, b) => a.run === b.run && a.L === b.L && a.nudge === b.nudge && a.stock?.item === b.stock?.item && a.stock?.state === b.stock?.state);
