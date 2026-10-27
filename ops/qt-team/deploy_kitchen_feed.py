"""Owner request 27 Oct 2026: feed the public Mochi kitchen page (docs/MOCHI_KITCHEN_PLAN.md §4) from the QT team's real work.

Copies kitchen_feed.py into /opt/data/qt-team, guarded like deploy_game_bridges.py: run lock, release-hash check, backup, atomic
replace, an import check as the hermes user and automatic restore on failure. Then installs qt-kitchen-feed.service (one push)
and qt-kitchen-feed.timer (every 15 minutes) on the host. Each push runs inside the Hermes container as uid 10000, reads state
only and signs with the publisher key; it publishes nothing. `systemctl disable --now qt-kitchen-feed.timer` stops it.

Deploy the app first: the push needs /api/kitchen/bot/feed (server/kitchen/router.mjs). Not run yet (owner: "don't deploy").
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
CONTAINER = 'hermes-agent-yril-hermes-agent-1'
NAMES = ['kitchen_feed.py', 'app_signing.py']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;PY='/opt/hermes/.venv/bin/python'
for attempt in range(600):  # the team's 15-minute cycle can hold this lock for most of each cycle; wait up to 40 minutes
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work:
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/kitchen-feed-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 created=[]
 for n,data in payload.items():
  p=r/n
  compile(base64.b64decode(data),n,'exec')
  if n in release['hashes'] and p.exists():assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  (backup/n).write_bytes(p.read_bytes()) if p.exists() else created.append(n)
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.kf-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  built=subprocess.run([PY,'kitchen_feed.py'],cwd=r,capture_output=True,text=True,user=10000,group=10000,
                       env={**os.environ,'HERMES_SRC':'/opt/hermes','HERMES_HOME':'/opt/data'},timeout=120)
  assert built.returncode==0 and json.loads(built.stdout).get('version')==1,'Feed build failed: '+built.stderr[-300:]
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.kf-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  raise
 print(json.dumps({'files':list(payload),'created':created,'backup':str(backup),'items':len(json.loads(built.stdout)['items'])}))
'''.replace('PAYLOAD', repr(payload))

UNITS = r'''
import pathlib,subprocess
service=pathlib.Path('/etc/systemd/system/qt-kitchen-feed.service')
service.write_text("""[Unit]
Description=Mochi kitchen: push the public feed to the app
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data -e HERMES_SRC=/opt/hermes CONTAINER /opt/hermes/.venv/bin/python kitchen_feed.py --push
TimeoutStartSec=120
""");service.chmod(0o644)
timer=pathlib.Path('/etc/systemd/system/qt-kitchen-feed.timer')
timer.write_text("""[Unit]
Description=Mochi kitchen feed every 15 minutes

[Timer]
OnCalendar=*:0/15
RandomizedDelaySec=60
Persistent=true

[Install]
WantedBy=timers.target
""");timer.chmod(0o644)
for unit in (service,timer):subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','qt-kitchen-feed.timer'],check=True,capture_output=True)
subprocess.run(['systemctl','start','qt-kitchen-feed.service'],check=True,capture_output=True)
print(subprocess.run(['systemctl','list-timers','qt-kitchen-feed.timer','--no-pager'],capture_output=True,text=True).stdout)
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.remote_container(code, 'root'))
    print(setup.helper.remote(UNITS))
