import { createHash } from 'node:crypto';

// Shared by the Express server (server/place-signals.mjs) and the Expo API routes (src/server/place-signals.ts), like
// staff-content-core.mjs: in production both run in one Node process and share one loader through globalThis.quintastePlaceSignals.

/** @typedef {{ reviews: number, total: number, likes: number }} PlaceSignal */
/** @typedef {{ revision: string, places: ReadonlyMap<string, PlaceSignal>, previous?: PlaceSignals }} PlaceSignals */

// Visible QuinTaste reviews (count and rating sum) and likes per place. Restricted accounts drop out, the same rule as
// notRestricted in server/community/router.mjs; blocks are per viewer and cannot apply to one shared order.
const active = column => `NOT EXISTS (SELECT 1 FROM ops.restriction rst_ WHERE rst_.user_id=${column} AND rst_.active)`;
export const placeSignalsQuery = `SELECT id, sum(reviews)::int AS reviews, sum(total)::int AS total, sum(likes)::int AS likes FROM (
    SELECT pr.place_id AS id, count(*) AS reviews, sum(pr.rating) AS total, 0 AS likes FROM community.place_review pr
      WHERE pr.hidden_at IS NULL AND ${active('pr.user_id')} GROUP BY pr.place_id
    UNION ALL
    SELECT r.target, 0, 0, count(*) FROM community.reaction r WHERE r.kind='place' AND r.action='like' AND ${active('r.user_id')} GROUP BY r.target
  ) s GROUP BY id ORDER BY id`;
/** @type {PlaceSignals} */
export const emptyPlaceSignals = { revision: '0'.repeat(64), places: new Map() };

/**
 * Re-reads the signals at most every 15 minutes, in the background after the first attempt, so only the first search
 * after start waits (and never again, even while the database is down). Each copy keeps the one before it, so a result
 * list paged across a refresh keeps its order. A failed read keeps the last copy and retries a minute later.
 * @param {() => Promise<{ rows: Array<{ id: string } & PlaceSignal> }>} read
 * @param {(event: string) => void} warn
 * @returns {() => Promise<PlaceSignals>}
 */
export function placeSignalsLoader(read, warn) {
  let value = emptyPlaceSignals, tried = false, nextAt = 0;
  /** @type {Promise<PlaceSignals> | undefined} */
  let pending;
  const refresh = () => pending ??= read().then(({ rows }) => {
    const revision = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    if (revision !== value.revision) value = { revision, places: new Map(rows.map(({ id, reviews, total, likes }) => [id, { reviews, total, likes }])),
      previous: { revision: value.revision, places: value.places } };
    nextAt = Date.now() + 900000; return value;
  }).catch(() => { warn('place_signals_unavailable'); nextAt = Date.now() + 60000; return value; })
    .finally(() => { pending = undefined; });
  return async function placeSignals() {
    if (Date.now() < nextAt) return value;
    const next = refresh();
    if (tried) return value;
    tried = true;
    return next;
  };
}
