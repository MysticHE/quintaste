import { register } from 'node:module';
import path from 'node:path';
import { logger } from '../config.mjs';
import { catalogueVenues, placeAliases } from '../catalogue-places.mjs';
import { readSnapshot } from '../editorial/store.mjs';

/**
 * The URA planning area of a place, for the Explorer badge, from its map point with the app's own lookup
 * (src/utils/planning-area.ts, loaded with Node's type stripping like the game simulation). Covers packaged places,
 * map points the QT bots corrected (venue records), and the approved place alias. Places the bots add have no map point
 * yet, so they don't count towards area tasks until they get one. Rebuilt when the published snapshot changes.
 */
const editorialRoot = process.env.QT_EDITORIAL_ROOT || path.resolve('.local/editorial');
let lookup = null, built = { snapshot: undefined, map: new Map() };

function areaLookup() {
  lookup ??= (async () => {
    register(new URL('../game/ts-hooks.mjs', import.meta.url));
    return (await import(new URL('../../src/utils/planning-area.ts', import.meta.url).href)).planningAreaFor;
  })().catch(error => {
    logger.error({ event: 'collection_areas_unavailable', message: error?.message });
    return null;
  });
  return lookup;
}

/** A function from place id to planning-area code (or undefined). */
export async function placeAreas() {
  const areaFor = await areaLookup();
  if (!areaFor) return () => undefined;
  const snapshot = await readSnapshot(editorialRoot).catch(() => null);
  if (snapshot !== built.snapshot) {
    const points = new Map(catalogueVenues.filter(v => v.point).map(v => [v.id, v.point]));
    for (const record of Object.values(snapshot?.records ?? {})) if (record?.kind === 'venue' && record.data?.point && points.has(record.id)) points.set(record.id, record.data.point);
    const map = new Map();
    for (const [id, point] of points) { const area = areaFor(point.latitude, point.longitude); if (area) map.set(id, area.code); }
    built = { snapshot, map };
  }
  const map = built.map;
  return id => map.get(placeAliases.get(id) ?? id);
}
