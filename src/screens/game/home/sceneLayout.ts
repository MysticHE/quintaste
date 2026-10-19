import type { SlotId } from "../../../game/content/cosmetics";
/**
 * My little café scene coordinates (docs/GAME_HOME_PLAN.md). Units: x 0–100 across the scene width, y 0–150 down
 * its height (the skins are 2:3 portraits). Backdrop hotspots differ per skin; everything else sits on the counter layer.
 */
export type Box = [number, number, number, number];
const sc = (x: number, y: number, w: number, h: number): Box => [x, y * 1.5, w, h * 1.5];

export const BACK: Record<"books" | "menu" | "window" | "wardrobe", Record<string, Box>> = {
  // The signature room was painted from the sunny room's layout, so it shares its tap areas.
  books: { sunny: sc(0, 1, 17, 55), lotus: sc(0, 1, 17, 56), lantern: sc(0, 3, 16, 53), signature: sc(0, 1, 17, 55) },
  menu: { sunny: sc(65, 18, 18, 21), lotus: sc(62, 16, 20, 25), lantern: sc(68, 18, 19, 26), signature: sc(65, 18, 18, 21) },
  window: { sunny: sc(19, 9, 43, 26), lotus: sc(21, 11, 40, 26), lantern: sc(22, 12, 43, 24), signature: sc(19, 9, 43, 26) },
  wardrobe: { sunny: sc(86, 17, 14, 32), lotus: sc(87, 20, 13, 30), lantern: sc(88, 20, 12, 33), signature: sc(86, 17, 14, 32) },
};
export const COUNTER = { x: 6, y: 94, w: 88 };
export const STOVE: Box = [60, 88, 29, 21];
/** The avatar cooks behind the counter: centre x, bottom y (hidden by the counter) and width. */
export const AVATAR = { cx: 50, bottom: 110, w: 30 };
export const PET = { x: 25.5, bottom: 107, w: 17 };
export const STATIONS_ON_COUNTER = [
  { id: "rice", art: "rice-cooker", name: "Rice cooker", x: 6.5, w: 14, bottom: 106.5, level: 11 },
  { id: "soup", art: "soup-pot", name: "Soup pot", x: 45.5, w: 15, bottom: 106.5, level: 8 },
  // Drawn after the rice cooker so it sits just in front of it, with the companion in front of both.
  { id: "board", art: "assembly-counter", name: "Assembly board", x: 15.5, w: 13, bottom: 107.6, level: 15 },
];
export type { SlotId };
export const SLOTS: Record<SlotId, { name: string; fits: "hanging" | "wall" | "floor"; box: Box; anchor: "top" | "center" | "bottom"; wallTop?: Record<string, number> }> = {
  ceiling: { name: "Ceiling", fits: "hanging", box: [39, 3.5, 22, 24], anchor: "top" },
  wall: { name: "Wall by the door", fits: "wall", box: [67.5, 61, 14, 17], anchor: "center", wallTop: { sunny: 61, lotus: 62.5, lantern: 67, signature: 61 } },
  floorL: { name: "Floor left", fits: "floor", box: [-1, 117, 27, 32], anchor: "bottom" },
  floorR: { name: "Floor right", fits: "floor", box: [70, 126, 31, 23], anchor: "bottom" },
};
export const slotBox = (id: SlotId, skin: string): Box => {
  const s = SLOTS[id]; const b = [...s.box] as Box; if (s.wallTop) b[1] = s.wallTop[skin] ?? b[1]; return b;
};
/** Where steam leaves the wok on the stove. */
export const WOK = { x: 73, y: 93 };

/** Beacon points (scene units) marking what can be tapped; the companion's and the menu's are computed. */
export const BEACONS: Record<"books" | "wardrobe" | "stove" | "avatar", [number, number]> = { books: [9, 44], wardrobe: [92, 46], stove: [83, 91], avatar: [57, 72] };

/**
 * Fits the 2:3 portrait room to the screen without ever cropping its sides. With a wide skin the room fits the height
 * (cropping at most the top 22 units under the HUD) and, on phones, takes 90% of the width so the wide art shows a
 * little more room at each edge; the wide art fills the rest. Without one, phones fill the width and wider screens slide
 * the room up (at most 45 units in play, 22 in decorate so the ceiling spot stays reachable) before falling back to a
 * blurred copy of the room. The counter (play) or floor slots (decorate) always stay above the controls. When there is
 * height to spare the room moves down by at most `lift` and Stage mirrors the ceiling above it.
 */
export function stageFit(W: number, H: number, reserve: number, decorating: boolean, lift = 0, wide = false) {
  const crop = decorating || wide ? 22 : 45, need = decorating ? 150 : 128, avail = Math.max(1, H - reserve);
  const most = Math.min(W, (avail * 100) / (need - crop));
  const width = Math.max(0, wide ? Math.min(most, W * 0.9, Math.max((avail * 100) / 150, W / WIDE_SCALE)) : Math.min(most, decorating ? H / 1.2 : Infinity));
  const u = width / 100;
  const top = Math.max(-crop * u, Math.min(0, avail - 150 * u));
  return { width, u, left: (W - width) / 2, top: top < 0 || decorating ? top : Math.min(lift, Math.max(0, avail - 125 * u - 110)) };
}
/** Wide skins are 3:2 with the 2:3 room in the middle, so they are 2.25 times the room's width. */
export const WIDE_SCALE = 2.25;
