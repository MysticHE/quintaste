"""Owner request 18 Oct 2026: add QT Gamer, a bot that makes Rush Hour game sprites in the owner's concept style.

Guarded like the other QT deploys: run lock and reporter lock, release-hash check, backup, atomic replace, full tests plus
test_gamer, import check as the hermes user, and automatic restore on failure. Creates the qt-gamer Hermes profile
(SOUL from roles/qt-gamer.md, image_gen copied from qt-cooker, no OAuth store copied). No schedule is added: the existing
15-minute coordinator runs the QT Gamer stage. Nothing is published to the app.

workflow.py is the LIVE version (fetched to .live-20261018/) plus only the QT Gamer hook, so undeployed local edits by other
work are not shipped.
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
SOURCES = {'workflow.py': HERE / '.live-20261018' / 'workflow.py'}
NAMES = ['gamer.py', 'workflow.py', 'telegram_controls.py', 'telegram_reporter.py', 'test_gamer.py', 'roles/qt-gamer.md',
         'gamer/style.json', 'gamer/assets.json', 'gamer/generate.py', 'gamer/process_lite.py', 'gamer/README.md',
         'gamer/references/style-reference.webp']
payload = {n: base64.b64encode(SOURCES.get(n, HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil,yaml
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/gamer-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','approved-references/registry.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 created=[]
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 from hermes_cli.profiles import create_profile,get_profile_dir,set_profile_display_name
 profile=get_profile_dir('qt-gamer');made_profile=False
 if profile.exists():
  meta=yaml.safe_load((profile/'profile.yaml').read_text()) or {}
  assert meta.get('display_name')=='QT Gamer','Unrelated existing qt-gamer profile; refusing'
 try:
  for n,data in payload.items():
   p=r/n;p.parent.mkdir(parents=True,exist_ok=True)
   tmp=p.with_suffix(p.suffix+'.gamer-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  g=r/'gamer'
  for d in [g,g/'references',g/'runs',g/'approved']:
   d.mkdir(exist_ok=True);os.chown(d,10000,10000)
  for d in [g/'runs',g/'approved']:d.chmod(0o700)
  for f in [g/'assets.json']:os.chown(f,10000,10000);f.chmod(0o644)
  if not profile.exists():
   profile=create_profile('qt-gamer',no_alias=True,no_skills=True,description='QT Gamer — Rush Hour game sprites in the owner concept style');made_profile=True
  set_profile_display_name('qt-gamer','QT Gamer')
  cooker=yaml.safe_load((get_profile_dir('qt-cooker')/'config.yaml').read_text())
  c=yaml.safe_load((profile/'config.yaml').read_text()) or {}
  c['model']=cooker['model'];c['timezone']='Asia/Singapore';c['image_gen']=cooker.get('image_gen',{})
  c['platform_toolsets']={k:[] for k in ['cli','cron','api_server','telegram','discord','homeassistant']}
  c.setdefault('approvals',{}).update(cron_mode='deny',single_query_mode='deny',unattended_mode='deny');c['command_allowlist']=[]
  c.setdefault('terminal',{})['cwd']=str(g)
  (profile/'config.yaml').write_text(yaml.safe_dump(c,sort_keys=False),encoding='utf-8')
  (profile/'SOUL.md').write_bytes((r/'roles/qt-gamer.md').read_bytes())
  for f in [profile,*profile.rglob('*')]:os.chown(f,10000,10000)
  assert not (profile/'auth.json').exists(),'OAuth store unexpectedly present'
  assert c['image_gen'].get('provider')=='openai-codex',c['image_gen']
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture','test_gamer'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import gamer,workflow,telegram_controls,telegram_reporter,sys;sys.path.insert(0,"gamer");import process_lite;print("ok")'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.strip()=='ok','Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload if not n.startswith('gamer/references/')})
  tmp=marker.with_suffix('.gamer-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  if made_profile:shutil.rmtree(profile,ignore_errors=True)
  raise
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'profileCreated':made_profile,'tests':tail,'protectedUnchanged':True,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

PROBE = r'''
import fcntl,time
for _ in range(20):
    with open('/opt/data/qt-team/state/run.lock','a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(f,fcntl.LOCK_UN);print('free');break
        except BlockingIOError:pass
    time.sleep(4)
else:print('busy')
'''

if __name__ == '__main__':
    import time
    for attempt in range(45):
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy; nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
