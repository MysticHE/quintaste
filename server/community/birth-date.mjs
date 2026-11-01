import { pool } from '../config.mjs';

/** The earliest birth date accepted anywhere (account check, Social, admin); matches community_birth_date_range. */
export const EARLIEST_BIRTH = '1920-01-01';
/** SQL: the birth date of the account in `column` (date or null). The one birth date Social reads (see birth-date.sql). */
export const birthSql = column => `(SELECT bd_.birth_date FROM community.birth_date bd_ WHERE bd_.user_id=${column})`;
/** The account's birth date ("YYYY-MM-DD"), or null for accounts that passed the 18+ check before dates were kept. */
export async function accountBirthDate(userId, db = pool) {
  const row = (await db.query(`SELECT to_char(birth_date, 'YYYY-MM-DD') AS birth FROM community.birth_date WHERE user_id=$1`, [userId])).rows[0];
  return row?.birth ?? null;
}
/** Keeps a validated birth date for the account; a date already kept stays (members set it once, see birth-date.sql). */
export async function keepBirthDate(userId, birthDate, db = pool) {
  await db.query('INSERT INTO community.birth_date(user_id, birth_date) VALUES($1, $2) ON CONFLICT DO NOTHING', [userId, birthDate]);
}
