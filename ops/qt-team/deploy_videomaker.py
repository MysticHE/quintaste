"""Owner request 21 Oct 2026: QT Videomaker writes members' AI recipes when the app's `ai_recipes_bots` control is on.

Not run yet. Guarded like deploy_gamer.py: run lock, release-hash check, backup, atomic replace, import check as the
hermes user, automatic restore on failure. Creates the qt-videomaker Hermes profile (SOUL from roles/qt-videomaker.md,
model copied from qt-cooker, toolsets chosen per call with -t video or -t web, no OAuth store copied), then installs
qt-ai-recipes-bridge.service on the host, which runs ai_recipes_bridge.py inside the Hermes container as uid 10000.

Order: apply server/ai-recipes/schema.sql (v3) and deploy the app first, then run this, then turn on `ai_recipes_bots`
in Admin > Operations. Turning the control off sends new jobs back to Gemini; this service can stay running.
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['ai_recipes_bridge.py', 'app_signing.py', 'roles/qt-videomaker.md']  # app_signing.py: the shared signer the bridge imports
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
CONTAINER = 'hermes-agent-yril-hermes-agent-1'

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time,shutil,io
# Hermes 0.22 ships ruamel.yaml, not PyYAML.
from ruamel.yaml import YAML
_y=YAML(typ='safe');_y.default_flow_style=False
def yload(text):return _y.load(io.StringIO(text))
def ydump(data):
 buf=io.StringIO();_y.dump(data,buf);return buf.getvalue()
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;PY='/opt/hermes/.venv/bin/python'
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work:
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/videomaker-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 created=[]
 for n,data in payload.items():
  p=r/n
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n.replace('/','__')).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 from hermes_cli.profiles import create_profile,get_profile_dir,set_profile_display_name
 profile=get_profile_dir('qt-videomaker');made=False
 if profile.exists():
  meta=yload((profile/'profile.yaml').read_text()) or {}
  assert meta.get('display_name')=='QT Videomaker','Unrelated existing qt-videomaker profile; refusing'
 try:
  for n,data in payload.items():
   p=r/n;p.parent.mkdir(parents=True,exist_ok=True)
   tmp=p.with_suffix(p.suffix+'.vm-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  d=r/'ai-recipes';d.mkdir(exist_ok=True);os.chown(d,10000,10000);d.chmod(0o700)
  if not profile.exists():
   profile=create_profile('qt-videomaker',no_alias=True,no_skills=True,description='QT Videomaker - members AI recipes from videos and dish requests');made=True
  set_profile_display_name('qt-videomaker','QT Videomaker')
  cooker=yload((get_profile_dir('qt-cooker')/'config.yaml').read_text())
  c=yload((profile/'config.yaml').read_text()) or {}
  c['model']=cooker['model'];c['timezone']='Asia/Singapore'
  c['platform_toolsets']={k:[] for k in ['cli','cron','api_server','telegram','discord','homeassistant']}
  c.setdefault('approvals',{}).update(cron_mode='deny',single_query_mode='deny',unattended_mode='deny');c['command_allowlist']=[]
  c.setdefault('terminal',{})['cwd']=str(d)
  (profile/'config.yaml').write_text(ydump(c),encoding='utf-8')
  (profile/'SOUL.md').write_bytes((r/'roles/qt-videomaker.md').read_bytes())
  for f in [profile,*profile.rglob('*')]:os.chown(f,10000,10000)
  assert not (profile/'auth.json').exists(),'OAuth store unexpectedly present'
  imported=subprocess.run([PY,'-c','import ai_recipes_bridge;print("ok")'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.strip()=='ok','Import check failed: '+imported.stderr[-300:]
  tools=subprocess.run(['hermes','-p','qt-videomaker','tools','list'],cwd=r,capture_output=True,text=True,user=10000,group=10000,env={**os.environ,'HERMES_HOME':'/opt/data'})
  (backup/'tools.txt').write_text(tools.stdout+tools.stderr)
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.vm-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  if made:shutil.rmtree(profile,ignore_errors=True)
  raise
 print(json.dumps({'files':list(payload),'created':created,'profileCreated':made,'videoToolListed':'video_analyze' in (backup/'tools.txt').read_text(),'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

UNIT = r'''
import pathlib,subprocess
unit=pathlib.Path('/etc/systemd/system/qt-ai-recipes-bridge.service')
unit.write_text("""[Unit]
Description=QT Videomaker: members' AI recipes for the app
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data CONTAINER /opt/hermes/.venv/bin/python -u ai_recipes_bridge.py
Restart=always
RestartSec=15
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
""");unit.chmod(0o644)
subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','qt-ai-recipes-bridge.service'],check=True,capture_output=True)
print(subprocess.check_output(['systemctl','is-active','qt-ai-recipes-bridge.service'],text=True).strip())
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.remote_container(code, 'root'))  # runs `python -` in the container; use /opt/hermes/.venv/bin/python when piping by hand
    print(setup.helper.remote(UNIT))
