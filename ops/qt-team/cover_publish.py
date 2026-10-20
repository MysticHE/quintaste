"""Publish an owner-approved cover right after the owner's Approve tap (owner, 20 Oct 2026), instead of waiting for the end of
the next full round. The Telegram listener records the request; the reporter tick (every minute, in the container) starts this
script when no round holds the run lock. The script takes the run lock itself, so it never overlaps a round, and runs a
covers-only publication: QT Manager checks the cover, then it goes live. A round that is running publishes approved covers in
its own publish step, and the request is picked up by the first tick after the round ends."""
from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys
import time
from pathlib import Path

try:
    import fcntl
except ImportError:  # local Windows test runs; the VPS is Linux
    fcntl = None

ROOT = Path(os.environ.get('QT_TEAM_ROOT', Path(__file__).resolve().parent))
MAX_ATTEMPTS = 3        # tries per approval that end without a decision (tooling, server); a Manager hold is a decision
RETRY_SECONDS = 300
ROUND_PYTHON = '/opt/hermes/.venv/bin/python'


def requests_file(root):
    return Path(root) / 'state' / 'cover-publish-requests.json'


def _read(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def _write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(data, indent=1), encoding='utf-8')
    os.replace(tmp, path)


def _locked(root):
    """Exclusive lock on the request file (the listener and this script both write it)."""
    (Path(root) / 'state').mkdir(parents=True, exist_ok=True)
    handle = (Path(root) / 'state' / 'cover-publish.lock').open('a+')
    if fcntl:
        fcntl.flock(handle, fcntl.LOCK_EX)
    return handle


def request(root, venue_id):
    """The owner approved a cover for venue_id: publish it as soon as no round is running."""
    with _locked(root):
        path = requests_file(root)
        data = _read(path)
        data[venue_id] = {'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'attempts': 0}
        _write(path, data)


def due(root, at=None):
    at = at or time.time()
    return {v: r for v, r in _read(requests_file(root)).items()
            if r.get('attempts', 0) < MAX_ATTEMPTS and r.get('lastTry', 0) + RETRY_SECONDS <= at}


def run_lock_free(root):
    if not fcntl:
        return True
    with (Path(root) / 'state' / 'run.lock').open('a+') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return False
        fcntl.flock(lock, fcntl.LOCK_UN)
        return True


def maybe_start(root=ROOT):
    """Reporter tick: start a covers-only publication when one is requested and no round is running. Returns True if started."""
    if not due(root) or not run_lock_free(root):
        return False
    python = ROUND_PYTHON if Path(ROUND_PYTHON).is_file() else sys.executable
    with (Path(root) / 'state' / 'cover-publish.log').open('a') as log:
        subprocess.Popen([python, str(Path(root) / 'cover_publish.py')], cwd=root, stdin=subprocess.DEVNULL,
                         stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    return True


def settle(root, result, live):
    """Drop requests whose cover is live or has a Manager decision; count a try for the rest."""
    import cover_photos
    decided = result.get('status') in ('all-held', 'no-eligible-changes')  # QT Manager held it, or nothing is publishable yet
    waiting = {row['venueId'] for row in cover_photos.publishable(root, live)} if live else None
    with _locked(root):
        path = requests_file(root)
        data = _read(path)
        for venue_id, row in list(data.items()):
            if decided or (waiting is not None and venue_id not in waiting):
                del data[venue_id]  # published, held, or not publishable until its place is live (the round handles that)
            elif result.get('status') != 'published' or waiting is None:
                row.update(attempts=row.get('attempts', 0) + 1, lastTry=time.time(), lastStatus=result.get('status'))
        _write(path, data)
    return data


def main():
    sys.path.insert(0, str(ROOT))
    import publisher
    from workflow import read
    with (ROOT / 'state' / 'run.lock').open('a+') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(json.dumps({'at': time.time(), 'status': 'round-active'}), flush=True)
            return
        if not due(ROOT):
            return
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        try:
            result = publisher.run_publication(read(ROOT / 'policy.json'), ROOT / 'runs' / ('covers-' + stamp), covers_only=True)
        except Exception as exc:  # counted as a try; retried after RETRY_SECONDS, at most MAX_ATTEMPTS times
            result = {'status': 'failed', 'error': type(exc).__name__ + ': ' + str(exc)[:300]}
        try:
            live = publisher.request('GET', '/control/state')
        except Exception:
            live = None  # counted as a try
        left = settle(ROOT, result, live)
        print(json.dumps({'at': stamp, 'status': result.get('status'), 'writes': result.get('productionWrites', 0),
                          'error': result.get('error'), 'stillWaiting': sorted(left)}), flush=True)


if __name__ == '__main__':
    main()
