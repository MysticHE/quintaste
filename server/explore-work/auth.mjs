import { readFileSync } from 'node:fs';
import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

/** Dedicated bridge key; deliberately cannot authenticate editorial or other bot routes. */
export function signedExplore(req,res,next) {
  res.set('Cache-Control','no-store');
  try {
    const key=readFileSync(process.env.QT_EXPLORE_KEY_FILE || '.local/editorial-private/explore.key','utf8').trim();
    const time=req.get('X-QT-Time') ?? '', signature=req.get('X-QT-Signature') ?? '';
    if(key.length<48 || !/^\d{10}$/.test(time) || Math.abs(Date.now()/1000-Number(time))>300 || !/^[a-f0-9]{64}$/.test(signature)) return res.sendStatus(401);
    const bytes=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
    const expected=createHmac('sha256',key).update(time+'\n'+req.method+'\n'+req.originalUrl.split('?')[0]+'\n'+createHash('sha256').update(bytes).digest('hex')).digest();
    if(!timingSafeEqual(expected,Buffer.from(signature,'hex'))) return res.sendStatus(401);
    next();
  } catch { res.sendStatus(401); }
}
