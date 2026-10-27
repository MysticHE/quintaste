"""Chefs in admin (docs/ADMIN_CHEFS_PLAN.md §12): the bot side on the VPS, in two steps the owner asks for.

  python deploy_chefs.py keys   Go-live step 3, before the admin release. One key per caller (alerts, head and the six chefs),
                                made on the VPS and never shown: admin's copy in /docker/quintaste/admin-secrets (uid 1000, 0400)
                                with its ADMIN_BOT_<CALLER>_KEY_FILE line in admin.env (backed up first), and the bot's copy in
                                qt-team/private (uid 10000, 0600). Keys already there are kept; a bot copy that differs from
                                admin's is replaced with admin's. Admin reads them once the admin release recreates it (step 4).
  python deploy_chefs.py bot    Go-live step 5, after the admin release. Copies the chef files as committed, holding the chef
                                pass's, the coordinator's and the Telegram reporter's locks (waiting at most 45 minutes in all,
                                well inside the SSH limit). It refuses a VPS file this checkout never had (another session's
                                deploy) or one edited by hand, backs up, replaces atomically, then as the hermes user runs the
                                chef tests, an import check and one signed read per caller (admin must accept every key). Any
                                failure puts the old files back. Then it restarts the running services that import these files
                                (Telegram listener, bridges), installs qt-chef-work.timer (one pass at 7 past each hour, the first
                                one started now) and lists missing Hermes profiles. Every lane starts Off in Features, so the
                                timer only reads lane modes until the owner chooses Watch. The report, or the error, is also kept
                                on the VPS, and a dropped connection never stops a copy that has started.
  python deploy_chefs.py diff   Read-only: each VPS copy `bot` would refuse, as a diff against the committed file. After reviewing,
                                `bot --accept name=<sha256 prefix>,...` (as `diff` prints) lets `bot` replace exactly those copies.
  python deploy_chefs.py result The report of the last `bot` run, kept on the VPS (for when the connection dropped).
  python deploy_chefs.py plan   Local only: what `bot` would copy.

Code that runs on the VPS is shipped as the source of the functions below, so the tests (test_deploy_chefs.py) run the same
code against temporary folders. Nothing here prints a key. `systemctl disable --now qt-chef-work.timer` stops the chefs.
Built and tested locally on 27 Oct 2026; not run.
"""
from __future__ import annotations

import argparse
import base64
import difflib
import hashlib
import inspect
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
REPO, REL = HERE.parents[1], 'ops/qt-team'
CONTAINER = 'hermes-agent-yril-hermes-agent-1'
TEAM = '/docker/hermes-agent-yril/data/qt-team'  # /opt/data/qt-team inside the Hermes container
ADMIN_SECRETS, ADMIN_ENV, BACKUPS = '/docker/quintaste/admin-secrets', '/docker/quintaste/admin.env', '/docker/quintaste/deployment-backups'
UNIT_DIR = '/etc/systemd/system'
SSH_TIMEOUT = 3600  # the bot step's connection; the locks are waited for at most LOCK_WAIT, leaving time to copy and check
LOCK_WAIT = 2700    # team_locks' default
CALLERS = ('alerts', 'head', 'wok', 'writer', 'artist', 'fixer', 'host', 'safety')  # admin/src/lib/bot.ts
# One signed read per caller proves admin accepts its key; lanes are Off at first, so these return no items. Coco reads place
# reviews, not place reports, whose hand-off holds case details.
READS = {'alerts': 'attention', 'head': 'asks', 'wok': 'ingredients', 'writer': 'wanted', 'artist': 'game-levels', 'fixer': 'reviews',
         'host': 'gatherings', 'safety': 'recalls'}
BOT_FILES = ('chef_admin.py', 'chef_work.py', 'sfa_notice.py', 'hermes_run.py', 'rechecks.py', 'staff_alerts.py', 'app_signing.py',
             'telegram_controls.py', 'telegram_reporter.py', 'workflow.py', 'game_level_bridge.py', 'ai_recipes_bridge.py')
