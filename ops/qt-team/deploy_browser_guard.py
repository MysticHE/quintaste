"""Owner-approved 18 Oct 2026: install the Hermes browser egress guard and the reinstall timer.

Copies browser_guard.py and browser-policy.json into the QT workspace (data volume), installs
browser_ensure.py on the host, writes qt-browser-guard.service and hermes-browser-ensure.{service,timer},
runs the ensure step once (policy before Chromium), then starts the guard. Backs up any unit it replaces.
"""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
FILES = {'browser_guard.py': '/docker/hermes-agent-yril/data/qt-team/browser_guard.py',
         'browser-policy.json': '/docker/hermes-agent-yril/data/qt-team/browser-policy.json',
         'browser_ensure.py': '/opt/hermes-browser/browser_ensure.py'}
UNITS = {
    'qt-browser-guard.service': """[Unit]
Description=QT Hermes browser egress guard (loopback proxy inside the Hermes container)
After=docker.service
Requires=docker.service

[Service]
ExecStart=/usr/bin/docker exec -u 10000 hermes-agent-yril-hermes-agent-1 python /opt/data/qt-team/browser_guard.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
""",
    'hermes-browser-ensure.service': """[Unit]
Description=Re-apply Hermes browser policy, Chromium and Bot Desktop packages after container recreation
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /opt/hermes-browser/browser_ensure.py
TimeoutStartSec=900
""",
    'hermes-browser-ensure.timer': """[Unit]
Description=Check Hermes browser install every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
""",
}
payload = {name: base64.b64encode((HERE / name).read_bytes()).decode() for name in FILES}
code = r'''
import base64,hashlib,json,os,pathlib,shutil,subprocess,datetime
files=FILES;payload=PAYLOAD;units=UNITS
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=pathlib.Path('/opt/hermes-browser/backups')/stamp;backup.mkdir(parents=True,mode=0o700)
pathlib.Path('/opt/hermes-browser').chmod(0o700)
for name,dest in files.items():
    raw=base64.b64decode(payload[name]);p=pathlib.Path(dest)
    if name.endswith('.py'):compile(raw,name,'exec')
    if name.endswith('.json'):json.loads(raw)
    if p.exists():shutil.copy2(p,backup/name)
    tmp=p.with_suffix(p.suffix+'.new');tmp.write_bytes(raw)
    if dest.startswith('/docker/'):os.chown(tmp,10000,10000);tmp.chmod(0o444)
    else:tmp.chmod(0o700)
    os.replace(tmp,p)
for name,text in units.items():
    p=pathlib.Path('/etc/systemd/system')/name
    if p.exists():shutil.copy2(p,backup/name)
    p.write_text(text);p.chmod(0o644)
def run(*a):
    r=subprocess.run(a,capture_output=True,text=True);return (r.returncode,(r.stdout+r.stderr).strip()[-600:])
print('daemon-reload',run('systemctl','daemon-reload'))
print('ensure',run('systemctl','start','hermes-browser-ensure.service'))
print('ensure log',run('journalctl','-u','hermes-browser-ensure.service','-n','3','--no-pager','-o','cat'))
print('timer',run('systemctl','enable','--now','hermes-browser-ensure.timer'))
print('guard',run('systemctl','enable','--now','qt-browser-guard.service'))
import time;time.sleep(4)
print('guard active',run('systemctl','is-active','qt-browser-guard.service'))
print('hashes',{n:hashlib.sha256(pathlib.Path(d).read_bytes()).hexdigest()[:16] for n,d in files.items()},'backup',str(backup))
'''.replace('FILES', repr(FILES)).replace('PAYLOAD', repr(payload)).replace('UNITS', repr(UNITS))

if __name__ == '__main__':
    print(setup.helper.remote(code))
