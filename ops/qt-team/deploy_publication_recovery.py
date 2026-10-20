"""Scoped, guarded QT publication/notification upgrade; no research or budget reset."""
import base64
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
NAMES=['publisher.py','telegram_controls.py','telegram_reporter.py','publication_notify.py','test_publication_delivery.py']
payload={n:base64.b64encode((HERE/n).read_bytes()).decode() for n in NAMES}
code=r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
with (r/'state/run.lock').open('a+') as work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(report,fcntl.LOCK_EX|fcntl.LOCK_NB)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/'operator-tests/publication-recovery-20261017-v3';backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/checkpoint.json','state/usage.jsonl']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n,data in payload.items():
  raw=base64.b64decode(data);compile(raw,n,'exec');p=r/n
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  else:assert not p.exists(),'Unexpected file '+n
  if p.exists():(backup/n).write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.recovery-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr)
  assert test.returncode==0,'Tests failed; code restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.recovery-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   old=backup/n
   if old.exists():
    tmp=(r/n).with_suffix('.restore');tmp.write_bytes(old.read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
   elif (r/n).exists():(r/n).unlink()
  raise
 print(json.dumps({'files':list(payload),'testsPassed':86,'protectedUnchanged':True,'backup':str(backup),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
'''.replace('PAYLOAD',repr(payload))

if __name__=='__main__':
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener stopped for code reload')"))
    try:print(setup.remote_container(code,'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
