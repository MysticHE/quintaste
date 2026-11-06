"""Stall fix, watchdog and restart (owner, 6 Nov 2026): the bot side on the VPS. Release the app and admin images first: without them the
publisher cannot tell which records wait, so nothing is set aside (it keeps waiting as before, and the watchdog says so).

  python deploy_bot_ops.py check    Read-only: would `bot` accept what is on the VPS?
  python deploy_bot_ops.py bot      Copies the files as committed under deploy_chefs.py's guards (locks, known version, backup, tests with an
                                    empty QT_TEAM_ROOT, rollback on failure), restarts the Telegram listener, installs the watchdog and the
                                    restart trigger in /usr/local/lib/qt-ops, sets the chat's command menu and runs one watchdog pass.
  python deploy_bot_ops.py result   The report of the last `bot` run, kept on the VPS.

Stop the watchdog and the trigger: systemctl disable --now qt-bot-watch.timer qt-bot-restart.path
Restart by hand on the VPS: python3 -I -B /usr/local/lib/qt-ops/bot_ops.py restart bots
"""
from __future__ import annotations

import base64
import json
import subprocess
import sys

import deploy_chefs as chefs

OPS_DIR = '/usr/local/lib/qt-ops'
HOST_FILES = ('bot_ops.py', 'bot_health.py')
TEST_MODULES = ('test_publisher', 'test_workflow', 'test_telegram_reporter', 'test_chef_lanes', 'test_food_bridge')
# The tests ship with the code they check: test_food_bridge was never on the VPS, and an older copy would test the wrong behaviour.
BOT_FILES = ('food_parked.py', 'ops_commands.py', 'publisher.py', 'workflow.py', 'telegram_controls.py', 'telegram_reporter.py',
             *(name + '.py' for name in TEST_MODULES))
SERVICES = ('qt-telegram-listener.service',)
COMMANDS = [{'command': 'health', 'description': 'Is every bot working, and what is stuck'}, {'command': 'restart', 'description': 'Restart the bots'},
            {'command': 'status', 'description': 'Last run and publication'}, {'command': 'latest', 'description': 'Latest publication'},
            {'command': 'coverage', 'description': 'Review coverage'}, {'command': 'holds', 'description': 'Unresolved gaps'},
            {'command': 'learning', 'description': 'Reviewed lessons'}, {'command': 'manage', 'description': 'Delete bot-added recipes and events'},
            {'command': 'help', 'description': 'What QT Manager can do'}]
# One module per process with an empty root: in the live root the tests would start real kitchen pushes (see memory bot-tests-empty-root).
TESTS = ' && '.join(f'QT_TEAM_ROOT="$E" PYTHONDONTWRITEBYTECODE=1 /opt/hermes/.venv/bin/python -m unittest {name}' for name in TEST_MODULES)
CHECKS = [('tests', ['docker', 'exec', '--user', '10000', '--workdir', '/opt/data/qt-team', '-e', 'HERMES_HOME=/opt/data', '-e', 'HERMES_SRC=/opt/hermes', chefs.CONTAINER,
                     'sh', '-c', f'E=$(mktemp -d) && {TESTS}; code=$?; rm -rf "$E"; exit $code']),
          ('imports', chefs.DOCKER + ['-c', 'import food_parked, ops_commands, publisher, workflow, telegram_controls, telegram_reporter\nprint("ok")'])]
UNITS = {
    'qt-bot-watch.service': f"""[Unit]
Description=QT bot watchdog: one check of every bot
After=docker.service network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 -I -B {OPS_DIR}/bot_ops.py watch
TimeoutStartSec=240
""",
    'qt-bot-watch.timer': """[Unit]
Description=QT bot watchdog every 5 minutes

[Timer]
OnCalendar=*:0/5
AccuracySec=30s

[Install]
WantedBy=timers.target
""",
    'qt-bot-restart.service': f"""[Unit]
Description=QT bots: the restart the owner asked for in the QT Manager chat
After=docker.service network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 -I -B {OPS_DIR}/bot_ops.py restart-due
TimeoutStartSec=1500
""",
    'qt-bot-restart.path': f"""[Unit]
Description=QT bots: watches for a restart request from the QT Manager chat

[Path]
PathExists={chefs.TEAM}/state/ops-requests/restart.json
Unit=qt-bot-restart.service

[Install]
WantedBy=multi-user.target
""",
}


