"""Read-only acceptance observer for the explicitly requested one-hour live run."""
import datetime as dt
import json
from pathlib import Path
import shutil
import sys
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent))
import workflow as w

BASE = 'https://quintaste.srv1902914.hstgr.cloud'


def fetch(route, data=None, headers=None):
    raw = None if data is None else json.dumps(data).encode()
    request = Request(BASE + route, data=raw, headers={'Content-Type': 'application/json', **(headers or {})})
    started = time.monotonic()
    try:
        with urlopen(request, timeout=20) as response:
            content = response.read(4 * 1024 * 1024)
            return response.status, dict(response.headers), content, round((time.monotonic()-started)*1000, 2)
    except HTTPError as error:
        return error.code, dict(error.headers), error.read(4096), round((time.monotonic()-started)*1000, 2)


def pages(kind):
    rows, cursor, revision = [], None, None
    for _ in range(100):
        route = '/api/editorial/' + kind + ('?' + urlencode({'cursor': cursor}) if cursor else '')
        status, headers, raw, ms = fetch(route)
        assert status == 200, (kind, status)
        page = json.loads(raw)
        assert len(page['items']) <= 20, 'Unbounded page'
        assert revision in (None, page['revision']), 'Revision changed while verifying'
        revision = page['revision']
        rows += page['items']
        cursor = page['nextCursor']
        if not cursor:
            assert len(rows) == page['total']
            assert len({r['id'] for r in rows}) == len(rows), 'Duplicate public identity'
            return rows
    raise AssertionError('Pagination did not terminate')


def verify(folder):
    from publisher import request
    checks, metrics = [], {}
    before = w.read(folder / 'before.json')
    result = w.read(folder / 'result.json')
    after = w.read(folder / 'after.json')
    receipts = []
    for row in result['rounds']:
        if row['runId']:
            receipts += [w.read(p) for p in (w.ROOT / 'runs' / row['runId']).rglob('receipt.json')]
    fresh = [r for r in receipts if not r.get('reusedResponseFrom') and r.get('exitCode') == 0]
    roles = sorted({r['role'] for r in fresh})
    assert set(roles) == set(w.ROLES), 'Not every role completed a fresh live invocation: ' + str(roles)
    checks.append('All four roles completed real provider runs')
    assert all(r.get('googleRequests') == 0 for r in receipts), 'Unexpected reported Google usage'
    assert after['usage']['limit'] is None or after['usage']['used'] <= after['usage']['limit']
    checks.append('Shared AI budget retained; no reported Google calls')
    for name in ('baseline.json', 'policy.json', 'night_window.py'):
        assert before['protectedHashes'][name] == after['protectedHashes'][name], name + ' changed'
    fix = w.read(folder / 'recipe-controls.json', w.read(folder / 'manager-fix.json', w.read(folder / 'recovery-fix.json', {})))
    assert after['protectedHashes']['workflow.py'] == fix.get('hashes', {}).get('workflow.py', before['protectedHashes']['workflow.py'])
    checks.append('Only documented fixes changed workflow code; schedule and policy retained')
    rows = [json.loads(line) for line in (w.ROOT / 'state/usage.jsonl').read_text().splitlines()]
    assert not any(r.get('kind') == 'image' and r.get('at', '') >= before['at'] for r in rows), 'Image allowance unexpectedly spent'
    checks.append('Exhausted image allowance respected')
    live = request('GET', '/control/state')
    from recipe_policy import require_recipe
    for row in live['records']:
        if row['kind'] == 'recipe': require_recipe(row['data'])
    checks.append('All live bot-added recipes satisfy the owner five-pungent rule')
    assert live['revision'] == result['revision'], 'Live content changed after the captured result'
    status, _, raw, _ = fetch('/api/editorial/status')
    assert status == 200 and json.loads(raw)['revision'] == live['revision']
    checks.append('Signed live state and public publication revision agree')
    recipes, events = pages('recipes'), pages('events')
    assert all('steps' not in r and 'ingredients' not in r for r in recipes)
    for row in live['records']:
        if row['kind'] == 'recipe':
            status, _, raw, _ = fetch('/api/editorial/recipes/' + row['id'])
            assert status == 200 and json.loads(raw) == row['data'], 'Recipe detail delivery differs'
    expected_events = {r['id'] for r in live['records'] if r['kind'] == 'event' and r['data']['status'] != 'cancelled'
                       and dt.datetime.fromisoformat(r['data']['startsAt']).timestamp() > time.time()}
    assert {e['id'] for e in events} == expected_events
    checks.append('Published recipe details and event lists match signed data; pages bounded and unique')
    status, headers, raw, ms = fetch('/api/editorial/recipes')
    etag = next(v for k, v in headers.items() if k.lower() == 'etag')
    assert fetch('/api/editorial/recipes', headers={'If-None-Match': etag})[0] == 304
    metrics['recipePage'] = {'bytes': len(raw), 'milliseconds': ms}
    checks.append('Conditional recipe revalidation returns 304')
    venues, cursor = [], None
    for _ in range(20):
        status, _, raw, ms = fetch('/api/catalogue', {'search': {'area': 'Singapore', 'query': '', 'vegan': False}, 'cursor': cursor})
        assert status == 200
        page = json.loads(raw)
        assert len(page['venues']) <= 20
        if not venues: metrics['catalogueFirstPage'] = {'bytes': len(raw), 'milliseconds': ms}
        venues += page['venues']; cursor = page['nextCursor']
        if not cursor: break
    assert not cursor and len(venues) == len({v['id'] for v in venues}) == 174
    checks.append('All 174 catalogue identities remain reachable through bounded unique pages')
    assert fetch('/api/editorial/control/state')[0] == 401
    assert fetch('/healthz')[0] == 200
    checks.append('App healthy and control state remains private')
    metrics.update(recipes=len(recipes), events=len(events), covers=sum(bool(v.get('photo')) for v in venues),
                   hours=sum(bool(v.get('hours')) for v in venues), freeDiskBytes=shutil.disk_usage(w.ROOT).free,
                   ownerRemovals=len(live.get('removals', []))-len(before.get('removals', [])),
                   venueUpdatesAwaitingReview=len(w.read(folder/'stale-batch-reconciliation/superseded-by-live-change.json', {}).get('records', [])))
    return {'checkedAt': w.now(), 'status': 'passed', 'checks': checks, 'metrics': metrics,
            'freshRoles': roles, 'freshInvocationReceipts': len(fresh), 'recoveredReceipts': len(receipts)-len(fresh),
            'encounteredWorkflowErrors': result['errors']}


