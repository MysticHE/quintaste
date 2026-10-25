import { logger, pool } from './config.mjs';
import { placeSignalsLoader, placeSignalsQuery } from './place-signals-core.mjs';

// Explore orders keyword searches partly by reviews and likes (src/server/venue-catalogue.ts); the Expo API route in this
// process reads them through this loader.
globalThis.quintastePlaceSignals = placeSignalsLoader(() => pool.query(placeSignalsQuery), event => logger.warn({ event }));
