"""Owner request 18 Oct 2026: Explorer 24 hours, Cooker and Event 6-10 pm SGT, daily summary at 10:05 pm.

Guarded like the other QT deploys (release hashes, backup, full tests, auto-restore). policy.json may change
only in its schedule description keys. Also returns the four QT profile config.yaml files to the hermes user
(a root-run edit had left qt-manager's unreadable) and switches the coordinator cron job to every 15 minutes.
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['night_window.py', 'night_supervisor.py', 'workflow.py', 'telegram_reporter.py', 'policy.json', 'test_night_controls.py']
POLICY_KEYS = {'managerSchedule', 'workWindow', 'researchCutoff'}
JOB = '1d0f99df35ff'
PROMPT = ('Run the fixed QT workflow tick. Explorer, Manager review and publication run around the clock in rolling '
          '~55-minute ticks; Cooker and Event start only 6-10 pm Singapore time. No monthly AI or image caps; every '
          'call is ledgered. Google disabled. Live screenshots for real changes and one daily summary at 10:05 pm.')
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;policy_keys=POLICY_KEYS
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/schedule-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 live_policy=json.loads((r/'policy.json').read_text());new_policy=json.loads(base64.b64decode(payload['policy.json']))
 changed={k for k in set(live_policy)|set(new_policy) if live_policy.get(k)!=new_policy.get(k)}
 assert changed<=policy_keys,'Unexpected policy change: '+','.join(sorted(changed-policy_keys))
 protected=['baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n).write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.sched-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.sched-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   tmp=(r/n).with_suffix((r/n).suffix+'.restore');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
  raise
# Profile settings must be readable by the hermes user (uid 10000).
owners={}
for name in ('qt-manager','qt-explorer','qt-cooker','qt-event'):
 cfg=pathlib.Path('/opt/data/profiles')/name/'config.yaml';os.chown(cfg,10000,10000);cfg.chmod(0o600);owners[name]=(cfg.stat().st_uid,oct(cfg.stat().st_mode&0o777))
env=dict(os.environ,HERMES_HOME='/opt/data',HOME='/opt/data')
edit=subprocess.run(['hermes','-p','qt-manager','cron','edit',JOB,'--schedule','*/15 * * * *','--name','QT team scheduled work','--prompt',PROMPT],
                    capture_output=True,text=True,env=env,user=10000,group=10000,timeout=60)
jobs=json.loads(pathlib.Path('/opt/data/profiles/qt-manager/cron/jobs.json').read_text())['jobs']
job=next(j for j in jobs if j['id']==JOB)
readable=subprocess.run(['hermes','-p','qt-manager','tools','list'],capture_output=True,text=True,env=env,user=10000,group=10000,timeout=60)
tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
print(json.dumps({'files':list(payload),'policyChanged':sorted(changed),'tests':tail,'protectedUnchanged':True,'configOwners':owners,
                  'cronEdit':edit.returncode,'cronEditOut':(edit.stdout+edit.stderr)[-300:],'schedule':job.get('schedule'),'name':job.get('name'),'nextRunAt':job.get('next_run_at'),'enabled':job.get('enabled'),
                  'settingsWarning':'could not be read' in (readable.stdout+readable.stderr),'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload)).replace('POLICY_KEYS', repr(POLICY_KEYS)).replace('JOB', repr(JOB)).replace('PROMPT', repr(PROMPT))

if __name__ == '__main__':
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