TEST_FILES = ('test_chef_lanes.py', 'test_sfa_notice.py', 'test_coco_resolve.py', 'test_rechecks.py')
ON_VPS = ('kitchen_feed', 'night_window', 'publisher')  # imported by the chef files, deployed by their own scripts
SERVICES = ('qt-telegram-listener.service', 'qt-ai-recipes-bridge.service', 'qt-game-level-bridge.service')
PROFILES = ('qt-manager', 'qt-cooker', 'qt-gamer', 'qt-videomaker', 'qt-fixer', 'qt-safety')
DOCKER = ['docker', 'exec', '--user', '10000', '--workdir', '/opt/data/qt-team', '-e', 'HERMES_HOME=/opt/data', '-e', 'HERMES_SRC=/opt/hermes',
          CONTAINER, '/opt/hermes/.venv/bin/python']
IMPORTS = ('import chef_work, staff_alerts, telegram_controls, telegram_reporter, workflow, game_level_bridge, ai_recipes_bridge\n'
           'from kitchen_feed import read, taken_back, when\nprint("ok")')
REACH = '''import json, pathlib, sys, urllib.error
import chef_admin
root, out = pathlib.Path('/opt/data/qt-team'), {}
for caller, read in READS:
    try:
        if read == 'attention':
            chef_admin.call(root, 'alerts', 'GET', '/api/bot/attention')
        elif read == 'asks':
            chef_admin.asks(root)
        else:
            chef_admin.lane(root, caller, read)
        out[caller] = 'ok'
    except urllib.error.HTTPError as exc:
        out[caller] = 'HTTP ' + str(exc.code)
    except Exception as exc:
        out[caller] = type(exc).__name__
print(json.dumps(out))
sys.exit(0 if set(out.values()) == {'ok'} else 1)
'''.replace('READS', repr(list(READS.items())))
CHECKS = [('tests', DOCKER + ['-m', 'unittest', *(name[:-3] for name in TEST_FILES)]), ('imports', DOCKER + ['-c', IMPORTS]),
          ('keys', DOCKER + ['-c', REACH])]
PROFILE_CHECK = ('import json\nfrom hermes_cli.profiles import get_profile_dir\n'
                 f'print(json.dumps([p for p in {PROFILES!r} if not get_profile_dir(p).exists()]))')
RESULT = f'''import pathlib
found = sorted(pathlib.Path({TEAM!r}, 'operator-tests').glob('chefs-*.json'))
print(found[-1].read_text() if found else '{{"result": "no deploy_chefs.py bot run yet"}}')
'''
SERVICE = f"""[Unit]
Description=QT chefs: one pass over their admin lanes
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker exec --user 10000 --workdir /opt/data/qt-team -e HERMES_HOME=/opt/data -e HERMES_SRC=/opt/hermes {CONTAINER} /opt/hermes/.venv/bin/python chef_work.py
TimeoutStartSec=3300
"""
TIMER = """[Unit]
Description=QT chefs every hour

[Timer]
OnCalendar=*-*-* *:07:00
RandomizedDelaySec=120
Persistent=true

[Install]
WantedBy=timers.target
"""


def git(repo: Path, *args: str) -> bytes:
    return subprocess.run(['git', *args], cwd=repo, capture_output=True, check=True).stdout


def committed(repo: Path, rel: str, names, versions: int = 200) -> tuple[dict, dict]:
    """The files as committed in HEAD, which is what `bot` copies (a working copy that differs is refused: commit first), and the
    sha256 of every committed version of each, with Unix or Windows line endings: the versions the VPS may hold."""
    payload, known, dirty = {}, {}, []
    for name in names:
        path = rel + '/' + name
        try:
            head = git(repo, 'show', 'HEAD:' + path)
        except subprocess.CalledProcessError:
            raise SystemExit(name + ' is not committed; nothing was sent') from None
        if (repo / path).read_bytes().replace(b'\r\n', b'\n') != head.replace(b'\r\n', b'\n'):
            dirty.append(name)
        payload[name] = head
        hashes = set()
        for commit in git(repo, 'log', '--format=%H', '-n', str(versions), '--', path).decode().split():
            blob = git(repo, 'show', commit + ':' + path).replace(b'\r\n', b'\n')
            hashes |= {hashlib.sha256(blob).hexdigest(), hashlib.sha256(blob.replace(b'\n', b'\r\n')).hexdigest()}
        known[name] = sorted(hashes)
    if dirty:
        raise SystemExit('Not committed: ' + ', '.join(dirty) + '; commit them first, nothing was sent')
    return payload, known


