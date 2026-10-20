"""Supervised veg options (Mixed Kitchen) pilot (owner, 19 Oct 2026). Operator-run only; never installed as a cron
job, and the 24-hour Hermes schedule is not changed. The regular Round now also works through the queue
(workflow.Round.mixed_kitchen); this entry point stays for supervised batches of never-tried places.

Takes the first N never-tried candidates from state/veg-options/queue.json and, inside the shared run lock, works
through them in rounds bounded by night_window.limits() (about 55 minutes each): Explorer workers of five
candidates, QT Manager review, Manager-reviewed publication and the Telegram digest (sent by the reporter after
each verified publication). Writes state/veg-options/pilot-report.json. Scheduled ticks that find the lock busy
do nothing, so regular Explorer work pauses while the pilot runs.

The Veg Kitchen pilot (run_veg_kitchen_pilot.py) is this same loop with the Veg Kitchen task (4 candidates per worker,
state/veg-kitchen).

    python -X utf8 run_veg_options_pilot.py --places 50 [--hours 4] [--wait-minutes 70]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import night_window
import veg_options as vo
import workflow as w

REVIEW_GROUP = 2      # packets per Manager review call: about ten places
MAX_PUBLISH_CALLS = 6  # each publishes one batch of at most 12 items


class VegRound(w.Round):
    """One supervised round: queue research for a task (Mixed Kitchen by default), then the usual Manager review and
    publication stages."""
    review_batch = REVIEW_GROUP

    def __init__(self, policy, ids, task=vo):
        super().__init__(policy, trial=False, nightly=True)
        self.ids = ids
        self.task = task
        self.published = []

    def run_wave(self, batches, folders, budget):
        if self.task is vo:
            return self.mixed_kitchen_wave(batches, folders, budget)  # the regular Mixed Kitchen path
        return self.explorer_wave(self.task, batches, folders, budget)

    def run_worker(self, batch, folder, budget):
        if self.task is vo:
            return self.mixed_kitchen_worker(batch, folder, budget)
        return self.explorer_worker(self.task, batch, folder, budget)

    def veg_explorer(self):
        task = self.task
        progress = task.progress(w.ROOT)['candidates']
        todo = [c for c in task.queue(w.ROOT) if c['candidateId'] in self.ids
                and progress.get(c['candidateId'], {'status': 'pending'})['status'] == 'pending']
        seq, step = 0, task.PER_WORKER
        while todo:
            budget = self.explorer_budget()
            if not self.research_due('qt-explorer') or budget < w.MIN_EXPLORER_SECONDS:
                break
            workers = self.mixed_parallel_workers()  # policy mixedKitchenParallel (default 4), fewer when disk or memory is low
            chunk, todo = todo[:step * workers], todo[step * workers:]
            batches = [chunk[i:i + step] for i in range(0, len(chunk), step)]
            folders = [self.folder / f'veg-{seq + i}' for i in range(len(batches))]
            seq += len(batches)
            # Shared with the regular Round's stages; 'stop' means the window is closing and these
            # candidates stay pending for the next round.
            if workers == 1:
                result = self.run_worker(batches[0], folders[0], budget)
            else:
                result = self.run_wave(batches, folders, budget)
            if result == 'stop':
                break

    def veg_review(self):
        """Manager reviews pending packets in small groups while the round has time."""
        while any((w.read(Path(p), {}) or {}).get('task') == self.task.TASK for p in self.state.get('pendingReview', [])):
            if time.time() + 600 > self.policy['_deadline']:
                break
            before = list(self.state['pendingReview'])
            self.manager_review_once()  # the pilot loops over small groups itself
            self.task.settle(w.ROOT)
            if self.state['pendingReview'] == before:
                break  # failed or deferred review: retried next round (quarantined after repeated failures)

    def veg_publish(self):
        for _ in range(MAX_PUBLISH_CALLS):
            self.publish()
            result = self.publication
            if result.get('status') == 'published':
                self.published.extend(r for r in result.get('records', []) if r.startswith('place:'))
            if result.get('status') != 'published':
                break

    def stages(self):
        return (self.veg_explorer, self.veg_review, self.veg_publish, self.report)


def usage_now(policy):
    return night_window.usage(w.ROOT, policy)['used']


def acquire(wait_minutes):
    import fcntl  # Linux (VPS) only
    (w.ROOT / 'state').mkdir(parents=True, exist_ok=True)
    lock = (w.ROOT / 'state' / 'run.lock').open('a+')
    deadline = time.time() + wait_minutes * 60
    while True:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return lock
        except BlockingIOError:
            if time.time() >= deadline:
                lock.close()
                raise SystemExit('Run lock stayed busy; pilot not started')
            time.sleep(15)


def pilot(places, hours, wait_minutes, task=vo):
    if not 1 <= places <= 500 or not 0 < hours <= 8:
        raise SystemExit('--places must be 1-500 and --hours 0-8')
    policy = w.read(w.ROOT / 'policy.json')
    if not policy.get('automaticProductionWrites'):
        raise SystemExit('Production writes are disabled in policy.json; pilot not started')
    started, used_before = time.time(), usage_now(policy)
    lock = acquire(wait_minutes)
    report_path = task.folder(w.ROOT) / 'pilot-report.json'
    rounds, published, errors, ids = [], [], [], set()
    try:
        if w.shutil.disk_usage(w.ROOT).free < policy['minimumFreeBytes']:
            raise SystemExit('Insufficient free disk for a recoverable run')
        w.rotate_runs(policy)
        if sum(p.stat().st_size for p in (w.ROOT / 'runs').rglob('*') if p.is_file() and not p.is_symlink()) >= policy.get('maxRunStorageBytes', 536870912):
            raise SystemExit('Research archive capacity reached; operator archive required before further provider calls')
        import publisher
        live = publisher.request('GET', '/control/state')
        task.settle(w.ROOT, live)
        task.skip_main_catalogue(w.ROOT, live)  # already listed in Explore: never added again
        ids = {c['candidateId'] for c in task.due(w.ROOT, places, fresh_only=True)}
        w.write(task.folder(w.ROOT) / 'pilot.json', {'startedAt': w.now(), 'places': places, 'ids': sorted(ids)})
        while time.time() < started + hours * 3600:
            window = night_window.limits()
            run_policy = dict(policy, _deadline=min(window['deadline'], time.time() + policy['runSeconds'], started + hours * 3600),
                              _researchDeadline=min(window['researchDeadline'], started + hours * 3600 - 900))
            tick = VegRound(run_policy, ids, task)
            try:
                tick.prepare()
            except Exception as exc:  # no live app state: nothing is dispatched or published
                errors.append({'error': 'Round not started: ' + str(exc)})
                break
            for stage in tick.stages():
                stage()
            published.extend(tick.published)
            errors.extend(tick.errors)
            rounds.append({'runId': tick.run_id, 'packets': len(tick.packets), 'published': tick.published, 'errors': len(tick.errors)})
            state = task.settle(w.ROOT, publisher.request('GET', '/control/state'))
            # A candidate not yet dispatched has no progress entry: it is still pending work.
            open_work = [cid for cid in ids if state['candidates'].get(cid, {'status': 'pending'}).get('status') in ('pending', 'in-review', 'verified')]
            if not open_work or (not tick.packets and not tick.published and not tick.reviewed.get('decisions')):
                break  # done, or a round made no progress (window, outage or nothing left to send)
    finally:
        lock.close()
        state = task.progress(w.ROOT)
        report = {'startedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(started)), 'completedAt': w.now(),
                  'durationSeconds': round(time.time() - started), 'placesRequested': places,
                  'candidates': sorted(ids), **vo.counts(state, ids),
                  'publishedIds': sorted({r.removeprefix('place:') for r in published}),
                  'aiCallsUsed': usage_now(policy) - used_before, 'rounds': rounds,
                  'errors': [e['error'][:300] for e in errors][-40:]}
        w.write(report_path, report)
        print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--places', type=int, default=50)
    parser.add_argument('--hours', type=float, default=4.0)
    parser.add_argument('--wait-minutes', type=float, default=70.0)
    args = parser.parse_args()
    pilot(args.places, args.hours, args.wait_minutes)
