"""Owner request 31 Oct 2026: QT Gamer draws the step pictures of members' AI recipes instead of Gemini.

Guarded like deploy_videomaker.py: run lock, release-hash check, backup, atomic replace, import check as the hermes user,
automatic restore on failure. Uses the existing qt-gamer profile through image_worker.py (unchanged). Then installs
qt-recipe-drawings.service on the host, which runs recipe_drawing_bridge.py inside the Hermes container as uid 10000.

Order: apply server/ai-recipes/schema.sql (v4, recipes.ai_drawing) and deploy the app first, then run this.
`systemctl disable --now qt-recipe-drawings.service` stops the drawings; queued ones then fail after an hour.
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['recipe_drawing_bridge.py']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
CONTAINER = 'hermes-agent-yril-hermes-agent-1'

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;PY='/opt/hermes/.venv/bin/python'
for attempt in range(600):  # a round can hold the lock for a while; wait up to 40 minutes
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work:
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/recipe-drawings-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 created=[]
 for n,data in payload.items():
  p=r/n
  compile(base64.b64decode(data),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.rd-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  imported=subprocess.run([PY,'-c','import recipe_drawing_bridge,workflow;print("ok")'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.strip()=='ok','Import check failed: '+imported.stderr[-300:]
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.rd-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  raise
 print(json.dumps({'files':list(payload),'created':created,'backup':str(backup)}))
'''.replace('PAYLOAD', repr(payload))

UNIT = r'''
import pathlib,subprocess
unit=pathlib.Path('/etc/systemd/system/qt-recipe-drawings.service')
unit.write_text("""[Unit]
Description=QT Gamer: step drawings for members' AI recipes
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data CONTAINER /opt/hermes/.venv/bin/python -u recipe_drawing_bridge.py
Restart=always
RestartSec=15
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
""");unit.chmod(0o644)
subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','qt-recipe-drawings.service'],check=True,capture_output=True)
print(subprocess.check_output(['systemctl','is-active','qt-recipe-drawings.service'],text=True).strip())
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.remote_container(code, 'root'))
    print(setup.helper.remote(UNIT))
