"""Isolated presence regressions: no provider calls, member data, or public pushes."""
import datetime as dt
import json
import os
from pathlib import Path
import tempfile
import unittest
from contextlib import nullcontext
from unittest.mock import patch

import kitchen_activity as activity
import kitchen_feed as feed


@unittest.skipIf(os.name=='nt','Linux flock capacity gate')
class FoodCapacity(unittest.TestCase):
    def test_food_uses_a_free_existing_slot_but_never_creates_a_third(self):
        import fcntl,qt_capacity
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'QT_TEAM_ROOT':folder,'QT_EXPLORE_INTERACTIVE':'0'}):
            root=Path(folder)/'state/model-slots';root.mkdir(parents=True)
            with (root/'0').open('a+') as background:
                fcntl.flock(background,fcntl.LOCK_EX)
                with self.assertRaises(TimeoutError):
                    with qt_capacity.slot(wait_seconds=0):pass
                with qt_capacity.slot(priority=True,wait_seconds=0):
                    with self.assertRaises(TimeoutError):
                        with qt_capacity.slot(priority=True,wait_seconds=0):pass
            self.assertEqual({p.name for p in root.iterdir()},{'0','1'})

    def test_capacity_options_are_consumed_before_the_model_function(self):
        import qt_capacity
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'QT_TEAM_ROOT':folder}):
            @qt_capacity.limited
            def run(value):return value
            self.assertEqual(run('fixture',capacity_priority=True,capacity_wait=0),'fixture')


class Presence(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'team'
        self.root.mkdir()
        for profile in activity.PROFILES:
            if profile != 'qt-storyteller':
                (self.root.parent / 'profiles' / profile).mkdir(parents=True)
        self.env = patch.dict(os.environ, QT_TEAM_ROOT=str(self.root))
        self.env.start(); self.addCleanup(self.env.stop)
        self.feed_root = patch.object(feed, 'ROOT', self.root)
        self.feed_root.start(); self.addCleanup(self.feed_root.stop)
        self.identity = patch.object(activity, 'process_identity', return_value='boot:start')
        self.identity.start(); self.addCleanup(self.identity.stop)
        self.ping = patch.object(activity, 'ping')
        self.ping.start(); self.addCleanup(self.ping.stop)

    def states(self):
        return {c['id']: c for c in feed.chef_states(dt.datetime.now(dt.timezone.utc))}

    def test_every_profile_starts_and_finishes_without_old_output_files(self):
        for profile, chef in activity.PROFILES.items():
            with self.subTest(profile=profile):
                with activity.activity(profile):
                    self.assertEqual(self.states()[chef]['state'], 'reviewing' if chef == 'head' else 'working')
                self.assertNotIn(chef, activity.current(dt.datetime.now(dt.timezone.utc)))
                if chef != 'storyteller': self.assertEqual(self.states()[chef]['state'], 'resting')

    def test_overlapping_jobs_keep_chef_working(self):
        with activity.activity('qt-videomaker'):
            with activity.activity('qt-videomaker'):
                self.assertEqual(len(list((self.root / 'state/kitchen-active').glob('*.json'))), 2)
            self.assertEqual(self.states()['writer']['state'], 'working')
        self.assertEqual(self.states()['writer']['state'], 'resting')

    def test_exception_clears_presence_and_propagates(self):
        @activity.tracked('qt-fixer')
        def fail():
            self.assertEqual(self.states()['fixer']['state'], 'working')
            raise RuntimeError('failure')
        with self.assertRaisesRegex(RuntimeError, 'failure'): fail()
        self.assertEqual(self.states()['fixer']['state'], 'resting')

    def test_dead_or_reused_pid_is_not_busy(self):
        with activity.activity('qt-explorer'):
            for identity in (None, 'new-boot:new-start'):
                with patch.object(activity, 'process_identity', return_value=identity):
                    self.assertEqual(self.states()['scout']['state'], 'resting')

    def test_expired_heartbeat_stops_presence_even_if_parent_lives(self):
        with activity.activity('qt-gamer'):
            file = next((self.root / 'state/kitchen-active').glob('*.json'))
            row = json.loads(file.read_text())
            row['heartbeatAt'] = row['startedAt'] = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=70)).isoformat()
            file.write_text(json.dumps(row))
            self.assertEqual(self.states()['artist']['state'], 'resting')

    def test_long_calls_stay_active_with_heartbeat(self):
        with activity.activity('qt-cooker'):
            file = next((self.root / 'state/kitchen-active').glob('*.json'))
            row = json.loads(file.read_text())
            row['startedAt'] = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=2)).isoformat()
            file.write_text(json.dumps(row))
            self.assertEqual(self.states()['wok']['state'], 'working')

    def test_old_recipe_output_does_not_mean_working(self):
        (self.root / 'ai-recipes').mkdir()
        (self.root / 'ai-recipes/last.json').write_text('{}')
        self.assertEqual(self.states()['writer']['state'], 'resting')

    def test_available_chefs_and_head_are_independent(self):
        with activity.activity('qt-fixer'):
            states = self.states()
            self.assertIn('fixer', states)
            self.assertIn('safety', states)
            self.assertNotIn('storyteller', states)
            self.assertEqual(states['head']['state'], 'resting')

    def test_active_drawing_takes_precedence_over_waiting_art(self):
        (self.root / 'gamer').mkdir()
        (self.root / 'gamer/state.json').write_text(json.dumps({'assets': {'one': {'status': 'awaiting-owner'}}}))
        self.assertEqual(self.states()['artist']['state'], 'waiting')
        with activity.activity('qt-gamer'):
            self.assertEqual(self.states()['artist']['state'], 'working')
        self.assertEqual(self.states()['artist']['state'], 'waiting')

    def test_public_payload_has_no_worker_or_job_metadata(self):
        with activity.activity('qt-fixer'):
            output = feed.build({})
            self.assertEqual(set(next(c for c in output['chefs'] if c['id'] == 'fixer')), {'id', 'state', 'since'})
            self.assertNotIn('pid', json.dumps(output))
            self.assertNotIn('boot:start', json.dumps(output))

    def test_unwritable_presence_does_not_stop_work(self):
        with patch.object(Path, 'mkdir', side_effect=OSError('read only')):
            with activity.activity('qt-cooker'):
                pass

    def test_shared_runner_reports_activity_and_cleans_failed_calls(self):
        import hermes_run
        import qt_capacity
        for code in (0, 1):
            with self.subTest(exit=code):
                folder = self.root / 'call'
                folder.mkdir(exist_ok=True)
                outer = self
                class Process:
                    returncode = code
                    def __init__(self, *args, **kwargs):
                        kwargs['stdout'].write(json.dumps({'type': 'result', 'exit_code': code, 'text': '{}'}) + '\n')
                    def wait(self, **kwargs):
                        outer.assertEqual(outer.states()['fixer']['state'], 'working')
                with patch.object(qt_capacity, 'slot', nullcontext), patch.object(hermes_run.subprocess, 'Popen', Process):
                    if code:
                        with self.assertRaises(RuntimeError): hermes_run.run('qt-fixer', 'private text', folder)
                    else:
                        hermes_run.run('qt-fixer', 'private text', folder, keep=False)
                        self.assertFalse((folder / 'prompt.txt').exists())
                self.assertEqual(self.states()['fixer']['state'], 'resting')


if __name__ == '__main__': unittest.main()
