"""Host services for the app bridges that run inside the Hermes container (3 Nov 2026). The one list used by deploy_videomaker.py,
install_quick_bridge.py, install_game_bridge_services.py and deploy_chefs.py.

Each bridge runs through `docker exec`, and stopping the docker exec client leaves the process inside the container running (five old
recipe bridges were found on 3 Nov). So every unit stops its own copy, matched on its exact command line, before it starts and when
it stops. pkill sends SIGTERM, which a bridge takes as "finish the job in hand, then exit" (bridge_stop.py), so restarting is safe at
any time. `install()` builds the script the deploy scripts run as root on the host (setup.helper.remote).
"""
from __future__ import annotations

CONTAINER = 'hermes-agent-yril-hermes-agent-1'
PYTHON = '/opt/hermes/.venv/bin/python -u '
# service: (command after the Python path, description, extra docker exec environment)
BRIDGES = {
    'qt-food-review': ('food_bridge.py', 'QT Mint and Kaya: shared food-content review', ' -e HERMES_SRC=/opt/hermes'),
    'qt-explore-quick': ('explore_bridge.py quick', 'QT Explore: contribution screening', ' -e HERMES_SRC=/opt/hermes'),
    'qt-explore-research': ('explore_bridge.py research', 'QT Explore: reported place corrections', ' -e HERMES_SRC=/opt/hermes'),
    'qt-explore-notify': ('explore_bridge.py notify', 'QT Explore: immediate verified receipts', ' -e HERMES_SRC=/opt/hermes'),
    'qt-ai-recipes-bridge': ('ai_recipes_bridge.py', "QT Videomaker: members' AI recipes for the app", ''),
    'qt-ai-quick-bridge': ('ai_recipes_bridge.py --name qt-quick --lanes quick',
                           'QT quick bridge: swap asks and Snap a dish / My ingredients recipes for the app', ''),
    'qt-game-level-bridge': ('game_level_bridge.py', 'QT Gamer: recipe levels for the app', ' -e HERMES_SRC=/opt/hermes'),
    'qt-game-art-bridge': ('game_art_bridge.py', 'QT Gamer: recipe level pictures for the app', ' -e HERMES_SRC=/opt/hermes'),
}
RECIPES = ('qt-ai-recipes-bridge', 'qt-ai-quick-bridge')
GAME = ('qt-game-level-bridge', 'qt-game-art-bridge')


def unit(service: str) -> str:
    command, description, env = BRIDGES[service]
    stop = f"-/usr/bin/docker exec {CONTAINER} pkill -f -x '{PYTHON}{command}'"
    return f"""[Unit]
Description={description}
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStartPre={stop}
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data{env} {CONTAINER} {PYTHON}{command}
ExecStop={stop}
Restart=always
RestartSec=15
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
"""


_BODY = r'''
import json,pathlib,subprocess
def run(*argv):return subprocess.run(list(argv),capture_output=True,text=True)
for name,item in PLAN.items():
  if run('docker','exec',CONTAINER,'test','-f','/opt/data/qt-team/'+item['script']).returncode:raise SystemExit(item['script']+' is not deployed; nothing changed')
for name,item in PLAN.items():
  path=pathlib.Path('/etc/systemd/system/'+name+'.service');path.write_text(item['unit']);path.chmod(0o644)
  checked=run('systemd-analyze','verify',str(path))
  if checked.returncode:raise SystemExit(name+': '+checked.stderr.strip()[:300])
old=pathlib.Path('/etc/systemd/system/qt-ai-recipes-bridge.service.d/clear-leftovers.conf')  # 3 Nov drop-in; the unit carries it now
if old.exists():old.unlink()
run('systemctl','daemon-reload')
out={}
for name in PLAN:
  if name in ENABLE:run('systemctl','enable',name+'.service')
  enabled=run('systemctl','is-enabled',name+'.service').stdout.strip()=='enabled'
  if name in STOP:act='stop'
  elif name in RESTART and enabled:act='restart'  # a failed service is restarted too
  else:act=None
  done=run('systemctl',act,name+'.service') if act else None
  did='left as it was' if not act else {'stop':'stopped','restart':'restarted'}[act] if not done.returncode else act+' failed: '+done.stderr.strip()[:200]
  out[name]={'did':did,'state':run('systemctl','is-active',name+'.service').stdout.strip()}
print(json.dumps(out))
'''


def install(services, enable=(), restart=None, stop=()) -> str:
    """Root script for the host: writes the units of `services`, enables `enable`, restarts every enabled service in `restart`
    (default: all of them), stops `stop`, and prints what it did to each. Refuses before writing if a bridge file is not deployed."""
    restart = services if restart is None else restart
    plan = {s: {'unit': unit(s), 'script': BRIDGES[s][0].split()[0]} for s in services}
    return (f'PLAN={plan!r}\nENABLE={list(enable)!r}\nRESTART={list(restart)!r}\nSTOP={list(stop)!r}\nCONTAINER={CONTAINER!r}\n'
            + _BODY)
