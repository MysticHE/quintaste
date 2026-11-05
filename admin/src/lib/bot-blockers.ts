import 'server-only';
import { createHash } from 'node:crypto';
import { transaction } from './db';
import { audit } from './audit';
import { LANES } from './chef-lanes';
import { HttpError,text } from './http';

const PROFILES=['qt-manager','qt-explorer','qt-cooker','qt-event','qt-gamer','qt-videomaker','qt-fixer','qt-safety','publisher'];

function blockerSubject(caller:string,input:Record<string,unknown>){
  const scope=text(input.scope,'bot scope',60),key=text(input.key??'runtime','revision key',100);
  if(!(caller==='head'&&(PROFILES.includes(scope)||Object.hasOwn(LANES,scope)))&&LANES[scope]?.chef!==caller)throw new HttpError(403,'Not this bot scope.');
  return {scope,key,subject:'bot:block:'+scope+':'+createHash('sha256').update(key).digest('hex').slice(0,32)};
}

/** What the bot saw and already tried, for the case text: bounded, single-line, never a secret (the bot sends error classes and locations). */
function detail(value:unknown,limit:number){
  return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,limit):'';
}

/** Reports exhausted automation, never an invented moderation action. One open case per scope/revision. */
export async function botBlocker(caller:string,input:Record<string,unknown>){
  const {scope,key,subject}=blockerSubject(caller,input);
  const error=detail(input.error,300),tried=detail(input.tried,300);
  return transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
    const prior=(await db.query("SELECT id FROM ops.case_record WHERE subject_id=$1 AND status NOT IN ('resolved','dismissed') ORDER BY created_at LIMIT 1",[subject])).rows[0];
    if(prior)return {id:prior.id};
    const row=(await db.query(`INSERT INTO ops.case_record(kind,title,description,subject_id,severity) VALUES('incident',$1,$2,$3,'high') RETURNING id`,
      ['QT Manager: '+scope+' needs attention','Automation could not finish after its bounded retries. No unsupported action was applied. '
        +(error?'Last error: '+error+'\n':'Check the current queue and worker logs for '+scope+'.\n')
        +(tried?'Already tried: '+tried+'\n':'')
        +'It closes this case by itself when '+scope+' works again.\nRevision reference: '+key,subject])).rows[0];
    await audit(db,null,'bot.blocked',row.id,'Automation needs operator attention',{scope,revision:key},caller);
    return {id:row.id};
  });
}

/** The bot worked again: its open case closes with a note, so the owner is not left with a stale issue. */
export async function botRecovered(caller:string,input:Record<string,unknown>){
  const {scope,key,subject}=blockerSubject(caller,input);
  return transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
    const rows=(await db.query(`UPDATE ops.case_record SET status='resolved',resolution=$2,updated_at=now(),version=version+1
      WHERE subject_id=$1 AND status NOT IN ('resolved','dismissed') RETURNING id`,[subject,'Recovered by itself: '+scope+' finished its work again.'])).rows;
    for(const row of rows)await audit(db,null,'bot.recovered',row.id,'Automation recovered by itself',{scope,revision:key},caller);
    return {closed:rows.map(r=>r.id)};
  });
}

/**
 * Kaya's automatic diagnosis of an open case (ops/qt-team/bot_insight.py): up to four notes beside the staff notes. The bot sees only
 * its own code, error classes, locations and run logs, never members' words; a suggested fix is checked but never applied.
 */
export async function botDiagnosis(caller:string,input:Record<string,unknown>){
  const {scope,key,subject}=blockerSubject(caller,input);
  // Cleaned first, then measured in characters as the database counts them (a UTF-16 length would refuse emoji-bearing notes).
  const raw=Array.isArray(input.notes)?input.notes:[];
  const notes=raw.map(n=>typeof n==='string'?n.replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g,' ').trim():'');
  if(!notes.length||notes.length>4||notes.some(n=>!n||[...n].length>1000))throw new HttpError(400,'Check the diagnosis notes.');
  return transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
    const open=(await db.query("SELECT id FROM ops.case_record WHERE subject_id=$1 AND status NOT IN ('resolved','dismissed') ORDER BY created_at LIMIT 1",[subject])).rows[0];
    if(!open)return {case:null};
    // A retry after a lost reply must not add the same diagnosis twice.
    const seen=(await db.query('SELECT 1 FROM ops.case_bot_note WHERE case_id=$1 AND bot=$2 AND body=$3 LIMIT 1',[open.id,caller,notes[0]])).rowCount;
    if(seen)return {case:open.id,duplicate:true};
    for(const note of notes)await db.query('INSERT INTO ops.case_bot_note(case_id,bot,body) VALUES($1,$2,$3)',[open.id,caller,note]);
    await audit(db,null,'bot.diagnosed',open.id,'Automatic diagnosis added',{scope,revision:key},caller);
    return {case:open.id};
  });
}
