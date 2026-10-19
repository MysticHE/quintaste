/**
 * One portrait layout for the Rush Hour playfield (GAME_PLAN §13), shared by the Phaser canvas and the DOM panels.
 * A centred column (phone width, capped on tablets and desktops) holds, top to bottom: HUD, recipe card, guests at the
 * counter, the ingredient shelf, stations, the heat panel and the dialogue. Short screens scale the fixed bands down;
 * the guests and the stations share whatever height is left, so nothing is ever clipped.
 */
import type { StationKind } from "../content/dishes";
import { GUEST_ASPECT, PLATE_ART, PLATING_ART, STATION_ART } from "./stationArt";

export type Rect = { x: number; y: number; w: number; h: number };
export type Oval = { x: number; y: number; rx: number; ry: number };
export type Point = { x: number; y: number };
/** A guest's seat: where they stand, their plate mat on the counter, the tip of their order bubble and the seat tag. */
export type Seat = { guest: Rect; mat: Rect; bubble: Point; tag: Point };
/** A station's tap area, its fitted art, where food sits (bowl) and the state tag under it. */
export type Station = Rect & { art: Rect; bowl: Oval; tag: Point };
export type Layout = {
  w: number; h: number; s: number; col: Rect; seatW: number;
  hud: Rect; recipe: Rect; backdrop: Rect; counter: Rect; seats: Seat[];
  shelves: Rect; card: { w: number; h: number; gap: number };
  stations: Partial<Record<StationKind, Station>>; plating: Rect & { art: Rect; tag: Point }; board: Rect[];
  heat: Rect; dialogue: Rect;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
/** Fits an image of `size` inside `box`, centred horizontally and resting on the box's bottom edge. */
function fitBottom(size: [number, number], box: Rect): Rect {
  const k = Math.min(box.w / size[0], box.h / size[1]), w = size[0] * k, h = size[1] * k;
  return { x: box.x + (box.w - w) / 2, y: box.y + box.h - h, w, h };
}

export function computeLayout(w: number, h: number, seats: number, stations: StationKind[]): Layout {
  const cw = Math.round(Math.min(w, h * 0.62, 560)), x0 = Math.round((w - cw) / 2);
  const s = clamp((h - 250) / 486, 0.72, 1), m = Math.round(8 * s), px = x0 + 8, pw = cw - 16;
  const hud = { x: px, y: Math.round(6 * s), w: pw, h: Math.round(54 * s) };
  const recipe = { x: px, y: hud.y + hud.h + Math.round(6 * s), w: pw, h: Math.round(64 * s) };
  const top = recipe.y + recipe.h;
  // Bottom panels keep the height their content needs; the rest is shared: the café scene gets a floor (a guest, their bubble and the counter),
  // then the shelf cards take what they want up to a comfortable size, and the station row only what its art needs.
  const dialogue = { x: px, y: h - m - Math.max(66, Math.round(72 * s)), w: pw, h: Math.max(66, Math.round(72 * s)) };
  const heat = { x: px, y: dialogue.y - Math.round(6 * s) - 90, w: pw, h: 90 };
  const flex = heat.y - top - 3 * m, minScene = 140, minStation = 78;
  const gap = Math.round(6 * s), cardW = Math.floor((pw - 16 - 5 * gap - 14) / 6);
  const cardMax = Math.floor((flex - minScene - minStation - 16 - gap) / 2);
  const cardH = Math.round(clamp(Math.min(cardW * 1.34, cardMax), 50, 92)), shelfH = cardH * 2 + gap + 16;
  const left = flex - shelfH;
  // The station row is only as tall as its art needs (the art is width-limited on crowded levels); the café scene takes the rest.
  const stationH = Math.round(clamp(Math.min(left - minScene, neededRow(stations, pw, s)), minStation, 150)), sceneH = left - stationH;
  const counterH = Math.round(clamp(sceneH * 0.2, 34 * s, 52));
  const counter = { x: 0, y: top + sceneH - counterH, w, h: counterH };
  const backdrop = { x: 0, y: 0, w, h: counter.y + 4 };
  const shelves = { x: px, y: counter.y + counterH + m, w: pw, h: shelfH };
  const row = { y: shelves.y + shelfH + m, h: stationH };
  return {
    w, h, s, col: { x: x0, y: 0, w: cw, h }, seatW: Math.floor((pw - 8) / (seats <= 2 ? 3 : 4)), hud, recipe, backdrop, counter, seats: seatBoxes(seats, px, pw, top, counter, s, x0 + cw),
    shelves, card: { w: cardW, h: cardH, gap }, ...stationRow(stations, px, pw, row, s), heat, dialogue,
  };
}

/** Seats share three or four columns across the counter (fewer seats sit centred); guests stand behind it, head and shoulders up. */
function seatBoxes(n: number, px: number, pw: number, top: number, counter: Rect, s: number, right: number): Seat[] {
  const cols = n <= 2 ? 3 : 4, seatW = (pw - 8) / cols, offset = (cols - n) * seatW / 2, bubbleH = 70;
  const bottom = counter.y + counter.h * 0.45, gh = Math.min(seatW * (cols === 3 ? 1.1 : 1.22), (bottom - top - bubbleH) / 0.94), gw = gh * GUEST_ASPECT;
  return Array.from({ length: n }, (_, i) => {
    const cx = px + 4 + offset + seatW * (i + 0.5);
    const matW = Math.min(seatW * 0.66, counter.h * 1.9), matH = matW * PLATE_ART[1] / PLATE_ART[0];
    const mat = round({ x: cx - matW / 2, y: counter.y + counter.h * 0.5 - matH / 2, w: matW, h: matH });
    return { guest: round({ x: cx - gw / 2, y: bottom - gh, w: gw, h: gh }), mat, bubble: { x: Math.round(cx), y: Math.round(Math.max(bottom - gh + gh * 0.06, top + bubbleH + 6)) },
      tag: { x: Math.round(Math.min(mat.x + mat.w - 4, right - 36)), y: Math.round(mat.y + mat.h * 0.62) } };
  });
}

const boardShare = (n: number) => (n <= 1 ? 0.44 : n === 2 ? 0.34 : n === 3 ? 0.28 : 0.24);
const tagHeight = (s: number) => Math.round(24 * s);
/** Row height that fits the tallest station's art at the width each station gets, plus its tag. */
function neededRow(kinds: StationKind[], pw: number, s: number) {
  const each = (pw * (1 - boardShare(kinds.length)) - 4) / Math.max(1, kinds.length) - 4;
  return Math.max(...kinds.map(k => each * STATION_ART[k].size[1] / STATION_ART[k].size[0])) + tagHeight(s) * 0.6 + 6;
}

/** Plating board on the left, then each station; every piece of art rests on the row's floor above its state tag. */
function stationRow(kinds: StationKind[], px: number, pw: number, row: { y: number; h: number }, s: number) {
  const n = kinds.length, tagH = tagHeight(s), floor = row.y + row.h - tagH * 0.6;
  const pwBoard = pw * boardShare(n);
  const boardArt = round(fitBottom(PLATING_ART, { x: px, y: row.y, w: pwBoard, h: floor - row.y }));
  const plateW = boardArt.w * 0.28, plateH = plateW * PLATE_ART[1] / PLATE_ART[0];
  const board = [0, 1, 2].map(i => round({ x: boardArt.x + boardArt.w * (0.13 + i * 0.29), y: boardArt.y + boardArt.h * 0.46 - plateH / 2, w: plateW, h: plateH }));
  const plating = { ...round({ x: px, y: row.y, w: pwBoard, h: row.h }), art: boardArt, tag: { x: Math.round(px + pwBoard / 2), y: Math.round(row.y + row.h - tagH / 2) } };
  const each = (pw - pwBoard - 4) / Math.max(1, n), stations: Partial<Record<StationKind, Station>> = {};
  kinds.forEach((k, i) => {
    const x = px + pwBoard + 4 + i * each, spec = STATION_ART[k];
    const art = round(fitBottom(spec.size, { x: x + 2, y: row.y, w: each - 4, h: floor - row.y }));
    const bowl = { x: art.x + art.w * spec.bowl.x, y: art.y + art.h * spec.bowl.y, rx: art.w * spec.bowl.rx, ry: art.h * spec.bowl.ry };
    stations[k] = { ...round({ x, y: row.y, w: each, h: row.h }), art, bowl, tag: { x: Math.round(x + each / 2), y: Math.round(row.y + row.h - tagH / 2) } };
  });
  return { stations, plating, board };
}
