"""Owner request 22 Oct 2026 (approved in chat): keep QT Gamer's two app bridges running on the VPS.

Installs qt-game-level-bridge.service and qt-game-art-bridge.service on the host. Each runs its bridge (copied by
deploy_game_bridges.py) inside the Hermes container as uid 10000 and restarts on failure. The app's `game_levels` control still
gates level making; stopping a service (`systemctl disable --now <name>`) stops that bridge.
"""
import setup

CONTAINER = 'hermes-agent-yril-hermes-agent-1'
UNIT = r'''
import pathlib,subprocess
for name,script,desc in [('qt-game-level-bridge','game_level_bridge.py','QT Gamer: recipe levels for the app'),
                         ('qt-game-art-bridge','game_art_bridge.py','QT Gamer: recipe level pictures for the app')]:
 assert subprocess.run(['docker','exec','CONTAINER','test','-f','/opt/data/qt-team/'+script]).returncode==0,script+' is not deployed'
 unit=pathlib.Path('/etc/systemd/system/'+name+'.service')
 unit.write_text(f"""[Unit]
Description={desc}
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data -e HERMES_SRC=/opt/hermes CONTAINER /opt/hermes/.venv/bin/python -u {script}
Restart=always
RestartSec=15
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
""");unit.chmod(0o644)
 subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
for name in ('qt-game-level-bridge','qt-game-art-bridge'):
 subprocess.run(['systemctl','enable','--now',name+'.service'],check=True,capture_output=True)
 print(name,subprocess.check_output(['systemctl','is-active',name+'.service'],text=True).strip())
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.helper.remote(UNIT))
