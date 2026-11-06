"""The bots' watchdog and their restart, on the host as root (owner, 6 Nov 2026). Installed by deploy_bot_ops.py in /usr/local/lib/qt-ops.

  bot_ops.py watch         every 5 minutes (qt-bot-watch.timer): runs bot_health, restarts a stopped worker, tells the owner what is stuck
  bot_ops.py restart-due   when the chat asked for a restart (qt-bot-restart.path): reads and removes the request, restarts, reports
  bot_ops.py restart MODE  the same by hand, MODE bots or full

It lives outside the bots, needs nothing but the standard library and sends its own Telegram messages, so a stopped reporter, Hermes or
app cannot silence it. The bots' folder is writable by the bots, so everything read from it here is data: parsed, bounded, never run.

Neither job may fail in silence. The watch only publishes its report after alerting, so a watch that crashes goes stale and the reporter
says so (ops_commands.check_watchdog). A restart always ends with a report, whatever went wrong on the way.
"""
from __future__ import annotations

import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parent))  # run with python -I: only this root-owned folder
import bot_health  # noqa: E402

OPS_STATE = Path(os.environ.get('QT_OPS_STATE', '/var/lib/qt-ops'))
REQUEST = 'state/ops-requests/restart.json'
HEALTH_DIR = 'state/ops'
GRACE = {'critical': 8 * 60, 'stall': 15 * 60}        # a problem must last this long, so a deploy or a restart never alerts
REPEAT = {'critical': 6 * 3600, 'stall': 24 * 3600}   # while it lasts, say so again this often
QUIET_HOURS = (23, 8)                                  # SGT; only critical problems wake the owner
HEAL_AFTER = 5 * 60
HEAL_EVERY = 30 * 60
CRASH_WINDOW = 30 * 60                                 # this many automatic restarts this quickly is a crash loop
CRASH_RESTARTS = 3
RESTART_EVERY = 120
REQUEST_MAX_AGE = 15 * 60                              # an old request (the trigger was off, or the server was down) is not acted on
REPLY_WAIT = 30                                        # one listener cycle: its long poll is 20 seconds
OWN_UNITS = ('qt-bot-watch.timer', 'qt-bot-restart.path')
BUTTONS = [[{'text': 'Restart', 'callback_data': 'ops-menu:open'}, {'text': 'Health', 'callback_data': 'ops-health:open'}]]


class Sender:
    """Direct to Telegram with the bots' own pairing; returns False instead of raising, so the caller can try again next tick."""

    def __init__(self, team):
        self.team = Path(team)

    def __call__(self, text: str, buttons=None) -> bool:
        try:
            token = (self.team / 'private/telegram-token').read_text().strip()
            chat = json.loads((self.team / 'private/telegram-chat.json').read_text())['chatId']
            body = {'chat_id': chat, 'text': text[:4000], 'link_preview_options': {'is_disabled': True}}
            if buttons:
                body['reply_markup'] = {'inline_keyboard': buttons}
            request = urllib.request.Request('https://api.telegram.org/bot' + token + '/sendMessage', data=json.dumps(body).encode(),
                                             headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=25) as response:
                return bool(json.loads(response.read(1_000_000)).get('ok'))
        except Exception:  # transport errors come in many types; never log one: a transport URL can carry the token
            return False


def system(run, argv, timeout=30):
    """One system command that cannot stop the job around it: the result, or None when it could not run or timed out."""
    try:
        return run(argv, capture_output=True, text=True, timeout=timeout)
    except (subprocess.SubprocessError, OSError):
        return None


def said(result) -> str:
    return (result.stdout or '').strip() if result else ''


def load_state() -> dict:
    try:
        data = json.loads((OPS_STATE / 'watch.json').read_text())
        if isinstance(data, dict):
            return data
    except (OSError, ValueError):
        pass
    return {}


def save_state(state: dict) -> None:
    OPS_STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = OPS_STATE / 'watch.json.new'
    temp.write_text(json.dumps(state))
    os.replace(temp, OPS_STATE / 'watch.json')


def quiet(now: float) -> bool:
    hour = dt.datetime.fromtimestamp(now, bot_health.SG).hour
    return hour >= QUIET_HOURS[0] or hour < QUIET_HOURS[1]


