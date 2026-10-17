import pg from 'pg';
const db = new pg.Client({ connectionString:process.env.ADMIN_DATABASE_URL });
try {
  await db.connect();
  await db.query(`DELETE FROM staff.oauth WHERE expires_at<now();
    DELETE FROM staff.challenge WHERE expires_at<now();
    DELETE FROM staff.session WHERE expires_at<now() OR touched_at<now()-interval '1 day';
    DELETE FROM staff.throttle WHERE window_start<now()-interval '2 days';`);
  process.stdout.write('Expired authentication records removed\n');
} catch { process.stderr.write('Authentication cleanup failed\n'); process.exitCode=1; }
finally { await db.end(); }
