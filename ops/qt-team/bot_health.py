"""What is each QT bot doing, and is anything stuck? (owner, 6 Nov 2026). Read only; bot_ops.py acts on the result.

Rounds that "passed" hid a three-day stall, so these checks look at outcomes: when a bot last finished, last published and whether its
queue moves. Each check returns rows {id, name, group, status, detail, severity, heal}:
  ok        working
  problem   stuck or down: the watchdog alerts the owner (severity critical: at once, also at night; stall: from 8 am)
  waiting   needs the owner's answer; not a fault, and the daily reminder covers it
  paused    stopped on purpose
`heal` names a systemd unit the watchdog may restart by itself. Standard library only: this runs on the host, outside the bots.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request

SG = dt.timezone(dt.timedelta(hours=8))
TEAM = '/docker/hermes-agent-yril/data/qt-team'
HERMES = '/docker/hermes-agent-yril/data'
HERMES_CONTAINER = 'hermes-agent-yril-hermes-agent-1'
DB_CONTAINER = 'quintaste-staging-db-1'
APP_HEALTH = 'https://quintaste.srv1902914.hstgr.cloud/healthz'
ROUNDS_JOB, REPORTER_JOB = '1d0f99df35ff', '18ae508e503a'
TICKER = 'profiles/qt-manager/cron/ticker_heartbeat'  # each profile has its own gateway; the daily jobs run under qt-manager's

SERVICES = {
    'qt-food-review': 'Mint and Kaya (food checks)', 'qt-explore-quick': 'Coco (Explore reports)', 'qt-explore-research': 'Pandan (place corrections)',
    'qt-explore-notify': 'Explore receipts', 'qt-ai-recipes-bridge': 'Peach (AI recipes)', 'qt-ai-quick-bridge': 'Peach (Snap and swaps)',
    'qt-game-level-bridge': 'Taro (game levels)', 'qt-game-art-bridge': 'Taro (level pictures)', 'qt-recipe-drawings': 'Taro (step drawings)',
    'qt-browser-guard': 'Browser guard', 'qt-telegram-listener': 'Telegram commands',
}
TIMERS = {'qt-chef-work': ('Chef lanes', 3 * 3600), 'qt-kitchen-feed': ('Mochi Kitchen feed', 1800), 'qt-bot-insight': ('Kaya diagnoses', 3600)}
CONTAINERS = {HERMES_CONTAINER: 'Hermes', 'hermes-codex-proxy': 'ChatGPT proxy', 'quintaste-staging-app-1': 'App',
              'quintaste-staging-admin-1': 'Admin', DB_CONTAINER: 'Database'}
# Label, table, unfinished states, "work is due now" column or None, minutes before unfinished work counts as stuck, its start time.
QUEUES = [
    ('Food checks', 'ops.food_review', "state IN ('queued','working')", 'due_at', 60, 'created_at'),
    ('Explore reports', 'ops.explore_work', "state IN ('queued','working')", 'due_at', 180, 'created_at'),
    ('AI recipes', 'recipes.ai_job', "status IN ('queued','working')", None, 60, 'created_at'),
    ('AI recipe tasks', 'recipes.ai_bot_task', "status IN ('queued','claimed')", None, 60, 'created_at'),
    ('Recipe drawings', 'recipes.ai_drawing', "status IN ('queued','claimed')", None, 240, 'created_at'),
    ('Swap answers', 'recipes.swap_ai', "status IN ('queued','claimed')", None, 30, 'created_at'),
    ('Game levels', 'game.level_job', "status IN ('queued','claimed')", None, 360, 'created_at'),
    ('Game pictures', 'game.art_job', "status IN ('queued','claimed')", None, 720, 'created_at'),
    ('Library gaps', 'recipes.library_gap', "status IN ('queued','claimed')", None, 720, 'queued_at'),
]
ROUND_LIMIT = 3 * 3600          # a round can run long (model calls are only stopped after an hour), but never this long
BATCH_LIMIT = 3 * 3600          # a pending batch is sent every round; the publisher parks what waits on an answer
PUBLISH_LIMIT = 48 * 3600
RECIPE_LIMIT = 36 * 3600        # the Cooker's target is daily
TICK_LIMIT = 10 * 60            # Hermes ticks and the Telegram reporter run every minute
LISTENER_LIMIT = 3 * 60         # the listener polls every 20 seconds
DELIVERY_LIMIT = 30 * 60
NOTICE_LIMIT = 2 * 3600         # the reporter retries a failed notice for an hour, then falls back to words
FREE_BYTES = 5 * 1024 ** 3      # the app refuses to publish under 2 GB


def row(rid, name, group, status='ok', detail='', severity='stall', heal=None, blind=False):
    """`blind`: this check could not look this time, so what it reported before is unknown, not fixed."""
    return {'id': rid, 'name': name, 'group': group, 'status': status, 'detail': detail, 'severity': severity, 'heal': heal, 'blind': blind}


def when(value):
    """Seconds since the epoch from an ISO time or a number; None when unreadable."""
    if isinstance(value, (int, float)):
        return float(value)
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        return None
    return (parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)).timestamp()


def span(seconds) -> str:
    seconds = max(0, int(seconds))
    if seconds >= 2 * 86400:
        return f'{seconds // 86400} days'
    if seconds >= 3600:
        return f'{seconds // 3600}h'
    return f'{seconds // 60}m'


class Host:
    """The real machine. Tests pass their own object with the same methods."""

    def __init__(self, team=TEAM, hermes=HERMES):
        self.team, self.hermes = Path(team), Path(hermes)

    def now(self):
        return time.time()

    def json(self, rel, default=None):
        try:
            return json.loads((self.team / rel).read_text())
        except (OSError, ValueError):
            return default

    def exists(self, rel):
        return (self.team / rel).exists()

    def mtime(self, rel):
        try:
            return (self.team / rel).stat().st_mtime
        except OSError:
            return None

    def glob(self, rel, pattern):
        folder = self.team / rel
        return sorted(folder.glob(pattern)) if folder.is_dir() else []

    def hermes_text(self, rel):
        try:
            return (self.hermes / rel).read_text()
        except OSError:
            return ''

    def hermes_json(self, rel, default=None):
        try:
            return json.loads((self.hermes / rel).read_text())
        except (OSError, ValueError):
            return default

    def unit(self, name):
        done = subprocess.run(['systemctl', 'show', name, '-p', 'ActiveState,UnitFileState,LastTriggerUSec,Result,LoadState,NRestarts'],
                              capture_output=True, text=True, timeout=20)
        return dict(line.split('=', 1) for line in done.stdout.splitlines() if '=' in line)

    def container(self, name):
        done = subprocess.run(['docker', 'inspect', name, '--format', '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}'],
                              capture_output=True, text=True, timeout=20)
        return done.stdout.strip() if done.returncode == 0 else 'missing|'

    def sql(self, statement):
        """One read-only statement in the app database; its single text result."""
        done = subprocess.run(['docker', 'exec', '-e', 'PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=15000', DB_CONTAINER, 'sh', '-c',
                               'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "$1"', 'sh', statement],
                              capture_output=True, text=True, timeout=40)
        if done.returncode:
            raise RuntimeError('database read failed')
        return done.stdout.strip()

    def http_ok(self, url):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'qt-watchdog'}), timeout=15) as response:
                return response.status == 200
        except Exception:
            return False

    def free_bytes(self):
        return shutil.disk_usage(self.team).free


def check_services(host) -> list:
    rows = []
    for name, label in SERVICES.items():
        unit = host.unit(name + '.service')
        if unit.get('LoadState') != 'loaded' or unit.get('UnitFileState') not in ('enabled', 'static', 'enabled-runtime'):
            rows.append(row(name, label, 'Workers', 'paused', 'turned off'))
        elif unit.get('ActiveState') != 'active':
            rows.append(row(name, label, 'Workers', 'problem', 'not running (' + str(unit.get('ActiveState')) + ')', 'critical', name + '.service'))
        else:
            rows.append(row(name, label, 'Workers'))
        rows[-1]['restarts'] = int(unit.get('NRestarts') or 0)  # bot_ops.flag_crash_loops compares this between checks
    now = host.now()
    for name, (label, limit) in TIMERS.items():
        timer = host.unit(name + '.timer')
        last = timer.get('LastTriggerUSec', '')
        ran = _usec_text(last)
        if timer.get('LoadState') != 'loaded' or timer.get('UnitFileState') != 'enabled':
            rows.append(row(name, label, 'Workers', 'paused', 'turned off'))
        elif timer.get('ActiveState') != 'active':
            rows.append(row(name, label, 'Workers', 'problem', 'its timer stopped', 'stall', name + '.timer'))
        elif ran is not None and now - ran > limit:
            rows.append(row(name, label, 'Workers', 'problem', 'last ran ' + span(now - ran) + ' ago', 'stall', name + '.timer'))
        elif host.unit(name + '.service').get('Result') not in ('success', None):
            rows.append(row(name, label, 'Workers', 'problem', 'its last run failed'))
        else:
            rows.append(row(name, label, 'Workers'))
    trigger = host.unit('qt-bot-restart.path')
    asked = host.mtime('state/ops-requests/restart.json')
    if trigger.get('ActiveState') != 'active':
        rows.append(row('restart-trigger', 'Restart button', 'Workers', 'problem', "it won't start a restart", 'critical', 'qt-bot-restart.path'))
    elif asked is not None and now - asked > 300:
        rows.append(row('restart-trigger', 'Restart button', 'Workers', 'problem', 'a restart request was never picked up', 'critical', 'qt-bot-restart.path'))
    else:
        rows.append(row('restart-trigger', 'Restart button', 'Workers'))
    return rows


def _usec_text(text):
    """systemd's 'Fri 2026-11-06 01:57:00 UTC' as epoch seconds; None for n/a or anything unexpected."""
    parts = str(text).split()
    if len(parts) < 3:
        return None
    try:
        return dt.datetime.strptime(parts[1] + ' ' + parts[2], '%Y-%m-%d %H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp()
    except ValueError:
        return None


def check_hermes(host) -> list:
    """The Hermes ticker and the two scheduled jobs every daily job hangs on."""
    now = host.now()
    rows = []
    beat = host.hermes_text(TICKER).split()
    age = now - float(beat[0]) if beat and beat[0].replace('.', '', 1).isdigit() else None
    if age is None or age > TICK_LIMIT:
        rows.append(row('hermes-ticker', 'Hermes scheduler', 'Daily work', 'problem',
                        'no heartbeat for ' + span(age) if age is not None else 'no heartbeat', 'critical'))
    else:
        rows.append(row('hermes-ticker', 'Hermes scheduler', 'Daily work'))
    jobs = (host.hermes_json('profiles/qt-manager/cron/jobs.json', {}) or {}).get('jobs') or []
    found = {j.get('id'): j for j in jobs if isinstance(j, dict)}
    for job, rid, label in ((ROUNDS_JOB, 'rounds-job', 'Round schedule'), (REPORTER_JOB, 'reporter-job', 'Telegram report schedule')):
        entry = found.get(job)
        if not entry or not entry.get('enabled') or entry.get('state') != 'scheduled':
            rows.append(row(rid, label, 'Daily work', 'problem', 'the schedule is off', 'critical'))
        elif entry.get('last_status') not in ('ok', None):
            rows.append(row(rid, label, 'Daily work', 'problem', 'its last run failed'))
    return rows


def check_rounds(host) -> list:
    now = host.now()
    report = host.json('state/latest-report.json', {}) or {}
    done = when(report.get('completedAt'))
    if done is None or now - done > ROUND_LIMIT:
        return [row('rounds', 'Kaya (rounds)', 'Daily work', 'problem',
                    'no finished round for ' + span(now - done) if done is not None else 'no round report', 'critical')]
    # The same role failing round after round; a single bad round mends itself.
    failed = None
    for path in host.glob('runs', '2*')[-4:]:
        try:
            roles = set(json.loads((path / 'report.json').read_text()).get('failedRoles') or [])
        except (OSError, ValueError):
            continue
        failed = roles if failed is None else failed & roles
    if failed:
        return [row('rounds', 'Kaya (rounds)', 'Daily work', 'problem', ', '.join(sorted(failed)) + ' failed in every recent round')]
    return [row('rounds', 'Kaya (rounds)', 'Daily work', detail='last finished ' + span(now - done) + ' ago')]


def _receipts(host, days=4):
    """Publication receipts of the last days, newest first."""
    now, found = host.now(), []
    for path in host.glob('state/publications', '*.json'):
        try:
            if now - path.stat().st_mtime > days * 86400:
                continue
            receipt = json.loads(path.read_text())
        except (OSError, ValueError):
            continue
        at = when(receipt.get('publishedAt'))
        if at is not None:
            found.append((at, receipt))
    return sorted(found, key=lambda pair: pair[0], reverse=True)


def _publish_row(host, receipts) -> dict:
    now = host.now()
    pending, parked = host.exists('state/pending-publication.json'), len(host.glob('state/food-parked', '*.json'))
    stuck = now - (host.mtime('state/pending-publication.json') or now) if pending else 0
    if pending and stuck > BATCH_LIMIT:
        status = ((host.json('state/latest-report.json', {}) or {}).get('publication') or {}).get('status')
        return row('publisher', 'Publisher', 'Daily work', 'problem', f'one batch stuck for {span(stuck)} ({status})')
    if not receipts:
        last = host.json('state/latest-publication.json', {}) or {}
        at = when(last.get('publishedAt'))
        return row('publisher', 'Publisher', 'Daily work', 'problem', 'nothing published for ' + (span(now - at) if at else 'a long time')
                   + (f'; {parked} waiting on your answer' if parked else ''))
    age = now - receipts[0][0]
    if age > PUBLISH_LIMIT:
        return row('publisher', 'Publisher', 'Daily work', 'problem', 'nothing published for ' + span(age)
                   + (f'; {parked} waiting on your answer' if parked else ''))
    return row('publisher', 'Publisher', 'Daily work', detail='last published ' + span(age) + ' ago')


def _is_new(change) -> bool:
    return isinstance(change, dict) and change.get('kind') == 'recipe' and change.get('created') is True


def _cooldown(checkpoint, role, now):
    """(reason or None, until) when the role is cooling down, else None."""
    entry = (checkpoint.get('roleCooldown') or {}).get(role)
    return (entry.get('reason'), entry.get('until')) if isinstance(entry, dict) and entry.get('until', 0) > now else None


def check_roles(host) -> list:
    now = host.now()
    checkpoint = host.json('state/checkpoint.json', {}) or {}
    policy = host.json('policy.json', {}) or {}
    receipts = _receipts(host)
    rows = [_publish_row(host, receipts)]
    today = dt.datetime.fromtimestamp(now, SG).date()
    # Cooker
    target = policy.get('dailyRecipeTarget')
    new = [(at, c) for at, r in receipts for c in r.get('changes') or [] if _is_new(c)]
    made_today = sum(1 for at, _ in new if dt.datetime.fromtimestamp(at, SG).date() == today)
    cool = _cooldown(checkpoint, 'qt-cooker', now)
    if cool and cool[0]:
        rows.append(row('cooker', 'Mango (recipes)', 'Daily work', 'paused', str(cool[0])[:100]))
    elif cool:
        rows.append(row('cooker', 'Mango (recipes)', 'Daily work', 'problem', 'paused after repeated failures for ' + span(cool[1] - now)))
    elif target == 0:
        rows.append(row('cooker', 'Mango (recipes)', 'Daily work', 'paused', 'daily target is 0'))
    elif not new or now - new[0][0] > RECIPE_LIMIT:
        rows.append(row('cooker', 'Mango (recipes)', 'Daily work', 'problem', 'no new recipe published for '
                        + (span(now - new[0][0]) if new else 'over 4 days') + '; last wrote on ' + str(checkpoint.get('cookDay'))))
    else:
        rows.append(row('cooker', 'Mango (recipes)', 'Daily work', detail=f'{made_today} of {target} today'))
    # Event: rechecks daily in its evening window, so two missed days means something is wrong
    cool = _cooldown(checkpoint, 'qt-event', now)
    checked = str(checkpoint.get('eventCheckDay') or '')
    if cool and cool[0]:
        rows.append(row('event', 'Lychee (events)', 'Daily work', 'paused', str(cool[0])[:100]))
    elif cool:
        rows.append(row('event', 'Lychee (events)', 'Daily work', 'problem', 'paused after repeated failures for ' + span(cool[1] - now)))
    elif not checked or checked < (today - dt.timedelta(days=2)).isoformat():
        rows.append(row('event', 'Lychee (events)', 'Daily work', 'problem', 'last checked events on ' + (checked or 'no record')))
    else:
        rows.append(row('event', 'Lychee (events)', 'Daily work', detail='last checked ' + checked))
    # Explorer (and the Veg, Mixed, cover and menu work that follows it)
    cool = _cooldown(checkpoint, 'qt-explorer', now)
    if cool and cool[0]:
        rows.append(row('explorer', 'Pandan (research)', 'Daily work', 'paused', str(cool[0])[:100]))
    elif cool:
        rows.append(row('explorer', 'Pandan (research)', 'Daily work', 'problem', 'paused after repeated failures for ' + span(cool[1] - now)))
    else:
        rows.append(row('explorer', 'Pandan (research)', 'Daily work'))
    return rows


def check_telegram(host) -> list:
    now = host.now()
    state = host.json('state/telegram/state.json', {}) or {}
    rows = []
    tick, listen = when(state.get('lastTickAt')), when(state.get('lastListenerAt'))
    if tick is None or now - tick > TICK_LIMIT:
        rows.append(row('reporter', 'Telegram reports', 'Telegram', 'problem', 'last ran ' + (span(now - tick) + ' ago' if tick else 'never'), 'critical'))
    else:
        rows.append(row('reporter', 'Telegram reports', 'Telegram'))
    if listen is not None and now - listen > LISTENER_LIMIT:
        rows.append(row('listener', 'Telegram buttons', 'Telegram', 'problem', 'last answered ' + span(now - listen) + ' ago', 'critical', 'qt-telegram-listener.service'))
    else:
        rows.append(row('listener', 'Telegram buttons', 'Telegram'))
    deliveries = state.get('deliveries') or {}
    late = [k for k, v in deliveries.items() if isinstance(v, dict) and v.get('status') == 'pending' and now - (when(v.get('createdAt')) or now) > DELIVERY_LIMIT]
    # A message whose send failed or timed out is never sent twice, so it can only be reported.
    lost = [k for k, v in deliveries.items() if isinstance(v, dict) and v.get('status') not in ('sent', 'pending', 'sending', 'suppressed')
            and now - (when(v.get('createdAt')) or 0) < 86400]
    if late or lost:
        bits = ([f'{len(late)} delayed'] if late else []) + ([f'{len(lost)} may not have reached you'] if lost else [])
        rows.append(row('deliveries', 'Telegram messages', 'Telegram', 'problem', ', '.join(bits)))
    else:
        rows.append(row('deliveries', 'Telegram messages', 'Telegram'))
    # Something went live and the owner was never told: how no event update reached the chat for two weeks after 23 Oct 2026.
    visuals = state.get('visuals') or {}
    # Past the reporter's own 7-day limit (telegram_reporter.NOTICE_EXPIRY): an untold update stays a problem until it has really been told, never just by ageing out.
    untold = [r for at, r in _receipts(host, 8) if now - at > NOTICE_LIMIT and r.get('changes') and not (visuals.get(r.get('revision')) or {}).get('complete')]
    rows.append(row('notices', 'Publication notices', 'Telegram', 'problem', f'{len(untold)} published updates never reached you') if untold
                else row('notices', 'Publication notices', 'Telegram'))
    return rows


def check_owner(host) -> list:
    """Questions waiting for the owner: named here, repeated daily by the reminder; a wait is not a fault."""
    now = host.now()
    rows = []
    try:
        count, oldest = host.sql("SELECT count(*)||'|'||COALESCE(extract(epoch FROM min(d.created_at))::bigint::text,'') FROM ops.chef_decision d WHERE d.outcome='asked' AND "
                                 "(d.lane<>'food-checks' OR EXISTS(SELECT 1 FROM ops.food_review r WHERE r.id::text=d.target AND r.state='asked'))").split('|')
    except (RuntimeError, ValueError, subprocess.SubprocessError):
        return [row('questions', 'Questions for you', 'Your answers', 'problem', "couldn't read them from the database", blind=True)]
    if int(count):
        rows.append(row('questions', 'Questions for you', 'Your answers', 'waiting', f'{count}, oldest {span(now - float(oldest))} ago'))
    else:
        rows.append(row('questions', 'Questions for you', 'Your answers'))
    parked = len(host.glob('state/food-parked', '*.json'))
    if parked:
        rows.append(row('parked', 'Set aside until you answer', 'Your answers', 'waiting', str(parked)))
    return rows


def queue_sql() -> str:
    parts = []
    for _, table, states, due, _, start in QUEUES:
        ready = f' AND {due}<now()' if due else ''
        parts.append(f"(SELECT count(*)||'/'||COALESCE(extract(epoch FROM min({start}))::bigint::text,'') FROM {table} WHERE {states}{ready})")
    return 'SELECT ' + "||','||".join(parts)


def check_queues(host) -> list:
    """Work a worker should have finished: catches a worker that runs but is hung, which no service check can see."""
    now = host.now()
    try:
        cells = host.sql(queue_sql()).split(',')
        if len(cells) != len(QUEUES):
            raise ValueError
    except (RuntimeError, ValueError, subprocess.SubprocessError):
        return [row('queues', 'Job queues', 'Job queues', 'problem', "couldn't read them from the database", blind=True)]
    rows = []
    for (label, table, _, _, limit, _), cell in zip(QUEUES, cells):
        count, _, oldest = cell.partition('/')
        age = now - float(oldest) if oldest else 0
        rid = 'queue-' + table.replace('.', '-')
        if int(count) and age > limit * 60:
            rows.append(row(rid, label, 'Job queues', 'problem', f'{count} waiting, oldest {span(age)}'))
        else:
            rows.append(row(rid, label, 'Job queues'))
    return rows


def check_platform(host) -> list:
    rows = []
    for name, label in CONTAINERS.items():
        status, _, health = host.container(name).partition('|')
        if status != 'running' or health in ('unhealthy',):
            rows.append(row('container-' + name, label, 'Platform', 'problem', status if status != 'running' else health, 'critical'))
        else:
            rows.append(row('container-' + name, label, 'Platform'))
    rows.append(row('app-health', 'App is answering', 'Platform') if host.http_ok(APP_HEALTH)
                else row('app-health', 'App is answering', 'Platform', 'problem', 'its health check fails', 'critical'))
    free = host.free_bytes()
    rows.append(row('disk', 'Disk space', 'Platform', detail=f'{free // 1024 ** 3} GB free') if free >= FREE_BYTES
                else row('disk', 'Disk space', 'Platform', 'problem', f'only {free // 1024 ** 3} GB free', 'critical'))
    return rows


CHECKS = (check_rounds, check_roles, check_hermes, check_services, check_queues, check_owner, check_telegram, check_platform)


def run_checks(host) -> list:
    """Every check, each on its own: one that breaks reports itself as a problem and the rest still run."""
    rows = []
    for check in CHECKS:
        try:
            found = check(host)
        except Exception as exc:
            found = [row(check.__name__, check.__name__.removeprefix('check_').title(), 'Watchdog', 'problem', 'this check broke: ' + type(exc).__name__, blind=True)]
        for item in found:
            item['check'] = check.__name__
        rows += found
    return rows
