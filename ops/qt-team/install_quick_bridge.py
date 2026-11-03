"""Owner request 3 Nov 2026 (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E): a second bridge just for the quick lane, so swap asks and Snap a
dish / My ingredients recipes never wait behind a long video. It runs the same ai_recipes_bridge.py (installed by deploy_videomaker.py)
as `--name qt-quick --lanes quick`, inside the Hermes container as uid 10000, like qt-ai-recipes-bridge.service.

Both services run the bridge through `docker exec`, and stopping the docker exec client does not stop the process inside the
container: every restart of the main bridge left the old one running (five copies were found on 3 Nov, some 12 days old, taking
tasks with old code). Like the QT Gamer bridges, each service now stops any copy of itself before it starts (ExecStartPre, matched
on its exact command line, so the main and quick bridges never stop each other). pkill sends SIGTERM, which lets the task in hand
finish before the old copy exits, so a restart is safe at any time. The script restarts both bridges, so running it again also
loads new bridge code. Run after deploy_videomaker.py has put the lane-aware bridge in place. `systemctl disable --now
qt-ai-quick-bridge.service` stops the quick bridge; the main bridge still serves the quick lane when it is idle.
"""
import setup

CONTAINER = 'hermes-agent-yril-hermes-agent-1'
SCRIPT = r'''
import pathlib,subprocess,time
C='CONTAINER';PY='/opt/hermes/.venv/bin/python -u ai_recipes_bridge.py'
MAIN=PY;QUICK=PY+' --name qt-quick --lanes quick'
def start_pre(cmdline):return f"ExecStartPre=-/usr/bin/docker exec {C} pkill -f -x '{cmdline}'\n"
drop=pathlib.Path('/etc/systemd/system/qt-ai-recipes-bridge.service.d');drop.mkdir(exist_ok=True)
(drop/'clear-leftovers.conf').write_text('[Service]\n'+start_pre(MAIN));(drop/'clear-leftovers.conf').chmod(0o644)
unit=pathlib.Path('/etc/systemd/system/qt-ai-quick-bridge.service')
unit.write_text(f"""[Unit]
Description=QT quick bridge: swap asks and Snap a dish / My ingredients recipes for the app
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
{start_pre(QUICK)}ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data {C} {QUICK}
Restart=always
RestartSec=15
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
""");unit.chmod(0o644)
subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','qt-ai-quick-bridge.service'],check=True,capture_output=True)
for service in ('qt-ai-recipes-bridge.service','qt-ai-quick-bridge.service'):  # each pre-start clears that bridge's leftover copies
  subprocess.run(['systemctl','restart',service],check=True)
time.sleep(5)
running=subprocess.run(['docker','exec',C,'pgrep','-a','-f','ai_recipes_bridge.py'],capture_output=True,text=True).stdout.split('\n')
running=[line.split(' ',1)[1] for line in running if ' ' in line]
print(*subprocess.run(['systemctl','is-active','qt-ai-recipes-bridge.service','qt-ai-quick-bridge.service'],capture_output=True,text=True).stdout.split())
print('bridges in the container (an old copy stays until its task is done):',len(running));print('\n'.join(running))
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.helper.remote(SCRIPT))