def publish_report(team: Path, rows: list, now: float) -> None:
    """For /health and the daily summary. The folder is root's, inside the bots' own: refuse anything else that appears at that name."""
    directory = os.open(team / HEALTH_DIR, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        if os.fstat(directory).st_uid != os.getuid():
            raise PermissionError('health folder changed owner')
        name = f'health.{os.getpid()}.new'
        handle = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o644, dir_fd=directory)
        with os.fdopen(handle, 'w') as out:
            json.dump({'at': now, 'rows': rows}, out)
        os.replace(name, 'health.json', src_dir_fd=directory, dst_dir_fd=directory)
    finally:
        os.close(directory)


def flag_crash_loops(rows: list, state: dict, now: float) -> None:
    """A worker that dies seconds after each start can look "active" at every check, and one healthy sample would reset its alert. systemd
    counts its automatic restarts, so the count over the last half hour tells what a single sample cannot."""
    book = state.setdefault('restarts', {})
    for item in rows:
        count = item.get('restarts')
        if count is None:
            continue
        seen = [p for p in book.get(item['id'], []) if now - p[0] <= CRASH_WINDOW and p[1] <= count]  # a lower count: systemd started over
        seen.append([now, count])
        book[item['id']] = seen
        extra = count - seen[0][1]
        if extra >= CRASH_RESTARTS and item['status'] == 'ok':
            item.update(status='problem', severity='critical', detail=f'keeps crashing: {extra} restarts in {bot_health.span(now - seen[0][0])}')


def heal(rows: list, state: dict, now: float, run=subprocess.run) -> list:
    """Restarts a stopped worker by itself: systemd gives up on one that keeps failing, and that must not wait for a person.
    At most once per HEAL_EVERY per unit; the alert still goes out if the restart did not help."""
    done = []
    for item in rows:
        unit = item.get('heal')
        if item['status'] != 'problem' or not unit:
            continue
        since = (state['issues'].get(item['id']) or {}).get('since', now)
        if now - since < HEAL_AFTER or now - state['healed'].get(unit, 0) < HEAL_EVERY:
            continue
        state['healed'][unit] = now
        system(run, ['systemctl', 'reset-failed', unit])
        system(run, ['systemctl', 'restart', '--no-block', unit])
        done.append(item['name'])
    return done


def alerts(rows: list, state: dict, now: float) -> tuple:
    """Updates the issue book. Returns (problems to tell the owner now, problems that cleared). A check that could not look this time says
    nothing about what it reported before: those issues stay, keeping their timers, so a broken check never sends a false "working again"."""
    issues, found = state['issues'], {r['id']: r for r in rows if r['status'] == 'problem'}
    blind = {r.get('check') for r in rows if r.get('blind')}
    tell, cleared = [], []
    for rid, item in found.items():
        entry = issues.setdefault(rid, {'since': now, 'told': 0})
        entry.update(name=item['name'], detail=item['detail'], severity=item['severity'], check=item.get('check'))
        if now - entry['since'] < GRACE.get(item['severity'], GRACE['stall']):
            continue
        if item['severity'] != 'critical' and quiet(now):
            continue
        if now - entry['told'] >= REPEAT.get(item['severity'], REPEAT['stall']):
            tell.append((rid, entry))
    for rid in [r for r in issues if r not in found]:
        if issues[rid].get('check') in blind:
            continue
        if issues[rid].get('told'):
            cleared.append(issues[rid])
        del issues[rid]
    return tell, cleared


def watch(team=bot_health.TEAM, host=None, send=None, now=None, run=subprocess.run) -> dict:
    team = Path(team)
    host = host or bot_health.Host(team)
    send = send or Sender(team)
    now = now if now is not None else time.time()
    state = load_state()
    for name, empty in (('issues', {}), ('healed', {}), ('backNormal', [])):
        state.setdefault(name, empty)
    rows = bot_health.run_checks(host)
    flag_crash_loops(rows, state, now)
    healed = heal(rows, state, now, run)
    tell, cleared = alerts(rows, state, now)
    if tell:
        lines = [f"• {entry['name']}: {entry['detail']}" if entry.get('detail') else f"• {entry['name']}" for _, entry in tell]
        message = 'QT Manager · Something is stuck\n' + '\n'.join(lines) + (('\nRestarted by myself: ' + ', '.join(healed)) if healed else '')
        if send(message, BUTTONS):
            for _, entry in tell:
                entry['told'] = now
    # A stall that cleared at night waits for the morning; the end of a critical alert, which did wake the owner, does not.
    state['backNormal'] += [e['name'] for e in cleared]
    state['backNow'] = state.get('backNow') or any(e.get('severity') == 'critical' for e in cleared)
    if state['backNormal'] and (state['backNow'] or not quiet(now)) \
            and send('QT Manager · Working again\n' + '\n'.join('• ' + name for name in state['backNormal'])):
        state['backNormal'], state['backNow'] = [], False
    save_state(state)
    # Last on purpose: a fresh report means this whole pass worked. A watch that crashes above goes stale and the reporter notices.
    try:
        publish_report(team, rows, now)
    except OSError as exc:
        print(json.dumps({'healthReport': type(exc).__name__}), flush=True)
    summary = {'problems': sum(r['status'] == 'problem' for r in rows), 'told': len(tell), 'cleared': len(cleared), 'healed': healed}
    print(json.dumps(summary), flush=True)
    return summary


