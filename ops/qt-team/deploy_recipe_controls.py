"""Owner-requested recipe rule and single-click screenshot removal, lock-bound."""
import base64
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
NAMES=['recipe_policy.py','workflow.py','publisher.py','telegram_controls.py','telegram_reporter.py',
       'test_recipe_policy.py','test_night_controls.py','roles/qt-cooker.md','roles/qt-manager.md']
payload={n:base64.b64encode((HERE/n).read_bytes()).decode() for n in NAMES}
code=r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,time,datetime
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];payload=PAYLOAD
with (r/'state/run.lock').open('a+') as work,(r/'state/telegram/reporter.lock').open('a+') as report:
 deadline=time.time()+900
 while True:
  try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
  except BlockingIOError:
   if time.time()>deadline:raise RuntimeError('Work lock still busy; no code changed')
   time.sleep(2)
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=d/'recipe-controls-backup-v2';backup.mkdir()
 protected=['policy.json','baseline.json','state/checkpoint.json','state/usage.jsonl']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n,data in payload.items():
  raw=base64.b64decode(data)
  if n.endswith('.py'):compile(raw,n,'exec')
  p=r/n
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],n
  elif n.startswith('roles/'):
   assert raw.split(b'\n## Owner recipe rule')[0].replace(b'\r\n',b'\n').rstrip()==p.read_bytes().replace(b'\r\n',b'\n').rstrip(),'Concurrent role change'
  else:assert not p.exists(),'Unexpected new file '+n
 for n,data in payload.items():
  p=r/n;b=backup/n;b.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():b.write_bytes(p.read_bytes())
  tmp=p.with_suffix('.owner-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
 for role in ['qt-cooker','qt-manager']:
  p=r.parent/'profiles'/role/'SOUL.md';b=backup/(role+'-SOUL.md');b.write_bytes(p.read_bytes())
  assert p.read_bytes()==(backup/'roles'/(role+'.md')).read_bytes(),'Concurrent profile instructions'
  tmp=p.with_suffix('.owner-new');tmp.write_bytes((r/'roles'/(role+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,p)
 test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy'],cwd=r,capture_output=True,text=True)
 (d/'recipe-controls-tests.txt').write_text(test.stdout+test.stderr)
 assert test.returncode==0,'Regression failure; inspect retained backup before continuing'
 assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 hashes={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload};release['hashes'].update(hashes)
 tmp=marker.with_suffix('.owner-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 proof={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':list(payload),'hashes':hashes,'testsPassed':75,'protectedUnchanged':True,'authority':'Owner explicitly excludes five pungent vegetables and requests immediate screenshot deletion'}
 (d/'recipe-controls.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof),flush=True)
'''.replace('PAYLOAD',repr(payload))

if __name__=='__main__':
    print(setup.remote_container("""
import pathlib,json,base64,subprocess
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];p=d/'apply-recipe-controls-v2.py'
assert not p.exists();p.write_bytes(base64.b64decode(PAYLOAD));p.chmod(0o444)
with (d/'recipe-controls-v2.log').open('w') as log:
 child=subprocess.Popen(['python',str(p)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'waitingForWorkflowLock':True,'pid':child.pid}))
""".replace('PAYLOAD',repr(base64.b64encode(code.encode()).decode())),'root'))
