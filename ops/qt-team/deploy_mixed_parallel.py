"""Parallel Mixed Kitchen workers (owner, 19 Oct 2026: "I need the data filled as soon as possible").

Runs up to mixedKitchenParallel Explorer workers at once inside one round (policy.json key, default 4 when the key is
absent, minimum 1, maximum 8; 1 behaves exactly as before). Only the model call runs concurrently; every write to
shared state stays on the main thread. The Google Maps lane is now a cross-process file lock, so concurrent Hermes
workers still capture one Maps page at a time, 15 s apart. Run AFTER deploy_mixed_kitchen.py.

Guarded like deploy_mixed_kitchen.py: waits for the run lock (never while a tick or the pilot runs), takes the reporter
lock, pauses the Telegram listener, checks release hashes, backs up under operator-tests, runs the full unit suite on
the VPS and restores every file on failure. state/veg-options/progress.json, queue.json and policy.json are never
uploaded or changed (their hashes are checked). No policy change is needed: add "mixedKitchenParallel": N to
policy.json by hand only to choose another number.

    python -X utf8 deploy_mixed_parallel.py
"""
import base64
import sys
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['workflow.py', 'veg_options.py', 'run_veg_options_pilot.py', 'maps_capture.py', 'extract_cache.py',
         'test_workflow.py', 'test_menu_coverage.py']
TESTS = ['test_workflow', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls', 'test_recipe_policy',
         'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,sys
r=pathlib.Path('/opt/data/qt-team');payload=__QT_PAYLOAD__
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 assert 'def mixed_kitchen(' in (r/'workflow.py').read_text(),'Deploy deploy_mixed_kitchen.py first'
 backup=r/('operator-tests/mixed-parallel-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','state/publication-outcomes.json',
            'state/veg-options/progress.json','state/veg-options/queue.json','approved-references/registry.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()}
 created=[]
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.mp-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest']+__QT_TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import json,veg_options,run_veg_options_pilot,maps_capture,publisher,workflow;'
    'print("ok",workflow.mixed_parallel(workflow.read(workflow.ROOT/"policy.json")),len(veg_options.queue(workflow.ROOT)),json.dumps(veg_options.status(workflow.ROOT)[0]["byStatus"]))'],
    cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()},'Protected file changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.mp-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'import':imported.stdout.strip(),'tests':tail,'protectedUnchanged':True,'backup':str(backup)}))
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


def build():
    payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
    for name, data in payload.items():
        if name.endswith('.py'):
            compile(base64.b64decode(data), name, 'exec')
    # The placeholder contains '_', which base64 never produces, so no payload text can be replaced by mistake.
    return code.replace('__QT_PAYLOAD__', repr(payload))


if __name__ == '__main__':
    import time
    if len(sys.argv) > 1:
        raise SystemExit(__doc__)
    remote = build()
    for attempt in range(45):  # up to ~70 min; ticks (and a running pilot) hold the lock, with gaps between ticks
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy (a tick or the pilot is running); nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:
        print(setup.remote_container(remote, 'root'))
    finally:
        print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