def read_request(team: Path):
    """The chat's restart request, removed once read so it runs once and the path unit does not fire again: 'bots', 'full', or None.
    The folder belongs to the bots: anything but a small, recent, regular file with a known mode is thrown away and ignored."""
    path = team / REQUEST
    raw, fresh = b'', False
    try:
        handle = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError:
        handle = None
    if handle is not None:
        try:
            info = os.fstat(handle)
            if stat.S_ISREG(info.st_mode):
                raw, fresh = os.read(handle, 4096), time.time() - info.st_mtime <= REQUEST_MAX_AGE
        finally:
            os.close(handle)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        print(json.dumps({'restartRequest': 'could not be removed'}), flush=True)
    try:
        mode = json.loads(raw).get('mode')
    except (ValueError, AttributeError):
        return None
    return mode if fresh and mode in ('bots', 'full') else None


def round_running(team: Path) -> bool:
    """Whether a coordinator round holds its lock right now."""
    try:
        with (team / 'state/run.lock').open('a+') as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                return True
            fcntl.flock(handle, fcntl.LOCK_UN)
    except OSError:
        pass
    return False


def worker_units() -> list:
    return [name + '.service' for name in bot_health.SERVICES if name != 'qt-telegram-listener']


def enabled(unit: str, run=subprocess.run) -> bool:
    return said(system(run, ['systemctl', 'is-enabled', unit], 20)) in ('enabled', 'static', 'enabled-runtime')


def active(unit: str, run=subprocess.run) -> bool:
    return said(system(run, ['systemctl', 'is-active', unit], 20)) == 'active'


