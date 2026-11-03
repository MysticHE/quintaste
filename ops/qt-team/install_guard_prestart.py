"""3 Nov 2026: qt-browser-guard.service runs browser_guard.py through `docker exec`, and stopping the docker exec client does not
stop the process inside the Hermes container, so a restart would leave the old guard running beside the new one. Like the QT Gamer
bridges, the service now stops any copy of itself before it starts (an ExecStartPre drop-in, matched on its exact command line).
Nothing is restarted now: the step takes effect at the guard's next restart.
"""
import setup

CONTAINER = 'hermes-agent-yril-hermes-agent-1'
SCRIPT = r'''
import pathlib,subprocess
C='CONTAINER';CMD='python /opt/data/qt-team/browser_guard.py'
drop=pathlib.Path('/etc/systemd/system/qt-browser-guard.service.d');drop.mkdir(exist_ok=True)
conf=drop/'clear-leftovers.conf'
conf.write_text(f"[Service]\nExecStartPre=-/usr/bin/docker exec {C} pkill -f -x '{CMD}'\n");conf.chmod(0o644)
subprocess.run(['systemd-analyze','verify','/etc/systemd/system/qt-browser-guard.service'],check=True,capture_output=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
print(subprocess.check_output(['systemctl','show','qt-browser-guard.service','-p','ExecStartPre','--value'],text=True).strip()[:220])
print(subprocess.check_output(['systemctl','is-active','qt-browser-guard.service'],text=True).strip())
'''.replace('CONTAINER', CONTAINER)

if __name__ == '__main__':
    print(setup.helper.remote(SCRIPT))
