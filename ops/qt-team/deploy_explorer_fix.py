"""Owner-approved 18 Oct 2026: unproven 'verified' dish claims become per-dish holds (no whole-batch
rejection), and evidence-check results feed back into the worker's next prompt (validation_feedback.py).
Resets ONLY today's Explorer failure breaker (checkpoint backed up). Guarded like the other QT deploys;
slots in between rounds of the running supervised live run."""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['workflow.py', 'menu_coverage.py', 'validation_feedback.py', 'test_menu_coverage.py']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil
from zoneinfo import ZoneInfo
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
for attempt in range(30):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(3)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/explorer-fix-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  else:assert not p.exists(),'Unexpected file '+n
  if p.exists():(backup/n).write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 cp=r/'state/checkpoint.json';shutil.copy2(cp,backup/'checkpoint.json')
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.fix-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; code restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.fix-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   old=backup/n
   if old.exists():
    tmp=(r/n).with_suffix('.restore');tmp.write_bytes(old.read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
   elif (r/n).exists():(r/n).unlink()
  raise
 day=datetime.datetime.now(ZoneInfo('Asia/Singapore')).date().isoformat()
 state=json.loads(cp.read_text());reset=state.get('nightFailures',{}).get(day,{}).pop('qt-explorer',None)
 tmp=cp.with_suffix('.fix-new');tmp.write_text(json.dumps(state,indent=2));shutil.copymode(cp,tmp);os.chown(tmp,cp.stat().st_uid,cp.stat().st_gid);os.replace(tmp,cp)
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'tests':tail,'protectedUnchanged':True,'explorerFailuresReset':reset,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

if __name__ == '__main__':
    print(setup.remote_container(code, 'root'))
