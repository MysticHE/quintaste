"""Mixed Kitchen in the regular schedule (owner, 19 Oct 2026): the 24-hour Round's Mixed Kitchen stage (Explorer time
after the whole-menu audit, at least one worker of five places per round when due), monthly rechecks of published
places with the owner's Remove / Keep prompt on Telegram, cover photos for Mixed Kitchen places (one cover search per
round) and the "Mixed Kitchen" wording in Telegram. The pilot entry point keeps working; the Hermes schedule
(every 15 minutes) is not changed.

Guarded like deploy_veg_options.py: waits for the run lock (so never while the pilot runs), takes the reporter lock,
pauses the Telegram listener, checks release hashes, backs up under operator-tests, runs the full unit suite on the
VPS and restores every file on failure. state/veg-options/progress.json is never uploaded or changed (its hash is
checked). The queue stays as it is unless a queue file is given, which is validated and installed (mode 0600).

    python -X utf8 deploy_mixed_kitchen.py [queue.json]
"""
import base64
import json
import sys
import zlib
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['veg_options.py', 'veg_options_check.py', 'veg_options_queue.py', 'run_veg_options_pilot.py', 'workflow.py', 'publisher.py',
         'cover_photos.py', 'telegram_reporter.py', 'telegram_controls.py', 'test_workflow.py', 'test_publisher.py', 'test_telegram_reporter.py',
         # Parallel Mixed Kitchen workers ship in the same release so workflow.py and its locks never run out of step.
         'maps_capture.py', 'extract_cache.py', 'test_menu_coverage.py']
TESTS = ['test_workflow', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls', 'test_recipe_policy',
         'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']

code = r'''
# Owner approved (19 Oct 2026): the nutrition session's live publisher.py (not recorded in the release marker) was
# three-way merged into this release, so exactly that version may be replaced. Every other live change still stops the deploy.
MERGED={'publisher.py':'0488a6eb92eb883e97302df3c83f03805e972dce1e7f2dc25d6ffe9c16cd2430'}
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,zlib,sys
r=pathlib.Path('/opt/data/qt-team');payload=__QT_PAYLOAD__;queue=__QT_QUEUE__
queue=zlib.decompress(base64.b64decode(queue)) if queue else None
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/mixed-kitchen-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 target=r/'state/veg-options/queue.json';old_queue=target.read_bytes() if target.exists() else None
 assert old_queue is not None or queue is not None,'No Mixed Kitchen queue on the VPS; pass a queue file'
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','state/publication-outcomes.json',
            'state/veg-options/progress.json','approved-references/registry.json']+([] if queue else ['state/veg-options/queue.json'])
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()}
 created=[]
 if queue is not None:json.loads(queue)  # well-formed before anything changes
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest() in (release['hashes'][n],MERGED.get(n)),'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 if old_queue is not None:(backup/'veg-options-queue.json').write_bytes(old_queue)
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.mk-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  sys.path.insert(0,str(r));import veg_options
  if queue is not None:
   veg_options.check_queue(json.loads(queue))
   tmp=target.with_suffix('.mk-new');fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
   with os.fdopen(fd,'wb') as out:out.write(queue)
   os.chown(tmp,10000,10000);os.replace(tmp,target)
  test=subprocess.run(['python','-m','unittest']+__QT_TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import json,veg_options,veg_options_check,run_veg_options_pilot,publisher,cover_photos,telegram_controls,telegram_reporter,workflow;'
    'print("ok",len(veg_options.queue(workflow.ROOT)),json.dumps(veg_options.status(workflow.ROOT)[0]["byStatus"]))'],
    cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()},'Protected file changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.mk-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  if queue is not None:
   if old_queue is None:target.unlink(missing_ok=True)
   else:
    tmp=target.with_suffix('.restore');tmp.write_bytes(old_queue);os.chown(tmp,10000,10000);tmp.chmod(0o600);os.replace(tmp,target)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'queue':'replaced '+hashlib.sha256(queue).hexdigest() if queue else 'kept',
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


def build(queue_path=None):
    queue = None
    if queue_path:
        raw = Path(queue_path).read_bytes()
        import veg_options
        veg_options.check_queue(json.loads(raw))  # refuse a malformed queue before connecting
        queue = base64.b64encode(zlib.compress(raw, 9)).decode()
    payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
    for name, data in payload.items():
        if name.endswith('.py'):
            compile(base64.b64decode(data), name, 'exec')
    # Placeholders contain '_', which base64 never produces, so no payload text can be replaced by mistake.
    return code.replace('__QT_QUEUE__', repr(queue)).replace('__QT_PAYLOAD__', repr(payload))


if __name__ == '__main__':
    import time
    if len(sys.argv) > 2:
        raise SystemExit(__doc__)
    remote = build(sys.argv[1] if len(sys.argv) == 2 else None)
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
