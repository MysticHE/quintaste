"""Owner-requested 18 Oct 2026: a new recipe publishes only together with its approved photo (generated and
Manager-inspected in the same round, up to two per round, failed attempts retried), and audit-only menu
reviews go into one end-of-run summary instead of a screenshot message each. Guarded like the other QT
deploys; slots in between rounds of the running supervised live run."""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
# Second use, 18 Oct 10:30 am SGT: Event record bound 12 -> 60 and proposals 6 -> 12, web-call guidance
# raised to about 30, and a live run's end summary is no longer suppressed (the swallowed one is re-sent).
# Third use, 18 Oct ~12:50 pm SGT: server-rule mirror for recipes, 422-rejected batches never jam publishing,
# images per batch back to the server's 2, and Cooker timing 'note' accepted.
NAMES = ['publisher.py', 'workflow.py', 'test_publisher.py', 'test_learning.py']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
for attempt in range(30):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(3)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/photo-first-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n,data in payload.items():
  p=r/n;compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n).write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.photo-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; code restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.photo-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   tmp=(r/n).with_suffix('.restore');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 cp=r/'state/checkpoint.json';shutil.copy2(cp,backup/'checkpoint.json');state=json.loads(cp.read_text())
 lifted=state.get('roleCooldown',{}).pop('qt-event',None)  # Event failed only because of the old 12-record bound
 tmp=cp.with_suffix('.photo-new');tmp.write_text(json.dumps(state,indent=2));shutil.copymode(cp,tmp);os.chown(tmp,cp.stat().st_uid,cp.stat().st_gid);os.replace(tmp,cp)
 tg=r/'state/telegram/state.json';shutil.copy2(tg,backup/'telegram-state.json');tstate=json.loads(tg.read_text());resent=[]
 for k,v in tstate['deliveries'].items():
  if k.startswith('e2e-') and k.endswith(':end') and v['status']=='suppressed' and v.get('createdAt','')>='2026-10-18':
   v.update(status='pending',nextAt=0);resent.append(k)
 tmp=tg.with_suffix('.photo-new');tmp.write_text(json.dumps(tstate,indent=2));shutil.copymode(tg,tmp);os.chown(tmp,tg.stat().st_uid,tg.stat().st_gid);os.replace(tmp,tg)
 print(json.dumps({'files':list(payload),'tests':tail,'protectedUnchanged':True,'eventCooldownLifted':bool(lifted),'endSummaryResent':resent,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

PROBE = r'''
import fcntl,time
for _ in range(20):  # wait inside one SSH call for the 30 s gap between live-run rounds
    with open('/opt/data/qt-team/state/run.lock','a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(f,fcntl.LOCK_UN);print('free');break
        except BlockingIOError:pass
    time.sleep(4)
else:print('busy')
'''

if __name__ == '__main__':
    import time
    for attempt in range(40):  # up to ~70 min; the listener keeps running while we wait
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy; nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
