"""Image menus in web_extract (owner, 20 Oct 2026): Explorer holds dishes whose menu is a picture, or a page whose dishes
are only in pictures, because the stored text has no dish names, prices or dietary icons. image_capture.py reads such
pictures with the same vision model and mechanism as the PDF reader and stores the labelled transcription, and extract_cache
dispatches to it. Every vision call (pictures and PDF pages) now writes a 'vision' row to state/usage.jsonl.

Installs image_capture.py, pdf_capture.py, extract_cache.py and test_outlet_capture.py, creates state/image-text (0700,
uid 10000). Guarded like deploy_mixed_kitchen.py: waits for the run lock (never while a tick or the pilot runs), takes the
reporter lock, checks every file against the release marker (a live file that differs is accepted only when named with
--accept file=sha256, the MERGED mechanism), backs up under operator-tests/image-menus-<stamp>, runs the full unit suite
on the VPS, checks as uid 10000 that the new state directory and the usage ledger are writable and that the egress guard
refuses a private address, and restores every file on failure. Protected files (policy, baseline, usage ledger, checkpoints,
publication state, the Mixed Kitchen queue and progress, approved references) are hash-checked unchanged. Nothing calls the
vision model during the deploy, so the ledger is not touched.

    python -X utf8 deploy_image_menus.py [--accept extract_cache.py=<sha256-of-the-live-file> ...]
"""
import base64
import re
import sys
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
ROOT = '/opt/data/qt-team'
NAMES = ['image_capture.py', 'pdf_capture.py', 'extract_cache.py', 'test_outlet_capture.py']
TESTS = ['test_workflow', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls', 'test_recipe_policy',
         'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']

# Run as uid 10000 (the bots' user) after the files are installed; the output must start with "ok".
CHECK = r'''
import os,pathlib,sys
sys.path.insert(0,__QT_ROOT__)
import pdf_capture,image_capture,workflow,PIL
root=pathlib.Path(__QT_ROOT__);image_capture.ROOT=pdf_capture.ROOT=root
folder=root/'state/image-text';probe=folder/'.deploy-probe'
probe.write_text('x');probe.unlink()
ledger=root/'state/usage.jsonl'
assert os.access(ledger.parent,os.W_OK) and (not ledger.exists() or os.access(ledger,os.W_OK)),'usage ledger not writable by the bots'
guard,agent=image_capture._guard()
try:
 image_capture._open('https://169.254.169.254/latest/meta-data/','text/plain',1000,timeout=10)
 raise SystemExit('the egress guard let a private address through')
except image_capture.FetchError:pass
try:
 got=image_capture._open('https://example.com/','text/html',200000,timeout=20);fetch='ok '+got['type']
except Exception as exc:fetch='unavailable: '+type(exc).__name__
print('ok',guard,'PIL',PIL.__version__,'public fetch',fetch)
'''

code = r'''
# Live files may differ from the release marker only by a version the owner approved (--accept name=sha256).
MERGED=__QT_MERGED__
import pathlib,json,fcntl,hashlib,base64,os,shutil,subprocess,datetime,time,sys
r=pathlib.Path(__QT_ROOT__);payload=__QT_PAYLOAD__
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/image-menus-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 folder=r/'state/image-text';made=not folder.exists()
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','state/publication-outcomes.json',
            'state/veg-options/progress.json','state/veg-options/queue.json','approved-references/registry.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()}
 created=[]
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest() in (release['hashes'][n],MERGED.get(n)),'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  if made:folder.mkdir(mode=0o700);os.chown(folder,10000,10000);folder.chmod(0o700)
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.im-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest']+__QT_TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c',__QT_CHECK__],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+(imported.stderr or imported.stdout)[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()},'Protected file changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.im-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  if made:shutil.rmtree(folder,ignore_errors=True)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'stateDir':str(folder),'import':imported.stdout.strip(),'tests':tail,
                   'accepted':sorted(MERGED),'protectedUnchanged':True,'backup':str(backup)}))
'''

PROBE = r'''
import fcntl,time
for _ in range(20):  # wait inside one SSH call for the gap between scheduled ticks
    with open('/opt/data/qt-team/state/run.lock','a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(f,fcntl.LOCK_UN);print('free');break
        except BlockingIOError:pass
    time.sleep(4)
else:print('busy')
'''


def accepted(arguments):
    """--accept name=sha256 pairs: live versions the owner approved to replace although the release marker differs."""
    found, items = {}, list(arguments)
    while items:
        if items.pop(0) != '--accept' or not items:
            raise SystemExit(__doc__)
        name, _, digest = items.pop(0).partition('=')
        if name not in NAMES or not re.fullmatch('[0-9a-f]{64}', digest):
            raise SystemExit('--accept needs <one of %s>=<sha256>' % ', '.join(NAMES))
        found[name] = digest
    return found


def build(merged=None, root=ROOT):
    payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
    for name, data in payload.items():
        if name.endswith('.py'):
            compile(base64.b64decode(data), name, 'exec')
    check = CHECK.replace('__QT_ROOT__', repr(root))
    # Placeholders contain '_', which base64 never produces, so no payload text can be replaced by mistake.
    return (code.replace('__QT_MERGED__', repr(merged or {})).replace('__QT_ROOT__', repr(root)).replace('__QT_TESTS__', repr(TESTS))
            .replace('__QT_CHECK__', repr(check)).replace('__QT_PAYLOAD__', repr(payload)))


if __name__ == '__main__':
    import time
    remote = build(accepted(sys.argv[1:]))
    for attempt in range(45):  # up to ~70 min; ticks (and a running pilot) hold the lock, with gaps between ticks
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy (a tick or the pilot is running); nothing changed')
    print(setup.remote_container(remote, 'root'))
