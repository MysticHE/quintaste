import { createHash, randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { pool } from './config.mjs';

const codeCount = 8;
function digest(code) {
  return createHash('sha256').update(code).digest('hex');
}
export function normalizeCode(value) {
  if (typeof value !== 'string' || value.length > 80) return null;
  const code = value.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-F0-9]{32}$/.test(code) ? code : null;
}
async function replaceCodes(connection, userId) {
  const codes = Array.from({ length: codeCount }, () => randomBytes(16).toString('hex').toUpperCase());
  await connection.query('DELETE FROM account_recovery_code WHERE user_id=$1', [userId]);
  await connection.query(`INSERT INTO account_recovery_code (user_id, code_hash)
    SELECT $1, unnest($2::text[])`, [userId, codes.map(digest)]);
  return codes.map(code => code.match(/.{4}/g).join('-'));
}
async function transaction(operation) {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const value = await operation(connection);
    await connection.query('COMMIT');
    return value;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally { connection.release(); }
}
export async function initialRecoveryCodes(userId) {
  return transaction(async connection => {
    await connection.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
    return replaceCodes(connection, userId);
  });
}
export async function rotateRecoveryCodes(userId, sessionId, password) {
  return transaction(async connection => {
    const user = await connection.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
    if (!user.rowCount) return null;
    const session = await connection.query('SELECT id FROM session WHERE id=$1 AND "userId"=$2 AND "expiresAt">NOW()', [sessionId, userId]);
    if (!session.rowCount) return null;
    const account = await connection.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=$2', [userId, 'credential']);
    if (!account.rows[0]?.password || !await verifyPassword({ hash: account.rows[0].password, password })) return null;
    return replaceCodes(connection, userId);
  });
}
export async function resetWithRecoveryCode(username, code, password) {
  const codeHash = digest(code);
  const match = await pool.query(`SELECT u.id FROM "user" u JOIN account_recovery_code r ON r.user_id=u.id
    WHERE u.username=$1 AND r.code_hash=$2`, [username, codeHash]);
  if (!match.rowCount) return false;
  const passwordHash = await hashPassword(password);
  return transaction(async connection => {
    const userId = match.rows[0].id;
    await connection.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
    const used = await connection.query('DELETE FROM account_recovery_code WHERE user_id=$1 AND code_hash=$2 RETURNING user_id', [userId, codeHash]);
    if (!used.rowCount) return false;
    const changed = await connection.query('UPDATE account SET password=$1, "updatedAt"=NOW() WHERE "userId"=$2 AND "providerId"=$3', [passwordHash, userId, 'credential']);
    if (changed.rowCount !== 1) throw new Error('Credential account is unavailable.');
    await connection.query('DELETE FROM session WHERE "userId"=$1', [userId]);
    return true;
  });
}
