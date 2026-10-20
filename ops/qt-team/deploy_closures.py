"""Closed venues leave Explore automatically (owner, 19 Oct 2026): a permanently closed venue verified by
diet_review.closure_check becomes a reviewed `closed` venue publication (needs app commit 640ad22); its Telegram
notice carries Revert this update. Earlier uses: Google Maps capture, PDF menus and diet-proof fixes.

Guarded like the other QT deploys (run lock, release hashes, backup, full tests, auto-restore).
"""
import base64
import sys
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['publisher.py', 'telegram_reporter.py', 'telegram_controls.py', 'test_menu_coverage.py']
WHEEL = Path(sys.argv[1]) if len(sys.argv) > 1 else None
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
wheel = base64.b64encode(WHEEL.read_bytes()).decode() if WHEEL else ''
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil,zipfile,io
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;wheel=WHEEL
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/closures-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in ('qt-explorer',)}
 for x,soul in souls.items():(backup/(x+'-SOUL.md')).write_bytes(soul.read_bytes())
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','approved-references/registry.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 created=[];vendor=r/'vendor'/'pypdf';vendor_new=not vendor.exists()
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  if wheel and vendor_new:
   archive=zipfile.ZipFile(io.BytesIO(base64.b64decode(wheel)))
   for name in archive.namelist():
    if not name.startswith('pypdf/') or name.endswith('/') or '..' in name:continue
    target=r/'vendor'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(name));target.chmod(0o444)
   for d in [r/'vendor',*[p for p in (r/'vendor').rglob('*') if p.is_dir()]]:d.chmod(0o755)
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.pdf-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.pdf-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture','test_gamer'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import maps_capture,pdf_capture,pypdf,diet_review,menu_coverage,publisher,telegram_controls,gamer,workflow;print("ok",pypdf.__version__)'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.pdf-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  if vendor_new:shutil.rmtree(r/'vendor',ignore_errors=True)
  raise
 # Failed PDF captures are read again on the next visit instead of reusing the 24-hour failure.
 dropped=[]
 for f in (r/'state/source-cache').glob('*.json'):
  try:d=json.loads(f.read_text())
  except Exception:continue
  res=d.get('result',{})
  if '.pdf' in d.get('url','').lower() and (res.get('error') or not res.get('content')) and len(f.stem)==64:
   (backup/('cache-'+f.name)).write_bytes(f.read_bytes());f.unlink();dropped.append(d['url'][:90])
 recheck=subprocess.run(['python','-c',RECHECK],cwd=r,capture_output=True,text=True,user=10000,group=10000)
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'vendor':imported.stdout.strip(),'tests':tail,'protectedUnchanged':True,
                   'droppedPdfCaptures':dropped,'dietRecheck':recheck.stdout.strip() or recheck.stderr[-400:],'backup':str(backup)}))
'''
RECHECK = r'''
import json,pathlib,sys
sys.path.insert(0,'/opt/data/qt-team')
import diet_review as d
R=pathlib.Path('/opt/data/qt-team')
flags=json.loads((R/'state/diet-flags.json').read_text())
files=sorted(R.glob('runs/*/explorer-*/response.json'),key=lambda p:p.stat().st_mtime,reverse=True)
out={}
for k in list(flags):
  for f in files:
    recs=[x for x in json.loads(f.read_text()).get('records',[]) if x.get('id')==k and isinstance(x.get('dietReview'),dict)]
    if recs:
      review=recs[0]['dietReview']
      out[k]=d.check(R,dict(recs[0],proposals=[]),{'name':flags[k].get('name')})['diet'] if review.get('diet') in ('vegan','vegetarian') else 'explorer-doubt'
      break
  else:out[k]='no-record'
print(json.dumps({'results':out,'stillFlagged':sorted(json.loads((R/'state/diet-flags.json').read_text()))}))
'''
code = code.replace('PAYLOAD', repr(payload)).replace('WHEEL', repr(wheel)).replace('RECHECK', repr(RECHECK))

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
