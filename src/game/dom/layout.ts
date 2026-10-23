/**
 * One portrait layout for the Rush Hour playfield (GAME_PLAN §13), shared by the Phaser canvas and the DOM panels.
 * A centred column (phone width, capped on tablets and desktops) holds, top to bottom: HUD, recipe card, guests at the
 * counter, the ingredient shelf, stations, the heat panel and the dialogue. Short screens scale the fixed bands down;
 * the guests and the stations share whatever height is left, so nothing is ever clipped.
 */
import type { StationKind } from "../content/dishes";
import { GUEST_ASPECT, PLATE_ART, SERVING_ART, SERVING_PLATE, STATION_ART } from "./stationArt";

export type Rect = { x: number; y: number; w: number; h: number };
export type Oval = { x: number; y: number; rx: number; ry: number };
export type Point = { x: number; y: number };
/** A guest's seat: where they stand, their plate mat on the counter, the tip of their order bubble and the seat tag. */
export type Seat = { guest: Rect; mat: Rect; bubble: Point; tag: Point };
/** A station's tap area, its fitted art, where food sits (bowl) and the state tag under it. */
export type Station = Rect & { art: Rect; bowl: Oval; tag: Point };
/**
 * The station row's view (owner, 23 Oct 2026): two stations show at a time beside the serving tray, and a row of three or four slides
 * to the rest. `stations` in a Layout sit on the slid-out strip (slot `slot` wide, in `kinds` order); viewLayout gives what is on screen.
 */
export type Row = Rect & { slot: number; kinds: StationKind[] };
export type Layout = {
  /** `ts` is the player's text size (Play your way), which every font size in the DOM panels is multiplied by. */
  w: number; h: number; s: number; ts: number; col: Rect; seatW: number;
  hud: Rect; recipe: Rect; backdrop: Rect; counter: Rect; seats: Seat[];
  shelves: Rect; card: { w: number; h: number; gap: number };
  stations: Partial<Record<StationKind, Station>>; plating: Rect & { art: Rect; tag: Point }; board: Rect[]; row: Row;
  heat: Rect;
};

/** Where the row can rest: the first station in view (a row of three shows 1–2 then 2–3; a row of four, 1–2 then 3–4). */
export const rowStarts = (n: number) => (n <= 2 ? [0] : [0, n - 2]);
/** A station moved along the row by `dx`. */
export const shiftStation = (r: Station, dx: number): Station =>
  ({ ...r, x: r.x + dx, art: { ...r.art, x: r.art.x + dx }, bowl: { ...r.bowl, x: r.bowl.x + dx }, tag: { ...r.tag, x: r.tag.x + dx } });
/** The layout as the screen shows it with the row resting at `start`: only the stations in view, where they are on screen. */
export function viewLayout(L: Layout, start: number): Layout {
  if (L.row.kinds.length <= 2) return L;
  const stations: Layout["stations"] = {};
  L.row.kinds.forEach((k, i) => { if (i >= start && i < start + 2) stations[k] = shiftStation(L.stations[k]!, -start * L.row.slot); });
  return { ...L, stations };
}
/** Where the row rests to show `kind`: where it is now if `kind` is in view, else the end of the row it is at. */
export function startFor(L: Layout, kind: StationKind, start: number) {
  const i = L.row.kinds.indexOf(kind), starts = rowStarts(L.row.kinds.length);
  if (i < 0 || (i >= start && i < start + 2)) return start;
  return i < start ? starts[0] : starts[starts.length - 1];
}
/** The row's edge a point is over (a drag held there slides the row), or null; a row of one or two never slides. */
export function rowEdge(L: Layout, p: Point, start: number): "back" | "next" | null {
  const r = L.row, starts = rowStarts(r.kinds.length);
  if (starts.length < 2 || p.y < r.y - 8 || p.y > r.y + r.h + 8) return null;
  if (p.x <= r.x + ROW_EDGE && p.x >= r.x - 6 && start > starts[0]) return "back";
  if (p.x >= r.x + r.w - ROW_EDGE && start < starts[starts.length - 1]) return "next";
  return null;
}
/** How much of a sliding row's edge holds its arrows (and slides it when a drag is held there). */
const ROW_EDGE = 30, ROW_GUTTER = 10;

