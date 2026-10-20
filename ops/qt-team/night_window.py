"""Work schedule (owner, 18 Oct 2026): Explorer, Manager review and publication run around the clock in
rolling ~55-minute ticks; Cooker and Event run 6-10 pm Singapore time. Short cron ticks resume checkpoints."""
import datetime as dt
from zoneinfo import ZoneInfo

SG = ZoneInfo('Asia/Singapore')


TICK_SECONDS = 3300          # one supervised tick; the next cron tick resumes from checkpoints
RESEARCH_TAIL = 900          # last 15 minutes of a tick: review and publish only
ROLE_WINDOWS = {'qt-cooker': (18, 22), 'qt-event': (18, 22)}  # SGT [start, end) hours; others always
LAST_START = 15 * 60         # no new Cooker/Event work in the final 15 minutes of their window


def limits(at=None):
    at = (at or dt.datetime.now(SG)).astimezone(SG)
    deadline = at.timestamp() + TICK_SECONDS
    return {'active': True, 'research': True, 'deadline': deadline,
            'researchDeadline': deadline - RESEARCH_TAIL, 'day': at.date().isoformat()}


def role_open(role, at=None):
    """Whether a role may start new research now (Cooker/Event only inside their evening window)."""
    hours = ROLE_WINDOWS.get(role)
    if not hours:
        return True
    at = (at or dt.datetime.now(SG)).astimezone(SG)
    start = at.replace(hour=hours[0], minute=0, second=0, microsecond=0)
    end = at.replace(hour=hours[1], minute=0, second=0, microsecond=0)
    return start <= at and (end - at).total_seconds() >= LAST_START


def usage(root, policy, at=None):
    import json
    month = (at or dt.datetime.now(SG)).astimezone(SG).strftime('%Y-%m')
    file = root / 'state/usage.jsonl'
    rows = [json.loads(line) for line in file.read_text().splitlines()] if file.exists() else []
    used = sum(r.get('month') == month and r.get('kind') in ('model', 'acceptance-model') for r in rows)
    limit = policy.get('monthlyModelInvocations')  # None: no monthly cap (owner, 18 Oct 2026)
    return {'month': month, 'used': used, 'limit': limit,
            'remaining': None if limit is None else max(0, limit - used)}


def main():
    import workflow as w
    window = limits()
    if not window['active']:
        print('QT Manager: schedule inactive; no research started.')
        return
    policy = w.read(w.ROOT / 'policy.json')
    status = usage(w.ROOT, policy)
    if status['remaining'] == 0:
        w.write(w.ROOT / 'state/night-status.json', dict(window, status='monthly-budget-paused', usage=status))
        print('QT Manager: monthly AI allowance exhausted; checkpoints retained.')
        return
    w.run(nightly=True)


if __name__ == '__main__':
    main()
