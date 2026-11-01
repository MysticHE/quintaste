import { readFileSync } from 'node:fs';

/** Planning-area centres (URA Master Plan 2025 label points) for rough distances between members' areas. */
export const points = JSON.parse(readFileSync(new URL('./area-points.json', import.meta.url), 'utf8'));
/** [lat, lng] of a planning area's centre by name (any case), or null. */
export const pointOf = area => points[Object.keys(points).find(name => name.toLowerCase() === String(area ?? '').trim().toLowerCase()) ?? ''] ?? null;
