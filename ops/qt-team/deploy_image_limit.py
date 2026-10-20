"""Owner request 18 Oct 2026: remove the monthly image-attempt cap (policy monthlyImageAttempts -> null).

Guarded like the other QT deploys: run/reporter locks, the live policy must differ from the new one
ONLY in monthlyImageAttempts, workflow.py must match the release marker, backup, tests, auto-restore.
The usage ledger keeps recording every image attempt; failed recipe images are still not retried.
"""
import base64
import json
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['workflow.py', 'policy.json']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
for attempt in range(20):  # the supervised run takes run.lock for each round; slot in between rounds
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(3)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 live=json.loads((r/'policy.json').read_text());new=json.loads(base64.b64decode(payload['policy.json']))
 assert {k:v for k,v in live.items() if k!='monthlyImageAttempts'}=={k:v for k,v in new.items() if k!='monthlyImageAttempts'},'Policy drift beyond the image cap'
 assert new['monthlyImageAttempts'] is None
 assert hashlib.sha256((r/'workflow.py').read_bytes()).hexdigest()==release['hashes']['workflow.py'],'Concurrent change workflow.py'
 compile(base64.b64decode(payload['workflow.py']),'workflow.py','exec')
 backup=r/('operator-tests/image-limit-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 for n in payload:(backup/n).write_bytes((r/n).read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 protected=['baseline.json','state/checkpoint.json','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.img-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.img-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n;tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'monthlyImageAttempts':json.loads((r/'policy.json').read_text())['monthlyImageAttempts'],'tests':tail,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

if __name__ == '__main__':
    print(setup.remote_container(code, 'root'))
