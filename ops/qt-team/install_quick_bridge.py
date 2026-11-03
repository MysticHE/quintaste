"""Owner request 3 Nov 2026 (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E): a second bridge just for the quick lane, so swap asks and Snap a
dish / My ingredients recipes never wait behind a long video. It runs the same ai_recipes_bridge.py (installed by deploy_videomaker.py)
as `--name qt-quick --lanes quick`, inside the Hermes container as uid 10000, like qt-ai-recipes-bridge.service.

Run after deploy_videomaker.py has put the lane-aware bridge in place. It does not restart the main bridge, which may be writing a
recipe: restart qt-ai-recipes-bridge.service separately once no task is claimed (recipes.ai_bot_task status 'claimed'), so it
loads the new code. `systemctl disable --now qt-ai-quick-bridge.service` stops the quick bridge; the main bridge still serves the
quick lane when it is idle.
"""
import setup

CONTAINER = 'hermes-agent-yril-hermes-agent-1'
UNIT = r'''
import pathlib,subprocess
unit=pathlib.Path('/etc/systemd/system/qt-ai-quick-bridge.service')
unit.write_text("""[Unit]
Description=QT quick bridge: swap asks and Snap a dish / My ingredients recipes for the app
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data CONTAINER /opt/hermes/.venv/bin/python -u ai_recipes_bridge.py --name qt-quick --lanes quick
Restart=always
RestartSec=15
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
""");unit.chmod(0o644)
subprocess.run(['systemd-analyze','verify',str(unit)],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','qt-ai-quick-bridge.service'],check=True,capture_output=True)
print(subprocess.check_output(['systemctl','is-active','qt-ai-quick-bridge.service','qt-ai-recipes-bridge.service'],text=True).strip())
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.helper.remote(UNIT))