/** The area every station of the level covers together (the Gather basket sits over it). */
export function stationsBox(L: Layout): Rect {
  const rs = Object.values(L.stations).filter((r): r is Station => !!r);
  const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y)), x2 = Math.max(...rs.map(r => r.x + r.w)), y2 = Math.max(...rs.map(r => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
/** Fits an image of `size` inside `box`, centred horizontally and resting on the box's bottom edge. */
function fitBottom(size: [number, number], box: Rect): Rect {
  const k = Math.min(box.w / size[0], box.h / size[1]), w = size[0] * k, h = size[1] * k;
  return { x: box.x + (box.w - w) / 2, y: box.y + box.h - h, w, h };
}

export function computeLayout(w: number, h: number, seats: number, stations: StationKind[], knob = false, ts = 1): Layout {
  const cw = Math.round(Math.min(w, h * 0.62, 560)), x0 = Math.round((w - cw) / 2);
  const s = clamp((h - 250) / 486, 0.72, 1), m = Math.round(8 * s), px = x0 + 8, pw = cw - 16;
  const hud = { x: px, y: Math.round(6 * s), w: pw, h: Math.round(54 * s) };
  const recipe = { x: px, y: hud.y + hud.h + Math.round(6 * s), w: pw, h: Math.round(70 * s) };
  const top = recipe.y + recipe.h;
  // Bottom panels keep the height their content needs; the rest is shared: the café scene gets a floor (a guest, their bubble and the counter),
  // then the shelf cards take what they want up to a comfortable size, and the station row only what its art needs.
  // No chat panel (owner, 22 Oct 2026): messages are short toasts, and the heat panel sits at the bottom, taller with the knob's cook timer.
  const heatH = knob ? 146 : 116, heat = { x: px, y: h - m - heatH, w: pw, h: heatH };
  const flex = heat.y - top - 3 * m, minScene = 140, minStation = 78;
  // Five cards a row, as in the owner's mockup: a longer shelf pages with its arrows (or a swipe).
  const gap = Math.round(6 * s), cardW = Math.floor((pw - 16 - 4 * gap) / 5);
  const cardMax = Math.floor((flex - minScene - minStation - 32 - gap) / 2);
  // The shelf keeps a strip under the cards for its page dots (a long shelf).
  // Room above and below the cards inside the shelf, so their borders and glows are never clipped.
  const cardH = Math.round(clamp(Math.min(cardW * 1.2, cardMax), 50, 96)), shelfH = cardH * 2 + gap + 32;
  const left = flex - shelfH;
  // The station row is only as tall as its art needs (the art is width-limited on crowded levels); the café scene takes the rest.
  const stationH = Math.round(clamp(Math.min(left - minScene, neededRow(stations, pw, s)), minStation, 150)), sceneH = left - stationH;
  const counterH = Math.round(clamp(sceneH * 0.2, 34 * s, 52));
  const counter = { x: 0, y: top + sceneH - counterH, w, h: counterH };
  const backdrop = { x: 0, y: 0, w, h: counter.y + 4 };
  const shelves = { x: px, y: counter.y + counterH + m, w: pw, h: shelfH };
  const row = { y: shelves.y + shelfH + m, h: stationH };
  return {
    w, h, s, ts, col: { x: x0, y: 0, w: cw, h }, seatW: Math.floor((pw - 8) / (seats <= 3 ? 3 : 4)), hud, recipe, backdrop, counter, seats: seatBoxes(seats, px, pw, top, counter, s, x0 + cw, ts),
    shelves, card: { w: cardW, h: cardH, gap }, ...stationRow(stations, px, pw, row, s), heat,
  };
}

/** A drop (or hover) counts on a station when it lands within a finger's width of it; between two, the nearer one takes it. */
const REACH = 16;
export function nearestStation(L: Layout, p: Point): StationKind | null {
  let best: StationKind | null = null, bestD = Infinity;
  for (const k of Object.keys(L.stations) as StationKind[]) {
    const r = L.stations[k]!;
    if (p.x < r.x - REACH || p.x > r.x + r.w + REACH || p.y < r.y - REACH || p.y > r.y + r.h + REACH) continue;
    const d = Math.hypot(p.x - (r.x + r.w / 2), p.y - (r.y + r.h / 2));
    if (d < bestD) { best = k; bestD = d; }
  }
  return best;
}

/** Seats share three or four columns across the counter (fewer seats sit centred); guests stand behind it, head and shoulders up. */
function seatBoxes(n: number, px: number, pw: number, top: number, counter: Rect, s: number, right: number, ts: number): Seat[] {
  // A bubble (dish, a diet chip, hearts) is about 62 px tall and grows with the text size; guests stand as tall as the scene allows
  // under it (owner, 23 Oct: the guests were smaller than their bubbles).
  const cols = n <= 3 ? 3 : 4, seatW = (pw - 8) / cols, offset = (cols - n) * seatW / 2, bubbleH = Math.round(62 * Math.max(1, ts));
  const bottom = counter.y + counter.h * 0.45, gh = Math.min(seatW * (cols === 3 ? 1.45 : 1.4), (bottom - top - bubbleH) / 0.94), gw = gh * GUEST_ASPECT;
  return Array.from({ length: n }, (_, i) => {
    const cx = px + 4 + offset + seatW * (i + 0.5);
    const matW = Math.min(seatW * 0.66, counter.h * 1.9), matH = matW * PLATE_ART[1] / PLATE_ART[0];
    const mat = round({ x: cx - matW / 2, y: counter.y + counter.h * 0.5 - matH / 2, w: matW, h: matH });
    return { guest: round({ x: cx - gw / 2, y: bottom - gh, w: gw, h: gh }), mat, bubble: { x: Math.round(cx), y: Math.round(Math.max(bottom - gh + gh * 0.06, top + bubbleH + 6)) },
      tag: { x: Math.round(Math.min(mat.x + mat.w - 4, right - 52)), y: Math.round(mat.y + mat.h * 0.62) } };
  });
}

const boardShare = (n: number) => (n <= 1 ? 0.44 : n === 2 ? 0.34 : n === 3 ? 0.28 : 0.24);
/** Row height that fits the tallest station's art at the width each station gets (two show at a time), plus its tag. */
function neededRow(kinds: StationKind[], pw: number, s: number) {
  const shown = Math.min(2, Math.max(1, kinds.length)), each = (pw * (1 - boardShare(shown)) - 4) / shown - 4;
  return Math.max(...kinds.map(k => each * STATION_ART[k].size[1] / STATION_ART[k].size[0])) + 8;
}

/** Plating board on the left, then the stations two at a time; every piece of art rests on the row's floor above its state tag. */
function stationRow(kinds: StationKind[], px: number, pw: number, row: { y: number; h: number }, s: number) {
  // Station art stands on the row's floor; a state tag, shown only when it asks for something, floats over the art's foot.
  const n = kinds.length, shown = Math.min(2, Math.max(1, n)), floor = row.y + row.h - 4, tagY = Math.round(row.y + row.h - 22 * s);
  const pwBoard = pw * boardShare(shown);
  // One serving plate on a rattan tray (owner, 23 Oct 2026): the first plated dish sits on the tray's plate; a second or third (two
  // stations finishing together) waits on a small plate at the tray's front corners, drawn only while it holds a dish.
  const boardArt = round(fitBottom(SERVING_ART, { x: px, y: row.y, w: pwBoard, h: floor - row.y })), sp = SERVING_PLATE;
  const sideW = boardArt.w * 0.38, sideH = sideW * PLATE_ART[1] / PLATE_ART[0], sideY = boardArt.y + boardArt.h - sideH * 0.95;
  // The left corner plate leans past the tray, but never past the column's side margin.
  const board = [round({ x: boardArt.x + boardArt.w * sp.x, y: boardArt.y + boardArt.h * sp.y, w: boardArt.w * sp.w, h: boardArt.h * sp.h }),
    round({ x: Math.max(px, boardArt.x - sideW * 0.12), y: sideY, w: sideW, h: sideH }), round({ x: boardArt.x + boardArt.w - sideW * 0.88, y: sideY, w: sideW, h: sideH })];
  const plating = { ...round({ x: px, y: row.y, w: pwBoard, h: row.h }), art: boardArt, tag: { x: Math.round(px + pwBoard / 2), y: tagY } };
  // A row that slides keeps a narrow gutter at each side for its arrows; every station has a slot of the view's width over two.
  const gut = n > shown ? ROW_GUTTER : 0, view = { x: px + pwBoard + 4, y: row.y, w: pw - pwBoard - 4, h: row.h };
  const each = (view.w - 2 * gut) / shown, stations: Partial<Record<StationKind, Station>> = {};
  kinds.forEach((k, i) => {
    const x = view.x + gut + i * each, spec = STATION_ART[k];
    const art = round(fitBottom(spec.size, { x: x + 2, y: row.y, w: each - 4, h: floor - row.y }));
    const bowl = { x: art.x + art.w * spec.bowl.x, y: art.y + art.h * spec.bowl.y, rx: art.w * spec.bowl.rx, ry: art.h * spec.bowl.ry };
    stations[k] = { ...round({ x, y: row.y, w: each, h: row.h }), art, bowl, tag: { x: Math.round(x + each / 2), y: tagY } };
  });
  return { stations, plating, board, row: { ...round(view), slot: each, kinds } };
}
