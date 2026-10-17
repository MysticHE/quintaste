import { planningAreaProjection as P, planningAreas, type PlanningArea } from "../data/planning-areas";

export const planningAreaByCode = new Map(planningAreas.map(area => [area.code, area]));
/** Web Mercator pixels at the geometry zoom, in the same space as the generated planning-area rings. */
export function projectPoint(latitude: number, longitude: number): [number, number] {
  const scale = P.tile * 2 ** P.zoom;
  const x = (longitude + 180) / 360 * scale - P.originX * P.tile;
  const y = (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * scale - P.originY * P.tile;
  return [x, y];
}
function inRing(x: number, y: number, ring: number[]) {
  let hit = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
/** The planning area containing a projected pixel, if any. */
export function planningAreaAtPixel(x: number, y: number): PlanningArea | undefined {
  return planningAreas.find(area => area.rings.some(ring => inRing(x, y, ring)));
}
/**
 * The planning area for a saved place, computed on the device so only the area code ever leaves it.
 * Simplified outlines can miss points right on a boundary, so the nearest area centre within about 1 km is used then.
 */
export function planningAreaFor(latitude: number, longitude: number): PlanningArea | undefined {
  const [x, y] = projectPoint(latitude, longitude);
  const exact = planningAreaAtPixel(x, y);
  if (exact) return exact;
  let best: PlanningArea | undefined, distance = 14;
  for (const area of planningAreas) {
    const d = Math.hypot(area.label[0] - x, area.label[1] - y);
    if (d < distance) { best = area; distance = d; }
  }
  return best;
}
export const ringPath = (ring: number[]) => {
  let d = "M" + ring[0] + " " + ring[1];
  for (let i = 2; i < ring.length; i += 2) d += "L" + ring[i] + " " + ring[i + 1];
  return d + "Z";
};
