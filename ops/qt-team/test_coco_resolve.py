"""Coco suggests resolving a place report once Pandan's recheck is settled (chef_work.suggest_resolutions)."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import chef_admin
import chef_work
import rechecks

SENT = dt.datetime(2026, 10, 27, 2, 0, tzinfo=dt.timezone.utc)   # 10 am SGT, when Pandan's recheck ran
LATER = '2026-10-28T03:00:00Z'                                    # 11 am SGT the next day
EARLIER = '2026-10-26T03:00:00Z'
LIVE = {'reverts': [], 'removals': [], 'staffHidden': [], 'staffHiddenItems': []}


class CocoResolves(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        self.decisions = []
        decide = patch.object(chef_admin, 'decide', side_effect=lambda root, chef, d: self.decisions.append((chef, d)) or
                              {'outcome': 'asked', 'why': 'rule'})
        decide.start()
        self.addCleanup(decide.stop)

    def tearDown(self):
        self.dir.cleanup()

    def sent(self, case, place, status, fields=()):
        record = {'id': place, 'status': status, 'proposals': [{'field': f} for f in fields]}
        rechecks.mark(self.root, [case], ok=True, now=SENT, record=record)

    def receipt(self, name, at, changes):
        path = self.root / 'state' / 'publications' / (name + '.json')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({'publishedAt': at, 'changes': changes}), encoding='utf-8')

    def run_coco(self, cases, live=LIVE):
        return chef_work.suggest_resolutions(self.root, [{'case': c, 'place': 'x', 'note': 'n'} for c in cases], live)

    def test_nothing_to_change_suggests_closing_once(self):
        self.sent('c1', 'green-leaf', 'unchanged')
        out = self.run_coco(['c1'])
        self.assertEqual(out, [{'action': 'resolve', 'outcome': 'asked', 'why': 'rule'}])
        chef, d = self.decisions[0]
        self.assertEqual((chef, d['lane'], d['target'], d['action'], d['idem']), ('fixer', 'place-reports', 'c1', 'resolve', 'place-reports:resolve:c1'))
        self.assertEqual(d['input']['note'], "Rechecked on 27 Oct 2026: the place's own sources show no change, so nothing was updated.")
        self.assertEqual(self.run_coco(['c1']), [])
        self.assertEqual(len(self.decisions), 1)

    def test_a_published_fix_after_the_recheck_suggests_closing_with_the_fields(self):
        self.sent('c1', 'green-leaf', 'proposed', ['hours', 'menuPrices'])
        self.receipt('r1', LATER, [{'changeId': 'ch1', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['hours', 'menuPrices', 'photo']},
                                   {'changeId': 'ch2', 'kind': 'recipe', 'id': 'green-leaf', 'fields': ['steps']}])
        self.run_coco(['c1'])
        self.assertEqual(self.decisions[0][1]['input']['note'], 'Fixed after a recheck: menu prices, opening hours updated on 28 Oct 2026.')

    def test_only_a_publication_of_a_proposed_field_counts(self):
        self.sent('c1', 'green-leaf', 'proposed', ['hours'])
        self.receipt('r1', LATER, [{'changeId': 'ch1', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['photo']}])  # unrelated cover
        self.assertEqual(self.run_coco(['c1']), [])
        self.sent('c2', 'lotus-house', 'proposed', ['coverEnhancement'])  # Explorer's name for what publishes as photo
        self.receipt('r2', LATER, [{'changeId': 'ch2', 'kind': 'venue', 'id': 'lotus-house', 'fields': ['photo']}])
        self.assertEqual(len(self.run_coco(['c1', 'c2'])), 1)
        self.assertEqual(self.decisions[0][1]['input']['note'], 'Fixed after a recheck: cover photo updated on 28 Oct 2026.')

    def test_a_proposal_waits_until_it_is_published(self):
        self.sent('c1', 'green-leaf', 'proposed', ['hours'])
        self.receipt('r0', EARLIER, [{'changeId': 'ch0', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['hours']}])  # before the recheck
        self.assertEqual(self.run_coco(['c1']), [])
        self.assertEqual(rechecks.settled(self.root)[0]['case'], 'c1')  # still waiting, not marked
        self.receipt('r1', LATER, [{'changeId': 'ch1', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['hours']}])
        self.assertEqual(len(self.run_coco(['c1'])), 1)

    def test_a_reverted_or_removed_change_does_not_count(self):
        self.sent('c1', 'green-leaf', 'proposed', ['hours'])
        self.receipt('r1', LATER, [{'changeId': 'ch1', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['hours']}])
        self.assertEqual(self.run_coco(['c1'], dict(LIVE, reverts=[{'changeId': 'ch1'}])), [])
        self.assertEqual(self.run_coco(['c1'], dict(LIVE, staffHidden=['green-leaf'])), [])
        self.assertEqual(self.decisions, [])

    def test_a_held_recheck_is_left_for_staff(self):
        self.sent('c1', 'green-leaf', 'held', ['hours'])  # Explorer proposed hours but held them
        self.receipt('r1', LATER, [{'changeId': 'ch1', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['hours']}])
        self.assertEqual(self.run_coco(['c1']), [])

    def test_a_report_staff_already_closed_is_dropped(self):
        self.sent('c1', 'green-leaf', 'unchanged')
        self.assertEqual(self.run_coco([]), [])
        self.assertEqual(self.decisions, [])
        self.assertEqual(rechecks.settled(self.root), [])

    def test_a_report_missing_from_a_cut_list_waits(self):
        self.sent('c1', 'green-leaf', 'unchanged')
        out = chef_work.suggest_resolutions(self.root, [], LIVE, complete=False)
        self.assertEqual((out, rechecks.settled(self.root)[0]['case']), ([], 'c1'))

    def test_the_live_state_is_read_only_when_a_recheck_is_settled(self):
        reads = []
        self.assertEqual(chef_work.suggest_resolutions(self.root, [], lambda: reads.append(1) or LIVE), [])
        self.assertEqual(reads, [])
        self.sent('c1', 'green-leaf', 'unchanged')
        chef_work.suggest_resolutions(self.root, [{'case': 'c1'}], lambda: reads.append(1) or LIVE)
        self.assertEqual(reads, [1])

    def test_a_receipt_without_a_time_is_ignored(self):
        self.sent('c1', 'green-leaf', 'proposed', ['hours'])
        self.receipt('r1', 'not a date', [{'changeId': 'ch1', 'kind': 'venue', 'id': 'green-leaf', 'fields': ['hours']}])
        self.assertEqual(self.run_coco(['c1']), [])


class CocoLanePass(unittest.TestCase):
    """work_lane runs the suggestions after Coco's lane, only while the lane is not off, and survives an unreadable live state."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        (self.root / 'policy.json').write_text(json.dumps({'chefMemberText': True}), encoding='utf-8')
        rechecks.mark(self.root, ['c1'], ok=True, now=SENT, record={'id': 'green-leaf', 'status': 'unchanged'})

    def tearDown(self):
        self.dir.cleanup()

    def lane_pass(self, mode, live=LIVE, live_state=None):
        work = {'lane': 'place-reports', 'mode': mode, 'items': [], 'handoff': [{'case': 'c1', 'place': 'green-leaf', 'note': 'n'}],
                'handoffComplete': True}
        decided = []
        with patch.object(chef_admin, 'has_key', return_value=True), patch.object(chef_admin, 'lane', return_value=work), \
                patch.object(chef_admin, 'decide', side_effect=lambda r, c, d: decided.append(d) or {'outcome': 'asked'}), \
                patch.object(chef_work, 'live_state', side_effect=live_state or (lambda: LIVE)):
            record = chef_work.work_lane(self.root, 'place-reports', live=live)
        return record, decided

    def test_the_lane_pass_writes_the_handoff_and_suggests(self):
        record, decided = self.lane_pass('on')
        self.assertEqual([d['action'] for d in decided], ['resolve'])
        self.assertEqual(record['resolved'], [{'action': 'resolve', 'outcome': 'asked', 'why': None}])
        self.assertEqual(json.loads((self.root / 'state/fixer/rechecks.json').read_text())[0]['case'], 'c1')

    def test_no_suggestions_while_the_lane_is_off(self):
        record, decided = self.lane_pass('off')
        self.assertEqual((decided, 'resolved' in record), ([], False))

    def test_an_unreadable_live_state_waits_for_the_next_pass(self):
        def broken():
            raise OSError('app down')
        record, decided = self.lane_pass('on', live=None, live_state=broken)
        self.assertEqual((decided, record.get('resolveError')), ([], 'OSError'))
        self.assertEqual(rechecks.settled(self.root)[0]['case'], 'c1')


if __name__ == '__main__':
    unittest.main()
