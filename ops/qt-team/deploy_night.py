"""Guarded QT-only upgrade. Existing authentication and state remain in place."""
import base64
import json
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
FILES=['workflow.py','recipe_policy.py','publisher.py','telegram_reporter.py','telegram_listener.py','policy.json','night_window.py','night_supervisor.py','search_history.py','telegram_controls.py','test_night_controls.py','test_workflow.py','test_publisher.py','test_telegram_reporter.py','test_learning.py','test_recipe_policy.py']
EXPECTED={'workflow.py':'2fc96072b5389da2e11644c480fcf1eba7c8765d7ac38a40ee013238ace06bae','publisher.py':'5ec1fdfac3ab678774f67cd650c3b6ed4d2ea2926c7845e3b7b124f4ca5ec83a','telegram_reporter.py':'532f22d8b543d196135656690491ceb0830b365b536661f84b714d3ad1a8de25','policy.json':'b813f65b0c542c08d58f8b46aed61229909a64c454be7ab2cf637e01a9fcd6d3'}


def deploy():
    payload={n:base64.b64encode((HERE/n).read_bytes()).decode() for n in FILES}
    result=setup.remote_container(r'''
import pathlib,os,json,hashlib,fcntl,base64,datetime,yaml
root=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;expected=EXPECTED
marker=root/'night-release.json';previous=json.loads(marker.read_text()) if marker.exists() else {}
protected=['baseline.json','state/checkpoint.json','state/usage.jsonl','state/latest-publication.json','learning-policy.json','extract_cache.py']
with (root/'state/run.lock').open('a+') as worklock,(root/'state/telegram/reporter.lock').open('a+') as reportlock:
 fcntl.flock(worklock,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(reportlock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 before={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in protected}
 decoded={n:base64.b64decode(v) for n,v in payload.items()}
 for n,b in decoded.items():
  if n.endswith('.py'):compile(b,n,'exec')
  p=root/n
  if p.exists():
   assert hashlib.sha256(p.read_bytes()).hexdigest() in {expected.get(n),previous.get('hashes',{}).get(n),hashlib.sha256(b).hexdigest()},'Unexpected concurrent change: '+n
 backup=root/'telegram-runtime/backups'/('night-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir()
 for n,b in decoded.items():
  p=root/n
  if p.exists():(backup/n).write_bytes(p.read_bytes())
  temp=p.with_suffix('.new');temp.write_bytes(b);temp.chmod(0o444);os.replace(temp,p)
 manager=pathlib.Path('/opt/data/profiles/qt-manager')
 wrapper=manager/'scripts/qt-team-daily.py';(backup/'daily-wrapper.py').write_bytes(wrapper.read_bytes())
 wrapper.write_text("import runpy,sys\nsys.path.insert(0,'/opt/data/qt-team')\nrunpy.run_path('/opt/data/qt-team/night_supervisor.py',run_name='__main__')\n");wrapper.chmod(0o444)
 config=manager/'config.yaml';(backup/'manager-config.yaml').write_bytes(config.read_bytes());(backup/'manager-config.yaml').chmod(0o600)
 data=yaml.safe_load(config.read_text());data.setdefault('cron',{}).update(script_timeout_seconds=3500,max_parallel_jobs=2)
 config.write_text(yaml.safe_dump(data,sort_keys=False));os.chown(config,10000,10000);config.chmod(0o600)
 after={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in protected};assert before==after
 receipt={'deployedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backup':str(backup),'hashes':{n:hashlib.sha256(b).hexdigest() for n,b in decoded.items()},'preserved':after}
 marker.write_text(json.dumps(receipt,indent=2));marker.chmod(0o444)
 print(json.dumps(receipt))
'''.replace('PAYLOAD',repr(payload)).replace('EXPECTED',repr(EXPECTED)), 'root')
    receipt=json.loads(result)
    dest=HERE/'evidence/2026-10-17/night-management';dest.mkdir(parents=True,exist_ok=True)
    (dest/'deployment.json').write_text(json.dumps(receipt,indent=2))
    print(json.dumps({'deployed':list(receipt['hashes']),'backup':receipt['backup'],'statePreserved':True}))


def schedule():
    print(setup.remote_container("""
import os,json
os.environ['HERMES_HOME']='/opt/data/profiles/qt-manager';os.environ['HERMES_TIMEZONE']='Asia/Singapore'
from cron.jobs import update_job
job=update_job('1d0f99df35ff',{'schedule':'*/15 1-4 * * *','prompt':'Resume fixed QT checkpoints during 01:00–05:00 Singapore time. Stop new research at 04:15. Manager review and bounded publication only. 2000 shared monthly agent invocations; Google disabled pending billing reconciliation. Owner Telegram deletions remain suppressed.','enabled':True})
print(json.dumps({k:job[k] for k in ['id','schedule','next_run_at','enabled','script']}))
"""))


if __name__=='__main__':
    import sys
    {'deploy':deploy,'schedule':schedule}[sys.argv[1]]()
