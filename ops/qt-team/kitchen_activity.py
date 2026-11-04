"""Public chef presence, independent of private prompts and job folders.

Each running operation owns a separate lease. Heartbeats and Linux process identity
prevent abandoned files, PID reuse or concurrent jobs from leaving a chef stuck.
Only the chef and timestamps reach the public feed; telemetry never blocks work.
"""
from contextlib import contextmanager
from functools import wraps
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import uuid

PROFILES = {'qt-manager': 'head', 'qt-explorer': 'scout', 'qt-cooker': 'wok', 'qt-event': 'host',
            'qt-gamer': 'artist', 'qt-videomaker': 'writer', 'qt-fixer': 'fixer',
            'qt-safety': 'safety', 'qt-storyteller': 'storyteller'}
HEARTBEAT_SECONDS = 15
LEASE_SECONDS = 60


def root():
    return Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))


def process_identity(pid):
    """Boot and process start ticks, not just a reusable PID (all workers share a container)."""
    try:
        stat = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        if stat[0] == 'Z':
            return None
        return Path('/proc/sys/kernel/random/boot_id').read_text().strip() + ':' + stat[19]
    except (OSError, IndexError):
        return None


def ping():
    """Coalesced by kitchen_feed.push_latest; no prompts, keys or responses in logs."""
    if (root() / 'kitchen_feed.py').is_file():
        try:
            subprocess.Popen([sys.executable, 'kitchen_feed.py', '--push'], cwd=root(), stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        except OSError:
            pass


@contextmanager
def activity(profile):
    chef = PROFILES.get(profile)
    if not chef:
        yield
        return
    path = root() / 'state/kitchen-active' / (uuid.uuid4().hex + '.json')
    stopped = threading.Event()
    row = {'chef': chef, 'pid': os.getpid(), 'process': process_identity(os.getpid()),
           'startedAt': dt.datetime.now(dt.timezone.utc).isoformat()}

    def refresh():
        try:
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            row['heartbeatAt'] = dt.datetime.now(dt.timezone.utc).isoformat()
            temporary = path.with_suffix('.tmp')
            temporary.write_text(json.dumps(row), encoding='utf-8')
            temporary.replace(path)
        except OSError:
            pass

    def heartbeat():
        while not stopped.wait(HEARTBEAT_SECONDS):
            refresh()
            ping()

    refresh()
    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    ping()
    try:
        yield
    finally:
        stopped.set()
        thread.join(timeout=2)
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
        ping()


def tracked(profile):
    """Wrap the actual operation, inside any capacity gate and outside its error paths."""
    def decorate(function):
        @wraps(function)
        def call(*args, **kwargs):
            role = profile(*args, **kwargs) if callable(profile) else profile
            with activity(role):
                return function(*args, **kwargs)
        return call
    return decorate


def current(now):
    """Earliest live operation per chef. Never inspect member job folders or prompt text."""
    found = {}
    for path in (root() / 'state/kitchen-active').glob('*.json'):
        try:
            row = json.loads(path.read_text(encoding='utf-8'))
            started = dt.datetime.fromisoformat(row['startedAt'])
            heartbeat = dt.datetime.fromisoformat(row['heartbeatAt'])
            valid = (row['chef'] in PROFILES.values() and row.get('process')
                     and row['process'] == process_identity(row['pid'])
                     and 0 <= (now - heartbeat).total_seconds() < LEASE_SECONDS
                     and started <= heartbeat)
        except (OSError, ValueError, KeyError, TypeError):
            continue
        if valid:
            chef = row['chef']
            found[chef] = min(found.get(chef, started), started)
        elif (now - heartbeat).total_seconds() > LEASE_SECONDS * 2:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
    return found
