"""Explicit operator-only live run (default one hour, at most four); never installed as the nightly cron job."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
import workflow as w


def window(config, at=None):
    stamp = time.time() if at is None else at
    return {'active': config['start'] <= stamp < config['deadline'],
            'research': config['start'] <= stamp < config['researchDeadline'],
            'deadline': config['deadline'], 'researchDeadline': config['researchDeadline'],
            'day': dt.datetime.fromtimestamp(stamp, w.SG).date().isoformat()}


def snapshot():
    from night_window import usage
    from publisher import request
    state = w.read(w.ROOT / 'state/checkpoint.json')
    live = request('GET', '/control/state')
    return {'at': w.now(), 'usage': usage(w.ROOT, w.read(w.ROOT / 'policy.json')),
            'checkpoint': state, 'revision': live['revision'],
            'records': live.get('records', []), 'removals': live.get('removals', []),
            'health': w.live_health(),
            'protectedHashes': {name: hashlib.sha256((w.ROOT / name).read_bytes()).hexdigest()
                                for name in ('policy.json', 'baseline.json', 'workflow.py', 'night_window.py')}}


def notify(test_id, suffix, text):
    import fcntl
    import telegram_reporter as t
    with (t.STATE / 'reporter.lock').open('a+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = t.read(t.STATE / 'state.json', {'offset': 0, 'deliveries': {}})
        t.enqueue(state, test_id + ':' + suffix, text)
        t.write(t.STATE / 'state.json', state)


def kill_tree(process):
    import psutil
    try:
        parent = psutil.Process(process.pid)
        parent.suspend()
        children = parent.children(recursive=True)
        for child in children:
            try: child.suspend()
            except psutil.NoSuchProcess: pass
        for child in reversed(children):
            try: child.kill()
            except psutil.NoSuchProcess: pass
        parent.kill()
    except psutil.NoSuchProcess:
        pass
    process.wait()


def worker(folder):
    import night_window
    config = w.read(folder / 'config.json')
    # Process-local window override; production policy, cron and checkpoints remain intact.
    night_window.limits = lambda at=None: window(config)
    if window(config)['active']:
        w.run(nightly=True)


def supervise(hours=1.0):
    if not 0 < hours <= 4:
        raise SystemExit('Run length must be between 0 and 4 hours')
    import fcntl
    root = w.ROOT / 'operator-tests'
    root.mkdir(exist_ok=True)
    with (root / 'supervisor.lock').open('a+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        start = time.time()
        test_id = 'e2e-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        folder = root / test_id
        folder.mkdir()
        label = f'{hours:g}-hour'
        config = {'id': test_id, 'start': start, 'deadline': start + hours * 3600,
                  'researchDeadline': start + hours * 3600 - 900, 'authorizedBy': f'owner {label} live run request',
                  'pid': os.getpid()}
        w.write(folder / 'config.json', config)
        w.write(root / 'active.json', config)
        before = snapshot()
        w.write(folder / 'before.json', before)
        end_sgt = dt.datetime.fromtimestamp(config['deadline'], w.SG).strftime('%-I:%M %p')
        notify(test_id, 'start', f'QT Manager — {label} live run started\n'
               f'Ends today at {end_sgt} SGT. Explorer, Cooker and Event use saved checkpoints; '
               'Manager checks evidence and photos before publishing. No monthly AI or image caps; '
               'every call is still counted in the usage ledger.')
        rounds = []
        try:
            while time.time() < config['deadline'] - 5:
                # Leave the final four minutes for receipt/health verification, not new inference.
                if time.time() >= config['deadline'] - 260:
                    time.sleep(min(30, max(0, config['deadline'] - 5 - time.time())))
                    continue
                prior = w.read(w.ROOT / 'state/checkpoint.json').get('lastRunId')
                with (folder / f'round-{len(rounds)+1}.log').open('w') as log:
                    process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                                                'worker', str(folder)], stdout=log, stderr=subprocess.STDOUT,
                                               start_new_session=True)
                    timed_out = False
                    try: process.wait(timeout=max(1, config['deadline'] - 10 - time.time()))
                    except subprocess.TimeoutExpired:
                        timed_out = True
                        kill_tree(process)
                report = w.read(w.ROOT / 'state/latest-report.json', {})
                row = {'endedAt': w.now(), 'exitCode': process.returncode, 'timedOut': timed_out,
                       'runId': report.get('runId') if report.get('runId') != prior else None}
                rounds.append(row)
                w.write(folder / 'progress.json', {'status': 'running', 'rounds': rounds})
                if timed_out: break
                time.sleep(min(30, max(0, config['deadline'] - 10 - time.time())))
        finally:
            after = snapshot()
            w.write(folder / 'after.json', after)
            reports = [w.read(w.ROOT / 'runs' / r['runId'] / 'report.json') for r in rounds if r['runId']]
            result = {'id': test_id, 'startedAt': before['at'], 'completedAt': w.now(), 'rounds': rounds,
                      'agentRunsUsed': after['usage']['used'] - before['usage']['used'],
                      'workerRolesCompleted': sorted({role for r in reports for role in r['workerRolesCompleted']}),
                      'recordsChecked': sum(r['recordsChecked'] for r in reports),
                      'recordsPublished': sum(r['productionWrites'] for r in reports),
                      'exploreBefore': len(before['checkpoint']['explorerReviewed']),
                      'exploreAfter': len(after['checkpoint']['explorerReviewed']),
                      'errors': [error for r in reports for error in r['errors']],
                      'protectedUnchanged': before['protectedHashes'] == after['protectedHashes'],
                      'health': after['health'], 'revision': after['revision']}
            result['status'] = 'needs-review' if result['errors'] or any(r['timedOut'] or r['exitCode'] for r in rounds) else 'completed-awaiting-independent-review'
            w.write(folder / 'result.json', result)
            w.write(root / 'latest-result.json', result)
            import menu_coverage
            audit = result['menuAudit'] = menu_coverage.month_totals(w.ROOT)
            w.write(folder / 'result.json', result)
            notify(test_id, 'end', f'QT Manager — {label} live run ended\n'
                   f"Checked {result['recordsChecked']} records; published {result['recordsPublished']} reviewed updates. "
                   f"Menus fully assessed: {audit['assessed']}/174; dishes {audit['verified']} verified, {audit['held']} held, "
                   f"{audit['pending']} not yet checked. AI runs used: {result['agentRunsUsed']}. "
                   f"Reported errors: {len(result['errors'])}. Independent result checks are still required."
                   + __import__('telegram_reporter').menu_digest(before['at']))
            print(json.dumps(result), flush=True)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'worker': worker(Path(sys.argv[2]))
    else: supervise(float(sys.argv[1]) if len(sys.argv) > 1 else 1.0)
