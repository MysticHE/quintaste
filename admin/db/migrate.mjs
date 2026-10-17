import { readFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.MIGRATION_DATABASE_URL;
const password = process.env.ADMIN_DB_PASSWORD;
const email = process.env.ADMIN_OWNER_EMAIL?.trim().toLowerCase();
if (!url || !password || password.length < 32 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Migration database, strong runtime password and owner email are required');
}
const db = new pg.Client({ connectionString:url });
try {
  await db.connect();
  await db.query(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(1902914311)');
  const exists = await db.query("SELECT 1 FROM pg_roles WHERE rolname='quintaste_admin'");
  if (!exists.rowCount) await db.query('CREATE ROLE quintaste_admin NOINHERIT LOGIN');
  await db.query("ALTER ROLE quintaste_admin PASSWORD '"+password.replaceAll("'","''")+"'");
  await db.query(`REVOKE ALL ON SCHEMA staff,ops FROM PUBLIC;
    GRANT USAGE ON SCHEMA staff,ops,public TO quintaste_admin;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA staff,ops TO quintaste_admin;
    REVOKE UPDATE,DELETE,TRUNCATE ON staff.audit FROM quintaste_admin;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA staff,ops TO quintaste_admin;
    GRANT SELECT(id,username,name,"createdAt") ON public."user" TO quintaste_admin;
    GRANT SELECT("userId"),DELETE ON public.session TO quintaste_admin;
    GRANT USAGE ON SCHEMA ops TO quintaste_app;
    GRANT SELECT ON ops.control,ops.restriction,ops.content_decision TO quintaste_app;`);
  const seeded = await db.query('SELECT 1 FROM staff.member LIMIT 1');
  if (!seeded.rowCount) await db.query("INSERT INTO staff.member(email,role) VALUES($1,'owner')",[email]);
  await db.query('COMMIT');
  process.stdout.write('Admin schema and restricted database role ready\n');
} catch {
  await db.query('ROLLBACK').catch(()=>{});
  process.stderr.write('Admin migration failed; inspect database configuration without logging credentials\n');
  process.exitCode=1;
} finally { await db.end(); }