def place_keys(admin_dir, env_file, bot_dir, backup_dir, callers, own=None):
    """Go-live step 3 on the VPS. Returns what happened for each caller, never a key. Checks everything before writing anything,
    and on a failure puts back what it wrote."""
    import os
    import pathlib
    import re
    import secrets
    import shutil
    admin_dir, env_file, bot_dir, backup_dir = map(pathlib.Path, (admin_dir, env_file, bot_dir, backup_dir))
    own = own if own is not None else getattr(os, 'chown', lambda *args: None)

    def write(path, text, mode, uid, gid):  # never leaves a stray copy of a key behind
        tmp = path.with_name(path.name + '.chefs-new')
        try:
            tmp.write_text(text, encoding='utf-8')
            tmp.chmod(mode)
            own(tmp, uid, gid)
            os.replace(tmp, path)
        except BaseException:
            tmp.unlink(missing_ok=True)
            raise

    if not admin_dir.is_dir() or not bot_dir.is_dir():
        raise SystemExit('admin-secrets or qt-team/private is missing; nothing changed')
    original = env_file.read_text(encoding='utf-8')
    wanted = {'ADMIN_BOT_%s_KEY_FILE' % c.upper(): '/run/secrets/quintaste/bot-%s-key' % c for c in callers}
    present = {}
    for line in original.splitlines():
        name, sep, value = line.partition('=')
        if sep and name.strip() in wanted:
            present[name.strip()] = value.strip()
    clash = sorted(n for n, v in present.items() if v != wanted[n])
    if clash:
        raise SystemExit('admin.env names another key file for ' + ', '.join(clash) + '; nothing changed')
    keys = {}
    for c in callers:
        path = admin_dir / ('bot-%s-key' % c)
        if path.exists():
            key = path.read_text(encoding='utf-8').strip()
            if not re.fullmatch(r'\S{48,}', key):  # admin's own rule: 48 characters or more (admin/src/lib/bot.ts)
                raise SystemExit(path.name + ' is not a usable key; nothing changed')
            keys[c] = (key, 'kept')
        else:
            keys[c] = (secrets.token_hex(32), 'created')
    backup_dir.mkdir(parents=True, mode=0o700)
    shutil.copy2(env_file, backup_dir / env_file.name)
    (backup_dir / env_file.name).chmod(0o600)
    made, before, report = [], {}, {}
    try:
        for c, (key, state) in keys.items():
            if state == 'created':
                write(admin_dir / ('bot-%s-key' % c), key + '\n', 0o400, 1000, 1000)
                made.append(admin_dir / ('bot-%s-key' % c))
            bot = bot_dir / ('admin-%s.key' % c)
            old = bot.read_text(encoding='utf-8') if bot.exists() else None
            report[c] = {'admin': state, 'bot': 'kept' if old is not None and old.strip() == key else 'replaced' if old is not None else 'created'}
            if report[c]['bot'] != 'kept':
                before[bot] = old
                write(bot, key + '\n', 0o600, 10000, 10000)
        added = [n for n in wanted if n not in present]
        if added:
            stat = env_file.stat()
            write(env_file, original.rstrip('\n') + '\n' + ''.join('%s=%s\n' % (n, wanted[n]) for n in added), stat.st_mode & 0o777,
                  stat.st_uid, stat.st_gid)
    except BaseException:
        for path in made:
            path.unlink(missing_ok=True)
        for path, old in before.items():
            if old is None:
                path.unlink(missing_ok=True)
            else:
                write(path, old, 0o600, 10000, 10000)
        raise
    owner = any(line.partition('=')[0].strip() == 'ADMIN_OWNER_EMAIL' and line.partition('=')[2].strip() for line in original.splitlines())
    return {'callers': report, 'adminEnv': {'added': added, 'kept': sorted(present)}, 'ownerEmailSet': owner, 'backup': str(backup_dir),
            'next': 'Admin reads the keys when the admin release recreates it (go-live step 4); then run `deploy_chefs.py bot`.'}


def team_locks(team, wait=2700, pause=4, own=None):
    """The chef pass's, the coordinator's and the Telegram reporter's locks, all held (else SystemExit: nothing changed). The
    longest-held comes first, so the reporter is blocked only for the copy itself. All three share one deadline, `wait` seconds
    (LOCK_WAIT), so the wait ends well inside the SSH limit. A lock file made here belongs to the hermes user."""
    import contextlib
    import fcntl
    import os
    import pathlib
    import time
    own = own if own is not None else getattr(os, 'chown', lambda *args: None)
    deadline, stack = time.monotonic() + wait, contextlib.ExitStack()
    for rel in ('state/chefs/work.lock', 'state/run.lock', 'state/telegram/reporter.lock'):
        path = pathlib.Path(team) / rel
        if not path.parent.exists():
            path.parent.mkdir(parents=True)
            own(path.parent, 10000, 10000)
        fresh = not path.exists()
        handle = stack.enter_context(path.open('a+'))
        if fresh:
            own(path, 10000, 10000)
        while True:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    stack.close()
                    raise SystemExit(rel + ' stayed busy; nothing changed') from None
                time.sleep(pause)
    return stack


