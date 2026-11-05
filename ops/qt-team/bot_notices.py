"""Telegram notices from bot processes that do not own the reporter's state (bot_blockers, bot_insight).

A process posts one file per notice in state/bot-notices; the reporter's tick (staff_alerts.check) moves each into its delivery
queue under the notice's key, so a notice posted twice is sent once, and only then removes the file. Buttons may only link to
admin or the app.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re

from app_signing import ADMIN_ORIGIN, ORIGIN

KEY = re.compile(r'[a-z0-9:-]{1,120}')


def folder(root: Path) -> Path:
    return root / 'state' / 'bot-notices'


def post(root: Path, key: str, text: str, buttons=None) -> None:
    """Leaves one notice for the reporter. Raises ValueError for a key or link it would refuse anyway."""
    if not KEY.fullmatch(key):
        raise ValueError('Invalid notice key')
    for row in buttons or []:
        for button in row:
            if not str(button.get('url', '')).startswith((ADMIN_ORIGIN + '/', ORIGIN + '/')):
                raise ValueError('Notice links go to admin or the app only')
    target = folder(root)
    target.mkdir(parents=True, exist_ok=True)
    path = target / (hashlib.sha256(key.encode()).hexdigest()[:32] + '.json')
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps({'key': key, 'text': text[:3500], 'buttons': buttons}), encoding='utf-8')
    os.replace(temp, path)


def drain(state, root: Path, enqueue) -> int:
    """Moves waiting notices into the reporter's queue with enqueue(state, key, text, buttons=...). A file is removed only after
    its notice is queued, so a full queue leaves the rest for the next tick. Returns how many were queued."""
    target, done = folder(root), 0
    for path in sorted(target.glob('*.json')) if target.is_dir() else []:
        try:
            notice = json.loads(path.read_text(encoding='utf-8'))
            key, text = str(notice['key']), str(notice['text'])
        except (OSError, ValueError, KeyError, TypeError):
            path.unlink(missing_ok=True)  # unreadable: never retried forever
            continue
        if not KEY.fullmatch(key):
            path.unlink(missing_ok=True)
            continue
        enqueue(state, 'notice:' + key, text, buttons=notice.get('buttons'))
        path.unlink(missing_ok=True)
        done += 1
    return done
