import pg from "pg";
import pino from "pino";

const state = globalThis as typeof globalThis & { quintasteLocalDatabase?: { pool: pg.Pool; logger: pino.Logger } };
/**
 * The database connection a standalone Expo dev server uses for staff content and place signals. In production the Expo
 * routes run inside the Express server and share its loaders instead (server/staff-content.mjs, server/place-signals.mjs).
 */
export function localDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("Operations database unavailable");
  if (!state.quintasteLocalDatabase) {
    const logger = pino({ base: undefined }), pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3,
      statement_timeout: 5000, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
    pool.on("error", () => logger.error({ event: "operations_database_error" }));
    state.quintasteLocalDatabase = { pool, logger };
  }
  return state.quintasteLocalDatabase;
}
