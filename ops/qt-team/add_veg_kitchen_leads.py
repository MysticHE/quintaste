"""Add reviewed lead rows to the front of QT Explorer's live Veg Kitchen queue (owner, 24 Oct 2026: vegetarian hawker stalls).

The rows come from a reviewed file (veg_kitchen_queue.entry() shape) and are checked with veg_kitchen.check_queue() before
connecting and again on the VPS. Rows whose candidate ID, Google place ID or name and postcode are already queued are skipped;
progress.json, code and every other state file stay untouched, so a skipped or earlier candidate keeps its status. Explorer still
verifies each stall on stored pages, Manager reviews it and the owner can remove it on Telegram.

Waits for the run lock (never while a tick runs), backs up the old queue under operator-tests and writes atomically (0600, uid 10000).
Default: report what would be added. --apply writes.

    python -X utf8 add_veg_kitchen_leads.py <rows.json> [--apply]
"""
import base64
import json
import sys
import time
import zlib
from pathlib import Path
import setup
import veg_kitchen

code = r'''
import pathlib,json,fcntl,os,sys,time,datetime,base64,zlib
r=pathlib.Path('/opt/data/qt-team');sys.path.insert(0,str(r))
import veg_kitchen,veg_options as vo
rows=json.loads(zlib.decompress(base64.b64decode(__QT_ROWS__)));apply=__QT_APPLY__
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work:
 target=veg_kitchen.folder(r)/'queue.json'
 raw=target.read_bytes();current=json.loads(raw);old=veg_kitchen.check_queue(current)
 ids={x['candidateId'] for x in old};places={x['googlePlaceId'] for x in old}
 keys={vo.identity_key(x['nameHint'],x['postalCode']) for x in old if x.get('nameHint')}
 fresh=[x for x in rows if x['candidateId'] not in ids and x['googlePlaceId'] not in places and vo.identity_key(x['nameHint'],x['postalCode']) not in keys]
 merged=dict(current,candidates=fresh+current['candidates'])
 veg_kitchen.check_queue(merged)
 result={'applied':False,'queued':len(old),'added':len(fresh),'skipped':len(rows)-len(fresh),'addedIds':[x['candidateId'] for x in fresh]}
 if apply and fresh:
  backup=r/('operator-tests/veg-kitchen-leads-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
  (backup/'queue.json').write_bytes(raw);(backup/'queue.json').chmod(0o600)
  tmp=target.with_suffix('.leads-new');fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
  with os.fdopen(fd,'w',encoding='utf-8') as out:out.write(json.dumps(merged,ensure_ascii=False,indent=1)+'\n')
  os.chown(tmp,10000,10000);os.replace(tmp,target)
  veg_kitchen.check_queue(json.loads(target.read_text(encoding='utf-8')))
  result.update(applied=True,queued=len(merged['candidates']),backup=str(backup))
 print(json.dumps(result))
'''

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--apply']
    if len(args) != 1:
        raise SystemExit(__doc__)
    rows = json.loads(Path(args[0]).read_text(encoding='utf-8'))['candidates']
    veg_kitchen.check_queue({'candidates': rows})  # refuse malformed rows before connecting
    payload = base64.b64encode(zlib.compress(json.dumps(rows, ensure_ascii=False).encode(), 9)).decode()
    remote = code.replace('__QT_ROWS__', repr(payload)).replace('__QT_APPLY__', repr('--apply' in sys.argv))
    for attempt in range(30):  # ticks hold the run lock; there are gaps between them
        try:
            print(setup.remote_container(remote, 'root'))
            break
        except RuntimeError as error:
            if 'Run lock busy' not in str(error):
                raise
            time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy; nothing changed')