def sync_bot(team, files, known, callers, checks, run, stamp, lock=None, accept=None):
    """Go-live step 5 on the VPS: copies `files` ({name: bytes}) into qt-team and runs `checks` ([(label, argv)], each must exit 0)
    as the hermes user. Refuses, changing nothing, when a caller has no key, a VPS file is a version this checkout never had or
    was edited by hand, or a file does not compile; after the copy, any failure puts every old file back. `accept` ({name: sha256
    prefix}, from `diff`) lets it replace exactly the VPS copies the owner reviewed."""
    import hashlib
    import json
    import os
    import pathlib
    team = pathlib.Path(team)

    def sha(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    with (lock or team_locks)(team):
        marker = team / 'night-release.json'
        release = json.loads(marker.read_text())
        missing = [c for c in callers if not (team / 'private' / ('admin-%s.key' % c)).exists()]
        if missing:
            raise SystemExit('No key for ' + ', '.join(missing) + ': run `deploy_chefs.py keys` first; nothing changed')
        current = {n: sha(team / n) for n in files if (team / n).exists()}
        reviewed = {n for n, h in current.items() if (accept or {}).get(n) and h.startswith(accept[n])}
        foreign = [n for n, h in current.items() if h not in known[n] and n not in reviewed]
        if foreign:
            raise SystemExit('A version this checkout never had is on the VPS: ' + ', '.join(f'{n} ({current[n][:16]})' for n in foreign)
                             + '; see `deploy_chefs.py diff`, nothing changed')
        edited = [n for n, h in current.items() if n not in reviewed and n in release['hashes'] and h != release['hashes'][n]]
        if edited:
            raise SystemExit('Changed by hand since the last deploy: ' + ', '.join(f'{n} ({current[n][:16]})' for n in edited)
                             + '; see `deploy_chefs.py diff`, nothing changed')
        for name, data in files.items():
            if name.endswith('.py'):
                compile(data, name, 'exec')
        backup = team / 'operator-tests' / ('chefs-' + stamp)
        backup.mkdir(parents=True, mode=0o700)
        created = [n for n in files if not (team / n).exists()]
        for name in files:
            if name not in created:
                (backup / name).write_bytes((team / name).read_bytes())
        (backup / marker.name).write_bytes(marker.read_bytes())
        outputs = {}
        try:
            for name, data in files.items():
                path = team / name
                tmp = path.with_name(path.name + '.chefs-new')
                tmp.write_bytes(data)
                tmp.chmod(0o444)
                os.replace(tmp, path)
            for label, argv in checks:
                done = run(argv, capture_output=True, text=True, timeout=600)
                said = ((done.stdout or '') + (done.stderr or '')).strip()
                if done.returncode:
                    raise RuntimeError(label + ' check failed: ' + said[-600:])
                outputs[label] = said.splitlines()[-1] if said else ''
            release['hashes'].update({name: sha(team / name) for name in files})
            tmp = marker.with_name(marker.name + '.chefs-new')
            tmp.write_text(json.dumps(release, indent=2))
            tmp.chmod(0o444)
            os.replace(tmp, marker)
        except BaseException:
            for name in files:
                path = team / name
                if name in created:
                    path.unlink(missing_ok=True)
                    continue
                tmp = path.with_name(path.name + '.restore')
                tmp.write_bytes((backup / name).read_bytes())
                tmp.chmod(0o444)
                os.replace(tmp, path)
            raise
    return {'files': sorted(files), 'created': created, 'backup': str(backup), 'checks': outputs}


def restart_running(services, run):
    """Restarts the long-running services that import the copied files, when they run here; others are left alone."""
    out = {}
    for name in services:
        active = run(['systemctl', 'is-active', name], capture_output=True, text=True).stdout.strip() == 'active'
        if active:
            run(['systemctl', 'restart', name], check=True, capture_output=True)
        out[name] = 'restarted' if active else 'not running'
    return out


def install_units(unit_dir, service, timer, run):
    """Installs and starts qt-chef-work.timer, then starts one pass without waiting for it: with lanes on Watch or On a pass can
    take most of an hour, and the deploy must not wait on it (with every lane Off it only reads the lane modes)."""
    import pathlib
    units = {'qt-chef-work.service': service, 'qt-chef-work.timer': timer}
    for name, text in units.items():
        path = pathlib.Path(unit_dir) / name
        path.write_text(text)
        path.chmod(0o644)
        run(['systemd-analyze', 'verify', str(path)], check=True, capture_output=True)
    run(['systemctl', 'daemon-reload'], check=True)
    run(['systemctl', 'enable', '--now', 'qt-chef-work.timer'], check=True, capture_output=True)
    run(['systemctl', 'start', '--no-block', 'qt-chef-work.service'], check=True, capture_output=True)
    return run(['systemctl', 'list-timers', 'qt-chef-work.timer', '--no-pager'], capture_output=True, text=True).stdout.strip()


def profiles_missing(run, argv):
    """The Hermes profiles the lanes need that are missing, read from the last line the check printed (Hermes may print notices
    before it); 'not checked' when it can't tell."""
    import json
    done = run(argv, capture_output=True, text=True)
    lines = [line for line in (done.stdout or '').splitlines() if line.strip()]
    try:
        found = json.loads(lines[-1]) if done.returncode == 0 and lines else None
    except ValueError:
        found = None
    return found if isinstance(found, list) else 'not checked'


def deploy_bot(team, files, known, accept, config, run, stamp, lock=None, say=print):
    """Go-live step 5 end to end on the VPS: sync_bot, then the services, the timer and the profile check. The report, or the
    error, is kept in operator-tests/chefs-<stamp>.json (`deploy_chefs.py result` reads the newest) and printed. A dropped SSH
    connection never stops a copy that has started: hang-ups are ignored and a closed output is not an error."""
    import json
    import pathlib
    import signal
    if hasattr(signal, 'SIGHUP'):
        signal.signal(signal.SIGHUP, signal.SIG_IGN)
    report = {'stamp': stamp}
    try:
        report.update(sync_bot(team, files, known, config['callers'], config['checks'], run, stamp, lock=lock, accept=accept))
        report['services'] = restart_running(config['services'], run)
        report['timer'] = install_units(config['unit_dir'], config['service'], config['timer'], run)
        report['missingProfiles'] = profiles_missing(run, config['profiles'])
    except BaseException as exc:
        report['error'] = (type(exc).__name__ + ': ' + str(exc))[:2000]
        raise
    finally:
        out = pathlib.Path(team) / 'operator-tests' / ('chefs-' + stamp + '.json')
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_name(out.name + '.new')
        tmp.write_text(json.dumps(report, indent=1))
        tmp.chmod(0o600)
        tmp.replace(out)
        try:
            say(json.dumps(report, indent=1))
        except BrokenPipeError:
            pass
    return report


def vps_versions(team, names, known):
    """Read-only: each VPS copy `bot` would refuse, a version this checkout never had or one that differs from what the last
    deploy recorded, as {name: {sha256, data (base64)}}. Missing files are left out."""
    import base64
    import hashlib
    import json
    import pathlib
    team = pathlib.Path(team)
    marker = team / 'night-release.json'
    recorded = json.loads(marker.read_text()).get('hashes', {}) if marker.exists() else {}
    out = {}
    for name in names:
        path = team / name
        if not path.exists():
            continue
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if digest not in known[name] or (name in recorded and recorded[name] != digest):
            out[name] = {'sha256': digest, 'data': base64.b64encode(data).decode()}
    return out


def show_diffs(files: dict, vps: dict) -> str:
    """What `bot` would change in each VPS copy it would refuse, as a diff from the VPS copy to the committed file, and the
    --accept that lets `bot` replace exactly those copies once reviewed."""
    if not vps:
        return 'Every VPS copy is a committed version, as last deployed: `bot` can copy without --accept.\n'
    parts = []
    for name, got in sorted(vps.items()):
        theirs = base64.b64decode(got['data']).decode('utf-8', 'replace').replace('\r\n', '\n').splitlines(keepends=True)
        ours = files[name].decode('utf-8', 'replace').replace('\r\n', '\n').splitlines(keepends=True)
        text = ''.join(difflib.unified_diff(theirs, ours, 'vps/' + name, 'HEAD/' + name))
        parts.append(text or f'{name}: the same text (it differs only in line endings or from what the last deploy recorded)\n')
    accept = ','.join(f"{name}={got['sha256'][:16]}" for name, got in sorted(vps.items()))
    return ''.join(parts) + f'\nAfter reviewing, let `bot` replace these VPS copies:\n  python deploy_chefs.py bot --accept {accept}\n'


def parse_accept(text: str) -> dict:
    """`a.py=<sha256 prefix>,b.py=...` as `diff` prints it. Each prefix needs 16+ hex characters, so only the reviewed version is
    replaced: a copy that changed since `diff` is still refused."""
    out = {}
    for part in filter(None, (p.strip() for p in (text or '').split(','))):
        name, sep, prefix = part.partition('=')
        if not sep or name not in BOT_FILES + TEST_FILES or not re.fullmatch(r'[0-9a-f]{16,64}', prefix):
            raise SystemExit(f'Check --accept {part}: use name=<first 16 or more characters of its sha256>, as `diff` prints')
        out[name] = prefix
    return out


def remote_code(functions, call: str) -> str:
    """The script sent to the VPS: these functions' own source, then `call`. They import what they need themselves."""
    return ('from __future__ import annotations\nimport base64, datetime, json, subprocess\n'
            + '\n\n'.join(inspect.getsource(f) for f in functions) + '\n\nstamp = datetime.datetime.now(datetime.timezone.utc)'
            ".strftime('%Y%m%dT%H%M%SZ')\n" + call)


def keys_code() -> str:
    return remote_code([place_keys], f"print(json.dumps(place_keys({ADMIN_SECRETS!r}, {ADMIN_ENV!r}, {TEAM + '/private'!r}, "
                                     f"{BACKUPS!r} + '/chefs-keys-' + stamp, {CALLERS!r})))")


def bot_config() -> dict:
    return {'callers': CALLERS, 'checks': CHECKS, 'services': SERVICES, 'unit_dir': UNIT_DIR, 'service': SERVICE, 'timer': TIMER,
            'profiles': DOCKER + ['-c', PROFILE_CHECK]}


def bot_code(files: dict, known: dict, accept: dict) -> str:
    encoded = {name: base64.b64encode(data).decode() for name, data in files.items()}
    return remote_code([team_locks, sync_bot, restart_running, install_units, profiles_missing, deploy_bot], f'''
files = {{name: base64.b64decode(data) for name, data in {encoded!r}.items()}}
deploy_bot({TEAM!r}, files, {known!r}, {accept!r}, {bot_config()!r}, subprocess.run, stamp)''')


def diff_code(known: dict) -> str:
    return remote_code([vps_versions], f'print(json.dumps(vps_versions({TEAM!r}, {list(known)!r}, {known!r})))')


def plan() -> dict:
    files, known = committed(REPO, REL, BOT_FILES + TEST_FILES)
    return {'files': {name: {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()[:12], 'committedVersions': len(known[name]) // 2}
                      for name, data in files.items()}}


def main(argv=None):
    parser = argparse.ArgumentParser(description='Chefs in admin: the bot side on the VPS')
    parser.add_argument('step', choices=('keys', 'bot', 'diff', 'result', 'plan'))
    parser.add_argument('--accept', default='', help='with bot: name=<sha256 prefix>,... as `diff` prints, after reviewing')
    args = parser.parse_args(argv)
    if args.accept and args.step != 'bot':
        parser.error('--accept goes with the bot step')
    accept = parse_accept(args.accept)
    if args.step == 'plan':
        print(json.dumps(plan(), indent=1))
        return
    import setup
    if args.step == 'keys':
        print(setup.helper.remote(keys_code()))
    elif args.step == 'result':
        print(setup.helper.remote(RESULT))
    elif args.step == 'diff':
        files, known = committed(REPO, REL, BOT_FILES + TEST_FILES)
        print(show_diffs(files, json.loads(setup.helper.remote(diff_code(known)))))
    else:
        files, known = committed(REPO, REL, BOT_FILES + TEST_FILES)
        try:
            print(setup.helper.remote(bot_code(files, known, accept), timeout=SSH_TIMEOUT))
        except subprocess.TimeoutExpired:
            print('The connection timed out, but the VPS carries on with the deploy. In a while, run '
                  '`python deploy_chefs.py result` for what happened; do not start another `bot` before then.')


if __name__ == '__main__':
    main()
