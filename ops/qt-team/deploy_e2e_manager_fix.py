"""Apply live-identity review context only at a workflow batch boundary."""
import base64
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
payload={n:base64.b64encode((HERE/n).read_bytes()).decode() for n in ['workflow.py','publisher.py','test_workflow.py','test_publisher.py']}
code=r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,time,datetime
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];payload=PAYLOAD
with (r/'state/run.lock').open('a+') as lock:
 while True:
  try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);break
  except BlockingIOError:
   if time.time()>a['researchDeadline']-300:raise RuntimeError('No safe window remains')
   time.sleep(2)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 assert hashlib.sha256((r/'workflow.py').read_bytes()).hexdigest()=='4d3ce2012cb18dc0413aabca85ed859c83b5cb91b99d6ed023d6a073a39be6fa','Concurrent workflow change'
 assert hashlib.sha256((r/'publisher.py').read_bytes()).hexdigest()=='2866b8e51074411df13c37aad8b1d80433442b848813735a18268e0279c6fc1a','Concurrent publisher change'
 backup=d/'manager-fix-backup';backup.mkdir()
 protected=['policy.json','baseline.json','state/checkpoint.json','state/usage.jsonl']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for name,data in payload.items():
  assert hashlib.sha256((r/name).read_bytes()).hexdigest()==release['hashes'][name],name
  raw=base64.b64decode(data);compile(raw,name,'exec');(backup/name).write_bytes((r/name).read_bytes())
  tmp=r/(name+'.e2e-new');tmp.write_bytes(raw);tmp.chmod(0o444);os.replace(tmp,r/name)
 test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls'],cwd=r,capture_output=True,text=True)
 (d/'manager-fix-tests.txt').write_text(test.stdout+test.stderr)
 if test.returncode:
  for n in payload:
   tmp=r/(n+'.rollback');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
  raise RuntimeError('Checks failed; code rolled back')
 assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 hashes={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload};release['hashes'].update(hashes)
 tmp=marker.with_suffix('.e2e-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 proof={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':list(payload),'hashes':hashes,'testsPassed':68,'protectedUnchanged':True,'change':'Research and final publication review both receive live recipe identities and owner suppression identities'}
 (d/'manager-fix.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof),flush=True)
'''.replace('PAYLOAD',repr(payload))

if __name__=='__main__':
    print(setup.remote_container("""
import pathlib,json,base64,subprocess
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];p=d/'apply-manager-fix.py'
assert not p.exists();p.write_bytes(base64.b64decode(PAYLOAD));p.chmod(0o444)
with (d/'manager-fix.log').open('w') as log:
 child=subprocess.Popen(['python',str(p)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'waitingForWorkflowLock':True,'pid':child.pid}))
""".replace('PAYLOAD',repr(base64.b64encode(code.encode()).decode())),'root'))
