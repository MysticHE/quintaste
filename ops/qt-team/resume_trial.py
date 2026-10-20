"""Operator-only recovery of a saved review after a verified container replacement.

No research/Manager inference is repeated. An explicit restart timestamp must
postdate the interrupted image request; its original attempt remains charged.
"""
import argparse
import datetime as dt
import fcntl
import re
import sys

import workflow as w


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--container-restarted-at', required=True)
    parser.add_argument('--resume-preflight-failure', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'\d{8}T\d{6}Z', args.run_id):
        raise ValueError('Invalid run ID')
    restart = dt.datetime.fromisoformat(args.container_restarted_at.replace('Z', '+00:00'))
    if restart.tzinfo is None or restart > dt.datetime.now(dt.timezone.utc):
        raise ValueError('Invalid observed restart timestamp')
    lock = (w.ROOT/'state/run.lock').open('a+')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    folder = w.ROOT/'runs'/args.run_id
    if (folder/'report.json').exists():
        prior_report = w.read(folder/'report.json')
        if not args.resume_preflight_failure or prior_report.get('image', {}).get('status') != 'failed-recovery' or not any('[Errno 17] File exists:' in e.get('error', '') for e in prior_report.get('errors', [])):
            raise RuntimeError('Run already has a final report; refusing duplicate recovery')
        if (folder/'report.preflight-failure.json').exists():
            raise RuntimeError('Preflight recovery already attempted')
        (folder/'report.json').rename(folder/'report.preflight-failure.json')
        (folder/'report.md').rename(folder/'report.preflight-failure.md')
    package = w.read(w.ROOT/'outbox'/f'{args.run_id}.json')
    if package['runId'] != args.run_id or package['publication'] != 'not-published':
        raise ValueError('Saved review package is not recoverable')
    interrupted = []
    if args.resume_preflight_failure:
        for original in (w.ROOT/'images').glob('*/request.interrupted.json'):
            if not any((original.parent/n).exists() for n in ['request.json','result.json','failure.json']) and (original.parent/'interruption.json').exists():
                interrupted.append(w.read(original)['requestHash'])
    for request_path in (w.ROOT/'images').glob('*/request.json'):
        d = request_path.parent
        if (d/'result.json').exists() or (d/'failure.json').exists():
            continue
        request = w.read(request_path)
        if not dt.datetime.fromisoformat(request['requestedAt']) < restart:
            continue
        original = d/'request.interrupted.json'
        if original.exists():
            raise RuntimeError('Interrupted attempt already archived; no repeat retry')
        request_path.rename(original)
        log = d/'worker.log'
        if log.exists():
            log.rename(d/'worker.interrupted.log')
        w.write(d/'interruption.json', {'observedAt': w.now(), 'containerRestartedAt': restart.isoformat(),
                'reason': 'Container replaced after request began; no process or output survived.',
                'originalAttemptStillCharged': True, 'operatorRetry': True})
        interrupted.append(request['requestHash'])
    if not interrupted:
        raise RuntimeError('No image request predates the observed container restart')
    state = w.read(w.ROOT/'state/checkpoint.json')
    state['pendingReview'] = [p for p in state['pendingReview'] if not p.startswith(str(folder) + '/')]
    w.write(w.ROOT/'state/checkpoint.json', state)
    w.write(folder/'recovery.json', {'startedAt': w.now(), 'savedReviewReused': True,
            'researchInvocations': 0, 'interruptedImages': interrupted, 'containerRestartedAt': restart.isoformat()})
    errors = []
    try:
        image = w.recipe_image(package['packets'], package['manager'], w.read(w.ROOT/'policy.json'))
        if image['status'].startswith('failed'):
            errors.append({'role':'image-worker','error':image['status']})
    except Exception as exc:
        image = {'status':'failed-recovery'}
        errors.append({'role':'image-worker','error':str(exc)})
    baseline = w.read(w.ROOT/'baseline.json')
    month = dt.datetime.now(w.SG).strftime('%Y-%m')
    count = sum(dt.datetime.fromisoformat(t).astimezone(w.SG).strftime('%Y-%m') == month for t in state['explorerReviewed'].values())
    report = {'runId':args.run_id, 'completedAt':w.now(), 'trial':True,
        'status':'passed' if not errors else 'partial', 'workerRolesCompleted':[p['role'] for p in package['packets']],
        'recordsChecked':sum(len(p['records']) for p in package['packets']),
        'exploreMonthReviewed':count,'exploreTotal':len(baseline['venues']),
        'manager':package['manager'],'image':image,'errors':errors,
        'googleRequests':0,'productionWrites':0,'publication':'review-outbox','appHealth':w.live_health(),
        'recovery':{'savedReviewReused':True,'additionalResearchInvocations':0,'containerRestartedAt':restart.isoformat()}}
    state.update(lastRunId=args.run_id,lastRunAt=w.now())
    w.write(w.ROOT/'state/checkpoint.json',state)
    w.write(folder/'report.json',report);w.write(w.ROOT/'state/latest-report.json',report)
    text = f"QT Manager — {args.run_id}\nStatus: {report['status']}. Recovered saved review after container replacement.\nResearch was not repeated. Google requests: 0. Production writes: 0.\nImage: {image['status']}.\n"
    (folder/'report.md').write_text(text,encoding='utf-8');print(text)
    if errors:sys.exit(1)


if __name__ == '__main__':
    main()
