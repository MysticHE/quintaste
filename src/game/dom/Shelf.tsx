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
import { nearestStation, type Layout, type Point } from "./layout";
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

function Chevron() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5l7.5 7.5L9 19.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

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
  const stationAt = (p: Point) => nearestStation(L, p);
  const { down, click } = useShelfGesture({ art, stationAt, onDrop, onHover, onHint, onLabel });
  // Five columns fit; a shorter shelf widens its cards into the spare room (up to half again, so long names fit) and a longer
  // one keeps five a page and pages with its arrows.
  // A paged shelf keeps a gutter at each side for its arrows (as in the mockup), so an arrow never covers a card.
  const cols = groups.reduce((n, g) => n + Math.ceil(g.ids.length / 2), 0), paged = cols > 5, avail = L.shelves.w - 16 - (paged ? 28 : 0);
  const fill = Math.floor((avail - (cols - 1) * L.card.gap - (groups.length - 1) * (6 + L.card.gap)) / Math.max(1, cols));
  const cw = !paged ? Math.max(L.card.w, Math.min(fill, Math.round(L.card.w * 1.5))) : Math.floor((avail - 4 * L.card.gap) / 5);
  // Names are 12 px on a roomy card and 11 px on a narrow one (a paged shelf), so a long name still wraps whole.
  const nameSize = cw < 60 ? 11 : 12;
  const vars = { "--cw": cw + "px", "--ch": L.card.h + "px", "--gap": L.card.gap + "px", "--nmfs": nameSize + "px" } as CSSProperties;
  // Letters that fit a card's line: Nunito ExtraBold is about 0.66 of its size a letter (at the largest text size), in 3 px padding.
  const fits = Math.max(5, Math.floor((cw - 8) / (nameSize * 0.66)));
  // A long shelf shows arrows at its sides and page dots under it (owner mockup); the arrows page it, a swipe still scrolls it.
  const trayRef = useRef<HTMLDivElement>(null), [pos, setPos] = useState({ more: false, back: false, pages: 1, page: 0 });
  useEffect(() => {
    const el = trayRef.current; if (!el) return;
    const check = () => {
      const max = el.scrollWidth - el.clientWidth, pages = max > 3 ? Math.max(2, Math.round(el.scrollWidth / el.clientWidth)) : 1;
      const next = { more: el.scrollLeft < max - 3, back: el.scrollLeft > 3, pages, page: pages > 1 ? Math.round(el.scrollLeft / max * (pages - 1)) : 0 };
      setPos(p => (p.more === next.more && p.back === next.back && p.pages === next.pages && p.page === next.page ? p : next));
    };
    check(); el.addEventListener("scroll", check, { passive: true }); const ro = new ResizeObserver(check); ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [cw, all]);
  const page = (d: number) => { const el = trayRef.current; if (el) el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: el.closest(".rh.still") ? "auto" : "smooth" }); };
  return <div className={"layer shelf panel" + (paged ? " paged" : "")} style={{ ...box(L.shelves), ...vars }}>
    <div className="tray" ref={trayRef} data-more={pos.more || undefined}>{groups.map((g, gi) => <div key={g.tray} style={{ display: "contents" }}>
      {gi > 0 && <span className="divider" aria-hidden="true" />}
      <div className="group" role="group" aria-label={g.tray === "fresh" ? "Fresh" : "Pantry"}>{g.ids.map(id => {
        const it = ITEMS[id], nope = nudge?.id === id, short = stock?.item === id ? stock.state : null;
        return <div key={id} className="cardwrap">
          <button key={nope ? nudge!.key : 0} className={"card" + (it.label ? " labelled" : "") + (nope ? " nope" : "") + (short ? " " + short : "")} onPointerDown={e => down(e, id)} onClick={() => click(id)}
            aria-label={"Drag " + itemName(id)}>
            <img src={art[it.art]} alt="" draggable={false} /><span className="nm">{breakable(it.name, fits)}</span>{it.variant && <span className="ab">{it.variant}</span>}{short && <span className="stk">{short === "out" ? "Out" : "Low"}</span>}
          </button>
          {it.label && <button className="lab" onPointerDown={e => down(e, id)} onClick={() => click(id, true)} aria-label={"Read the label of " + itemName(id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7.4l9.1 9.1-8.9 8.9L3 11.9zM7.8 9.3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /></svg>Label</button>}
        </div>;
      })}</div>
    </div>)}</div>
    {pos.back && <button className="sarrow l" onClick={() => page(-1)} aria-label="Earlier ingredients"><Chevron /></button>}
    {pos.more && <button className="sarrow r" onClick={() => page(1)} aria-label="More ingredients"><Chevron /></button>}
    {pos.pages > 1 && <div className="sdots" aria-hidden="true">{Array.from({ length: pos.pages }, (_, i) => <i key={i} className={i === pos.page ? "on" : undefined} />)}</div>}
  </div>;
}, (a, b) => a.run === b.run && a.L === b.L && a.nudge === b.nudge && a.stock?.item === b.stock?.item && a.stock?.state === b.stock?.state);
