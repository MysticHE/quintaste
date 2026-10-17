import { getMigrations } from 'better-auth/db/migration';
import { randomBytes } from 'node:crypto';
import { auth } from './auth.mjs';
import { logger, pool } from './config.mjs';

const connection = await pool.connect();
try {
  await connection.query('SELECT pg_advisory_lock(1902914, 1)');
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  await connection.query(`CREATE TABLE IF NOT EXISTS account_recovery_code (
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    code_hash text NOT NULL CHECK (length(code_hash)=64),
    created_at timestamptz NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, code_hash)
  )`);
  const existing = await connection.query('SELECT id, email FROM "user" WHERE username IS NULL');
  for (const user of existing.rows) {
    let username = user.email === 'tester@quintaste.invalid' ? 'tester' : 'member_' + randomBytes(10).toString('hex');
    if ((await connection.query('SELECT id FROM "user" WHERE username=$1', [username])).rowCount) {
      username = 'member_' + randomBytes(10).toString('hex');
    }
    await connection.query('UPDATE "user" SET username=$1 WHERE id=$2 AND username IS NULL', [username, user.id]);
  }
  logger.info({ event: 'database_migrated' });
} finally {
  await connection.query('SELECT pg_advisory_unlock(1902914, 1)');
  connection.release();
  await pool.end();
}
