"""Pandan's recheck pass (rechecks.py and its use in workflow.Round): Coco's triaged place reports go first, once each."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import rechecks
import workflow as w

NOW = dt.datetime(2026, 10, 27, 8, 0, tzinfo=dt.timezone.utc)
VENUES = [{'venueId': v, 'name': v.title()} for v in ('green-leaf', 'lotus-house', 'bodhi-deli')]


def write_list(root, rows):
    path = root / rechecks.LIST
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows), encoding='utf-8')


def done(root):
    return json.loads((root / rechecks.DONE).read_text(encoding='utf-8'))


def report(case, place, note='Recheck opening hours: Sunday closing moved to 8 pm.', at='2026-10-27T06:00:00+00:00'):
    return {'case': case, 'place': place, 'note': note, 'at': at}


class RecheckList(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)

    def tearDown(self):
        self.dir.cleanup()

    def test_oldest_report_first_and_notes_grouped_by_place(self):
        write_list(self.root, [report('c3', 'bodhi-deli', 'Recheck the menu prices.', '2026-10-27T07:00:00+00:00'),
                               report('c1', 'lotus-house', 'Recheck the address.', '2026-10-26T07:00:00+00:00'),
                               report('c2', 'bodhi-deli', 'Recheck the diet label.', '2026-10-26T09:00:00+00:00')])
        first, skipped = rechecks.due(self.root, VENUES, NOW)
        self.assertEqual([r['venue']['venueId'] for r in first], ['lotus-house', 'bodhi-deli'])
        self.assertEqual(first[1]['cases'], ['c2', 'c3'])
        self.assertEqual(first[1]['notes'], ['Recheck the diet label.', 'Recheck the menu prices.'])
        self.assertEqual(skipped, [])

    def test_a_place_keeps_its_newest_three_notes(self):
        write_list(self.root, [report(f'c{n}', 'green-leaf', f'Note {n}', f'2026-10-2{n}T06:00:00+00:00') for n in range(1, 6)])
        first, _ = rechecks.due(self.root, VENUES, NOW)
        self.assertEqual(first[0]['notes'], ['Note 3', 'Note 4', 'Note 5'])
        self.assertEqual(len(first[0]['cases']), 5)

    def test_unknown_place_is_skipped_once_and_malformed_rows_ignored(self):
        write_list(self.root, [report('c1', 'not-in-explore'), {'case': 'c2'}, 'junk', report('', 'green-leaf')])
        first, skipped = rechecks.due(self.root, VENUES, NOW)
        self.assertEqual((first, skipped), ([], ['c1']))
        self.assertEqual(done(self.root)['c1']['outcome'], 'unknown-place')
        self.assertEqual(rechecks.due(self.root, VENUES, NOW), ([], []))

    def test_a_sent_case_never_comes_first_again(self):
        write_list(self.root, [report('c1', 'green-leaf')])
        rechecks.mark(self.root, ['c1'], ok=True, now=NOW)
        self.assertEqual(rechecks.due(self.root, VENUES, NOW)[0], [])

    def test_two_failed_tries_and_it_stops_coming_first(self):
        write_list(self.root, [report('c1', 'green-leaf')])
        rechecks.mark(self.root, ['c1'], ok=False, now=NOW)
        self.assertEqual(done(self.root)['c1'], {'at': NOW.isoformat(), 'outcome': 'retry', 'tries': 1})
        self.assertEqual(len(rechecks.due(self.root, VENUES, NOW)[0]), 1)
        rechecks.mark(self.root, ['c1'], ok=False, now=NOW)
        self.assertEqual(done(self.root)['c1']['outcome'], 'failed')
        self.assertEqual(rechecks.due(self.root, VENUES, NOW)[0], [])

    def test_old_records_are_dropped(self):
        rechecks.mark(self.root, ['old'], ok=True, now=NOW - dt.timedelta(days=rechecks.KEEP_DAYS + 1))
        rechecks.mark(self.root, ['new'], ok=True, now=NOW)
        self.assertEqual(set(done(self.root)), {'new'})

    def test_no_list_means_no_rechecks(self):
        self.assertEqual(rechecks.due(self.root, VENUES, NOW), ([], []))

    def test_sent_cases_wait_for_coco_until_suggested(self):
        rechecks.mark(self.root, ['c1'], ok=True, now=NOW, record={'id': 'green-leaf', 'status': 'unchanged'})
        rechecks.mark(self.root, ['c2'], ok=False, now=NOW)
        rechecks.mark(self.root, ['c3'], ok=True, now=NOW)  # an older entry without Explorer's record is not Coco's to close
        self.assertEqual(rechecks.settled(self.root), [{'case': 'c1', 'at': NOW.isoformat(),
                                                        'record': {'place': 'green-leaf', 'status': 'unchanged', 'fields': []}}])
        rechecks.suggested(self.root, 'c1', NOW)
        self.assertEqual(rechecks.settled(self.root), [])
        rechecks.suggested(self.root, 'unknown', NOW)  # nothing to mark: no error, nothing added
        self.assertNotIn('unknown', done(self.root))


class RecheckRound(unittest.TestCase):
    """The coordinator: rechecks go first in Explorer's queue and run even when no dish is due."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        for p in (patch.object(w, 'ROOT', self.root),):
            p.start()
            self.addCleanup(p.stop)

    def tearDown(self):
        self.dir.cleanup()

    def round(self, production=False):
        w.shutil.rmtree(self.root / 'runs', ignore_errors=True)  # run folders are named by the second
        tick = w.Round({'runSeconds': 100000, 'automaticProductionWrites': production, 'workerSeconds': 900, 'maxExploreBatchesPerRun': 5,
                        'exploreBatchSize': 1}, trial=False, nightly=False)
        tick.baseline = {'checkedAt': '2026-10-17', 'holds': {}, 'venues': VENUES}
        return tick

    def test_prepare_puts_reported_places_first_even_when_reviewed_this_month(self):
        w.write(self.root / 'baseline.json', {'checkedAt': '2026-10-17', 'holds': {}, 'venues': VENUES})
        month = dt.datetime.now(w.SG).isoformat()
        w.write(self.root / 'state/checkpoint.json', {'explorerReviewed': {'bodhi-deli': month}, 'pendingReview': []})
        write_list(self.root, [report('c1', 'bodhi-deli'), report('c2', 'gone-place')])
        tick = self.round()
        tick.prepare()
        self.assertEqual(tick.pending[0]['venueId'], 'bodhi-deli')
        self.assertEqual([v['venueId'] for v in tick.pending].count('bodhi-deli'), 1)
        self.assertEqual(tick.rechecks['bodhi-deli']['cases'], ['c1'])
        self.assertTrue(any('not in Explore' in n['note'] for n in tick.notes))

    def run_explorer(self, tick, assignment, worker):
        import learning
        import outlet_capture
        import diet_review
        import publisher
        patches = [patch.object(publisher, 'menu_context', side_effect=lambda batch: [dict(assignment(v['venueId']), id=v['venueId']) for v in batch]),
                   patch.object(outlet_capture, 'ensure', return_value=[]), patch.object(diet_review, 'due', return_value=False),
                   patch.object(learning, 'due_retries', return_value=[]), patch.object(learning, 'note_retry'),
                   patch.object(w.Round, 'explorer_queue_reserve', return_value=0), patch.object(w.Round, 'review_backlogged', return_value=False),
                   patch.object(w, 'worker', side_effect=worker)]
        for p in patches:
            p.start()
        try:
            tick.explorer()
        finally:
            for p in patches:
                p.stop()

    def test_a_recheck_runs_with_the_notes_even_when_no_dish_is_due(self):
        write_list(self.root, [report('c1', 'lotus-house')])
        tick = self.round(production=True)
        first, _ = rechecks.due(self.root, VENUES)
        tick.rechecks = {r['venue']['venueId']: r for r in first}
        tick.pending = [VENUES[1], VENUES[0]]  # lotus-house (reported) first, then green-leaf
        contexts = []

        def worker(role, context, folder, policy):
            contexts.append(context)
            return {'role': role, 'records': [{'id': context['venues'][0]['venueId'], 'status': 'proposed',
                                               'proposals': [{'field': 'hours', 'newValue': 'x'}, {'field': 'hours'}, 'junk']}]}

        self.run_explorer(tick, lambda vid: {'assignedItems': []}, worker)
        self.assertEqual([c['venues'][0]['venueId'] for c in contexts], ['lotus-house'])  # green-leaf has no due dish: skipped as before
        self.assertEqual(contexts[0]['memberReports'], {'lotus-house': ['Recheck opening hours: Sunday closing moved to 8 pm.']})
        self.assertEqual(done(self.root)['c1']['outcome'], 'sent')
        self.assertEqual(done(self.root)['c1']['record'], {'place': 'lotus-house', 'status': 'proposed', 'fields': ['hours']})
        self.assertTrue(any('no due dish work: green-leaf' in n['note'] for n in tick.notes))

    def test_other_venues_get_no_member_reports(self):
        tick = self.round(production=True)
        tick.pending = [VENUES[0]]
        contexts = []

        def worker(role, context, folder, policy):
            contexts.append(context)
            return {'role': role, 'records': [{'id': context['venues'][0]['venueId']}]}

        self.run_explorer(tick, lambda vid: {'assignedItems': [{'name': 'Laksa'}]}, worker)
        self.assertEqual(len(contexts), 1)
        self.assertNotIn('memberReports', contexts[0])

    def test_unavailable_menu_or_a_failed_run_counts_a_try_but_a_closing_window_does_not(self):
        write_list(self.root, [report('c1', 'lotus-house')])
        for label, assignment, error, outcome in (
                ('menu unavailable', lambda vid: {'status': 'existing-menu-unavailable-preserve-hold'}, None, 'retry'),
                ('run failed', lambda vid: {'assignedItems': []}, RuntimeError('provider down'), 'retry'),
                ('window closing', lambda vid: {'assignedItems': []}, RuntimeError('Night window closing'), None)):
            with self.subTest(label):
                (self.root / rechecks.DONE).unlink(missing_ok=True)
                tick = self.round(production=True)
                first, _ = rechecks.due(self.root, VENUES)
                tick.rechecks = {r['venue']['venueId']: r for r in first}
                tick.pending = [VENUES[1]]

                def worker(role, context, folder, policy, error=error):
                    raise error

                self.run_explorer(tick, assignment, worker)
                self.assertEqual(done(self.root).get('c1', {}).get('outcome'), outcome)


if __name__ == '__main__':
    unittest.main()
