/**
 * The turn tools (Stage.turn): when a griddle dish is half done, a spatula appears on the griddle; when a dough board is filled, the
 * fold appears on it. Play is drag only, so the tool is dragged onto its station; a tap or a tiny nudge does nothing.
 */
import { useRef, useState, type PointerEvent } from "react";
import { STATIONS, TURN_TOOL, type StationKind } from "../content/dishes";
import * as sim from "../sim/engine";
import type { Layout, Point, Station } from "./layout";

/** How far a tool must travel before a drop counts, in layout pixels. */
const MIN_DRAG = 24;

export function ToolChips({ run, L, art, onTurn }: { run: sim.Run; L: Layout; art: Record<string, string>; onTurn(kind: StationKind): void }) {
  return <>{(Object.keys(L.stations) as StationKind[]).map(k => {
    const pr = run.stations[k]?.part, how = pr && pr.state === "cooking" && !pr.turned ? sim.stageOf(pr).turn : undefined;
    if (!pr || !how || (how === "flip" && pr.progress < 0.45)) return null;
    return <Tool key={k + pr.stage} kind={k} how={how} station={L.stations[k]!} art={art} onTurn={onTurn} />;
  })}</>;
}

function Tool({ kind, how, station: r, art, onTurn }: { kind: StationKind; how: "flip" | "fold"; station: Station; art: Record<string, string>; onTurn(kind: StationKind): void }) {
  const [drag, setDrag] = useState<Point | null>(null), start = useRef<Point | null>(null), tool = TURN_TOOL[how];
  // Just above its station, so a drag onto even a narrow station travels past MIN_DRAG.
  const home = { x: r.art.x + r.art.w / 2, y: r.art.y - 26 };
  const end = () => { start.current = null; setDrag(null); };
  const up = (e: PointerEvent<HTMLSpanElement>) => {
    const s = start.current; end(); if (!s) return;
    const root = e.currentTarget.closest(".rh")?.getBoundingClientRect(), x = e.clientX - (root?.left ?? 0), y = e.clientY - (root?.top ?? 0);
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y) >= MIN_DRAG;
    if (moved && x >= r.x && x <= r.x + r.w && y >= r.y - 12 && y <= r.y + r.h) onTurn(kind);
  };
  return <span className={"tool" + (drag ? " drag" : "")} role="img" aria-label={tool.name + ": drag it onto the " + STATIONS[kind].name.toLowerCase() + " to " + tool.verb.toLowerCase()}
    style={{ left: home.x + (drag?.x ?? 0), top: home.y + (drag?.y ?? 0) }}
    onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); start.current = { x: e.clientX, y: e.clientY }; setDrag({ x: 0, y: 0 }); }}
    onPointerMove={e => { const s = start.current; if (s) setDrag({ x: e.clientX - s.x, y: e.clientY - s.y }); }}
    onPointerUp={up} onPointerCancel={end}>
    {art[tool.art] ? <img src={art[tool.art]} alt="" draggable={false} /> : <b>{tool.verb}</b>}
  </span>;
}
