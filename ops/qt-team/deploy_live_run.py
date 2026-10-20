"""Owner-approved daytime live run (18 Oct 2026): stop the current supervised run, deploy every pending
QT bot fix, then start a fresh supervised run (default 3 hours).

Guarded like the other QT deploys: release-hash checks for tracked files, backup, full test suite and
auto-restore. The owner removed the monthly AI/image caps and the per-day role limits; policy.json
changes are therefore expected and limited to those keys. Role briefs are synced to the profiles' SOUL.md.
Today's failure counters and cooldowns are reset (checkpoint backed up).
"""
import base64
import json
import sys
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['workflow.py', 'menu_coverage.py', 'validation_feedback.py', 'publisher.py', 'telegram_reporter.py',
         'telegram_controls.py', 'night_window.py', 'extract_cache.py', 'e2e_postflight.py', 'supervised_e2e.py',
         'outlet_capture.py', 'policy.json', 'test_menu_coverage.py', 'test_night_controls.py', 'test_outlet_capture.py',
         'roles/qt-explorer.md', 'roles/qt-event.md']
POLICY_KEYS = {'monthlyModelInvocations', 'monthlyImageAttempts', 'workerMaxTurns', 'workerSeconds',
               'maxExploreBatchesPerRun', 'maxEventsPerRun'}
HOURS = float(sys.argv[1]) if len(sys.argv) > 1 else 3.0
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}

stop = r'''
import pathlib,json,fcntl,os,signal,time
import psutil
r=pathlib.Path('/opt/data/qt-team');active=json.loads((r/'operator-tests/active.json').read_text()) if (r/'operator-tests/active.json').exists() else {}
def supervisor_free():
    with (r/'operator-tests/supervisor.lock').open('a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);return True
        except BlockingIOError:return False
stopped=[]
if not supervisor_free() and active.get('pid'):
    try:os.kill(active['pid'],signal.SIGINT);stopped.append(active['pid'])   # its finally block writes the result and end message
    except ProcessLookupError:pass
    for p in psutil.process_iter(['pid','cmdline']):
        cmd=' '.join(p.info['cmdline'] or [])
        if 'supervised_e2e.py worker' in cmd:            # end the in-progress round; checkpoints recover partial work
            for c in p.children(recursive=True)+[p]:
                try:c.kill()
                except psutil.NoSuchProcess:pass
            stopped.append(p.info['pid'])
deadline=time.time()+90  # stays inside the 120 s SSH call
while time.time()<deadline and not supervisor_free():time.sleep(3)
result=json.loads((r/'operator-tests'/active['id']/'result.json').read_text()) if active.get('id') and (r/'operator-tests'/active['id']/'result.json').exists() else None
print(json.dumps({'stopped':stopped,'supervisorFree':supervisor_free(),'previousRun':active.get('id'),
                  'previousResult':{k:(result or {}).get(k) for k in ('status','rounds','recordsChecked','recordsPublished','agentRunsUsed')} if result else None},default=str)[:1500])
'''

install = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,shutil,time
from zoneinfo import ZoneInfo
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;policy_keys=POLICY_KEYS
with (r/'operator-tests/supervisor.lock').open('a+') as sup:
 fcntl.flock(sup,fcntl.LOCK_EX|fcntl.LOCK_NB)  # refuse while a supervised run is still active
for attempt in range(15):  # the stopped round releases run.lock within seconds; stays inside the SSH call
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(5)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 backup=r/('operator-tests/live-run-'+stamp);backup.mkdir(mode=0o700)
 live_policy=json.loads((r/'policy.json').read_text());new_policy=json.loads(base64.b64decode(payload['policy.json']))
 changed={k for k in set(live_policy)|set(new_policy) if live_policy.get(k)!=new_policy.get(k)}
 assert changed<=policy_keys,'Unexpected policy change: '+','.join(sorted(changed-policy_keys))
 protected=['baseline.json','state/usage.jsonl','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in ('qt-explorer','qt-event')}
 for n,data in payload.items():
  p=r/n;raw=base64.b64decode(data)
  if n.endswith('.py'):compile(raw,n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  if p.exists():b=backup/n;b.parent.mkdir(parents=True,exist_ok=True);b.write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 for x,s in souls.items():(backup/(x+'-SOUL.md')).write_bytes(s.read_bytes())
 cp=r/'state/checkpoint.json';shutil.copy2(cp,backup/'checkpoint.json')
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.live-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  for x,s in souls.items():
   tmp=s.with_suffix('.live-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,s)
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.live-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   old=backup/n
   if old.exists():
    tmp=(r/n).with_suffix((r/n).suffix+'.restore');tmp.write_bytes(old.read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
  for x,s in souls.items():
   tmp=s.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,s)
  raise
 day=datetime.datetime.now(ZoneInfo('Asia/Singapore')).date().isoformat()
 state=json.loads(cp.read_text());reset=state.get('nightFailures',{}).pop(day,{});state.pop('roleCooldown',None)
 tmp=cp.with_suffix('.live-new');tmp.write_text(json.dumps(state,indent=2));shutil.copymode(cp,tmp);os.chown(tmp,cp.stat().st_uid,cp.stat().st_gid);os.replace(tmp,cp)
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':len(payload),'policyChanged':sorted(changed),'tests':tail,'protectedUnchanged':True,'failuresReset':reset,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload)).replace('POLICY_KEYS', repr(POLICY_KEYS))

launch = r'''
import subprocess,pathlib,time,json
r=pathlib.Path('/opt/data/qt-team')
log=(r/'operator-tests'/('live-run-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'.log')).open('w')
p=subprocess.Popen(['python',str(r/'supervised_e2e.py'),'HOURS'],cwd=str(r),stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
time.sleep(20)
active=json.loads((r/'operator-tests/active.json').read_text())
print(json.dumps({'pid':p.pid,'running':p.poll() is None,'test':active['id'],'deadline':active['deadline'],'researchDeadline':active['researchDeadline']}))
'''.replace('HOURS', str(HOURS))

if __name__ == '__main__':
    print(setup.remote_container(stop, 'root'))
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(install, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
    print(setup.remote_container(launch))
