"""Staff alerts (docs/ADMIN_CHEFS_PLAN.md §5): tell the owner on Telegram what waits for a person in admin.

No model runs here and nothing is decided. Admin returns, per queue, a count and the time of the latest arrival (signed
GET /api/bot/attention), and this queues counts with links to admin: never names, report text, photos or ids. Urgent cases go
out at once; everything else at most hourly and not in quiet hours. Without the admin key file this does nothing.
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

from app_signing import ADMIN_ORIGIN as ADMIN
import chef_admin

BATCH_SECONDS = 3600
QUIET_HOURS = (23, 8)  # SGT; the hourly list waits until 8 am, urgent cases never wait
BROKEN_SECONDS = 3600  # admin unreadable this long: say so, once a day

# Queue, singular, plural and the admin section that acts on it, in message order.
QUEUES = [
    ('urgent', 'urgent case', 'urgent cases', 'cases'),
    ('people', 'report about a person', 'reports about people', 'cases'),
    ('market', 'Market report', 'Market reports', 'cases'),
    ('photoChecks', 'Dining photo check', 'Dining photo checks', 'photo-checks'),
    ('teachers', 'class teacher application', 'class teacher applications', 'teachers'),
    ('places', 'place report', 'place reports', 'cases'),
    ('posts', "report on a member's post", "reports on members' posts", 'cases'),
    ('other', 'other case', 'other cases', 'cases'),
    ('overdue', 'case overdue', 'cases overdue', 'cases'),
]
SECTIONS = {'cases': 'Open cases', 'photo-checks': 'Open photo checks', 'teachers': 'Open class teachers'}


def _when(value):
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))


def _newer(latest, seen):
    return bool(latest) and (not seen or _when(latest) > _when(seen))


def fetch(root: Path):
    return chef_admin.call(root, 'alerts', 'GET', '/api/bot/attention', timeout=20)


def queues(data):
    """{queue: (count, latest)} from the admin response; queues admin left out (null) count as empty."""
    flat = dict(data.get('cases') or {}, overdue=data.get('overdue'), photoChecks=data.get('photoChecks'), teachers=data.get('teachers'))
    out = {}
    for name, *_ in QUEUES:
        row = flat.get(name) or {}
        count = row.get('count', 0)
        if not isinstance(count, int) or count < 0:
            raise ValueError('Invalid count for ' + name)
        out[name] = (count, row.get('latest') or None)
    return out


def waiting(counts):
    """The non-empty queues as phrases, e.g. ['2 reports about people', '1 Dining photo check']."""
    return [f"{counts[name]} {one if counts[name] == 1 else many}" for name, one, many, _ in QUEUES if counts.get(name)]


def _buttons(names):
    sections = list(dict.fromkeys(section for name, *_, section in QUEUES if name in names))
    row = [{'text': SECTIONS[s], 'url': ADMIN + '/console/' + s} for s in sections]
    return [row[i:i + 2] for i in range(0, len(row), 2)]


def _quiet(now):
    hour = now.astimezone(dt.timezone(dt.timedelta(hours=8))).hour
    start, end = QUIET_HOURS
    return hour >= start or hour < end


def check(state, root: Path, now=None, read=fetch):
    """Called on every reporter tick; queues at most one urgent message and one waiting list."""
    import telegram_reporter as t
    if not chef_admin.has_key(root, 'alerts'):
        return
    box = state.setdefault('staffAlerts', {'seen': {}})
    now = now or dt.datetime.now(dt.timezone.utc)
    try:
        data = read(root)
        found = queues(data)
    except Exception as exc:  # unreachable, refused or malformed: never mistaken for an empty queue
        box['error'] = type(exc).__name__
        box.setdefault('failingSince', now.isoformat())
        if (now - _when(box['failingSince'])).total_seconds() >= BROKEN_SECONDS:
            t.enqueue(state, 'staff:broken:' + now.astimezone(t.SG).date().isoformat(),
                      "QT Manager · Staff alerts can't read admin since " + t.singapore_time(box['failingSince'])
                      + ". Reports may be waiting.", buttons=[[{'text': 'Open admin', 'url': ADMIN + '/console/overview'}]])
        return
    box.pop('error', None)
    box.pop('failingSince', None)
    seen = box['seen']
    box['counts'] = {name: count for name, (count, _) in found.items()}
    box['chefs'] = data.get('chefs') if isinstance(data.get('chefs'), dict) else None
    count, latest = found['urgent']
    # A new urgent case, or more of them than before (an older case raised to critical keeps its old created time).
    if count and (_newer(latest, seen.get('urgent')) or count > box.get('urgentCount', 0)):
        t.enqueue(state, 'staff:urgent:' + latest + ':' + str(count), 'QT Manager · Needs you now\n'
                  + f"{count} {'urgent case' if count == 1 else 'urgent cases'} (harm, privacy or critical) in admin.",
                  buttons=_buttons(['urgent']))
        seen['urgent'] = latest
    box['urgentCount'] = count
    fresh = [name for name, (n, last) in found.items() if name != 'urgent' and n and _newer(last, seen.get(name))]
    last_list = box.get('listAt')
    if not fresh or _quiet(now) or (last_list and (now - _when(last_list)).total_seconds() < BATCH_SECONDS):
        return
    t.enqueue(state, 'staff:list:' + now.isoformat(timespec='minutes'), 'QT Manager · Waiting for you in admin\n'
              + '\n'.join('• ' + line for line in waiting(box['counts'])),
              buttons=_buttons([name for name, n in box['counts'].items() if n]))
    box['listAt'] = now.isoformat()
    for name, (_, last) in found.items():
        if _newer(last, seen.get(name)):
            seen[name] = last


def summary_line(state):
    """One line for the daily summary, or '' before staff alerts are set up."""
    import telegram_reporter as t
    box = state.get('staffAlerts')
    if not box:
        return ''
    if box.get('error'):
        return "\nStaff alerts: can't read admin since " + t.singapore_time(box['failingSince']) + '.\n'
    lines = waiting(box.get('counts', {}))
    text = '\nWaiting for you in admin: ' + ' · '.join(lines) + '.\n' if lines else '\nNothing waiting for you in admin.\n'
    chefs = chef_line(box.get('chefs'))
    import chef_work
    failed, stuck = chef_work.failures(t.ROOT), chef_work.stuck_items(t.ROOT)
    broken = ('Chef lanes that failed today: ' + ', '.join(f'{lane} ({n})' for lane, n in sorted(failed.items())) + '.') if failed else ''
    left = ("Items the chefs couldn't decide, left for you in admin: " + ', '.join(f'{lane} ({n})' for lane, n in sorted(stuck.items()))
            + '.') if stuck else ''
    return text + ''.join(line + '\n' for line in (chefs, broken, left) if line)


def chef_line(chefs):
    """What each chef lane did in the last 24 hours, e.g. 'Chefs today: Ingredients 6 done, 1 waiting for you.'"""
    parts = []
    for lane, c in sorted((chefs or {}).items()):
        bits = [f"{c[k]} {label}" for k, label in (('handled', 'done'), ('asked', 'waiting for you'), ('watched', 'watched'),
                                                    ('failed', "couldn't apply")) if isinstance(c.get(k), int) and c[k] > 0]
        if bits:
            parts.append(lane + ' ' + ', '.join(bits))
    return 'Chefs today: ' + '; '.join(parts) + '.' if parts else ''
