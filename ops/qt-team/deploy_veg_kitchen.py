"""Veg Kitchen additions (owner, 20 Oct 2026): QT Explorer's new `veg-kitchen` task (new fully vegetarian or vegan places for
Explore's Veg Kitchen list, ids vk-...), its code checks, the Manager review rules, publication of kind "place", the Telegram
digest ("Added to Explore (Veg Kitchen)") with Remove per place and the monthly Remove / Keep check, the `veg_kitchen` stage in
the 24-hour Round (ONE parallel wave per round, before Mixed Kitchen), the supervised pilot and Veg Kitchen covers.

Guarded like deploy_mixed_kitchen.py: waits for the run lock (so never while a tick or a pilot runs), takes the reporter lock,
pauses the Telegram listener, checks release hashes (the MERGED allowance below is the one owner-approved exception), backs up
under operator-tests, runs the full unit suite on the VPS and restores every file on failure. Never uploaded or changed (their
hashes are checked): policy.json, baseline.json, the usage ledger, the checkpoint, publication state, both queues' progress.json,
state/veg-options/queue.json, the reference registry, nutrition.py and nutrition_sg.json (owned by another session).

state/veg-kitchen/queue.json (mode 0600, owner 10000) is installed only when a queue file is given (build it locally with
veg_kitchen_queue.py). When one is already installed the deploy refuses to replace it unless --replace-queue is added; progress.json
is kept either way. Without a queue the stage does nothing until one is installed. The Hermes schedule is not changed.

    python -X utf8 deploy_veg_kitchen.py [queue.json [--replace-queue]]
"""
import base64
import json
import sys
import zlib
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['veg_kitchen.py', 'veg_kitchen_check.py', 'veg_kitchen_queue.py', 'run_veg_kitchen_pilot.py', 'run_veg_options_pilot.py',
         'veg_options.py', 'workflow.py', 'publisher.py', 'cover_photos.py', 'cover_publish.py', 'learning.py', 'telegram_reporter.py', 'telegram_controls.py',
         'test_workflow.py', 'test_publisher.py', 'test_telegram_reporter.py', 'roles/qt-explorer.md', 'roles/qt-manager.md',
         # 20 Oct 2026: plain $ prices on the venue's own menu, bracketed prices and shop-grid layouts (shared price matcher).
         'menu_coverage.py', 'test_menu_coverage.py',
         # Unpriced dishes (owner, 20 Oct 2026) change the shared dish checks too, so both kitchens ship in one tested release.
         'veg_options_check.py',
         # Dish illustration covers (owner, 20 Oct 2026): the image runner and worker record the new image kind.
         'venue_images.py', 'image_worker.py']
TESTS = ['test_workflow', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls', 'test_recipe_policy',
         'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']

code = r'''
# Owner approved (19 Oct 2026): the nutrition session's live publisher.py (not recorded in the release marker) was
# three-way merged into a release, so exactly that version may be replaced. Every other live change still stops the deploy.
MERGED={'publisher.py':'0488a6eb92eb883e97302df3c83f03805e972dce1e7f2dc25d6ffe9c16cd2430'}
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,zlib,sys
r=pathlib.Path('/opt/data/qt-team');payload=__QT_PAYLOAD__;queue=__QT_QUEUE__;replace=__QT_REPLACE__
queue=zlib.decompress(base64.b64decode(queue)) if queue else None
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/veg-kitchen-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in ('qt-explorer','qt-manager')}
 for x,soul in souls.items():(backup/(x+'-SOUL.md')).write_bytes(soul.read_bytes())
 target=r/'state/veg-kitchen/queue.json';old_queue=target.read_bytes() if target.exists() else None
 assert queue is None or old_queue is None or replace,'A Veg Kitchen queue is already installed; add --replace-queue to replace it (progress.json is kept)'
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','state/publication-outcomes.json',
            'state/veg-options/progress.json','state/veg-options/queue.json','state/veg-kitchen/progress.json','approved-references/registry.json',
            'nutrition.py','nutrition_sg.json']+([] if queue else ['state/veg-kitchen/queue.json'])
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()}
 created=[]
 if queue is not None:json.loads(queue)  # well-formed before anything changes
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest() in (release['hashes'][n],MERGED.get(n)),'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 if old_queue is not None:(backup/'veg-kitchen-queue.json').write_bytes(old_queue)
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.vk-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.vk-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  sys.path.insert(0,str(r));import veg_kitchen
  if queue is not None:
   rows=veg_kitchen.check_queue(json.loads(queue))
   target.parent.mkdir(parents=True,exist_ok=True);os.chown(target.parent,10000,10000);target.parent.chmod(0o700)
   tmp=target.with_suffix('.vk-new');fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
   with os.fdopen(fd,'wb') as out:out.write(queue)
   os.chown(tmp,10000,10000);os.replace(tmp,target)
  test=subprocess.run(['python','-m','unittest']+__QT_TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import json,veg_kitchen,veg_kitchen_check,veg_kitchen_queue,run_veg_kitchen_pilot,run_veg_options_pilot,veg_options,'
    'publisher,cover_photos,telegram_controls,telegram_reporter,workflow,learning;'
    'q=(veg_kitchen.folder(workflow.ROOT)/"queue.json").is_file();'
    'print("ok",len(veg_kitchen.queue(workflow.ROOT)) if q else "no-queue",json.dumps(veg_kitchen.status(workflow.ROOT)[0]["byStatus"]) if q else "")'],
    cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()},'Protected file changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.vk-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  if queue is not None:
   if old_queue is None:target.unlink(missing_ok=True)
   else:
    tmp=target.with_suffix('.restore');tmp.write_bytes(old_queue);os.chown(tmp,10000,10000);tmp.chmod(0o600);os.replace(tmp,target)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'queue':('installed '+hashlib.sha256(queue).hexdigest()) if queue else ('kept' if old_queue is not None else 'none installed: Veg Kitchen idle'),
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


def build(queue_path=None, replace=False):
    queue = None
    if queue_path:
        raw = Path(queue_path).read_bytes()
        import veg_kitchen
        veg_kitchen.check_queue(json.loads(raw))  # refuse a malformed queue before connecting
        queue = base64.b64encode(zlib.compress(raw, 9)).decode()
    payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
    for name, data in payload.items():
        if name.endswith('.py'):
            compile(base64.b64decode(data), name, 'exec')
    # Placeholders contain '_', which base64 never produces, so no payload text can be replaced by mistake.
    return code.replace('__QT_QUEUE__', repr(queue)).replace('__QT_REPLACE__', repr(bool(replace))).replace('__QT_PAYLOAD__', repr(payload))


if __name__ == '__main__':
    import time
    args = [a for a in sys.argv[1:] if a != '--replace-queue']
    if len(args) > 1:
        raise SystemExit(__doc__)
    remote = build(args[0] if args else None, '--replace-queue' in sys.argv)
    for attempt in range(45):  # up to ~70 min; ticks (and a running pilot) hold the lock, with gaps between ticks
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy (a tick or a pilot is running); nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:
        print(setup.remote_container(remote, 'root'))
    finally:
        print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
