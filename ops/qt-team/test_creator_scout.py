"""Weekly creator scout (creator_scout.py): diet claims from the creator's own words only, the YouTube endpoint allowlist, quotes
checked on stored pages, Instagram pacing and the 24-hour stop, and the hand-off to the app. No network."""
import tempfile
import time
import unittest
from pathlib import Path

import creator_scout as cs
from test_workflow import veg_capture

LIBRARY = {'creators': [{'id': 'woon-heng', 'name': 'Woon Heng', 'website': 'https://woonheng.com', 'channels': [
    {'platform': 'website', 'handle': 'woonheng.com', 'url': 'https://woonheng.com', 'checked_at': None},
    {'platform': 'instagram', 'handle': 'woonheng', 'url': 'https://www.instagram.com/woonheng/', 'checked_at': None},
    {'platform': 'youtube', 'handle': '@woonheng', 'url': 'https://www.youtube.com/@woonheng', 'checked_at': '2099-01-01T00:00:00Z'}]}],
    'written': [], 'blocked': []}


def channel_item(cid, title, description, country='SG', subs='1200', custom='@greenkitchen'):
    return {'id': cid, 'snippet': {'title': title, 'description': description, 'country': country, 'customUrl': custom},
            'statistics': {'subscriberCount': subs, 'videoCount': '40'}}


class FakeClient:
    def __init__(self, library=LIBRARY):
        self.library_value, self.sent = library, None

    def library(self):
        return self.library_value

    def scout(self, creators, channels):
        self.sent = (creators, channels)
        return {'added': len(creators), 'updated': 0, 'refreshed': len(channels), 'paused': 0}


class CreatorScoutTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_diets_come_only_from_a_real_claim(self):
        self.assertEqual(cs.diets_from('100% plant-based Malaysian recipes'), ['vegan'])
        self.assertEqual(cs.diets_from('Buddhist vegetarian recipes without onion and garlic'), ['vegetarian', 'buddhist', 'five-pungent-free'])
        self.assertEqual(cs.diets_from('家常素食 食谱'), ['vegetarian'])
        self.assertEqual(cs.diets_from('Traditional Jain recipes'), ['jain'])
        self.assertEqual(cs.diets_from('Easy dinners with vegetarian options'), [])  # partial
        self.assertEqual(cs.diets_from('This is not a vegetarian channel'), [])       # negated
        self.assertEqual(cs.diets_from('Buddhist temple stories'), [])               # no food claim

    def test_youtube_calls_only_search_and_channels(self):
        with self.assertRaises(ValueError):
            cs.youtube_get('../places/v1/places', {}, 'k')  # the paid Places API stays unreachable
        calls = []
        def get(path, params, key):
            calls.append(path)
            if path == 'search':
                return {'items': [{'id': {'channelId': 'UC1'}}, {'id': {'channelId': 'UC2'}}, {'id': {'channelId': 'UC3'}}]}
            return {'items': [channel_item('UC1', 'Green Kitchen SG', 'Vegan Singapore home recipes'),
                              channel_item('UC2', 'Weekend BBQ', 'Grilling meat every weekend', custom='@bbq'),
                              channel_item('UC3', 'Woon Heng', 'Vegan recipes', custom='@woonheng')]}
        found = cs.youtube_creators('k', cs.known_keys(LIBRARY), get)
        self.assertEqual(set(calls), {'search', 'channels'})
        self.assertEqual(calls.count('search'), len(cs.QUERIES))
        self.assertEqual([c['name'] for c in found], ['Green Kitchen SG'])  # the BBQ channel claims no diet; Woon Heng is known
        self.assertEqual((found[0]['region'], found[0]['diets'], found[0]['channels'][0]['followers']), ('singapore', ['vegan'], 1200))

    def test_web_creator_needs_its_quote_on_its_own_stored_page(self):
        raw = {'name': 'Lotus Kitchen', 'website': 'https://lotuskitchen.sg', 'country': 'SG',
               'channels': [{'platform': 'instagram', 'url': 'https://www.instagram.com/lotuskitchen/'}],
               'dietQuote': 'All our recipes are 100% vegetarian and free of onion and garlic.', 'dietQuoteUrl': 'https://lotuskitchen.sg/about'}
        self.assertEqual(cs.web_creator(self.root, raw), (None, 'quote-not-on-page'))  # nothing stored: a guess never enters the library
        veg_capture(self.root, 'https://lotuskitchen.sg/about', 'About us\nAll our recipes are 100% vegetarian and\nfree of onion and garlic.')
        creator, why = cs.web_creator(self.root, raw)
        self.assertIsNone(why)
        self.assertEqual((creator['region'], creator['diets']), ('singapore', ['vegetarian', 'five-pungent-free']))
        self.assertEqual(creator['channels'][0]['handle'], 'lotuskitchen')
        other = dict(raw, dietQuoteUrl='https://happycow.net/lotus')  # a directory, not the creator's own page
        self.assertEqual(cs.web_creator(self.root, other)[1], 'quote-not-from-own-page')

    def test_instagram_is_paced_and_stops_for_a_day_on_refusal(self):
        state, sleeps, users = {}, [], []
        found = [{'name': 'A', 'channels': [{'platform': 'instagram', 'handle': '', 'url': 'https://www.instagram.com/a_kitchen/'}]},
                 {'name': 'B', 'channels': [{'platform': 'instagram', 'handle': '', 'url': 'https://www.instagram.com/b_kitchen/'}]}]
        def profile(user):
            users.append(user)
            if user == 'b_kitchen':
                raise cs.Blocked('Instagram refused the request: TooManyRequestsException')
            return {'followers': 900, 'posts': 12, 'bio': '', 'external': None}
        refreshed, note = cs.instagram_pass(state, found, LIBRARY, profile, sleeps.append, now=1000)
        self.assertEqual(users, ['a_kitchen', 'b_kitchen'])  # stopped at the refusal: the library's Instagram profile was not tried
        self.assertEqual(found[0]['channels'][0]['followers'], 900)
        self.assertEqual(len(sleeps), 1)
        self.assertTrue(cs.PACE[0] <= sleeps[0] <= cs.PACE[1])
        self.assertEqual(state['instagramPausedUntil'], 1000 + cs.INSTAGRAM_PAUSE)
        self.assertIn('paused for 24 hours', note)
        self.assertEqual(cs.instagram_pass(state, found, LIBRARY, profile, sleeps.append, now=2000)[0], [])  # still paused

    def test_weekly_run_hands_new_creators_and_fresh_counts_to_the_app(self):
        (self.root / 'private').mkdir()
        (self.root / 'private/youtube-api.key').write_text('AIza' + 'x' * 35)
        veg_capture(self.root, 'https://lotuskitchen.sg/about', 'We cook 100% vegetarian Teochew food.')
        model = lambda role, prompt, folder, policy, seconds=None: ({'role': 'qt-cooker', 'creators': [
            {'name': 'Lotus Kitchen', 'website': 'https://lotuskitchen.sg', 'country': 'SG', 'channels': [],
             'dietQuote': 'We cook 100% vegetarian Teochew food.', 'dietQuoteUrl': 'https://lotuskitchen.sg/about'},
            {'name': 'Made Up', 'website': 'https://madeup.example', 'dietQuote': 'Vegan food', 'dietQuoteUrl': 'https://madeup.example'}]}, {})
        def get(path, params, key):
            if path == 'search':
                return {'items': [{'id': {'channelId': 'UC9'}}]}
            if 'forHandle' in params or params.get('id') == '@woonheng':
                return {'items': []}
            return {'items': [channel_item('UC9', 'Vegan Taiwan Home', 'Taiwanese vegan recipes', country='TW', custom='@vegantw')]}
        client, state = FakeClient(), {}
        summary = cs.run(self.root, state, self.root / 'scout', {'workerSeconds': 100}, client=client, run_model=model, youtube_get=get,
                         instagram_profile=lambda user: {'followers': 51000, 'posts': 800, 'bio': '', 'external': None}, sleep=lambda s: None)
        creators, channels = client.sent
        self.assertEqual([c['name'] for c in creators], ['Lotus Kitchen', 'Vegan Taiwan Home'])  # Singapore first; the unverified one dropped
        self.assertEqual(channels, [{'creatorId': 'woon-heng', 'platform': 'instagram', 'handle': 'woonheng',
                                     'url': 'https://www.instagram.com/woonheng/', 'followers': 51000, 'posts': 800}])
        self.assertEqual((summary['found'], summary['web']), (2, 1))
        self.assertIn('web candidates dropped: quote-not-on-page 1', summary['notes'])

    def test_run_without_a_key_or_library(self):
        model = lambda *a, **k: ({'creators': []}, {})
        client = FakeClient()
        summary = cs.run(self.root, {}, self.root / 'scout', {}, client=client, run_model=model,
                         instagram_profile=lambda user: None, sleep=lambda s: None)
        self.assertIn('no YouTube key installed', summary['notes'])
        from unittest.mock import patch
        import importlib.util
        with patch.object(importlib.util, 'find_spec', return_value=None):  # the VPS venv may lack instaloader: skip, never crash
            summary = cs.run(self.root, {}, self.root / 'scout', {}, client=FakeClient(), run_model=model)
        self.assertIn('Instagram skipped: instaloader is not installed', summary['notes'])
        with self.assertRaises(RuntimeError):
            cs.run(self.root, {}, self.root / 'scout', {}, client=FakeClient(library=None), run_model=model)

    def test_reports_are_packed_under_the_proxy_body_limit(self):
        import creators_client
        from unittest.mock import patch
        # 22 Oct 2026: the first scout's 15 creators were refused with 413 by the 16 KB proxy limit in front of the app.
        creator = lambda n: {'name': 'Creator %d' % n, 'website': 'https://c%d.example' % n, 'note': 'x' * 900, 'diets': ['vegan'],
                             'channels': [{'platform': 'instagram', 'url': 'https://www.instagram.com/c%d/' % n}]}
        refresh = [{'creatorId': 'woon-heng', 'platform': 'instagram', 'handle': 'h%d' % n, 'url': 'https://www.instagram.com/h%d/' % n,
                    'followers': n, 'posts': n} for n in range(150)]
        bodies = []
        def call(route, data):
            bodies.append(creators_client.size(data))
            return {'added': len(data['creators']), 'updated': 0, 'refreshed': len(data['channels']), 'paused': 0}
        with patch.object(creators_client, 'call', side_effect=call):
            counts = creators_client.scout([creator(n) for n in range(40)], refresh)
        self.assertEqual((counts['added'], counts['refreshed']), (40, 150))
        self.assertGreater(len(bodies), 2)
        self.assertTrue(all(b < 16384 for b in bodies), bodies)
        with patch.object(creators_client, 'call', side_effect=call):
            self.assertEqual(creators_client.scout([], [])['added'], 0)  # one empty call still runs the app's 90-day pause

    def test_finds_are_screened_so_one_never_fails_the_batch(self):
        ok = {'name': 'Green Kitchen SG', 'website': 'https://green.example', 'channels': [
            {'platform': 'youtube', 'handle': '@green', 'url': 'https://www.youtube.com/@green'},
            {'platform': 'tiktok', 'handle': 'x', 'url': 'http://tiktok.example/x'}, {'platform': 'other', 'handle': 'y', 'url': 'https://e.example/' + 'y' * 400}]}
        kept = cs.sendable(ok)
        self.assertEqual([ch['platform'] for ch in kept['channels']], ['youtube'])
        self.assertIsNone(cs.sendable({'name': '素食小厨房', 'website': None, 'channels': [{'platform': 'youtube', 'handle': '@s', 'url': 'https://www.youtube.com/@s'}]}))
        self.assertIsNone(cs.sendable({'name': 'No Links', 'website': 'http://insecure.example', 'channels': []}))

    def test_due_weekly_and_retries_the_next_day(self):
        now = time.time()
        self.assertTrue(cs.due({}, now))
        self.assertFalse(cs.due({'creatorScoutAt': now - 3 * 86400}, now))
        self.assertFalse(cs.due({'creatorScoutAt': 0, 'creatorScoutTriedAt': now - 3600}, now))
        self.assertTrue(cs.due({'creatorScoutAt': now - 8 * 86400, 'creatorScoutTriedAt': now - 2 * 86400}, now))


if __name__ == '__main__':
    unittest.main()
