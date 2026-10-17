import pg from 'pg';
import pino from 'pino';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info', base: undefined });
export const origin = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
const previewURL = process.env.EXPO_GO_PREVIEW_URL ? new URL(process.env.EXPO_GO_PREVIEW_URL) : null;
if (previewURL && (previewURL.protocol !== 'https:' || previewURL.username || previewURL.password)) {
  throw new Error('Expo Go preview must use a trusted HTTPS URL.');
}
const devWeb = process.env.NODE_ENV !== 'production' && process.env.DEV_WEB_ORIGIN ? [new URL(process.env.DEV_WEB_ORIGIN).origin] : [];
export const authOrigins = [origin, 'quintaste://', ...devWeb, ...(previewURL ? [
  'exp://' + previewURL.host, 'exps://' + previewURL.host,
] : [])];
if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) {
  throw new Error('APP_URL must use HTTPS.');
}
if (!process.env.DATABASE_URL || (process.env.BETTER_AUTH_SECRET || '').length < 32) {
  throw new Error('Database and authentication secrets must be configured.');
}
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
  statement_timeout: 10000,
});
pool.on('error', () => logger.error({ event: 'database_connection_error' }));
export const registrationOpen = process.env.REGISTRATION_OPEN === 'true';
