import 'server-only';
import { createHash } from 'node:crypto';
import { transaction } from './db';
import { audit } from './audit';
import { LANES } from './chef-lanes';
import { HttpError,text } from './http';

/** Reports exhausted automation, never an invented moderation action. One open case per scope/revision. */
export async function botBlocker(caller:string,input:Record<string,unknown>){
  const scope=text(input.scope,'bot scope',60),key=text(input.key??'runtime','revision key',100);
  const profiles=['qt-manager','qt-explorer','qt-cooker','qt-event','qt-gamer','qt-videomaker','qt-fixer','qt-safety','publisher'];
  if(!(caller==='head'&&(profiles.includes(scope)||Object.hasOwn(LANES,scope)))&&LANES[scope]?.chef!==caller)throw new HttpError(403,'Not this bot scope.');
  const subject='bot:block:'+scope+':'+createHash('sha256').update(key).digest('hex').slice(0,32);
  return transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
    const prior=(await db.query("SELECT id FROM ops.case_record WHERE subject_id=$1 AND status NOT IN ('resolved','dismissed') ORDER BY created_at LIMIT 1",[subject])).rows[0];
    if(prior)return {id:prior.id};
    const row=(await db.query(`INSERT INTO ops.case_record(kind,title,description,subject_id,severity) VALUES('incident',$1,$2,$3,'high') RETURNING id`,
      ['QT Manager: '+scope+' needs attention','Automation could not finish after its bounded retries. No unsupported action was applied. Check the current queue and worker logs for '+scope+'.\nRevision reference: '+key,subject])).rows[0];
    await audit(db,null,'bot.blocked',row.id,'Automation needs operator attention',{scope,revision:key},caller);
    return {id:row.id};
  });
}
