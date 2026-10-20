"""Only enrolled, exact-branch references can enter the image worker. Downloads happen only in cover_photos."""
import datetime as dt
import subprocess
import sys
import time

PROMPT = ('Faithful photographic enhancement of this exact approved venue reference for a mobile gallery, 4:3. '
          'Improve exposure, white balance, natural contrast and composition without changing what is depicted. '
          'Preserve every dish, ingredient, sign, logo, interior, furniture and identifying feature. Do not add food, garnish, people or text. '
          'No fabricated reconstruction of hidden content. Leave breathing room for existing overlaid card text. The source remains attributed under its original licence.')


def enhance_reference(reference, sources, policy):
    """One enhancement attempt for an approved reference; failures retry after 30 minutes, up to 3 attempts."""
    return run_request({'kind': 'venue-enhancement', 'venueId': reference['venueId'], 'referenceSha256': reference['sha256'],
                        'prompt': PROMPT, 'sources': sources}, policy)


def run_request(request, policy):
    """One image_worker run for a request (venue enhancement or place dish illustration), keyed by its digest, with the
    monthly image budget, the round deadline and up to IMAGE_ATTEMPTS tries 30 minutes apart."""
    from workflow import ROOT, read, write, digest, reserve, now, IMAGE_ATTEMPTS, IMAGE_RETRY_SECONDS
    key = digest(request)
    folder = ROOT / 'images' / key
    if (folder / 'result.json').exists():
        return {'status': 'generated-awaiting-visual-review', 'requestHash': key}
    prior = read(folder / 'request.json', None)
    attempts = (prior or {}).get('attempts', 1)
    if prior:
        if attempts >= IMAGE_ATTEMPTS:
            return {'status': 'failed-final', 'requestHash': key}
        if time.time() - dt.datetime.fromisoformat(prior.get('requestedAt', now())).timestamp() < IMAGE_RETRY_SECONDS:
            return {'status': 'retry-waiting', 'requestHash': key}
        attempts += 1
    if policy.get('_deadline') and time.time() > policy['_deadline'] - 1200:
        return {'status': 'deferred-run-time-budget', 'requestHash': key}
    try:
        reserve(policy, 'image')
    except RuntimeError:
        return {'status': 'deferred-monthly-image-budget', 'requestHash': key}
    folder.mkdir(parents=True, exist_ok=True)
    if (folder / 'worker.log').exists():
        (folder / 'worker.log').replace(folder / f'worker.attempt-{attempts - 1}.log')
    write(folder / 'request.json', dict(request, requestHash=key, requestedAt=now(), attempts=attempts))
    with (folder / 'worker.log').open('w') as log:
        process = subprocess.Popen([sys.executable, str(ROOT / 'image_worker.py'), str(folder / 'request.json')],
                                   stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = process.wait(timeout=600)
        except subprocess.TimeoutExpired:
            import os
            import signal
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
            return {'status': 'failed-uncertain-image-timeout', 'requestHash': key, 'attempt': attempts}
    ok = code == 0 and (folder / 'result.json').exists()
    return {'status': 'generated-awaiting-visual-review' if ok else 'failed-image-worker', 'requestHash': key, 'attempt': attempts}


def run_venue_image(packets, decisions, policy):
    from workflow import ROOT, read
    registry = read(ROOT / 'approved-references/registry.json', {'entries': []})
    approved = {r['venueId']: r for r in registry['entries'] if r.get('status') == 'approved'}
    ready = {d['id'] for d in decisions.get('decisions', []) if d['decision'] == 'ready-for-editorial-review'}
    for packet in packets:
        if packet['role'] != 'qt-explorer':
            continue
        for row in packet['records']:
            proposals = [p for p in row.get('proposals', []) if p.get('field') == 'coverEnhancement']
            if row['id'] not in ready or row['status'] != 'proposed' or not proposals:
                continue
            reference = approved.get(row['id'])
            if not reference or proposals[0].get('newValue', {}).get('referenceSha256') != reference['sha256']:
                continue
            outcome = enhance_reference(reference, row['sources'], policy)
            if outcome['status'] in ('retry-waiting', 'failed-final') or (outcome['status'] == 'generated-awaiting-visual-review' and not outcome.get('attempt')):
                continue  # nothing new to do for this venue now; look for other work
            return dict(outcome, venueId=row['id'])
    return {'status': 'no-approved-venue-image-due'}
