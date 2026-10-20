"""Guarded 18 Oct upgrade (owner-approved): browser toolset for QT bot runs, read-only browsing rules in all
four roles, and the Greendot outlet capture. Requires the egress guard (deploy_browser_guard.py) first."""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['workflow.py', 'outlet_capture.py', 'test_outlet_capture.py',
         'roles/qt-manager.md', 'roles/qt-explorer.md', 'roles/qt-cooker.md', 'roles/qt-event.md']
ROLES = ['qt-manager', 'qt-explorer', 'qt-cooker', 'qt-event']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;roles=ROLES
assert (r/'browser_guard.py').exists() and (r/'browser-policy.json').exists(),'Install the egress guard first'
assert pathlib.Path('/etc/chromium/policies/managed/qt-browser-guard.json').exists(),'Browser policy missing'
with (r/'state/run.lock').open('a+') as work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(report,fcntl.LOCK_EX|fcntl.LOCK_NB)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/'operator-tests/browser-bots-20261018';backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in roles}
 for n,data in payload.items():
  raw=base64.b64decode(data);p=r/n
  if n.endswith('.py'):compile(raw,n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  elif n.startswith('roles/'):assert p.read_bytes()==souls[n[6:-3]].read_bytes(),'Role/SOUL drift '+n
  else:assert not p.exists(),'Unexpected file '+n
  if p.exists():b=backup/n;b.parent.mkdir(parents=True,exist_ok=True);b.write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 for x,s in souls.items():(backup/(x+'-SOUL.md')).write_bytes(s.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.browser-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; code restored'
  for x,s in souls.items():
   tmp=s.with_suffix('.browser-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,s)
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.browser-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   old=backup/n
   if old.exists():
    tmp=(r/n).with_suffix('.restore');tmp.write_bytes(old.read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
   elif (r/n).exists():(r/n).unlink()
  for x,s in souls.items():
   tmp=s.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,s)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'tests':tail,'protectedUnchanged':True,'backup':str(backup),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
'''.replace('PAYLOAD', repr(payload)).replace('ROLES', repr(ROLES))

if __name__ == '__main__':
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
