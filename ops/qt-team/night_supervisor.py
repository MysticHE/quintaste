"""Fixed cron entry: bound the full worker tree to 05:00 SGT, including tools."""
import os
from pathlib import Path
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
from night_window import limits


def unlimited():
    """Owner, 30 Oct 2026 (policy timeLimits false): no time limit on a round. It then starts in its own session and this script
    returns at once, so neither the deadline below nor Hermes's one-hour script timeout can cut it short (one 2:45 pm round was
    killed mid-publication at 55 minutes). The next tick's round finds the run lock held and leaves the running round alone."""
    import json
    try:
        return json.loads(Path(__file__).with_name('policy.json').read_text()).get('timeLimits') is False
    except (OSError, ValueError):
        return False


def main():
    window = limits()
    if not window['active']:
        print('QT Manager: schedule inactive; no work dispatched.')
        return
    if unlimited():
        path = Path(__file__).parent / 'state' / 'round.log'  # the round's own output, since nothing waits for it here
        log = path.open('w' if path.exists() and path.stat().st_size > 5_000_000 else 'a')
        subprocess.Popen([sys.executable, str(Path(__file__).with_name('night_window.py'))], start_new_session=True,
                         stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
        print('QT Manager: round dispatched without a time limit (a running round keeps the run lock).')
        return
    import psutil
    # Keep below Hermes' one-hour script timeout and leave room for cleanup.
    deadline = min(window['deadline'] - 5, time.time() + 3350)
    if deadline <= time.time(): return
    process = subprocess.Popen([sys.executable, str(Path(__file__).with_name('night_window.py'))], start_new_session=True)
    try:
        process.wait(timeout=max(1, deadline-time.time()))
    except subprocess.TimeoutExpired:
        parent = psutil.Process(process.pid)
        parent.suspend()
        children = parent.children(recursive=True)
        for child in children:
            try: child.suspend()
            except psutil.NoSuchProcess: pass
        for child in reversed(children):
            try: child.kill()
            except psutil.NoSuchProcess: pass
        parent.kill(); process.wait()
        print('QT Manager: work window ended; partial files retained for recovery.')
        return
    if process.returncode: raise SystemExit(process.returncode)


if __name__ == '__main__': main()
