/**
 * Geometry of the bundled station art (assets/game), for the playfield: each image's pixel size and where food sits,
 * as fractions of the image (centre and radii of the bowl). The rice cooker is closed, so its food stays out of sight.
 */
import type { StationKind } from "../content/dishes";

export type ArtOval = { x: number; y: number; rx: number; ry: number };
export const STATION_ART: Record<StationKind, { size: [number, number]; bowl: ArtOval; flame: ArtOval; closed?: boolean }> = {
  pan: { size: [320, 232], bowl: { x: 0.45, y: 0.36, rx: 0.25, ry: 0.15 }, flame: { x: 0.37, y: 0.72, rx: 0.23, ry: 0.05 } },
  pot: { size: [320, 314], bowl: { x: 0.45, y: 0.4, rx: 0.24, ry: 0.09 }, flame: { x: 0.45, y: 0.84, rx: 0.2, ry: 0.04 } },
  dessert: { size: [320, 293], bowl: { x: 0.47, y: 0.37, rx: 0.27, ry: 0.1 }, flame: { x: 0.47, y: 0.8, rx: 0.22, ry: 0.04 } },
  rice: { size: [318, 320], bowl: { x: 0.5, y: 0.2, rx: 0.2, ry: 0.07 }, flame: { x: 0.5, y: 0.9, rx: 0.1, ry: 0.02 }, closed: true },
  board: { size: [320, 212], bowl: { x: 0.49, y: 0.44, rx: 0.3, ry: 0.2 }, flame: { x: 0.5, y: 0.9, rx: 0.1, ry: 0.02 } },
  // A lidded jug (handle on the right): like the rice cooker, what is blending stays out of sight; the glow sits on the motor base.
  blender: { size: [192, 320], bowl: { x: 0.43, y: 0.38, rx: 0.24, ry: 0.07 }, flame: { x: 0.43, y: 0.85, rx: 0.16, ry: 0.03 }, closed: true },
  // Chapters 4–10: sized for the station sketch (240 × 320) until QT Gamer's art is imported; set from the picture then.
  steamer: { size: [240, 320], bowl: { x: 0.5, y: 0.45, rx: 0.3, ry: 0.08 }, flame: { x: 0.5, y: 0.9, rx: 0.2, ry: 0.03 }, closed: true },
  oven: { size: [240, 320], bowl: { x: 0.5, y: 0.5, rx: 0.3, ry: 0.1 }, flame: { x: 0.5, y: 0.75, rx: 0.3, ry: 0.04 }, closed: true },
  griddle: { size: [240, 320], bowl: { x: 0.5, y: 0.5, rx: 0.34, ry: 0.12 }, flame: { x: 0.5, y: 0.85, rx: 0.25, ry: 0.03 } },
  fryer: { size: [240, 320], bowl: { x: 0.5, y: 0.45, rx: 0.28, ry: 0.09 }, flame: { x: 0.5, y: 0.88, rx: 0.2, ry: 0.03 } },
  dough: { size: [240, 320], bowl: { x: 0.5, y: 0.5, rx: 0.34, ry: 0.16 }, flame: { x: 0.5, y: 0.9, rx: 0.1, ry: 0.02 } },
  fridge: { size: [240, 320], bowl: { x: 0.5, y: 0.45, rx: 0.3, ry: 0.1 }, flame: { x: 0.5, y: 0.9, rx: 0.1, ry: 0.02 }, closed: true },
};
/** The wooden plating board ("board" art) and the plate art laid on it. */
export const PLATING_ART: [number, number] = [320, 143];
export const PLATE_ART: [number, number] = [256, 152];
/** Guest portraits are about this wide for their height. */
export const GUEST_ASPECT = 0.86;
