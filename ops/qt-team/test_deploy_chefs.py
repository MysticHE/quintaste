"""deploy_chefs.py: keys placed once and never shown, files copied only as committed and only over versions this checkout had (or
the owner reviewed), every failure put back, the result kept on the VPS, and the hourly timer. The VPS code is the same function
source, run here against temporary folders."""
import ast
import base64
import contextlib
import hashlib
import inspect
import io
import json
import re
import subprocess
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import chef_work
import deploy_chefs as d

HERE = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()  # noqa: E731


class Done(types.SimpleNamespace):
    pass


def record_modes(case):
    """File modes are recorded, not applied: a read-only file can't be replaced on Windows, where these tests run."""
    case.modes = []
    p = patch.object(Path, 'chmod', lambda path, mode: case.modes.append((path.name, mode)))
    p.start()
    case.addCleanup(p.stop)


class Wiring(unittest.TestCase):
    def test_the_callers_are_admins(self):
        bot_ts = (HERE.parents[1] / 'admin/src/lib/bot.ts').read_text(encoding='utf-8')
        self.assertEqual(tuple(re.findall(r"^\s+(\w+): \{ key: 'ADMIN_BOT_", bot_ts, re.M)), d.CALLERS)

    def test_each_caller_reads_something_of_its_own_and_coco_no_case_details(self):
        self.assertEqual(set(d.READS), set(d.CALLERS))
        for caller, read in d.READS.items():
            if caller not in ('alerts', 'head'):
                self.assertEqual(chef_work.LANES[read]['chef'], caller)
        self.assertNotIn('place-reports', d.READS.values())

    def test_every_local_module_the_chefs_import_is_copied_or_already_there(self):
        local = {p.stem for p in HERE.glob('*.py')}
        allowed = {name[:-3] for name in d.BOT_FILES} | set(d.ON_VPS)
        for name in ('chef_admin.py', 'chef_work.py', 'sfa_notice.py', 'hermes_run.py', 'rechecks.py', 'staff_alerts.py'):
            tree = ast.parse((HERE / name).read_text(encoding='utf-8'))
            used = {a.name.split('.')[0] for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names}
            used |= {n.module.split('.')[0] for n in ast.walk(tree) if isinstance(n, ast.ImportFrom) and n.module}
            with self.subTest(name):
                self.assertEqual(used & local - allowed, set())

    def test_the_tests_that_run_on_the_vps_exist(self):
        self.assertTrue(all((HERE / name).exists() for name in d.TEST_FILES))
        self.assertEqual(d.CHECKS[0][1][-len(d.TEST_FILES):], [name[:-3] for name in d.TEST_FILES])

    def test_the_vps_scripts_compile_and_carry_no_secret(self):
        keys = d.keys_code()
        compile(keys, 'keys', 'exec')
        bot = d.bot_code({'chef_work.py': b'x = 1\n'}, {'chef_work.py': []}, {'chef_work.py': 'a' * 16})
        compile(bot, 'bot', 'exec')
        compile(d.diff_code({'chef_work.py': []}), 'diff', 'exec')
        compile(d.RESULT, 'result', 'exec')
        self.assertNotIn('admin-secrets/bot-', bot)
        self.assertIn("'/docker/quintaste/admin-secrets'", keys)
        self.assertIn('qt-chef-work.timer', bot)
        self.assertIn("{'chef_work.py': 'aaaaaaaaaaaaaaaa'}", bot)

    def test_the_timer_runs_one_pass_an_hour_as_the_hermes_user(self):
        self.assertIn('--user 10000', d.SERVICE)
        self.assertTrue(d.SERVICE.split('ExecStart=')[1].split('\n')[0].endswith('/opt/hermes/.venv/bin/python chef_work.py'))
        self.assertIn('OnCalendar=*-*-* *:07:00', d.TIMER)
        self.assertIn('Type=oneshot', d.SERVICE)

    def test_the_lock_wait_ends_well_inside_the_ssh_limit(self):
        self.assertEqual(inspect.signature(d.team_locks).parameters['wait'].default, d.LOCK_WAIT)
        self.assertLess(d.LOCK_WAIT + 600, d.SSH_TIMEOUT)


