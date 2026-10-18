/**
 * One portrait layout for the Rush Hour playfield (GAME_PLAN §13), shared by the Phaser canvas and the DOM overlay.
 * Bands, top to bottom: HUD, recipe strip, guests at the counter, shelves, stations, heat panel, dialogue.
 */
import type { StationKind } from "../content/dishes";

export type Rect = { x: number; y: number; w: number; h: number };
export type Layout = {
  w: number; h: number; hud: Rect; recipe: Rect; guests: Rect; counter: Rect; seats: Rect[]; mats: Rect[];
  shelves: Rect; stations: Record<string, Rect>; board: Rect[]; heat: Rect; dialogue: Rect; coin: { x: number; y: number };
};

export function computeLayout(w: number, h: number, seats: number, stations: StationKind[]): Layout {
  const pad = Math.round(w * 0.03);
  const bands = { hud: 0.075, recipe: 0.085, guests: 0.25, shelves: 0.205, stations: 0.17, heat: 0.105, dialogue: 0.11 };
  let y = 0;
  const band = (k: keyof typeof bands) => { const r = { x: 0, y, w, h: Math.round(h * bands[k]) }; y += r.h; return r; };
  const hud = band("hud"), recipe = band("recipe"), guests = band("guests"), shelves = band("shelves"), stationRow = band("stations"), heat = band("heat");
  const dialogue = { x: 0, y, w, h: h - y };
  const counter = { x: 0, y: guests.y + guests.h * 0.72, w, h: guests.h * 0.28 };
  const seatW = (w - pad * 2) / 4;
  const offset = (4 - seats) * seatW / 2;
  const seatRects: Rect[] = [], mats: Rect[] = [];
  for (let i = 0; i < seats; i++) {
    const x = pad + offset + i * seatW;
    // The top of the band is kept for order bubbles; guests sit lower, head and shoulders above the counter.
    seatRects.push({ x, y: guests.y + guests.h * 0.3, w: seatW, h: guests.h * 0.66 });
    mats.push({ x: x + seatW * 0.18, y: counter.y + counter.h * 0.12, w: seatW * 0.64, h: counter.h * 0.6 });
  }
  // Stations row: plating board (three plates) on the left, then each station.
  const boardW = Math.round(w * (stations.length >= 4 ? 0.25 : stations.length === 3 ? 0.3 : 0.34));
  const board: Rect[] = [0, 1, 2].map(i => ({ x: pad + i * (boardW - pad) / 3, y: stationRow.y + stationRow.h * 0.48, w: (boardW - pad) / 3 - 2, h: stationRow.h * 0.44 }));
  const right = w - boardW - pad, each = right / Math.max(1, stations.length);
  const st: Record<string, Rect> = {};
  stations.forEach((k, i) => { st[k] = { x: boardW + i * each, y: stationRow.y + stationRow.h * 0.04, w: each, h: stationRow.h * 0.92 }; });
  return { w, h, hud, recipe, guests, counter, seats: seatRects, mats, shelves, stations: st, board, heat, dialogue, coin: { x: w * 0.42, y: hud.y + hud.h * 0.5 } };
}
