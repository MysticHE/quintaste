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
 * The station row's view (owner, 23 Oct 2026): beside the serving tray a phone shows two stations at a time and a row of three or
 * four slides to the rest; a tablet's wider row shows up to four (`shown`). `stations` in a Layout sit on the slid-out strip (slot
 * `slot` wide, in `kinds` order); viewLayout gives what is on screen.
 */
export type Row = Rect & { slot: number; kinds: StationKind[]; shown: number };
export type Layout = {
  /** `ts` is the player's text size (Play your way), which every font size in the DOM panels is multiplied by. */
  w: number; h: number; s: number; ts: number;
  /**
   * `col` holds the café (HUD, order card, guests, counter) and `kit` the kitchen (shelf, stations, heat panel): one column on a phone
   * or a portrait tablet, two side by side on a landscape tablet or desktop. `backdrop` and `kitchen` are what the room and the
   * worktop pictures cover.
   */
  col: Rect; kit: Rect; seatW: number;
  hud: Rect; recipe: Rect; backdrop: Rect; kitchen: Rect; counter: Rect; seats: Seat[];
  /** `cols` cards a row on a shelf page (five on a phone, up to seven on a wider shelf) and `rows` rows (two, three in a tall kitchen pane). */
  shelves: Rect; card: { w: number; h: number; gap: number; cols: number; rows: number };
  stations: Partial<Record<StationKind, Station>>; plating: Rect & { art: Rect; tag: Point }; board: Rect[]; row: Row;
  heat: Rect;
};

/** Where a row of `n` with `shown` in view can rest: the first station in view (two in view: a row of three shows 1–2 then 2–3, of four 1–2 then 3–4). */
export const rowStarts = (n: number, shown = 2) => (n <= shown ? [0] : [0, n - shown]);
/** A station moved along the row by `dx`. */
export const shiftStation = (r: Station, dx: number): Station =>
  ({ ...r, x: r.x + dx, art: { ...r.art, x: r.art.x + dx }, bowl: { ...r.bowl, x: r.bowl.x + dx }, tag: { ...r.tag, x: r.tag.x + dx } });
/** The layout as the screen shows it with the row resting at `start`: only the stations in view, where they are on screen. */
export function viewLayout(L: Layout, start: number): Layout {
  const { kinds, shown } = L.row;
  if (kinds.length <= shown) return L;
  const stations: Layout["stations"] = {};
  kinds.forEach((k, i) => { if (i >= start && i < start + shown) stations[k] = shiftStation(L.stations[k]!, -start * L.row.slot); });
  return { ...L, stations };
}
/** Where the row rests to show `kind`: where it is now if `kind` is in view, else the end of the row it is at. */
export function startFor(L: Layout, kind: StationKind, start: number) {
  const { kinds, shown } = L.row, i = kinds.indexOf(kind), starts = rowStarts(kinds.length, shown);
  if (i < 0 || (i >= start && i < start + shown)) return start;
  return i < start ? starts[0] : starts[starts.length - 1];
}
/** The row's edge a point is over (a drag held there slides the row), or null; a row of one or two never slides. */
export function rowEdge(L: Layout, p: Point, start: number): "back" | "next" | null {
  const r = L.row, starts = rowStarts(r.kinds.length, r.shown);
  if (starts.length < 2 || p.y < r.y - 8 || p.y > r.y + r.h + 8) return null;
  if (p.x >= r.x - EDGE_OUT && p.x <= r.x + ROW_GUTTER + EDGE_IN && start > starts[0]) return "back";
  if (p.x >= r.x + r.w - ROW_GUTTER - EDGE_IN && p.x <= r.x + r.w + EDGE_OUT && start < starts[starts.length - 1]) return "next";
  return null;
}
/**
 * A sliding row keeps a gutter at each side for its arrows, off the stations in view; a drag held over a gutter (reaching a little past
 * it, and a few px onto the station beside it) slides the row, so pausing over a station to aim never does.
 */
export const ROW_GUTTER = 14;
const EDGE_IN = 4, EDGE_OUT = 12;

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

/**
 * A landscape screen with room for two phone columns side by side (a tablet or desktop) shows the café and the kitchen in two panes;
 * anything else is one column, phone width on a phone and wider on a portrait tablet.
 */
export function computeLayout(w: number, h: number, seats: number, stations: StationKind[], knob = false, ts = 1): Layout {
  return w >= 900 && h >= 560 && w >= h * 1.15 ? twoPanes(w, h, seats, stations, knob, ts) : oneColumn(w, h, seats, stations, knob, ts);
}
/** Cards a row on a shelf page: five on a phone, up to seven on a wider shelf, never narrower than about 110 px. */
const cardCols = (pw: number) => clamp(Math.floor((pw - 16) / 112), 5, 7);

