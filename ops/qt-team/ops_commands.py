"""/health and /restart in the QT Manager chat (owner, 6 Nov 2026), and what the daily summary says about the bots.

The listener runs unprivileged, so a restart is only a request: it leaves one file in state/ops-requests, and a root systemd path unit
on the host (qt-bot-restart.path, bot_ops.py) acts on it and reports back here. No model is involved and the file carries no commands,
only which of the two fixed restarts to run. Only the paired owner reaches this code (telegram_reporter.authorized).
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import secrets
import time

HEALTH = 'state/ops/health.json'
REQUEST = 'state/ops-requests/restart.json'
TOKEN_SECONDS = 600
STALE_SECONDS = 20 * 60     # the watchdog runs every 5 minutes; this long without a report means it stopped
STALE_REQUEST = 5 * 60      # a request still here after this was never picked up, so a new tap replaces it
MODES = {'ops-bots': 'bots', 'ops-full': 'full'}
ICON = {'ok': '✓', 'problem': '✗', 'waiting': '…', 'paused': '–'}


def report(root: Path):
    try:
        data = json.loads((root / HEALTH).read_text())
        return data if isinstance(data, dict) and isinstance(data.get('rows'), list) else None
    except (OSError, ValueError):
        return None


def age_seconds(data: dict, now: float | None = None) -> float:
    try:
        return (now or time.time()) - float(data.get('at'))
    except (TypeError, ValueError):
        return float('inf')


def _line(row: dict) -> str:
    return f"{ICON.get(row.get('status'), '?')} {row.get('name')}" + (f": {row['detail']}" if row.get('detail') else '')


def health_text(root: Path) -> str:
    """The daily work line by line; everything else only when it needs attention, with a count of what is fine."""
    data = report(root)
    if not data:
        return 'QT Manager · Health\nNo health report yet. The watchdog may not be installed, or it stopped.'
    rows = data['rows']
    problems = sum(r.get('status') == 'problem' for r in rows)
    stale = age_seconds(data) > STALE_SECONDS
    head = f"{problems} {'problem' if problems == 1 else 'problems'} found." if problems else 'All bots are working.'
    if stale:
        head = f"I can't confirm the bots are working: the watchdog last checked {int(age_seconds(data) // 60)} minutes ago, so this is old news."
    lines = ['QT Manager · Health', head]
    groups = {}
    for row in rows:
        groups.setdefault(row.get('group') or 'Other', []).append(row)
    for group, members in groups.items():
        fine = [r for r in members if r.get('status') == 'ok']
        shown = members if group == 'Daily work' else [r for r in members if r.get('status') != 'ok']
        if shown:
            lines += ['', group] + [_line(r) for r in shown]
            if group != 'Daily work' and fine:
                lines.append(f'✓ {len(fine)} more fine')
        else:
            lines += ['', f'{group}: all {len(members)} fine']
    return '\n'.join(lines)[:4000]


def restart_menu(state: dict):
    tokens = state.setdefault('opsTokens', {})
    for key in [k for k, v in tokens.items() if v <= time.time()]:
        del tokens[key]
    token = secrets.token_hex(12)
    tokens[token] = time.time() + TOKEN_SECONDS
    text = ('QT Manager · Restart\n'
            'Restart bots: restarts every bot service. Jobs in hand finish first and a running round is not touched.\n'
            'Full restart: also restarts Hermes. Use it when rounds have stopped. A running round is interrupted and resumes from its checkpoint.\n'
            'I report back here when it finishes.')
    return text, [[{'text': 'Restart bots', 'callback_data': 'ops-bots:' + token}],
                  [{'text': 'Full restart', 'callback_data': 'ops-full:' + token}, {'text': 'Cancel', 'callback_data': 'ops-cancel:' + token}]]


def write_request(root: Path, mode: str) -> None:
    path = root / REQUEST
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name('restart.' + secrets.token_hex(6) + '.tmp')
    temp.write_text(json.dumps({'mode': mode, 'at': time.time()}))
    os.replace(temp, path)


def callback(state: dict, root: Path, action: str, token: str):
    """(text, photo, buttons) for a tap on an ops button, as telegram_reporter.enqueue takes them."""
    return reply_text(*_answer(state, root, action, token))


def reply_text(text: str, buttons):
    return text, None, buttons


def _answer(state: dict, root: Path, action: str, token: str):
    if action == 'ops-menu':
        return restart_menu(state)
    if action == 'ops-health':
        return health_text(root), None
    tokens = state.setdefault('opsTokens', {})
    expires = tokens.pop(token, 0)
    if action == 'ops-cancel':
        return 'Cancelled. Nothing was restarted.', []
    if action not in MODES:
        return 'This button is no longer in use.', []
    if expires <= time.time():
        return 'This button expired. Send /restart for a new one.', []
    try:
        waiting = time.time() - (root / REQUEST).stat().st_mtime < STALE_REQUEST
    except OSError:
        waiting = False
    if waiting:
        return 'A restart is already on its way. I report back here when it finishes.', []
    write_request(root, MODES[action])
    return 'Restarting now. I report back here in a minute or two.', []


def check_watchdog(state: dict, root: Path, enqueue, now: dt.datetime) -> None:
    """The reporter watches the watchdog, as the watchdog watches the reporter, so neither can stop in silence. The watchdog's folder only
    exists once it is installed, so a report missing from it is a fault. /restart restarts the watchdog too."""
    data = report(root)
    if data and age_seconds(data, now.timestamp()) <= STALE_SECONDS or (not data and not (root / 'state/ops').is_dir()):
        return
    said = f"Its last check was {int(age_seconds(data, now.timestamp()) // 60)} minutes ago" if data else 'Its report is missing'
    enqueue(state, 'watchdog-stale:' + now.date().isoformat(), 'QT Manager · The bot watchdog stopped\n' + said
            + ', so stuck bots would not be noticed. Send /restart. If this comes again tomorrow, the restart did not bring it back and it needs a person.',
            buttons=[[{'text': 'Restart', 'callback_data': 'ops-menu:open'}]])


def summary_parts(root: Path) -> tuple[list, str]:
    """(needs-you lines, one footer line) for the daily summary."""
    data = report(root)
    if not data:
        return ['Bot health: no report from the watchdog'], ''
    rows = data['rows']
    needs = ['Stuck: ' + str(r.get('name')) + (' (' + str(r['detail']) + ')' if r.get('detail') else '') for r in rows if r.get('status') == 'problem']
    needs += ['Waiting: ' + str(r.get('name')) + (' (' + str(r['detail']) + ')' if r.get('detail') else '') for r in rows if r.get('status') == 'waiting']
    if age_seconds(data) > STALE_SECONDS:
        needs.append('Bot health: the watchdog last reported ' + str(int(age_seconds(data) // 60)) + ' minutes ago')
    working = sum(r.get('status') == 'ok' for r in rows)
    paused = [str(r.get('name')) for r in rows if r.get('status') == 'paused']
    return needs, f'Bot checks passed: {working} of {len(rows)}' + (' · Stopped on purpose: ' + ', '.join(paused) if paused else '')
