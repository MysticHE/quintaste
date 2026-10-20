"""Veg options places (owner, 19 Oct 2026): QT Explorer's veg options task, its evidence checks, the Manager
review rules, publication of kind "place" (needs the app's validatePlace/place records) and the Telegram digest
with Remove per place. Also installs the candidate queue at state/veg-options/queue.json (mode 0600).

Guarded like the other QT deploys: run lock and reporter lock, release-hash checks, backup under operator-tests,
protected-file hashes, the full unit suite on the VPS and automatic restore on failure. progress.json is never
touched. Does not run the pilot and does not change the Hermes schedule.

    python -X utf8 deploy_veg_options.py <queue.json>
"""
import base64
import json
import sys
import zlib
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['veg_options.py', 'veg_options_check.py', 'veg_options_queue.py', 'run_veg_options_pilot.py', 'workflow.py', 'publisher.py', 'learning.py',
         'telegram_reporter.py', 'telegram_controls.py', 'test_workflow.py', 'test_publisher.py', 'test_telegram_reporter.py',
         'roles/qt-explorer.md', 'roles/qt-manager.md']
TESTS = ['test_workflow', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls', 'test_recipe_policy',
         'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,zlib,sys
r=pathlib.Path('/opt/data/qt-team');payload=__QT_PAYLOAD__;queue=zlib.decompress(base64.b64decode(__QT_QUEUE__))
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/veg-options-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in ('qt-explorer','qt-manager')}
 for x,soul in souls.items():(backup/(x+'-SOUL.md')).write_bytes(soul.read_bytes())
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','state/publication-outcomes.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()}
 created=[];target=r/'state/veg-options/queue.json';old_queue=target.read_bytes() if target.exists() else None
 json.loads(queue)  # well-formed before anything changes
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 if old_queue is not None:(backup/'veg-options-queue.json').write_bytes(old_queue)
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.veg-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.veg-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  sys.path.insert(0,str(r));import veg_options
  rows=veg_options.check_queue(json.loads(queue))
  target.parent.mkdir(parents=True,exist_ok=True);os.chown(target.parent,10000,10000);target.parent.chmod(0o700)
  tmp=target.with_suffix('.veg-new');fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
  with os.fdopen(fd,'wb') as out:out.write(queue)
  os.chown(tmp,10000,10000);os.replace(tmp,target)
  test=subprocess.run(['python','-m','unittest']+__QT_TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import veg_options,veg_options_check,run_veg_options_pilot,publisher,telegram_controls,workflow,learning;'
    'print("ok",len(veg_options.queue(workflow.ROOT)))'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()},'Protected file changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.veg-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  if old_queue is None:target.unlink(missing_ok=True)
  else:
   tmp=target.with_suffix('.restore');tmp.write_bytes(old_queue);os.chown(tmp,10000,10000);tmp.chmod(0o600);os.replace(tmp,target)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'queue':{'candidates':len(rows),'sha256':hashlib.sha256(queue).hexdigest()},
                   'import':imported.stdout.strip(),'tests':tail,'protectedUnchanged':True,'backup':str(backup)}))
'''.replace('__QT_TESTS__', repr(TESTS))

PROBE = r'''
import fcntl,time
for _ in range(20):  # wait inside one SSH call for the gap between scheduled ticks
    with open('/opt/data/qt-team/state/run.lock','a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(f,fcntl.LOCK_UN);print('free');break
        except BlockingIOError:pass
    time.sleep(4)
else:print('busy')
'''


def build(queue_path):
    raw = Path(queue_path).read_bytes()
    import veg_options
    veg_options.check_queue(json.loads(raw))  # refuse a malformed queue before connecting
    payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
    # Placeholders contain '_', which base64 never produces, so no payload text can be replaced by mistake.
    return code.replace('__QT_QUEUE__', repr(base64.b64encode(zlib.compress(raw, 9)).decode())).replace('__QT_PAYLOAD__', repr(payload))


if __name__ == '__main__':
    import time
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    remote = build(sys.argv[1])
    for attempt in range(45):  # up to ~70 min; Explorer ticks run ~55 min with gaps between them
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy; nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:
        print(setup.remote_container(remote, 'root'))
    finally:
        print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
