import 'server-only';
import pg, { type PoolClient, type QueryResultRow } from 'pg';
import pino from 'pino';
export const logger = pino({ base: undefined, level: 'info' });
const runtime = globalThis as typeof globalThis & { adminPool?: pg.Pool };
export function pool() {
  if (!process.env.ADMIN_DATABASE_URL) throw new Error('Admin database unavailable');
  if (!runtime.adminPool) {
    runtime.adminPool = new pg.Pool({ connectionString: process.env.ADMIN_DATABASE_URL, max: 4,
      statement_timeout: 10000, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    runtime.adminPool.on('error', () => logger.error({ event: 'admin_database_error' }));
  }
  return runtime.adminPool;
}
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []) {
  return pool().query<T>(sql, values);
}
export async function transaction<T>(work: (db: PoolClient) => Promise<T>) {
  const db = await pool().connect();
  try { await db.query('BEGIN'); const result = await work(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