def wait_until(check, seconds: int, sleep=time.sleep) -> bool:
    for _ in range(seconds // 3):
        if check():
            return True
        sleep(3)
    return bool(check())


def restart_hermes(host, run=subprocess.run, sleep=time.sleep) -> tuple:
    """Stops the workers (they run inside the container), restarts it and waits for the daily jobs' scheduler. Returns (restarted, beating)."""
    system(run, ['systemctl', 'stop', *worker_units()], 180)
    proxy = system(run, ['docker', 'restart', '--time', '30', 'hermes-codex-proxy'], 120)
    agent = system(run, ['docker', 'restart', '--time', '30', bot_health.HERMES_CONTAINER], 180)
    started = time.time()

    def beating():
        beat = host.hermes_text(bot_health.TICKER).split()
        return bool(beat) and beat[0].replace('.', '', 1).isdigit() and float(beat[0]) > started
    alive = wait_until(beating, 180, sleep)
    system(run, ['systemctl', 'start', '--no-block', 'hermes-browser-ensure.service'])
    return bool(proxy and agent and proxy.returncode == 0 and agent.returncode == 0), alive


def _listener_at(host) -> float:
    return bot_health.when((host.json('state/telegram/state.json', {}) or {}).get('lastListenerAt')) or 0


def _restart_steps(mode: str, team: Path, host, run, sleep, notes: list) -> tuple:
    """Every step runs through system(), so one that fails is noted or shown by the checks afterwards and the rest still happen."""
    began = time.time()
    running = round_running(team)
    if mode == 'full':
        restarted, alive = restart_hermes(host, run, sleep)
        notes.append('Hermes restarted.' if restarted and alive else
                     "Hermes restarted, but the daily jobs' scheduler isn't beating yet." if restarted else "Hermes couldn't be restarted.")
        if running:
            notes.append('The running round was interrupted; the next one resumes from its checkpoint.')
    elif running:
        notes.append('A round is running; it was left alone.')
    workers = [unit for unit in worker_units() if enabled(unit, run)]
    if workers:
        system(run, ['systemctl', 'reset-failed', *workers])
        system(run, ['systemctl', 'restart', '--no-block', *workers], 60)
    for unit in [name + '.timer' for name in bot_health.TIMERS] + list(OWN_UNITS):
        if enabled(unit, run):
            system(run, ['systemctl', 'restart', unit], 60)
    system(run, ['systemctl', 'reset-failed', 'qt-bot-watch.service'])
    system(run, ['systemctl', 'start', '--no-block', 'qt-kitchen-feed.service'])
    # The listener last, and only once the cycle that carried this request has finished, so its "Restarting now" reply is out and not cut off.
    wait_until(lambda: _listener_at(host) > began, REPLY_WAIT, sleep)
    before = _listener_at(host)
    system(run, ['systemctl', 'restart', 'qt-telegram-listener.service'], 60)
    wait_until(lambda: all(active(unit, run) for unit in workers), 90, sleep)
    answered = wait_until(lambda: _listener_at(host) > before, 60, sleep)
    sleep(15)  # a worker that dies straight after starting shows up here
    return workers, answered


def restart(mode: str, team=bot_health.TEAM, host=None, send=None, run=subprocess.run, sleep=time.sleep) -> dict:
    team = Path(team)
    host = host or bot_health.Host(team)
    send = send or Sender(team)
    state = load_state()
    now = time.time()
    # A Full restart right after an ordinary one is the owner's next step, not a repeat.
    if now - state.get('restartedAt', 0) < RESTART_EVERY and (mode != 'full' or state.get('restartedMode') == 'full'):
        send('QT Manager · The bots were restarted a moment ago. Send /health to see how they are.', BUTTONS)
        return {'skipped': 'too soon'}
    if said(system(run, ['systemctl', 'is-active', 'hermes-autoupdate.service'], 20)) == 'activating':
        send('QT Manager · Hermes is updating itself, so nothing was restarted. Try /restart again in a few minutes.', BUTTONS)
        return {'skipped': 'hermes update'}
    state.update(restartedAt=now, restartedMode=mode)
    save_state(state)
    notes, workers, answered, problems = [], [], False, []
    try:
        workers, answered = _restart_steps(mode, team, host, run, sleep, notes)
        rows = bot_health.run_checks(host)
        problems = [r for r in rows if r['status'] == 'problem']
        try:
            publish_report(team, rows, time.time())
        except OSError as exc:  # the next watch writes it again; not a failed restart
            print(json.dumps({'healthReport': type(exc).__name__}), flush=True)
    except Exception as exc:  # whatever it was: the workers must not stay stopped, and the owner must hear
        notes.append(f'The restart stopped partway ({type(exc).__name__}). Workers were started again; send /health.')
        system(run, ['systemctl', 'start', '--no-block', *worker_units(), 'qt-telegram-listener.service'], 60)
        workers = workers or [unit for unit in worker_units() if enabled(unit, run)]
    up = sum(1 for unit in workers if active(unit, run))
    lines = ['QT Manager · Restart finished', f'{up} of {len(workers)} workers running.',
             'Telegram buttons are answering.' if answered else "Telegram buttons haven't answered yet.", *notes]
    if problems:
        lines += ['Still a problem:'] + [f"• {r['name']}: {r['detail']}" if r['detail'] else f"• {r['name']}" for r in problems]
        lines += ['A restart cannot fix every one of these; each says what it needs.']
    elif not any('partway' in note for note in notes):
        lines.append('All checks pass.')
    told = send('\n'.join(lines), BUTTONS)
    out = {'mode': mode, 'workers': up, 'of': len(workers), 'answered': answered, 'problems': [r['id'] for r in problems], 'told': told}
    print(json.dumps(out), flush=True)
    return out


def main(argv) -> int:
    action = argv[1] if len(argv) > 1 else ''
    OPS_STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (OPS_STATE / 'ops.lock').open('a+') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | (fcntl.LOCK_NB if action == 'watch' else 0))
        except BlockingIOError:
            return 0  # a restart is running; the next tick checks
        if action == 'watch':
            watch()
        elif action == 'restart-due':
            mode = read_request(Path(bot_health.TEAM))
            if mode:
                restart(mode)
        elif action == 'restart' and len(argv) > 2 and argv[2] in ('bots', 'full'):
            restart(argv[2])
        else:
            print('usage: bot_ops.py watch | restart-due | restart bots|full', file=sys.stderr)
            return 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
