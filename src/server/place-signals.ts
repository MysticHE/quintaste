import { emptyPlaceSignals, placeSignalsLoader, placeSignalsQuery, type PlaceSignals } from "../../server/place-signals-core.mjs";
import { localDatabase } from "./local-database";

export type { PlaceSignals };
const state = globalThis as typeof globalThis & { quintastePlaceSignals?: () => Promise<PlaceSignals>; localPlaceSignals?: () => Promise<PlaceSignals> };
/** Reviews and likes per place (server/place-signals-core.mjs). A standalone Expo dev server reads its own database, or has none. */
export function placeSignals(): Promise<PlaceSignals> {
  if (state.quintastePlaceSignals) return state.quintastePlaceSignals();
  if (!process.env.DATABASE_URL) return Promise.resolve(emptyPlaceSignals);
  if (!state.localPlaceSignals) {
    const { pool, logger } = localDatabase();
    state.localPlaceSignals = placeSignalsLoader(() => pool.query(placeSignalsQuery), event => logger.warn({ event }));
  }
  return state.localPlaceSignals();
}
