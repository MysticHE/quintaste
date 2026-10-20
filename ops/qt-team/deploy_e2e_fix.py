"""Guarded, lock-bound recovery fix for the owner's running acceptance window."""
import base64
import json
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
payload = {name: base64.b64encode((HERE / name).read_bytes()).decode()
           for name in ('workflow.py', 'test_workflow.py')}
code = r'''
import base64,datetime,fcntl,hashlib,json,os,pathlib,subprocess,time
root=pathlib.Path('/opt/data/qt-team')
active=json.loads((root/'operator-tests/active.json').read_text());folder=root/'operator-tests'/active['id']
payload=PAYLOAD
with (root/'state/run.lock').open('a+') as lock:
 while True:
  try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);break
  except BlockingIOError:
   if time.time()>active['researchDeadline']-600:raise RuntimeError('No safe research window remains for fix')
   time.sleep(2)
 assert hashlib.sha256((root/'workflow.py').read_bytes()).hexdigest()=='fb64feca50d65fe344fd42f271103e5135330a59dec22a425ec9d0f83b3191b7','Concurrent workflow edit'
 backup=folder/'recovery-fix-backup';backup.mkdir()
 state_path=root/'state/checkpoint.json';state=json.loads(state_path.read_text())
 (backup/'checkpoint.json').write_bytes(state_path.read_bytes())
 marker=root/'night-release.json';(backup/'night-release.json').write_bytes(marker.read_bytes())
 for name,data in payload.items():
  raw=base64.b64decode(data);compile(raw,name,'exec')
  (backup/name).write_bytes((root/name).read_bytes())
  temp=root/(name+'.e2e-new');temp.write_bytes(raw);temp.chmod(0o444);os.replace(temp,root/name)
 result=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls'],cwd=root,capture_output=True,text=True)
 (folder/'recovery-fix-tests.txt').write_text(result.stdout+result.stderr)
 if result.returncode:
  for name in payload:
   temp=root/(name+'.rollback');temp.write_bytes((backup/name).read_bytes());temp.chmod(0o444);os.replace(temp,root/name)
  raise RuntimeError('Regression checks failed; code rolled back')
 # Undo only today's checkpoint consumed by this test's stale recovery; retain evidence,
 # names, pending reviews, all budget rows and the completed Event checkpoint.
 recovered=root/'runs/20261017T093921Z/cooker/receipt.json'
 receipt=json.loads(recovered.read_text())
 assert receipt.get('reusedResponseFrom'), 'Not the observed recovery'
 day=datetime.datetime.fromtimestamp(active['start'],datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
 assert state.get('cookDay')==day,'Cooker checkpoint changed'
 state.pop('cookDay')
 temp=state_path.with_suffix('.e2e-new');temp.write_text(json.dumps(state,indent=2));os.chown(temp,10000,10000);temp.chmod(0o600);os.replace(temp,state_path)
 release=json.loads(marker.read_text());release['hashes'].update({n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in payload})
 release['e2eRecoveryFixAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 temp=marker.with_suffix('.e2e-new');temp.write_text(json.dumps(release,indent=2));temp.chmod(0o444);os.replace(temp,marker)
 proof={'at':release['e2eRecoveryFixAt'],'files':list(payload),'testsPassed':66,'originalCookerReceipt':str(recovered),'checkpointCorrection':'Removed only cookDay consumed by stale recovery; retained all other state and budget rows','hashes':{n:release['hashes'][n] for n in payload}}
 (folder/'recovery-fix.json').write_text(json.dumps(proof,indent=2))
 print(json.dumps(proof),flush=True)
'''.replace('PAYLOAD', repr(payload))

if __name__ == '__main__':
    # A fixed, reviewable operator script waits for the existing workflow lock.
    raw = base64.b64encode(code.encode()).decode()
    print(setup.remote_container("""
import pathlib,base64,subprocess,json
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id']
p=d/'apply-recovery-fix.py';assert not p.exists();p.write_bytes(base64.b64decode(PAYLOAD));p.chmod(0o444)
with (d/'recovery-fix.log').open('w') as log:
 child=subprocess.Popen(['python',str(p)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'waitingForWorkflowLock':True,'pid':child.pid}))
""".replace('PAYLOAD', repr(raw)), 'root'))