class Committed(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.repo = Path(self.dir.name) / 'repo'
        empty = Path(self.dir.name) / 'empty'  # no templates or hooks from this machine's git setup
        empty.mkdir()
        self.repo.mkdir()
        d.git(self.repo, 'init', '-q', '--template=' + str(empty))
        for args in (['user.email', 'qa@example.com'], ['user.name', 'QA'], ['core.autocrlf', 'false'], ['commit.gpgsign', 'false'],
                     ['core.hooksPath', str(empty)]):
            d.git(self.repo, 'config', *args)
        (self.repo / 'ops/qt-team').mkdir(parents=True)

    def tearDown(self):
        self.dir.cleanup()

    def commit(self, name, data):
        (self.repo / 'ops/qt-team' / name).write_bytes(data)
        d.git(self.repo, 'add', '-A')
        d.git(self.repo, 'commit', '-q', '-m', 'v')

    def test_the_committed_version_goes_and_every_committed_version_is_known(self):
        self.commit('a.py', b'v1\n')
        self.commit('a.py', b'v2\n')
        (self.repo / 'ops/qt-team/a.py').write_bytes(b'v2\r\n')  # a Windows checkout of the same version
        files, known = d.committed(self.repo, 'ops/qt-team', ['a.py'])
        self.assertEqual(files, {'a.py': b'v2\n'})
        self.assertEqual(set(known['a.py']), {sha(b'v1\n'), sha(b'v1\r\n'), sha(b'v2\n'), sha(b'v2\r\n')})

    def test_uncommitted_work_is_refused(self):
        self.commit('a.py', b'v1\n')
        (self.repo / 'ops/qt-team/a.py').write_bytes(b'v1 changed\n')
        with self.assertRaisesRegex(SystemExit, 'Not committed: a.py'):
            d.committed(self.repo, 'ops/qt-team', ['a.py'])
        (self.repo / 'ops/qt-team/b.py').write_bytes(b'new\n')
        with self.assertRaisesRegex(SystemExit, 'b.py is not committed'):
            d.committed(self.repo, 'ops/qt-team', ['b.py'])


class Keys(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        root = Path(self.dir.name)
        self.admin, self.bot, self.env = root / 'admin-secrets', root / 'private', root / 'admin.env'
        self.admin.mkdir()
        self.bot.mkdir()
        self.env.write_text('ADMIN_URL=https://admin.example\nADMIN_OWNER_EMAIL=owner@example.com\n', encoding='utf-8')
        self.backups, self.owned, self.runs = root / 'backups', [], 0
        record_modes(self)

    def tearDown(self):
        self.dir.cleanup()

    def own(self, path, uid, gid):
        self.owned.append((Path(path).name, uid, gid))

    def place(self, own=None):
        self.runs += 1
        return d.place_keys(self.admin, self.env, self.bot, self.backups / str(self.runs), d.CALLERS, own=own or self.own)

    def key(self, folder, name):
        return (folder / name).read_text(encoding='utf-8').strip()

    def test_first_run_makes_one_key_per_caller_for_both_sides(self):
        report = self.place()
        self.assertEqual({c: v for c, v in report['callers'].items()}, {c: {'admin': 'created', 'bot': 'created'} for c in d.CALLERS})
        for caller in d.CALLERS:
            key = self.key(self.admin, f'bot-{caller}-key')
            self.assertRegex(key, r'^[0-9a-f]{64}$')
            self.assertEqual(self.key(self.bot, f'admin-{caller}.key'), key)
            self.assertNotIn(key, json.dumps(report))
        self.assertEqual(len({self.key(self.admin, f'bot-{c}-key') for c in d.CALLERS}), 8)
        env = self.env.read_text(encoding='utf-8')
        self.assertTrue(env.startswith('ADMIN_URL=https://admin.example\nADMIN_OWNER_EMAIL=owner@example.com\n'))
        self.assertIn('ADMIN_BOT_SAFETY_KEY_FILE=/run/secrets/quintaste/bot-safety-key\n', env)
        self.assertEqual(report['adminEnv']['added'], [f'ADMIN_BOT_{c.upper()}_KEY_FILE' for c in d.CALLERS])
        self.assertEqual((self.backups / '1/admin.env').read_text(encoding='utf-8').count('ADMIN_BOT_'), 0)
        self.assertTrue(report['ownerEmailSet'])
        self.assertIn(('bot-wok-key.chefs-new', 1000, 1000), self.owned)
        self.assertIn(('admin-wok.key.chefs-new', 10000, 10000), self.owned)
        self.assertIn(('bot-wok-key.chefs-new', 0o400), self.modes)
        self.assertIn(('admin-wok.key.chefs-new', 0o600), self.modes)
        self.assertIn(('admin.env', 0o600), self.modes)  # the backup copy
        self.assertEqual(sorted(p.name for p in self.admin.iterdir() if p.name.endswith('.chefs-new')), [])

    def test_a_second_run_keeps_everything(self):
        self.place()
        keys, env = {c: self.key(self.admin, f'bot-{c}-key') for c in d.CALLERS}, self.env.read_bytes()
        report = self.place()
        self.assertEqual({v['admin'] for v in report['callers'].values()} | {v['bot'] for v in report['callers'].values()}, {'kept'})
        self.assertEqual(({c: self.key(self.admin, f'bot-{c}-key') for c in d.CALLERS}, self.env.read_bytes()), (keys, env))
        self.assertEqual(report['adminEnv']['added'], [])

    def test_a_key_the_owner_made_that_admin_accepts_is_kept(self):
        owned = base64.b64encode(bytes(range(48))).decode()  # 64 characters, base64 rather than hex
        (self.admin / 'bot-alerts-key').write_text(owned + '\n', encoding='utf-8')
        report = self.place()
        self.assertEqual((report['callers']['alerts']['admin'], self.key(self.bot, 'admin-alerts.key')), ('kept', owned))
        (self.admin / 'bot-head-key').write_text('k' * 47 + '\n', encoding='utf-8')  # shorter than admin allows
        with self.assertRaisesRegex(SystemExit, 'bot-head-key is not a usable key'):
            self.place()

    def test_a_bot_copy_that_differs_takes_admins_key(self):
        self.place()
        (self.bot / 'admin-head.key').write_text('0' * 64 + '\n', encoding='utf-8')
        report = self.place()
        self.assertEqual(report['callers']['head']['bot'], 'replaced')
        self.assertEqual(self.key(self.bot, 'admin-head.key'), self.key(self.admin, 'bot-head-key'))

    def test_another_key_file_in_admin_env_changes_nothing(self):
        self.env.write_text(self.env.read_text(encoding='utf-8') + 'ADMIN_BOT_WOK_KEY_FILE=/run/secrets/quintaste/other\n', encoding='utf-8')
        before = self.env.read_bytes()
        with self.assertRaisesRegex(SystemExit, 'ADMIN_BOT_WOK_KEY_FILE'):
            self.place()
        self.assertEqual((list(self.admin.iterdir()), list(self.bot.iterdir()), self.env.read_bytes()), ([], [], before))

    def test_an_unusable_admin_key_changes_nothing(self):
        (self.admin / 'bot-host-key').write_text('not a key\n', encoding='utf-8')
        with self.assertRaisesRegex(SystemExit, 'bot-host-key'):
            self.place()
        self.assertEqual((len(list(self.admin.iterdir())), list(self.bot.iterdir())), (1, []))

    def test_a_failure_part_way_puts_everything_back(self):
        self.place()
        (self.bot / 'admin-head.key').write_text('0' * 64 + '\n', encoding='utf-8')
        (self.admin / 'bot-safety-key').unlink()
        env = self.env.read_bytes()

        def own(path, uid, gid):
            if Path(path).name.startswith('admin-safety'):
                raise PermissionError('no')
        with self.assertRaises(PermissionError):
            self.place(own)
        self.assertFalse((self.admin / 'bot-safety-key').exists())  # made this run: removed again
        self.assertEqual(self.key(self.bot, 'admin-head.key'), '0' * 64)  # replaced this run: put back
        self.assertEqual(self.env.read_bytes(), env)
        self.assertEqual([p.name for p in self.bot.iterdir() if '.chefs-new' in p.name], [])

    def test_the_shipped_source_needs_nothing_from_this_module(self):
        ns = {}
        exec(compile(d.remote_code([d.place_keys], ''), 'remote', 'exec'), ns)
        report = ns['place_keys'](self.admin, self.env, self.bot, self.backups / 'x', d.CALLERS, own=self.own)
        self.assertEqual(len(report['callers']), 8)


class Team(unittest.TestCase):
    """A qt-team folder with keys, one deployed file and the release record, for sync_bot, deploy_bot and vps_versions."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.team = Path(self.dir.name)
        (self.team / 'private').mkdir()
        for caller in d.CALLERS:
            (self.team / 'private' / f'admin-{caller}.key').write_text('k\n')
        self.old, self.new = b'x = 1\n', b'x = 2\n'
        (self.team / 'chef_work.py').write_bytes(self.old)
        (self.team / 'night-release.json').write_text(json.dumps({'hashes': {'chef_work.py': sha(self.old), 'other.py': 'h'}}))
        self.files = {'chef_work.py': self.new, 'sfa_notice.py': b'y = 1\n'}
        self.known = {'chef_work.py': [sha(self.old), sha(self.new)], 'sfa_notice.py': [sha(b'y = 1\n')]}
        self.ran, self.breaks = [], None
        record_modes(self)

    def tearDown(self):
        self.dir.cleanup()

    def run_check(self, argv, **kwargs):
        self.ran.append(argv)
        failed = self.breaks == argv[0]
        return Done(returncode=1 if failed else 0, stdout='OK' if not failed else 'boom', stderr='')

    def unchanged(self):
        self.assertEqual((self.team / 'chef_work.py').read_bytes(), self.old)
        self.assertFalse((self.team / 'sfa_notice.py').exists())
        self.assertEqual(json.loads((self.team / 'night-release.json').read_text())['hashes']['chef_work.py'], sha(self.old))


class Sync(Team):
    def sync(self, files=None, accept=None):
        return d.sync_bot(self.team, files or self.files, self.known, d.CALLERS, [('tests', ['t']), ('keys', ['k'])], self.run_check,
                          'stamp', lock=lambda team: contextlib.nullcontext(), accept=accept)

    def test_files_are_replaced_checked_and_recorded(self):
        result = self.sync()
        self.assertEqual(((self.team / 'chef_work.py').read_bytes(), (self.team / 'sfa_notice.py').read_bytes()), (self.new, b'y = 1\n'))
        self.assertEqual((result['created'], result['checks'], self.ran), (['sfa_notice.py'], {'tests': 'OK', 'keys': 'OK'}, [['t'], ['k']]))
        release = json.loads((self.team / 'night-release.json').read_text())['hashes']
        self.assertEqual((release['chef_work.py'], release['sfa_notice.py'], release['other.py']), (sha(self.new), sha(b'y = 1\n'), 'h'))
        self.assertEqual((self.team / 'operator-tests/chefs-stamp/chef_work.py').read_bytes(), self.old)
        self.assertIn(('chef_work.py.chefs-new', 0o444), self.modes)

    def test_a_failed_check_puts_the_old_files_back(self):
        self.breaks = 'k'
        with self.assertRaisesRegex(RuntimeError, 'keys check failed: boom'):
            self.sync()
        self.unchanged()

    def test_a_caller_without_a_key_stops_before_anything(self):
        (self.team / 'private/admin-safety.key').unlink()
        with self.assertRaisesRegex(SystemExit, 'No key for safety'):
            self.sync()
        self.unchanged()
        self.assertFalse((self.team / 'operator-tests').exists())

    def test_a_version_this_checkout_never_had_is_left_alone(self):
        (self.team / 'chef_work.py').write_bytes(b'x = 3  # another session\n')
        with self.assertRaisesRegex(SystemExit, r'never had is on the VPS: chef_work.py \([0-9a-f]{16}\); see `deploy_chefs.py diff`'):
            self.sync()
        self.assertEqual(self.ran, [])

    def test_a_hand_edit_since_the_last_deploy_is_left_alone(self):
        (self.team / 'chef_work.py').write_bytes(self.new)  # a known version, but not the one the last deploy recorded
        with self.assertRaisesRegex(SystemExit, 'Changed by hand'):
            self.sync()

    def test_a_reviewed_vps_copy_is_replaced_and_only_that_one(self):
        theirs = b'x = 3  # another session\n'
        (self.team / 'chef_work.py').write_bytes(theirs)
        with self.assertRaisesRegex(SystemExit, 'never had'):
            self.sync(accept={'chef_work.py': '0' * 16})  # a prefix of some other version
        self.sync(accept={'chef_work.py': sha(theirs)[:16]})
        self.assertEqual((self.team / 'chef_work.py').read_bytes(), self.new)

    def test_a_reviewed_hand_edit_is_replaced(self):
        (self.team / 'chef_work.py').write_bytes(self.new)
        self.sync(accept={'chef_work.py': sha(self.new)[:20]})
        self.assertEqual((self.team / 'sfa_notice.py').read_bytes(), b'y = 1\n')

    def test_a_file_that_does_not_compile_changes_nothing(self):
        with self.assertRaises(SyntaxError):
            self.sync({'chef_work.py': b'def (\n', 'sfa_notice.py': b'y = 1\n'})
        self.unchanged()

    def fake_fcntl(self, busy=None):
        """A stand-in for fcntl (Unix only): records each lock taken. `busy` maps a lock to how many tries find it held (always
        when the count is None)."""
        taken, busy = [], dict(busy or {})

        def flock(handle, flags):
            name = Path(handle.name).name
            if name in busy and (busy[name] is None or busy[name] > 0):
                if busy[name] is not None:
                    busy[name] -= 1
                raise BlockingIOError
            taken.append(name)
        p = patch.dict('sys.modules', fcntl=types.SimpleNamespace(LOCK_EX=2, LOCK_NB=4, flock=flock))
        p.start()
        self.addCleanup(p.stop)
        return taken

    def test_the_locks_are_taken_longest_held_first_and_made_for_the_hermes_user(self):
        taken, owned = self.fake_fcntl(), []
        (self.team / 'state').mkdir()
        (self.team / 'state/run.lock').write_text('')
        with d.team_locks(self.team, wait=0, pause=0, own=lambda p, u, g: owned.append((Path(p).name, u, g))):
            self.assertEqual(taken, ['work.lock', 'run.lock', 'reporter.lock'])
        self.assertEqual(sorted(owned), [('chefs', 10000, 10000), ('reporter.lock', 10000, 10000), ('telegram', 10000, 10000),
                                         ('work.lock', 10000, 10000)])  # run.lock was already there: left as it was

    def test_a_lock_that_stays_busy_changes_nothing(self):
        self.fake_fcntl(busy={'run.lock': None})
        with self.assertRaisesRegex(SystemExit, 'state/run.lock stayed busy; nothing changed'):
            d.team_locks(self.team, wait=0, pause=0, own=lambda *a: None)
        with self.assertRaisesRegex(SystemExit, 'stayed busy'):
            d.sync_bot(self.team, self.files, self.known, d.CALLERS, [('tests', ['t'])], self.run_check, 'stamp',
                       lock=lambda team: d.team_locks(team, wait=0, pause=0, own=lambda *a: None))
        self.unchanged()

    def test_the_three_locks_share_one_deadline(self):
        # The chef pass holds its lock for two tries, the coordinator for one; each try is 40 seconds later on the clock.
        self.fake_fcntl(busy={'work.lock': 2, 'run.lock': 1})
        clock = iter(range(0, 1000, 40))
        with patch('time.monotonic', lambda: next(clock)), patch('time.sleep', lambda s: None):
            with self.assertRaisesRegex(SystemExit, 'state/run.lock stayed busy'):
                d.team_locks(self.team, wait=100, pause=4, own=lambda *a: None)  # 2 waits for work.lock leave no time for run.lock
        self.fake_fcntl(busy={'work.lock': 2, 'run.lock': 1})
        clock = iter(range(0, 1000, 10))
        with patch('time.monotonic', lambda: next(clock)), patch('time.sleep', lambda s: None):
            d.team_locks(self.team, wait=100, pause=4, own=lambda *a: None).close()  # with time to spare, all three are taken


class DeployBot(Team):
    """deploy_bot: the whole bot step, with its report kept on the VPS whatever happens."""

    def setUp(self):
        super().setUp()
        self.said, self.units = [], Path(self.dir.name) / 'units'
        self.units.mkdir()
        self.config = {'callers': d.CALLERS, 'checks': [('tests', ['t'])], 'services': ('qt-telegram-listener.service',),
                       'unit_dir': str(self.units), 'service': d.SERVICE, 'timer': d.TIMER, 'profiles': ['profiles']}

    def run_all(self, argv, **kwargs):
        if argv[0] == 'profiles':
            return Done(returncode=0, stdout='Hermes notice: profiles moved\n["qt-fixer"]\n', stderr='')
        if argv[:2] == ['systemctl', 'is-active']:
            return Done(returncode=0, stdout='inactive', stderr='')
        return self.run_check(argv, **kwargs)

    def deploy(self, accept=None):
        return d.deploy_bot(self.team, self.files, self.known, accept, self.config, self.run_all, 'stamp',
                            lock=lambda team: contextlib.nullcontext(), say=self.said.append)

    def kept(self):
        return json.loads((self.team / 'operator-tests/chefs-stamp.json').read_text())

    def test_the_report_is_kept_and_printed(self):
        report = self.deploy()
        self.assertEqual((report['files'], report['missingProfiles'], report['services']),
                         (['chef_work.py', 'sfa_notice.py'], ['qt-fixer'], {'qt-telegram-listener.service': 'not running'}))
        self.assertTrue((self.units / 'qt-chef-work.timer').exists())
        self.assertEqual(self.kept(), report)
        self.assertEqual(json.loads(self.said[0]), report)
        self.assertIn(('chefs-stamp.json.new', 0o600), self.modes)

    def test_a_failure_is_kept_too_and_still_raised(self):
        self.breaks = 't'
        with self.assertRaisesRegex(RuntimeError, 'tests check failed'):
            self.deploy()
        self.assertEqual(self.kept(), {'stamp': 'stamp', 'error': 'RuntimeError: tests check failed: boom'})
        self.unchanged()

    def test_a_closed_connection_does_not_undo_a_finished_deploy(self):
        def gone(text):
            raise BrokenPipeError
        report = d.deploy_bot(self.team, self.files, self.known, None, self.config, self.run_all, 'stamp',
                              lock=lambda team: contextlib.nullcontext(), say=gone)
        self.assertEqual(((self.team / 'chef_work.py').read_bytes(), self.kept()), (self.new, report))

    def test_the_shipped_source_runs_without_this_module(self):
        ns = {}
        exec(compile(d.remote_code([d.team_locks, d.sync_bot, d.restart_running, d.install_units, d.profiles_missing, d.deploy_bot],
                                   ''), 'remote', 'exec'), ns)
        ns['deploy_bot'](self.team, self.files, self.known, None, self.config, self.run_all, 'stamp',
                         lock=lambda team: contextlib.nullcontext(), say=self.said.append)
        self.assertEqual((self.team / 'chef_work.py').read_bytes(), self.new)


class Diff(Team):
    def test_only_copies_bot_would_refuse_are_sent_back(self):
        (self.team / 'chef_work.py').write_bytes(b'x = 3\n')  # never committed
        (self.team / 'sfa_notice.py').write_bytes(b'y = 1\n')  # committed, and not in the release record
        got = d.vps_versions(self.team, ['chef_work.py', 'sfa_notice.py', 'rechecks.py'], dict(self.known, **{'rechecks.py': []}))
        self.assertEqual(list(got), ['chef_work.py'])
        self.assertEqual(base64.b64decode(got['chef_work.py']['data']), b'x = 3\n')
        (self.team / 'chef_work.py').write_bytes(self.new)  # committed, but not what the last deploy recorded
        self.assertEqual(list(d.vps_versions(self.team, ['chef_work.py'], self.known)), ['chef_work.py'])

    def test_the_diff_shows_what_bot_would_change_and_the_accept_to_use(self):
        vps = {'chef_work.py': {'sha256': 'ab' * 32, 'data': base64.b64encode(b'x = 3\r\n').decode()}}
        text = d.show_diffs({'chef_work.py': b'x = 2\n'}, vps)
        self.assertIn('--- vps/chef_work.py\n+++ HEAD/chef_work.py\n', text)
        self.assertIn('-x = 3\n+x = 2\n', text)
        self.assertIn('python deploy_chefs.py bot --accept chef_work.py=' + 'ab' * 8 + '\n', text)
        self.assertIn('without --accept', d.show_diffs({}, {}))

    def test_accept_needs_a_reviewed_version(self):
        self.assertEqual(d.parse_accept(f'chef_work.py={"a" * 16}, workflow.py={"b" * 64}'),
                         {'chef_work.py': 'a' * 16, 'workflow.py': 'b' * 64})
        self.assertEqual(d.parse_accept(''), {})
        for bad in ('chef_work.py=abc', 'chef_work.py', 'notes.py=' + 'a' * 16, 'chef_work.py=' + 'g' * 16):
            with self.subTest(bad), self.assertRaisesRegex(SystemExit, 'Check --accept'):
                d.parse_accept(bad)


class Units(unittest.TestCase):
    def test_the_timer_is_installed_enabled_and_its_first_pass_started_without_waiting(self):
        calls = []

        def run(argv, **kwargs):
            calls.append(argv)
            return Done(returncode=0, stdout='NEXT qt-chef-work.timer', stderr='')
        with tempfile.TemporaryDirectory() as folder:
            listed = d.install_units(folder, d.SERVICE, d.TIMER, run)
            self.assertEqual((Path(folder) / 'qt-chef-work.timer').read_text(), d.TIMER)
        self.assertEqual([c[:2] for c in calls], [['systemd-analyze', 'verify'], ['systemd-analyze', 'verify'], ['systemctl', 'daemon-reload'],
                                                 ['systemctl', 'enable'], ['systemctl', 'start'], ['systemctl', 'list-timers']])
        self.assertEqual((calls[3][2], calls[4][2:]), ('--now', ['--no-block', 'qt-chef-work.service']))
        self.assertEqual(listed, 'NEXT qt-chef-work.timer')

    def test_only_running_services_are_restarted(self):
        calls = []

        def run(argv, **kwargs):
            calls.append(argv)
            return Done(returncode=0, stdout='active' if argv[-1] == 'qt-telegram-listener.service' else 'inactive', stderr='')
        out = d.restart_running(d.SERVICES, run)
        self.assertEqual(out['qt-telegram-listener.service'], 'restarted')
        self.assertEqual(out['qt-ai-recipes-bridge.service'], 'not running')
        self.assertEqual([c for c in calls if c[1] == 'restart'], [['systemctl', 'restart', 'qt-telegram-listener.service']])

    def test_the_profile_check_reads_its_last_line_and_never_breaks_the_report(self):
        answer = lambda code, out: (lambda argv, **kwargs: Done(returncode=code, stdout=out, stderr=''))  # noqa: E731
        self.assertEqual(d.profiles_missing(answer(0, 'a notice\n["qt-safety"]\n\n'), ['p']), ['qt-safety'])
        self.assertEqual(d.profiles_missing(answer(0, '[]\n'), ['p']), [])
        for code, out in ((1, '["qt-safety"]\n'), (0, 'no json here\n'), (0, ''), (0, '{"a": 1}\n')):
            with self.subTest(out=out):
                self.assertEqual(d.profiles_missing(answer(code, out), ['p']), 'not checked')


class Main(unittest.TestCase):
    def test_accept_goes_only_with_bot(self):
        with patch('sys.stderr', io.StringIO()), self.assertRaises(SystemExit) as stop:
            d.main(['diff', '--accept', 'chef_work.py=' + 'a' * 16])
        self.assertEqual(stop.exception.code, 2)

    def test_a_dropped_connection_says_how_to_find_out_what_happened(self):
        def remote(code, timeout=120):
            self.assertEqual(timeout, d.SSH_TIMEOUT)
            raise subprocess.TimeoutExpired('ssh', timeout)
        fake = types.SimpleNamespace(helper=types.SimpleNamespace(remote=remote))
        out = io.StringIO()
        with patch.dict(sys.modules, setup=fake), patch.object(d, 'committed', return_value=({}, {})), patch('sys.stdout', out):
            d.main(['bot'])
        self.assertIn('python deploy_chefs.py result', out.getvalue())


if __name__ == '__main__':
    unittest.main()
