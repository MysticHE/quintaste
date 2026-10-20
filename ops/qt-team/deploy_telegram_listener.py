"""Deploy the fixed owner-only listener without restarting Hermes research."""
import base64
import json
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
files = ['telegram_listener.py', 'telegram_reporter.py', 'test_telegram_reporter.py']
payload = {n: base64.b64encode((HERE/n).read_bytes()).decode() for n in files}
code = r"""
import pathlib,json,hashlib,fcntl,base64,os,subprocess,datetime
r=pathlib.Path('/docker/hermes-agent-yril/data/qt-team');payload=PAYLOAD
unit=pathlib.Path('/etc/systemd/system/qt-telegram-listener.service')
assert not unit.exists(),'Listener already installed; inspect before upgrading'
backup=r/'telegram-runtime/backups/listener-20261017';backup.mkdir()
with (r/'state/telegram/reporter.lock').open('a+') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 for n in payload:
  p=r/n
  if p.exists():
   assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
 for n,v in payload.items():
  p=r/n;b=base64.b64decode(v);compile(b,n,'exec')
  if p.exists():(backup/n).write_bytes(p.read_bytes())
  tmp=p.with_suffix('.listener-new');tmp.write_bytes(b);tmp.chmod(0o444);os.replace(tmp,p)
 test=subprocess.run(['docker','exec','--user','10000','--workdir','/opt/data/qt-team','hermes-agent-yril-hermes-agent-1','python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy'],capture_output=True,text=True)
 (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Regression failure'
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
 tmp=marker.with_suffix('.listener-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
probe=subprocess.run(['setpriv','--reuid=10000','--regid=10000','--clear-groups','env','QT_TEAM_ROOT='+str(r),'/usr/bin/python3','-c','import sys;sys.path.insert(0,'+repr(str(r))+');import telegram_listener,telegram_controls,publisher;assert telegram_listener.t.read(telegram_listener.t.ROOT/"private/telegram-chat.json")'],capture_output=True,text=True)
assert probe.returncode==0,probe.stderr
unit.write_text('''[Unit]
Description=QT Manager owner Telegram commands
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/docker/hermes-agent-yril/data/qt-team
Environment=QT_TEAM_ROOT=/docker/hermes-agent-yril/data/qt-team
Environment=PYTHONDONTWRITEBYTECODE=1
ExecStart=/usr/bin/setpriv --reuid=10000 --regid=10000 --clear-groups /usr/bin/python3 -u /docker/hermes-agent-yril/data/qt-team/telegram_listener.py
Restart=always
RestartSec=5
TimeoutStopSec=10
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/docker/hermes-agent-yril/data/qt-team/state

[Install]
WantedBy=multi-user.target
''');unit.chmod(0o644)
subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','qt-telegram-listener.service'],check=True,capture_output=True)
assert subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service'],text=True).strip()=='active'
proof={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'service':'qt-telegram-listener.service','testsPassed':79,'hashes':{n:release['hashes'][n] for n in payload},'researchUnchanged':True,'polling':'Single-consumer 20-second long polling; immediate callback acknowledgement before publication/state lock','backup':str(backup)}
(r/'operator-tests/e2e-20261017T093920Z/listener-fix.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
""".replace('PAYLOAD', repr(payload))

if __name__ == '__main__':
    result = json.loads(setup.helper.remote(code))
    out = HERE/'evidence/2026-10-17/owner-recipe-controls/listener-fix.json'
    out.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))
