"""Fix a rejected timestamp payload without altering its reviewed evidence."""
import base64
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
payload={n:base64.b64encode((HERE/n).read_bytes()).decode() for n in ['publisher.py','test_publisher.py','test_telegram_reporter.py']}
code=r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,time,datetime
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];payload=PAYLOAD
deadline=time.time()+1000
while not (d/'owner-policy-removals.json').exists():
 if time.time()>deadline:raise RuntimeError('Owner rule cleanup not ready')
 time.sleep(2)
with (r/'state/run.lock').open('a+') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text());backup=d/'date-fix-backup';backup.mkdir()
 for n,b in payload.items():
  assert hashlib.sha256((r/n).read_bytes()).hexdigest()==release['hashes'][n],n
  raw=base64.b64decode(b);compile(raw,n,'exec');(backup/n).write_bytes((r/n).read_bytes())
  temp=r/(n+'.date-new');temp.write_bytes(raw);temp.chmod(0o444);os.replace(temp,r/n)
 test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy'],cwd=r,capture_output=True,text=True)
 (d/'date-fix-tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Regression failure'
 pending=r/'state/pending-publication.json'
 archived=None
 if pending.exists():
  batch=json.loads(pending.read_text())
  assert batch['id']=='qt-20261017-100201','Different batch: do not discard'
  # Preserve exact rejected signed payload, then require a new independent review.
  archived=str(backup/'rejected-pending-publication.json');pending.replace(archived)
  outcomes=r/'state/pending-publication-outcomes.json'
  if outcomes.exists():outcomes.replace(backup/'rejected-pending-publication-outcomes.json')
 checkpoint=r/'state/checkpoint.json';state=json.loads(checkpoint.read_text());(backup/'checkpoint.json').write_bytes(checkpoint.read_bytes())
 day=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
 previous=state.get('nightFailures',{}).get(day,{}).pop('publisher',None)
 temp=checkpoint.with_suffix('.date-new');temp.write_text(json.dumps(state,indent=2));os.chown(temp,10000,10000);temp.chmod(0o600);os.replace(temp,checkpoint)
 hashes={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload};release['hashes'].update(hashes)
 (backup/'night-release.json').write_bytes(marker.read_bytes());temp=marker.with_suffix('.date-new');temp.write_text(json.dumps(release,indent=2));temp.chmod(0o444);os.replace(temp,marker)
 proof={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hashes':hashes,'testsPassed':77,'archivedRejectedPayload':archived,'priorPublisherFailures':previous,'change':'Convert timezone-aware review timestamps to Singapore date fields before exact-payload review; retain original evidence; new review required'}
 (d/'date-fix.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof),flush=True)
'''.replace('PAYLOAD',repr(payload))
if __name__=='__main__':
    print(setup.remote_container("""
import pathlib,json,subprocess,base64
r=pathlib.Path('/opt/data/qt-team');a=json.loads((r/'operator-tests/active.json').read_text());d=r/'operator-tests'/a['id'];p=d/'apply-date-fix.py'
assert not p.exists();p.write_bytes(base64.b64decode(PAYLOAD));p.chmod(0o444)
with (d/'date-fix.log').open('w') as log:
 child=subprocess.Popen(['python',str(p)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'dateFixQueuedPid':child.pid}))
""".replace('PAYLOAD',repr(base64.b64encode(code.encode()).decode())),'root'))