function oneColumn(w: number, h: number, seats: number, stations: StationKind[], knob: boolean, ts: number): Layout {
  // A phone column, up to 560 px wide; a portrait tablet's column is wider (up to 780 px), with more cards a row and more stations in view.
  const cw = Math.round(Math.min(w, h * 0.62, w >= 700 ? 780 : 560)), x0 = Math.round((w - cw) / 2);
  const s = clamp((h - 250) / 486, 0.72, 1), m = Math.round(8 * s), px = x0 + 8, pw = cw - 16;
  const hud = { x: px, y: Math.round(6 * s), w: pw, h: Math.round(54 * s) };
  const recipe = { x: px, y: hud.y + hud.h + Math.round(6 * s), w: pw, h: Math.round(70 * s) };
  const top = recipe.y + recipe.h;
  // Bottom panels keep the height their content needs; the rest is shared: the café scene gets a floor (a guest, their bubble and the counter),
  // then the shelf cards take what they want up to a comfortable size, and the station row only what its art needs.
  // No chat panel (owner, 22 Oct 2026): messages are short toasts, and the heat panel sits at the bottom, taller with the knob's cook timer.
  const heatH = knob ? 146 : 116, heat = { x: px, y: h - m - heatH, w: pw, h: heatH };
  const flex = heat.y - top - 3 * m, minScene = 140, minStation = 78;
  // Five cards a row on a phone, as in the owner's mockup (more on a wider shelf): a longer shelf pages with its arrows (or a swipe).
  const cols = cardCols(pw), gap = Math.round(6 * s), cardW = Math.floor((pw - 16 - (cols - 1) * gap) / cols);
  const cardMax = Math.floor((flex - minScene - minStation - 32 - gap) / 2);
  // The shelf keeps a strip under the cards for its page dots (a long shelf).
  // Room above and below the cards inside the shelf, so their borders and glows are never clipped.
  const cardH = Math.round(clamp(Math.min(cardW * 1.2, cardMax), 50, 96)), shelfH = cardH * 2 + gap + 32;
  const left = flex - shelfH;
  // The station row is only as tall as its art needs (the art is width-limited on crowded levels); the café scene takes the rest.
  const stationH = Math.round(clamp(Math.min(left - minScene, neededRow(stations, pw, s)), minStation, 150)), sceneH = left - stationH;
  const counterH = Math.round(clamp(sceneH * 0.2, 34 * s, 52));
  const counter = { x: 0, y: top + sceneH - counterH, w, h: counterH };
  const backdrop = { x: 0, y: 0, w, h: counter.y + 4 }, below = counter.y + counterH - 2, kitchen = { x: 0, y: below, w, h: h - below };
  const shelves = { x: px, y: counter.y + counterH + m, w: pw, h: shelfH };
  const row = { y: shelves.y + shelfH + m, h: stationH }, col = { x: x0, y: 0, w: cw, h };
  return {
    w, h, s, ts, col, kit: col, seatW: Math.floor((pw - 8) / (seats <= 3 ? 3 : 4)), hud, recipe, backdrop, kitchen, counter, seats: seatBoxes(seats, px, pw, top, counter, s, x0 + cw, ts),
    shelves, card: { w: cardW, h: cardH, gap, cols, rows: 2 }, ...stationRow(stations, px, pw, row, s), heat,
  };
}

/**
 * Two panes (owner, 23 Oct 2026: "a proper tablet layout"): the café room on the left, with the HUD and order card above the guests
 * and the counter at its foot; the kitchen on the right, with the shelf at the top and the stations and heat panel at the bottom.
 */
