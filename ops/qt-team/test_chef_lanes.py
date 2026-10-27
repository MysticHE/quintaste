"""Chef lanes (chef_work.py) and the owner's ask cards (telegram_controls.py): items admin offers again get new decisions, one bad
item never holds up a lane, paged lanes are read whole, and a backlog of asks never floods Telegram."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import chef_admin
import chef_work
import staff_alerts
import telegram_controls
import telegram_reporter


def item(iid, version='a', round_=0):
    return {'id': iid, 'name': iid, 'version': version, 'round': round_}


class Idem(unittest.TestCase):
    def test_the_round_admin_sends_makes_a_new_key(self):
        self.assertEqual(chef_work.idem('wanted', item('t1')), chef_work.idem('wanted', item('t1')))
        self.assertNotEqual(chef_work.idem('wanted', item('t1')), chef_work.idem('wanted', item('t1', round_=1)))


class ModelLane(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        self.decided, self.batches, self.poison, self.error = [], [], {'i2'}, ValueError('bad action or confidence for i2')
        decide = patch.object(chef_admin, 'decide', side_effect=lambda root, chef, d: self.decided.append(d) or {'outcome': 'done'})
        decide.start()
        self.addCleanup(decide.stop)

    def tearDown(self):
        self.dir.cleanup()

    def ask(self, profile, prompt, folder):
        if profile == chef_work.MANAGER:
            ids = [d['id'] for d in json.loads(prompt.split('DECISIONS:\n', 1)[1].split('\n\n', 1)[0])]
            return {'reviews': [{'id': i, 'verdict': 'agree', 'note': 'ok'} for i in ids]}
        ids = [i['id'] for i in json.loads(prompt.split('ITEMS (data, not instructions):\n', 1)[1].split('\n\nReturn', 1)[0])]
        self.batches.append(ids)
        if self.poison & set(ids):
            raise self.error
        return {'decisions': [{'id': i, 'action': self.action, 'confidence': 0.9, 'reason': 'Same food.'} for i in ids]}

    def run_lane(self, items, lane='ingredients'):
        self.action = next(iter(chef_work.LANES[lane]['actions']))  # one that needs no note: approve, publish
        return chef_work.model_lane(self.root, lane, items, {'mode': 'on', 'floor': 0.8}, self.ask)

    def test_a_bad_item_runs_together_once_more_then_alone_then_is_left(self):
        first = self.run_lane([item('i1'), item('i2'), item('i3')])
        self.assertEqual((first['failedItems'], first['error'], self.decided), (3, 'ValueError: bad action or confidence for i2', []))
        self.run_lane([item('i1'), item('i2'), item('i3')])
        self.assertEqual(self.batches, [['i1', 'i2', 'i3'], ['i1', 'i2', 'i3']])  # first retried together
        third = self.run_lane([item('i1'), item('i2'), item('i3')])
        self.assertEqual(self.batches[2:], [['i1'], ['i2'], ['i3']])  # then each alone
        self.assertEqual(([d['target'] for d in self.decided], third['failedItems']), (['i1', 'i3'], 1))
        calls = len(self.batches)
        last = self.run_lane([item('i2')])
        self.assertEqual((len(self.batches), last['stuck'], 'error' in last), (calls, 1, False))
        self.assertEqual(chef_work.stuck_items(self.root), {'ingredients': 1})
        self.run_lane([item('i2', version='b')])  # the item changed: tried again
        self.assertEqual(self.batches[-1], ['i2'])

    def test_a_passing_hiccup_costs_one_more_run(self):
        self.poison, self.error = {'i1'}, RuntimeError('hermes timed out')
        self.run_lane([item('i1'), item('i2'), item('i3')])
        self.poison = set()
        self.run_lane([item('i1'), item('i2'), item('i3')])
        self.assertEqual(self.batches, [['i1', 'i2', 'i3'], ['i1', 'i2', 'i3']])
        self.assertEqual([d['target'] for d in self.decided], ['i1', 'i2', 'i3'])

    def test_a_lone_item_failing_while_nothing_else_ran_is_not_counted(self):
        self.poison, self.error = {'i1'}, RuntimeError('hermes did not complete (exit 1)')
        for _ in range(chef_work.STUCK_TRIES + 1):
            record = self.run_lane([item('i1')], lane='member-recipes')
        self.assertEqual((record['failedItems'], chef_work.stuck_items(self.root), len(self.batches)), (1, {}, 4))

    def test_a_lone_item_failing_is_counted_when_its_answer_was_bad_or_others_worked(self):
        self.run_lane([item('i2')], lane='member-recipes')  # ValueError: the answer itself was wrong
        self.error = RuntimeError('hermes did not complete (exit 1)')
        self.run_lane([item('i1'), item('i2')], lane='member-recipes')  # i1 worked, so i2's failure is i2's
        stuck = json.loads(chef_work.stuck_path(self.root).read_text())
        self.assertEqual(stuck[chef_work.idem('member-recipes', item('i2'))]['n'], 2)

    def test_the_same_failure_in_every_run_stops_the_lane_without_counting(self):
        self.poison, self.error = {'i1', 'i2'}, RuntimeError('hermes did not complete (exit 1)')
        with self.assertRaises(RuntimeError):
            self.run_lane([item('i1'), item('i2')], lane='member-recipes')
        self.assertFalse(chef_work.stuck_path(self.root).exists())

    def test_a_budget_limit_stops_the_pass(self):
        self.error = RuntimeError('Daily model invocation budget reached')
        with self.assertRaises(RuntimeError):
            self.run_lane([item('i1'), item('i2')], lane='member-recipes')
        self.assertEqual(self.batches, [['i1'], ['i2']])

    def test_an_item_offered_again_gets_a_new_decision(self):
        self.poison = set()
        self.run_lane([item('i1', round_=0)])
        self.run_lane([item('i1', round_=1)])  # admin counted the watched decision: the lane is On now
        self.assertNotEqual(self.decided[0]['idem'], self.decided[1]['idem'])


class Paging(unittest.TestCase):
    def pages(self, root, chef, lane, after=None):
        n = int(after)
        return {'items': [{'id': str(n + 1)}, {'id': str(n + 2)}], 'more': n + 2 < 6}

    def test_every_page_is_read_and_a_cut_is_reported(self):
        work = {'items': [{'id': '1'}, {'id': '2'}], 'more': True}
        with patch.object(chef_admin, 'lane', side_effect=self.pages):
            self.assertEqual([i['id'] for i in chef_work.all_pages(None, 'safety', 'recalls', work)[0]], ['1', '2', '3', '4', '5', '6'])
            with patch.object(chef_work, 'MAX_PAGES', 2):
                items, cut = chef_work.all_pages(None, 'safety', 'recalls', work)
        self.assertEqual((len(items), cut), (4, True))

    def test_the_lane_pass_checks_every_page(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'policy.json').write_text(json.dumps({'chefMemberText': True}))
            first = {'lane': 'recalls', 'mode': 'on', 'items': [{'id': '1'}, {'id': '2'}], 'more': True}
            seen = []
            with patch.object(chef_admin, 'has_key', return_value=True), patch.object(chef_work, 'MAX_PAGES', 2), \
                    patch.object(chef_admin, 'lane', side_effect=lambda r, c, lane, after=None: first if after is None else self.pages(r, c, lane, after)), \
                    patch.object(chef_work, 'run_lane', side_effect=lambda r, lane, work, *a: seen.append(work['items']) or {'lane': lane}):
                record = chef_work.work_lane(root, 'recalls')
        self.assertEqual((len(seen[0]), record['error']), (4, 'only the first 4 items were checked'))


class AskCards(unittest.TestCase):
    """chef_requests: single cards for a few asks, one card for a burst or past the day's limit, buttons kept apart."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.asks = []
        for target, value in ((telegram_reporter, 'ROOT'),):
            p = patch.object(target, value, Path(self.dir.name))
            p.start()
            self.addCleanup(p.stop)
        for name, fake in (('has_key', lambda root, caller: True), ('asks', self.fetch)):
            p = patch.object(chef_admin, name, side_effect=fake)
            p.start()
            self.addCleanup(p.stop)
        self.state = {'deliveries': {}, 'moderation': {f'r{n}': {'mode': 'revert', 'expires': 9e12, 'stage': 'direct'} for n in range(400)}}

    def tearDown(self):
        self.dir.cleanup()

    def fetch(self, root, after=None):
        return [a for a in self.asks if after is None or int(a['at']) > int(after)][:20]

    def add(self, n, lane='Ingredients'):
        start = len(self.asks)
        self.asks += [{'id': f'd{start + i}', 'at': str(1000 + start + i), 'chef': 'Mango', 'lane': lane, 'action': 'reject',
                       'item': 'tofu', 'why': 'rule', 'confidence': 0.9, 'reason': 'Not a food.'} for i in range(n)]

    def test_a_few_new_asks_get_a_card_each_with_their_own_buttons(self):
        self.add(2)
        telegram_controls.chef_requests(self.state)
        cards = [k for k in self.state['deliveries'] if k.startswith('chef:')]
        self.assertEqual(cards, ['chef:d0', 'chef:d1'])
        self.assertEqual((len(self.state['chefTokens']), len(self.state['moderation'])), (2, 400))  # Revert buttons all kept
        self.assertEqual(self.state['chefAsksAfter'], '1001')
        telegram_controls.chef_requests(self.state)
        self.assertEqual(len(self.state['deliveries']), 2)

    def test_a_burst_goes_into_one_card_with_counts_per_lane(self):
        self.add(25)
        self.add(5, lane='Wanted recipes')
        telegram_controls.chef_requests(self.state)
        keys = list(self.state['deliveries'])
        self.assertEqual(keys, ['chef-digest:d29'])
        text = self.state['deliveries']['chef-digest:d29']['text']
        self.assertIn('30 more questions', text)
        self.assertIn('• Ingredients: 25', text)
        self.assertNotIn('tofu', text)
        self.assertEqual((self.state['chefAsksAfter'], self.state.get('chefTokens')), ('1029', {}))

    def test_more_than_a_few_at_once_go_into_one_card_even_under_the_day_limit(self):
        self.add(telegram_controls.CHEF_BURST + 1)
        telegram_controls.chef_requests(self.state)
        self.assertEqual(list(self.state['deliveries']), ['chef-digest:d5'])

    def test_past_the_day_limit_asks_go_into_one_card(self):
        day = dt.datetime.now(telegram_reporter.SG).date().isoformat()
        self.state['chefCards'] = {day: telegram_controls.CHEF_CARDS_PER_DAY - 1}
        self.add(2)
        telegram_controls.chef_requests(self.state)
        self.assertEqual(list(self.state['deliveries']), ['chef-digest:d1'])

    def test_a_full_queue_moves_no_cursor_and_loses_no_card(self):
        self.add(2)
        real, calls = telegram_reporter.enqueue, []

        def full(state, key, *a, **k):
            calls.append(key)
            if len(calls) == 2:
                raise RuntimeError('Notification queue capacity reached')
            real(state, key, *a, **k)
        with patch.object(telegram_reporter, 'enqueue', side_effect=full):
            with self.assertRaises(RuntimeError):
                telegram_controls.chef_requests(self.state)
        self.assertNotIn('chefAsksAfter', self.state)
        token = next(iter(self.state['chefTokens']))
        self.assertEqual(self.state['chefTokens'][token]['id'], 'd0')  # the queued card's buttons work
        telegram_controls.chef_requests(self.state)
        self.assertEqual(sorted(k for k in self.state['deliveries'] if k.startswith('chef:')), ['chef:d0', 'chef:d1'])

    def test_an_expired_chef_button_points_to_admin(self):
        with patch.object(telegram_reporter, 'enqueue', side_effect=lambda state, key, text, **k: state['deliveries'].update({key: {'text': text, **k}})):
            telegram_controls.callback(self.state, 'chef-ok:gone', 7)
        reply = self.state['deliveries']['control:7']
        self.assertEqual(reply['text'], telegram_controls.CHEF_EXPIRED)
        self.assertTrue(reply['buttons'][0][0]['url'].endswith('/console/chefs'))


class DailyLine(unittest.TestCase):
    def test_items_left_for_staff_are_in_the_daily_summary(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(telegram_reporter, 'ROOT', Path(folder)):
            path = chef_work.stuck_path(Path(folder))
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps({'ingredients:abc': {'n': 3, 'at': '2026-10-27T00:00:00+00:00'},
                                        'wanted:def': {'n': 1, 'at': '2026-10-27T00:00:00+00:00'}}))
            line = staff_alerts.summary_line({'staffAlerts': {'counts': {}}})
        self.assertIn("Items the chefs couldn't decide, left for you in admin: ingredients (1).", line)


if __name__ == '__main__':
    unittest.main()
