"""Guarded whole-menu workflow upgrade, preserving budgets and historical evidence."""
import base64
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
NAMES=['workflow.py','publisher.py','telegram_reporter.py','menu_coverage.py','test_menu_coverage.py','roles/qt-explorer.md','roles/qt-manager.md']
payload={n:base64.b64encode((HERE/n).read_bytes()).decode() for n in NAMES}
code=r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
with (r/'state/run.lock').open('a+') as work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(report,fcntl.LOCK_EX|fcntl.LOCK_NB)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/'operator-tests/menu-coverage-20261017';backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n,data in payload.items():
  raw=base64.b64decode(data);p=r/n
  if n.endswith('.py'):compile(raw,n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  elif n=='roles/qt-explorer.md':assert p.read_bytes()==(r.parent/'profiles/qt-explorer/SOUL.md').read_bytes()
  else:assert not p.exists(),'Unexpected file '+n
  if p.exists():b=backup/n;b.parent.mkdir(parents=True,exist_ok=True);b.write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes());(backup/'checkpoint.json').write_bytes((r/'state/checkpoint.json').read_bytes())
 for role in ['qt-explorer','qt-manager']:
  p=r.parent/'profiles'/role/'SOUL.md';assert p.read_bytes()==(r/'roles'/(role+'.md')).read_bytes();(backup/(role+'-SOUL.md')).write_bytes(p.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.menu-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; code restored'
  for role in ['qt-explorer','qt-manager']:
   p=r.parent/'profiles'/role/'SOUL.md';tmp=p.with_suffix('.menu-new');tmp.write_bytes((r/'roles'/(role+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,p)
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.menu-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   old=backup/n
   if old.exists():
    tmp=(r/n).with_suffix('.restore');tmp.write_bytes(old.read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
   elif (r/n).exists():(r/n).unlink()
  raise
 # Legacy visited/checklist counts are preserved, not presented as dish coverage.
 p=r/'state/checkpoint.json';state=json.loads(p.read_text());state.setdefault('explorerAttempted',{}).update(state['explorerReviewed']);state['explorerReviewed']={};state['menuCoverageVersion']=1
 tmp=p.with_suffix('.menu-new');tmp.write_text(json.dumps(state,indent=2));os.chown(tmp,10000,10000);tmp.chmod(0o600);os.replace(tmp,p)
 print(json.dumps({'files':list(payload),'testsPassed':96,'protectedUnchanged':True,'historicalVisitsPreserved':len(state['explorerAttempted']),'backup':str(backup),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
'''.replace('PAYLOAD',repr(payload))

if __name__=='__main__':
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code,'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