function twoPanes(w: number, h: number, seats: number, stations: StationKind[], knob: boolean, ts: number): Layout {
  const s = clamp((h - 250) / 486, 0.72, 1), m = Math.round(8 * s), between = 12;
  const paneW = Math.round(Math.min(640, (w - 3 * between) / 2)), x0 = Math.round((w - 2 * paneW - between) / 2), x1 = x0 + paneW + between;
  const split = Math.round(x0 + paneW + between / 2), px = x0 + 8, pw = paneW - 16, kx = x1 + 8, kw = paneW - 16;
  const hud = { x: px, y: Math.round(6 * s), w: pw, h: Math.round(54 * s) };
  const recipe = { x: px, y: hud.y + hud.h + Math.round(6 * s), w: pw, h: Math.round(70 * s) };
  const top = recipe.y + recipe.h, counterH = Math.round(clamp((h - top) * 0.12, 34 * s, 56));
  const counter = { x: 0, y: h - m - counterH, w: split, h: counterH };
  // The kitchen: the heat panel at the bottom, the station row just above it, the shelf at the top with the cards it wants.
  const heatH = knob ? 146 : 116, heat = { x: kx, y: h - m - heatH, w: kw, h: heatH }, room = heat.y - 3 * m;
  const need = Math.round(clamp(neededRow(stations, kw, s), 78, 190));
  // A tall pane gives the shelf a third row of cards (fewer pages to swipe) when each can still be 84 px tall.
  const cols = cardCols(kw), gap = Math.round(6 * s), cardW = Math.floor((kw - 16 - (cols - 1) * gap) / cols);
  const fit = (rows: number) => Math.floor((room - need - 32 - (rows - 1) * gap) / rows), rows = fit(3) >= 84 ? 3 : 2;
  const cardH = Math.round(clamp(Math.min(cardW * 1.2, fit(rows)), 50, 120)), shelfH = cardH * rows + (rows - 1) * gap + 32;
  const stationH = Math.round(clamp(room - shelfH, 78, need)), row = { y: heat.y - m - stationH, h: stationH };
  return {
    w, h, s, ts, col: { x: x0, y: 0, w: paneW, h }, kit: { x: x1, y: 0, w: paneW, h }, seatW: Math.floor((pw - 8) / (seats <= 3 ? 3 : 4)), hud, recipe,
    backdrop: { x: 0, y: 0, w: split, h }, kitchen: { x: split, y: 0, w: w - split, h }, counter, seats: seatBoxes(seats, px, pw, top, counter, s, x0 + paneW, ts),
    shelves: { x: kx, y: m, w: kw, h: shelfH }, card: { w: cardW, h: cardH, gap, cols, rows }, ...stationRow(stations, kx, kw, row, s), heat,
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

/** The serving tray's share of the row, by how many stations are in view beside it. */
const boardShare = (shown: number) => (shown <= 1 ? 0.44 : shown === 2 ? 0.34 : shown === 3 ? 0.28 : 0.24);
/** Stations in view: as many as get a slot of MIN_SLOT px or more, two at least (a phone shows two, a tablet up to four). */
const MIN_SLOT = 104;
function rowShown(n: number, pw: number) {
  let k = n;
  while (k > 2 && (pw * (1 - boardShare(k)) - 4) / k < MIN_SLOT) k--;
  return Math.max(1, k);
}
/** Row height that fits the tallest station's art at the width each station in view gets, plus its tag. */
function neededRow(kinds: StationKind[], pw: number, s: number) {
  const shown = rowShown(kinds.length, pw), each = (pw * (1 - boardShare(shown)) - 4) / shown - 4;
  return Math.max(...kinds.map(k => each * STATION_ART[k].size[1] / STATION_ART[k].size[0])) + 8;
}

/** Plating board on the left, then the stations in view (rowShown); every piece of art rests on the row's floor above its state tag. */
function stationRow(kinds: StationKind[], px: number, pw: number, row: { y: number; h: number }, s: number) {
  // Station art stands on the row's floor; a state tag, shown only when it asks for something, floats over the art's foot.
  const n = kinds.length, shown = rowShown(n, pw), floor = row.y + row.h - 4, tagY = Math.round(row.y + row.h - 22 * s);
  const pwBoard = pw * boardShare(shown);
  // One serving plate on a rattan tray (owner, 23 Oct 2026): the first plated dish sits on the tray's plate; a second or third (two
  // stations finishing together) waits on a small plate at the tray's front corners, drawn only while it holds a dish.
  const boardArt = round(fitBottom(SERVING_ART, { x: px, y: row.y, w: pwBoard, h: floor - row.y })), sp = SERVING_PLATE;
  const sideW = boardArt.w * 0.38, sideH = sideW * PLATE_ART[1] / PLATE_ART[0], sideY = boardArt.y + boardArt.h - sideH * 0.95;
  // The left corner plate leans past the tray, but never past the column's side margin.
  const board = [round({ x: boardArt.x + boardArt.w * sp.x, y: boardArt.y + boardArt.h * sp.y, w: boardArt.w * sp.w, h: boardArt.h * sp.h }),
    round({ x: Math.max(px, boardArt.x - sideW * 0.12), y: sideY, w: sideW, h: sideH }), round({ x: boardArt.x + boardArt.w - sideW * 0.88, y: sideY, w: sideW, h: sideH })];
  const plating = { ...round({ x: px, y: row.y, w: pwBoard, h: row.h }), art: boardArt, tag: { x: Math.round(px + pwBoard / 2), y: tagY } };
  // A row that slides keeps a gutter at each side for its arrows; every station has a slot of the view's width over those in view.
  const gut = n > shown ? ROW_GUTTER : 0, view = { x: px + pwBoard + 4, y: row.y, w: pw - pwBoard - 4, h: row.h };
  const each = (view.w - 2 * gut) / shown, stations: Partial<Record<StationKind, Station>> = {};
  kinds.forEach((k, i) => {
    const x = view.x + gut + i * each, spec = STATION_ART[k];
    const art = round(fitBottom(spec.size, { x: x + 2, y: row.y, w: each - 4, h: floor - row.y }));
    const bowl = { x: art.x + art.w * spec.bowl.x, y: art.y + art.h * spec.bowl.y, rx: art.w * spec.bowl.rx, ry: art.h * spec.bowl.ry };
    stations[k] = { ...round({ x, y: row.y, w: each, h: row.h }), art, bowl, tag: { x: Math.round(x + each / 2), y: tagY } };
  });
  return { stations, plating, board, row: { ...round(view), slot: each, kinds, shown } };
}
