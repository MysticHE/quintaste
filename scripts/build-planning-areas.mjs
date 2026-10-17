#!/usr/bin/env node
// Builds the compact planning-area geometry used by the area participation map.
// Input: URA "Master Plan 2025 Planning Area Boundary (No Sea)" GeoJSON from data.gov.sg
// (Singapore Open Data Licence). Usage: node scripts/build-planning-areas.mjs <path-to-geojson>
// Coordinates are projected to Web Mercator pixels at zoom 11, relative to OneMap tile (1613, 1015),
// so the shapes line up with OneMap basemap tiles drawn at 256 px per tile.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ZOOM = 11, TILE = 256, ORIGIN_X = 1613, ORIGIN_Y = 1015, TOLERANCE = 0.6, MIN_PART = 40;
const input = process.argv[2];
if (!input) { console.error('Usage: node scripts/build-planning-areas.mjs <planning-area.geojson>'); process.exit(1); }
const source = JSON.parse(readFileSync(input, 'utf8'));
if (source.type !== 'FeatureCollection' || !Array.isArray(source.features)) throw new Error('Expected a GeoJSON FeatureCollection');

const scale = TILE * 2 ** ZOOM;
const project = ([lon, lat]) => {
  const x = (lon + 180) / 360 * scale - ORIGIN_X * TILE;
  const y = (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * scale - ORIGIN_Y * TILE;
  return [x, y];
};
function simplify(points, tolerance) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let best = 0, index = -1;
    const [ax, ay] = points[a], [bx, by] = points[b], dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / length;
      if (d > best) { best = d; index = i; }
    }
    if (best > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
const area = ring => Math.abs(ring.reduce((sum, [x, y], i) => { const [nx, ny] = ring[(i + 1) % ring.length]; return sum + x * ny - nx * y; }, 0) / 2);
const inside = (x, y, ring) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
const edgeDistance = (x, y, ring) => {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
};
// Label point: the grid point inside the largest part that is farthest from its edges.
function labelPoint(ring) {
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best = [(minX + maxX) / 2, (minY + maxY) / 2], score = -1;
  for (let gx = 0; gx <= 30; gx++) for (let gy = 0; gy <= 30; gy++) {
    const x = minX + (maxX - minX) * gx / 30, y = minY + (maxY - minY) * gy / 30;
    if (!inside(x, y, ring)) continue;
    const d = edgeDistance(x, y, ring);
    if (d > score) { score = d; best = [x, y]; }
  }
  return best;
}
const titleCase = value => value.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, gap, letter) => gap + letter.toUpperCase());
const round = value => Math.round(value * 10) / 10;

const areas = source.features.map(feature => {
  const p = feature.properties ?? {}, g = feature.geometry;
  const code = String(p.PLN_AREA_C ?? ''), name = titleCase(String(p.PLN_AREA_N ?? '')), region = titleCase(String(p.REGION_N ?? '').replace(/ REGION$/, ''));
  if (!/^[A-Z]{2,3}$/.test(code) || !name) throw new Error('Unexpected planning area properties: ' + JSON.stringify(p));
  const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  // A closed ring starts and ends on the same point, so simplify its two halves split at the farthest vertex.
  const simplifyRing = points => {
    const [sx, sy] = points[0]; let far = 1;
    points.forEach(([x, y], i) => { if (Math.hypot(x - sx, y - sy) > Math.hypot(points[far][0] - sx, points[far][1] - sy)) far = i; });
    return [...simplify(points.slice(0, far + 1), TOLERANCE).slice(0, -1), ...simplify(points.slice(far), TOLERANCE).slice(0, -1)];
  };
  const parts = polygons.map(polygon => simplifyRing(polygon[0].map(project))).filter(ring => ring.length >= 3)
    .sort((a, b) => area(b) - area(a));
  const kept = parts.filter((ring, i) => i === 0 || area(ring) >= MIN_PART);
  if (!kept.length) throw new Error('No geometry for ' + name);
  const [lx, ly] = labelPoint(kept[0]);
  return { code, name, region, label: [round(lx), round(ly)], rings: kept.map(ring => ring.flatMap(([x, y]) => [round(x), round(y)])) };
}).sort((a, b) => a.name.localeCompare(b.name));

const all = areas.flatMap(a => a.rings.flatMap(r => r.filter((_, i) => i % 2 === 0)));
const allY = areas.flatMap(a => a.rings.flatMap(r => r.filter((_, i) => i % 2 === 1)));
const pad = 8, bounds = [Math.floor(Math.min(...all) - pad), Math.floor(Math.min(...allY) - pad), Math.ceil(Math.max(...all) + pad), Math.ceil(Math.max(...allY) + pad)];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ts = `// Generated by scripts/build-planning-areas.mjs from URA Master Plan 2025 Planning Area Boundary (No Sea),
// data.gov.sg, Singapore Open Data Licence. Do not edit by hand.
// Coordinates: Web Mercator pixels at zoom ${ZOOM}, relative to OneMap tile (${ORIGIN_X}, ${ORIGIN_Y}).
export type PlanningArea = { code: string; name: string; region: string; label: [number, number]; rings: number[][] };
export const planningAreaProjection = { zoom: ${ZOOM}, tile: ${TILE}, originX: ${ORIGIN_X}, originY: ${ORIGIN_Y} } as const;
export const planningAreaBounds = [${bounds.join(', ')}] as const;
export const planningAreas: PlanningArea[] = ${JSON.stringify(areas)};
`;
writeFileSync(path.join(root, 'src/data/planning-areas.ts'), ts);
writeFileSync(path.join(root, 'server/areas/planning-areas.json'), JSON.stringify(areas.map(({ code, name }) => ({ code, name }))) + '\n');
console.log(`${areas.length} areas, ${areas.reduce((n, a) => n + a.rings.reduce((m, r) => m + r.length / 2, 0), 0)} points, ${Buffer.byteLength(ts)} bytes, bounds ${bounds.join(',')}`);