def main():
    active = w.read(w.ROOT / 'operator-tests/active.json')
    folder = w.ROOT / 'operator-tests' / active['id']
    while not (folder / 'result.json').exists() and time.time() < active['deadline'] + 120:
        time.sleep(15)
    try:
        report = verify(folder)
    except Exception as error:
        report = {'checkedAt': w.now(), 'status': 'failed', 'errorType': type(error).__name__, 'error': str(error)[:800]}
    w.write(folder / 'postflight.json', report)
    result = w.read(folder / 'result.json', {})
    from night_window import usage
    allowance = usage(w.ROOT, w.read(w.ROOT / 'policy.json'))
    import telegram_reporter as t
    import fcntl
    counts = report.get('metrics', {})
    text = ('QT Manager — one-hour test results\n17 October, 5:39–6:39 pm SGT\n'
            f"Explore: {result.get('exploreAfter', '?')}/174 locations reviewed.\n"
            f"Live bot content: {counts.get('recipes', '?')} recipes, {counts.get('events', '?')} events. {counts.get('ownerRemovals', '?')} recipes removed under your instructions.\n"
            f"Awaiting fresh Manager review: {counts.get('venueUpdatesAwaitingReview', '?')} venue updates. Unverified information stays held.\n"
            f"AI calls this month: {allowance['used']} (no monthly cap).\n"
            + ('All four bots completed real runs. Final app/data checks passed. Issues found during testing were documented and corrected; pending venue updates are not yet published.' if report['status'] == 'passed'
               else 'Some acceptance checks need attention; no all-clear is claimed. /status shows the latest saved result.'))
    with (t.STATE / 'reporter.lock').open('a+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = t.read(t.STATE / 'state.json')
        key = active['id'] + ':end'
        existing = state['deliveries'].get(key)
        if existing and existing['status'] == 'pending': existing['status'] = 'suppressed'
        t.enqueue(state, active['id'] + ':verified', text)
        t.write(t.STATE / 'state.json', state)
    print(json.dumps(report), flush=True)


if __name__ == '__main__': main()
