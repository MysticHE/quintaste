import { pool, logger } from '../config.mjs';
import { AvatarError } from './config.mjs';

export async function reportAvatar(userId, input) {
  const avatarId=input?.avatarId, description=input?.description;
  if (typeof avatarId !== 'string' || !/^[a-f0-9-]{36}$/.test(avatarId) ||
    typeof description !== 'string' || description.trim().length<10 || description.length>2000) {
    throw new AvatarError(400,'Describe the avatar problem in 10–2,000 characters.');
  }
  const db=await pool.connect(), subject='avatar:'+userId;
  try {
    await db.query('BEGIN'); await db.query('SELECT pg_advisory_xact_lock(721941,3)');
    const recent=await db.query("SELECT count(*)::int AS count FROM ops.case_record WHERE subject_id=$1 AND kind='report' AND created_at>now()-interval '24 hours'",[subject]);
    if (recent.rows[0].count>=3) throw new AvatarError(429,'You can send three avatar reports in 24 hours.');
    const r=await db.query(`INSERT INTO ops.case_record(kind,title,description,subject_id)
      VALUES('report','Generated avatar report',$1,$2) RETURNING id`,[
      'Avatar reference: '+avatarId+'\n\n'+description.trim()+'\n\nNo selfie or generated image was attached.',subject]);
    await db.query('COMMIT');
    logger.info({event:'avatar_report_created'});
    return { reference:r.rows[0].id };
  } catch(error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
