"""Owner request 18 Oct 2026: Explorer finds a reusable photo for a venue without a cover, the owner approves it
on Telegram, then it is enhanced, reviewed by QT Manager and published as the cover (needs app commit e4f01bc).

Guarded like the other QT deploys (run lock, release hashes, backup, full tests, auto-restore); also syncs the
Explorer role brief and makes the reference folder writable by the hermes user (workflow and Telegram listener).
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['cover_photos.py', 'venue_images.py', 'workflow.py', 'publisher.py', 'telegram_controls.py', 'telegram_reporter.py',
         'roles/qt-explorer.md', 'roles/qt-event.md']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/covers-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in ('qt-explorer','qt-event')}
 for x,soul in souls.items():(backup/(x+'-SOUL.md')).write_bytes(soul.read_bytes())
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','approved-references/registry.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 created=[]
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.cover-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.cover-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import cover_photos,venue_images,publisher,telegram_controls,telegram_reporter;print("ok")'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.strip()=='ok','Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.cover-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  raise
 refs=r/'approved-references'
 for p in [refs,*refs.iterdir()]:os.chown(p,10000,10000)
 owners={p.name:(p.stat().st_uid,oct(p.stat().st_mode&0o777)) for p in [refs,*refs.iterdir()]}
 guard=subprocess.run(['python','-c','import socket;s=socket.create_connection(("127.0.0.1",3128),3);print("up")'],capture_output=True,text=True)
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'tests':tail,'protectedUnchanged':True,'referenceOwners':owners,'guardProxy':guard.stdout.strip() or guard.stderr[-120:],'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

PROBE = r'''
import fcntl,time
for _ in range(20):  # wait inside one SSH call for the gap between scheduled ticks
    with open('/opt/data/qt-team/state/run.lock','a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(f,fcntl.LOCK_UN);print('free');break
        except BlockingIOError:pass
    time.sleep(4)
else:print('busy')
'''

if __name__ == '__main__':
    import time
    for attempt in range(45):  # up to ~70 min; Explorer ticks run ~55 min with gaps between them
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy; nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