def install_ops(team, ops_dir, unit_dir, files, units, commands, run):
    """Root's copies, the two state folders, the units, the chat's command menu and a first watchdog pass. The report folder is root's, so
    the bots can read but not rewrite it; the request folder is theirs, and nothing in it is ever run."""
    import json
    import os
    import pathlib
    import urllib.request
    ops = pathlib.Path(ops_dir)
    ops.mkdir(parents=True, exist_ok=True, mode=0o755)
    os.chown(ops, 0, 0)
    for name, data in files.items():
        compile(data, name, 'exec')
        temp = ops / (name + '.new')
        temp.write_bytes(data)
        temp.chmod(0o644)
        os.chown(temp, 0, 0)
        os.replace(temp, ops / name)
    state = pathlib.Path(team) / 'state'
    report, requests = state / 'ops', state / 'ops-requests'
    report.mkdir(exist_ok=True)
    os.chown(report, 0, 0)
    report.chmod(0o755)
    requests.mkdir(exist_ok=True)
    os.chown(requests, 10000, 10000)
    requests.chmod(0o700)
    for name, text in units.items():
        path = pathlib.Path(unit_dir) / name
        path.write_text(text)
        path.chmod(0o644)
    run(['systemd-analyze', 'verify', *[str(pathlib.Path(unit_dir) / name) for name in units]], check=True, capture_output=True)
    run(['systemctl', 'daemon-reload'], check=True)
    run(['systemctl', 'enable', '--now', 'qt-bot-restart.path', 'qt-bot-watch.timer'], check=True, capture_output=True)
    first = run(['/usr/bin/python3', '-I', '-B', str(ops / 'bot_ops.py'), 'watch'], capture_output=True, text=True, timeout=240)
    token = (pathlib.Path(team) / 'private/telegram-token').read_text().strip()
    request = urllib.request.Request('https://api.telegram.org/bot' + token + '/setMyCommands', data=json.dumps({'commands': commands}).encode(),
                                     headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            menu = bool(json.loads(response.read(100000)).get('ok'))
    except OSError:
        menu = False  # never log the exception: its URL carries the token
    return {'firstWatch': (first.stdout or first.stderr).strip()[-300:], 'commandMenu': menu,
            'timer': run(['systemctl', 'is-active', 'qt-bot-watch.timer'], capture_output=True, text=True).stdout.strip(),
            'trigger': run(['systemctl', 'is-active', 'qt-bot-restart.path'], capture_output=True, text=True).stdout.strip()}


def deploy(team, files, known, host_files, config, run, stamp):
    import json
    import pathlib
    import signal
    signal.signal(signal.SIGHUP, signal.SIG_IGN)
    report = {'stamp': stamp}
    try:
        report.update(sync_bot(team, files, known, config['callers'], config['checks'], run, stamp))
        report['services'] = restart_running(config['services'], run)
        report['ops'] = install_ops(team, config['ops_dir'], config['unit_dir'], host_files, config['units'], config['commands'], run)
    except BaseException as exc:
        report['error'] = (type(exc).__name__ + ': ' + str(exc))[:2000]
        raise
    finally:
        out = pathlib.Path(team) / 'operator-tests' / ('bot-ops-' + stamp + '.json')
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=1))
        out.chmod(0o600)
        try:
            print(json.dumps(report, indent=1))
        except BrokenPipeError:
            pass
    return report


def bot_code(files, known, host_files) -> str:
    encoded = {name: base64.b64encode(data).decode() for name, data in files.items()}
    host = {name: base64.b64encode(data).decode() for name, data in host_files.items()}
    config = {'callers': chefs.CALLERS, 'checks': CHECKS, 'services': SERVICES, 'ops_dir': OPS_DIR, 'unit_dir': chefs.UNIT_DIR, 'units': UNITS, 'commands': COMMANDS}
    return chefs.remote_code([chefs.team_locks, chefs.sync_bot, chefs.restart_running, install_ops, deploy], f'''
files = {{name: base64.b64decode(data) for name, data in {encoded!r}.items()}}
host_files = {{name: base64.b64decode(data) for name, data in {host!r}.items()}}
deploy({chefs.TEAM!r}, files, {known!r}, host_files, {config!r}, subprocess.run, stamp)''')


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    step = argv[0] if argv else ''
    if step not in ('check', 'bot', 'result'):
        raise SystemExit('usage: deploy_bot_ops.py check | bot | result')
    import setup
    if step == 'result':
        print(setup.helper.remote(f'''import pathlib
found = sorted(pathlib.Path({chefs.TEAM!r}, 'operator-tests').glob('bot-ops-*.json'))
print(found[-1].read_text() if found else 'no run yet')'''))
        return
    files, known = chefs.committed(chefs.REPO, chefs.REL, BOT_FILES)
    host_files, _ = chefs.committed(chefs.REPO, chefs.REL, HOST_FILES)
    if step == 'check':
        found = json.loads(setup.helper.remote(chefs.remote_code([chefs.vps_versions], f'print(json.dumps(vps_versions({chefs.TEAM!r}, {list(known)!r}, {known!r})))')))
        print(json.dumps({'wouldRefuse': sorted(found)}, indent=1))
        return
    try:
        print(setup.helper.remote(bot_code(files, known, host_files), timeout=chefs.SSH_TIMEOUT))
    except subprocess.TimeoutExpired:
        print('The connection timed out, but the VPS carries on. In a while run `python deploy_bot_ops.py result`; do not start another `bot` before then.')


if __name__ == '__main__':
    main()
