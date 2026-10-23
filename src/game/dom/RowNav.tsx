/**
 * The station row (owner, 23 Oct 2026): two stations show at a time beside the serving tray, and a row of three or four slides to the
 * rest, by a sideways swipe on the stations, by its arrows, or by holding a dragged ingredient or paste at its edge. The row follows
 * the selected station (a tap on a guest shows their dish's station); an arrow becomes a chip naming a station beyond it that needs you.
 */
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { STATIONS, type StationKind } from "../content/dishes";
import * as sim from "../sim/engine";
import { SHORT, TagIcon, stationState } from "./Counter";
import { ROW_GUTTER, rowEdge, rowStarts, startFor, viewLayout, type Layout, type Point } from "./layout";
import type { Playfield } from "./scene";

/** How long a drag held at the row's edge waits before the row slides. */
const EDGE_MS = 450;
type Dir = "back" | "next";

/** `selected` is the run's selected station, which the row follows. */
export function useStationRow(L: Layout | null, selected: StationKind, runRef: MutableRefObject<sim.Run>, sceneRef: MutableRefObject<Playfield | null>, bump: () => void) {
  const [start, setStart] = useState(0), at = useRef(0), full = useRef(L);
  useEffect(() => { full.current = L; }, [L]);
  const view = useMemo(() => (L ? viewLayout(L, start) : null), [L, start]);
  // Development builds and the test harness read the stations where the screen shows them.
  useEffect(() => { if (process.env.NODE_ENV !== "production") (globalThis as { __rushView?: () => Layout | null }).__rushView = () => view; }, [view]);
  const rest = (s: number) => { at.current = s; setStart(s); sceneRef.current?.setRow(s); };
  /** Slides the row to rest at `s`; a selected station that leaves the view hands over to the first one in view. */
  const slide = (s: number) => {
    const lay = full.current; if (!lay || s === at.current) return;
    const r = runRef.current, shown = lay.row.kinds.slice(s, s + 2);
    if (r.started && !r.ended && shown[0] && !shown.includes(r.selected)) sim.select(r, shown[0]);
    rest(s); bump();
  };
  const ends = () => { const starts = rowStarts(full.current?.row.kinds.length ?? 0); return { first: starts[0], last: starts[starts.length - 1] }; };
  const swipe = (dir: 1 | -1) => { const e = ends(); slide(dir > 0 ? e.last : e.first); };
  // A drag held at the row's edge (an ingredient from the shelf or a paste from a station) slides the row after a moment.
  const [edge, setEdge] = useState<Dir | null>(null), dwell = useRef<{ dir: Dir; t: ReturnType<typeof setTimeout> } | null>(null);
  const edgeAt = (p: Point | null) => {
    const lay = full.current, dir = p && lay ? rowEdge(lay, p, at.current) : null;
    if ((dwell.current?.dir ?? null) === dir) return;
    if (dwell.current) clearTimeout(dwell.current.t);
    dwell.current = null; setEdge(dir);
    if (dir) dwell.current = { dir, t: setTimeout(() => { dwell.current = null; setEdge(null); const e = ends(); slide(dir === "next" ? e.last : e.first); }, EDGE_MS) };
  };
  useEffect(() => () => { if (dwell.current) clearTimeout(dwell.current.t); }, []);
  // The row follows the selected station; a new run starts at the first station.
  useEffect(() => { const lay = full.current; if (lay) { const want = startFor(lay, selected, at.current); if (want !== at.current) rest(want); } }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = () => rest(0);
  return { start, view, slide, swipe, edgeAt, edge, reset };
}

const URGENT = { warn: 3, take: 2, ready: 1, cook: 0, idle: 0 } as const;
/** The row's arrows and dots (a row of three or four). An arrow names the most urgent station beyond it that needs you. */
export function RowNav({ run, L, start, edge, onSlide }: { run: sim.Run; L: Layout; start: number; edge: Dir | null; onSlide(start: number): void }) {
  const r = L.row, kinds = r.kinds, starts = rowStarts(kinds.length);
  if (starts.length < 2) return null;
  const side = (dir: Dir) => {
    const hidden = dir === "back" ? kinds.slice(0, start) : kinds.slice(start + 2);
    if (!hidden.length) return null;
    const calls = hidden.map(k => ({ k, s: stationState(run, k) })).filter(c => URGENT[c.s.tone] > 0).sort((a, b) => URGENT[b.s.tone] - URGENT[a.s.tone]);
    const c = calls[0] as { k: StationKind; s: ReturnType<typeof stationState> } | undefined;
    // Each arrow's face sits on its gutter (the next one's button kept on screen); a chip naming a station grows inward from there.
    return <button key={dir} className={"rarrow " + dir + (c ? " call " + c.s.tone : "") + (edge === dir ? " dwell" : "")}
      style={{ left: dir === "back" ? r.x + ROW_GUTTER / 2 - 22 : Math.min(r.x + r.w - ROW_GUTTER / 2 + 22, L.col.x + L.col.w), top: r.y + r.h * 0.42 }}
      onClick={() => onSlide(dir === "back" ? starts[0] : starts[starts.length - 1])}
      aria-label={c ? STATIONS[c.k].name + ": " + c.s.text + ". Show it" : dir === "back" ? "Show the first stations" : "Show the other stations"}>
      <span className="face">{dir === "back" && <Chevron back />}{c && <><TagIcon tone={c.s.tone} /><span className="tx">{SHORT[c.k]}</span></>}{dir === "next" && <Chevron />}</span>
    </button>;
  };
  return <>{side("back")}{side("next")}
    <span className="rdots" style={{ left: r.x + r.w / 2, top: r.y - 4 }} aria-hidden="true">{starts.map(s => <i key={s} className={s === start ? "on" : undefined} />)}</span></>;
}
function Chevron({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="chev" style={back ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M9 4.5l7.5 7.5L9 19.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
