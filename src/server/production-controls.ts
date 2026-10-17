import pg from 'pg';
import pino from 'pino';

const state = globalThis as typeof globalThis & { operationsPool?: pg.Pool };
export async function withdrawnMenus(): Promise<Set<string>> {
  if (process.env.OPERATIONS_ENABLED !== 'true') return new Set();
  if (!process.env.DATABASE_URL) throw new Error('Operations database unavailable');
  if (!state.operationsPool) {
    state.operationsPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2,
      statement_timeout: 5000, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
    const logger = pino({ base: undefined });
    state.operationsPool.on('error', () => logger.error({ event: 'operations_database_error' }));
  }
  const result = await state.operationsPool.query<{ content_id: string }>("SELECT DISTINCT content_id FROM ops.content_decision WHERE decision='withdrawn'");
  return new Set(result.rows.map(row => row.content_id));
}
