"""Fixed cron entry: bound the full worker tree to 05:00 SGT, including tools."""
import os
from pathlib import Path
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
from night_window import limits


def main():
    window = limits()
    if not window['active']:
        print('QT Manager: schedule inactive; no work dispatched.')
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
