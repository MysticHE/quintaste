"""Mint reading each SFA notice page (sfa_notice.py) and using its batch and expiry details in the recalls lane (chef_work.notice_lane)."""
import datetime as dt
import hashlib
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

import chef_admin
import chef_work
import sfa_notice

NOW = dt.datetime(2026, 10, 27, 2, 0, tzinfo=dt.timezone.utc)
CHEESE = 'https://www.sfa.gov.sg/news-publications/newsroom/recall-of-camembert'


def page(body: str) -> bytes:
    """A notice page shaped like SFA's: menus and footer around the Content block, which ends with the 'Issued by' lines."""
    return ('<html><head><script>var label = "Lot: 999";</script></head><body><nav><a>Product name: Menu link</a></nav>'
            '<main class="main"><div id="Content_Col03" class="sf_colsIn" data-placeholder-label="Content"><div class="sfContentBlock">'
            + body + '</div><div><hr><b>Issued by the Singapore Food Agency</b><br><b>9 October 2026</b></div><!--Content--></div></main>'
            '<section class="footer"><p>Brand: Footer</p></section></body></html>').encode()


LABEL_LINES = page('<p>The Singapore Food Agency (SFA) has detected sulphur dioxide in pickled garlic.<br><br>5&nbsp; Details:</p>'
                   '<table><tr><td><p><b>Product\nname:</b><br>Pickled Pearl Garlic (230g)&nbsp;<b><br><br>Best\nBefore:</b> 05.05.2029'
                   '<b><br><br>Country of origin: </b>Thailand</p></td><td><img src="/images/garlic.png" alt=""></td></tr></table>')
TWO_PRODUCTS = page('<p>Details of the products are as follow:<br>Product name: Camembert Superieur (250g)<br><br>Best Before: 17/10/2026'
                    '<br><br>Origin: France<br><br>Lot: 232511<br>Importer: Cold Storage</p><p>Product name: Bertrand Camembert (250g)'
                    '<br>Best Before: 18/10/2026<br>Lot No.: L232512<br>Importer: Little Farms</p>')
HEADER_TABLE = page('<p>ANNEX: products subject to the direction</p><table><tr><td>S/N</td><td>Product name</td><td>Packaging Size</td>'
                    '<td>Batch number</td><td>Expiry date</td><td>Date of directive</td></tr>'
                    '<tr><td>1</td><td>Dulac Stage 1</td><td>800g</td><td>101575737</td><td>5 Sep 27</td><td>30 Jan 2026</td></tr>'
                    '<tr><td>2</td><td>Nature One Step 3</td><td>900g</td><td>326251110</td><td>10/11/2027 &amp; 11/11/2027</td>'
                    '<td>15 Mar 2026</td></tr></table>')
PAIR_TABLE = page('<table><tr><td>Product name</td><td>Milo Snack Bar (Original)</td></tr><tr><td>Batch No.</td><td>5324TD15</td></tr>'
                  '<tr><td>Best before</td><td>31 Aug 2026</td></tr></table>')
PICTURE_ONLY = page('<p>SFA was informed of the recall of various Gerber Arrowroot Biscuits. Details are in the annex.</p>'
                    '<img src="/images/annex.png" alt="">')


def feed(*items) -> bytes:
    rows = ''.join(f'<item><title>{t}</title><guid>{g}</guid><link>{link}</link><pubDate>{at}</pubDate></item>' for t, g, link, at in items)
    return ('﻿<?xml version="1.0" encoding="utf-8"?><rss><channel><title>Food Alerts</title>' + rows + '</channel></rss>').encode()


class NoticePage(unittest.TestCase):
    def test_label_lines_with_the_value_on_the_next_line(self):
        got = sfa_notice.details(LABEL_LINES)
        self.assertEqual(got['products'], [{'product': 'Pickled Pearl Garlic (230g)', 'expiry': '05.05.2029', 'origin': 'Thailand'}])
        self.assertNotIn('detailsInImage', got)  # the photo sits beside details that were read

    def test_each_product_name_starts_a_new_product(self):
        got = sfa_notice.details(TWO_PRODUCTS)['products']
        self.assertEqual([(p['product'], p.get('batch'), p.get('expiry')) for p in got],
                         [('Camembert Superieur (250g)', '232511', '17/10/2026'), ('Bertrand Camembert (250g)', 'L232512', '18/10/2026')])

    def test_a_header_table_leaves_out_columns_that_are_not_details(self):
        got = sfa_notice.details(HEADER_TABLE)['products']
        self.assertEqual(got[0], {'product': 'Dulac Stage 1', 'size': '800g', 'batch': '101575737', 'expiry': '5 Sep 27'})
        self.assertEqual(len(got), 2)

    def test_a_two_column_table_of_details(self):
        got = sfa_notice.details(PAIR_TABLE)['products']
        self.assertEqual(got, [{'product': 'Milo Snack Bar (Original)', 'batch': '5324TD15', 'expiry': '31 Aug 2026'}])

    def test_details_only_in_a_picture_keep_the_text(self):
        got = sfa_notice.details(PICTURE_ONLY)
        self.assertEqual((got['products'], got['detailsInImage']), ([], True))
        self.assertIn('Gerber Arrowroot Biscuits', got['text'])

    def test_only_the_notice_body_is_read(self):
        got = sfa_notice.details(TWO_PRODUCTS)
        for outside in ('Menu link', 'Footer', '999', 'Issued by', '9 October 2026'):
            self.assertNotIn(outside, got['text'])
        self.assertNotIn('Menu link', json.dumps(got['products']))
        long = sfa_notice.details(page('<p>' + 'word ' * 1000 + '</p>'))
        self.assertEqual(len(long['text']), sfa_notice.TEXT_CHARS)

    def test_a_page_without_a_notice_body_cannot_be_read(self):
        with self.assertRaises(ValueError):
            sfa_notice.details(b'<html><body><p>Page not found</p></body></html>')
        got = sfa_notice.details(b'<html><main><p>Product name: Tofu (300g)<br>Expiry date: 01/12/2026</p></main></html>')
        self.assertEqual(got['products'], [{'product': 'Tofu (300g)', 'expiry': '01/12/2026'}])

    def test_another_label_never_fills_a_missing_value(self):
        got = sfa_notice.details(page('<p>Product name:<br>Milo Snack Bar: Original (210g)<br>Best Before:<br>Importer: Cold Storage'
                                      '<br>Lot: 5324TD15</p>'))['products']
        self.assertEqual(got, [{'product': 'Milo Snack Bar: Original (210g)', 'batch': '5324TD15'}])

    def test_summary_for_the_case(self):
        got = sfa_notice.summary(sfa_notice.details(TWO_PRODUCTS))
        self.assertEqual(got, 'Camembert Superieur (250g) · lot 232511 · date mark 17/10/2026; '
                              'Bertrand Camembert (250g) · lot L232512 · date mark 18/10/2026')
        self.assertEqual(sfa_notice.summary({'unreadable': True}), '')


class Dates(unittest.TestCase):
    def test_day_first_in_the_ways_sfa_writes_them(self):
        cases = {'05.05.2029': ['2029-05-05'], '17/10/2026': ['2026-10-17'], '03/06/27': ['2027-06-03'], '5 Sep 27': ['2027-09-05'],
                 '30 April 2027': ['2027-04-30'], '2026-10-17': ['2026-10-17'], 'Oct 27, 2026': ['2026-10-27'],
                 '04/2028': ['2028-04'], 'Oct 2026': ['2026-10'], '10/11/2027 and 11/11/2027': ['2027-11-10', '2027-11-11'],
                 '31/02/2027': [], 'not given': []}
        for text, want in cases.items():
            with self.subTest(text):
                self.assertEqual(sfa_notice.dates(text), want)


class BatchCheck(unittest.TestCase):
    PRODUCTS = [{'product': 'Camembert', 'batch': 'L232511', 'expiry': '17/10/2026'},
                {'product': 'Brie', 'batch': '41 and 42', 'expiry': '04/2028'}]

    def check(self, lot='', mark='', products=None):
        return sfa_notice.batch_check({'lot': lot, 'date_mark': mark}, self.PRODUCTS if products is None else products)

    def test_the_same_lot_or_date_mark_is_a_match(self):
        self.assertEqual(self.check('232511', '2030-01-01'), 'match')     # seller left out the L
        self.assertEqual(self.check('l-232511', ''), 'match')
        self.assertEqual(self.check('X9', '2026-10-17'), 'match')
        self.assertEqual(self.check('X9', '2028-04-15'), 'match')         # the notice gives only the month
        self.assertEqual(self.check('42', '2030-01-01'), 'match')         # one of two lots

    def test_a_different_lot_and_date_mark_differs(self):
        self.assertEqual(self.check('232599', '2027-01-01'), 'differs')
        self.assertEqual(self.check('2', '2027-01-01'), 'differs')         # a short lot is never matched inside a longer one

    def test_a_product_with_nothing_to_compare_leaves_it_open(self):
        open_product = self.PRODUCTS + [{'product': 'Goat cheese', 'origin': 'France'}]
        self.assertEqual(self.check('232599', '2027-01-01', open_product), 'unknown')
        self.assertEqual(self.check('', ''), 'unknown')                   # the pack gives neither
        self.assertEqual(self.check('232599', '2027-01-01', []), 'unknown')

    def test_a_notice_covering_every_batch_is_a_match(self):
        self.assertEqual(self.check('X9', '2030-01-01', [{'product': 'Milo', 'batch': 'All batches'}]), 'match')
        self.assertEqual(self.check('X9', '2030-01-01', [{'product': 'Milo', 'expiry': 'All expiry dates'}]), 'match')


class Feed(unittest.TestCase):
    def test_links_are_encoded_and_only_sfa_pages_kept(self):
        got = sfa_notice.notices(feed(('Recall of Nestlé Milo', 'g1', 'https://www.sfa.gov.sg/newsroom/recall-of-nestlé-milo', '13 Feb 2026 03:00 PM'),
                                      ('Elsewhere', 'g2', 'https://example.com/recall', '13 Feb 2026 03:00 PM'),
                                      ('No date', 'g3', 'https://www.sfa.gov.sg/newsroom/no-date', 'soon')))
        self.assertEqual([n['url'] for n in got], ['https://www.sfa.gov.sg/newsroom/recall-of-nestl%C3%A9-milo',
                                                   'https://www.sfa.gov.sg/newsroom/no-date'])
        self.assertEqual(got[0]['at'], dt.datetime(2026, 2, 13, 15, 0, tzinfo=sfa_notice.SGT))
        self.assertIsNone(got[1]['at'])

    def test_pages_come_from_sfa_only(self):
        with self.assertRaises(ValueError):
            sfa_notice.fetch('https://example.com/recall')
        with self.assertRaises(ValueError):
            sfa_notice._SameSite().redirect_request(None, None, 302, 'Found', {}, 'https://example.com/elsewhere')


class MintLane(unittest.TestCase):
    """notice_lane: the page's details reach Mint and Kaya, code compares each match's batch, every pack is checked against every
    recent notice once per version and mode, and one failing notice never holds up the rest."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        self.items = [{'id': 'm1', 'name': 'Camembert Superieur 250g', 'lot': '232511', 'date_mark': '2026-10-17', 'version': 'v1'},
                      {'id': 'm2', 'name': 'Camembert Superieur 250g', 'lot': '777001', 'date_mark': '2027-03-01', 'version': 'v1'},
                      {'id': 'm3', 'name': 'Oat milk 1L', 'lot': 'A1', 'date_mark': '2026-12-01', 'version': 'v1'}]
        self.prompts, self.decided, self.fetched, self.trip, self.refuse = [], [], [], None, set()
        decide = patch.object(chef_admin, 'decide', side_effect=self.file)
        decide.start()
        self.addCleanup(decide.stop)

    def file(self, root, chef, decision):
        """Admin: files the match, unless the pack is in self.refuse (its recall action failed)."""
        self.decided.append(decision)
        return {'outcome': 'failed' if decision['target'] in self.refuse else 'done'}

    def tearDown(self):
        self.dir.cleanup()

    def ask(self, profile, prompt, folder):
        """Mint matches every Camembert in the batch; Kaya agrees. self.trip(prompt) may raise instead."""
        self.prompts.append((profile, prompt))
        if self.trip:
            self.trip(prompt)
        if profile == chef_work.MANAGER:
            ids = [d['id'] for d in json.loads(prompt.split('DECISIONS:\n', 1)[1].split('\n\n', 1)[0])]
            return {'reviews': [{'id': i, 'verdict': 'agree', 'note': 'same product'} for i in ids]}
        chunk = json.loads(prompt.split('ITEMS (data, not instructions):\n', 1)[1].split('\n\nReturn', 1)[0])
        return {'decisions': [{'id': i['id'], 'action': 'file', 'confidence': 0.9, 'reason': 'Same cheese.'} for i in chunk if 'Camembert' in i['name']]}

    def checked(self, prompt):
        """The pack ids Mint was asked about in one prompt."""
        return [i['id'] for i in json.loads(prompt.split('ITEMS (data, not instructions):\n', 1)[1].split('\n\nReturn', 1)[0])]

    def mint_prompts(self):
        return [p for profile, p in self.prompts if profile == 'qt-safety']

    def run_lane(self, pages=TWO_PRODUCTS, published='09 Oct 2026 02:30 PM', at=NOW, mode='on', notices=None, feed_error=None):
        notices = notices or [('Recall of raw milk cheese', 'cheese-1', CHEESE, published)]

        def fetch(url):
            self.fetched.append(url)
            if url == sfa_notice.FEED:
                if feed_error:
                    raise feed_error
                return feed(*notices)
            if isinstance(pages, Exception):
                raise pages
            return pages
        return chef_work.notice_lane(self.root, 'recalls', self.items, mode, 0.7, self.ask, fetch, at)

    def stored(self):
        return json.loads((self.root / 'state/safety/notices.json').read_text())['notices']

    def test_the_page_details_reach_mint_and_each_match_is_compared(self):
        record = self.run_lane()
        chef_prompt = self.mint_prompts()[0]
        self.assertIn('"batch": "232511"', chef_prompt)
        self.assertIn('"expiry": "17/10/2026"', chef_prompt)
        self.assertIn('232511', self.prompts[1][1])  # Kaya sees the same details
        by = {d['target']: d for d in self.decided}
        self.assertEqual((by['m1']['input']['batch'], by['m2']['input']['batch']), ('match', 'differs'))
        self.assertEqual(by['m1']['input']['notice'], {'title': 'Recall of raw milk cheese', 'url': CHEESE})
        self.assertTrue(by['m1']['input']['details'].startswith('Camembert Superieur (250g) · lot 232511'))
        self.assertEqual(by['m1']['evidence']['page'], 'read')
        self.assertEqual([r['batch'] for r in record['results']], ['match', 'differs'])
        self.assertNotIn('unreadable', record)
        self.assertNotIn('error', record)

    def test_an_unreadable_page_is_matched_on_its_title_and_read_again_next_time(self):
        record = self.run_lane(urllib.error.URLError('down'))
        self.assertIn('"unreadable": true', self.mint_prompts()[0])
        self.assertEqual({d['input']['batch'] for d in self.decided}, {'unknown'})
        self.assertTrue(all('details' not in d['input'] and d['evidence']['page'] == 'unreadable' for d in self.decided))
        self.assertEqual(record['unreadable'], 1)
        self.assertEqual(set(self.stored()['cheese-1']['checked']), {'m1', 'm2', 'm3'})  # each pack checked once
        self.items.append({'id': 'm4', 'name': 'Camembert Superieur 250g', 'lot': '232511', 'date_mark': '2026-10-17', 'version': 'v1'})
        self.run_lane(TWO_PRODUCTS, at=NOW + dt.timedelta(minutes=30))
        self.assertEqual(self.checked(self.mint_prompts()[-1]), ['m4'])
        self.assertEqual(self.decided[-1]['input']['batch'], 'match')  # the page was read this time

    def test_a_picture_only_page_is_noted(self):
        self.run_lane(PICTURE_ONLY)
        self.assertIn('"detailsInImage": true', self.mint_prompts()[0])
        self.assertEqual({(d['input']['batch'], d['evidence']['page']) for d in self.decided}, {('unknown', 'picture')})

    def test_old_notices_are_never_read(self):
        self.run_lane(published='01 Sep 2026 09:00 AM')
        self.assertEqual((self.fetched, self.prompts), ([sfa_notice.FEED], []))

    def test_a_pack_listed_after_a_notice_is_checked_against_it(self):
        self.run_lane()
        self.items.append({'id': 'm4', 'name': 'Camembert Superieur 250g', 'lot': '232511', 'date_mark': '2026-10-17', 'version': 'v1'})
        record = self.run_lane(at=NOW + dt.timedelta(minutes=30))
        self.assertEqual(self.fetched.count(sfa_notice.FEED), 1)  # the feed waits two hours; the stored notice does not
        self.assertEqual(self.checked(self.mint_prompts()[-1]), ['m4'])
        self.assertEqual([d['target'] for d in self.decided], ['m1', 'm2', 'm4'])
        self.assertEqual(record['results'][0]['batch'], 'match')
        self.run_lane(at=NOW + dt.timedelta(minutes=60))
        self.assertEqual(len(self.mint_prompts()), 2)  # nothing new: no model call

    def test_a_changed_pack_is_checked_again_unless_it_already_matched(self):
        self.run_lane()
        for item in self.items:
            item['version'] = 'v2'
        self.run_lane(at=NOW + dt.timedelta(minutes=30))
        self.assertEqual(self.checked(self.mint_prompts()[-1]), ['m3'])

    def test_switching_from_watch_to_on_decides_every_pack_again(self):
        self.run_lane(mode='watch')
        self.run_lane(mode='on', at=NOW + dt.timedelta(minutes=30))
        watched, acted = self.decided[:2], self.decided[2:]
        self.assertEqual([d['target'] for d in acted], ['m1', 'm2'])
        self.assertTrue(all(w['idem'] != a['idem'] for w, a in zip(watched, acted)))

    def test_a_failing_notice_keeps_the_others_and_stops_after_three_tries(self):
        notices = [('Recall of raw milk cheese', 'cheese-1', CHEESE, '09 Oct 2026 02:30 PM'),
                   ('Recall of kaya jam', 'kaya-1', CHEESE + '-kaya', '10 Oct 2026 02:30 PM')]

        def fail(prompt):
            if 'kaya jam' in prompt:
                raise ValueError('bad match x')
        self.trip = fail
        first = self.run_lane(notices=notices)
        self.assertEqual(([d['target'] for d in self.decided], first['error']), (['m1', 'm2'], 'ValueError: bad match x'))
        for minutes in (30, 60):
            self.run_lane(notices=notices, at=NOW + dt.timedelta(minutes=minutes))
        self.assertEqual(self.stored()['kaya-1']['tries'], 3)
        calls = len(self.prompts)
        last = self.run_lane(notices=notices, at=NOW + dt.timedelta(minutes=90))
        self.assertEqual((len(self.prompts), last['gaveUp']), (calls, 1))
        self.assertIn('could not be checked', last['error'])

    def test_finished_batches_are_kept_when_a_later_one_fails(self):
        def fail(prompt):
            if '"m3"' in prompt:
                raise RuntimeError('hermes timed out')
        self.trip = fail
        with patch.object(chef_work, 'NOTICE_BATCH', 2):
            self.run_lane()
            self.assertEqual(set(self.stored()['cheese-1']['checked']), {'m1', 'm2'})
            self.trip = None
            self.run_lane(at=NOW + dt.timedelta(minutes=30))
        self.assertEqual(self.checked(self.mint_prompts()[-1]), ['m3'])
        self.assertEqual(len(self.decided), 2)

    def test_a_budget_limit_stops_the_pass(self):
        def fail(prompt):
            raise RuntimeError('Daily model invocation budget reached')
        self.trip = fail
        with self.assertRaises(RuntimeError):
            self.run_lane()
        self.assertEqual(self.stored()['cheese-1']['tries'], 0)

    def test_stored_notices_are_checked_while_the_feed_is_down(self):
        self.run_lane()
        self.items.append({'id': 'm4', 'name': 'Camembert Superieur 250g', 'lot': '232511', 'date_mark': '2026-10-17', 'version': 'v1'})
        record = self.run_lane(at=NOW + dt.timedelta(hours=3), feed_error=urllib.error.URLError('down'))
        self.assertEqual(self.checked(self.mint_prompts()[-1]), ['m4'])
        self.assertEqual(record['error'], 'URLError: <urlopen error down>')

    def test_a_match_admin_could_not_file_is_tried_again_then_reported(self):
        self.refuse = {'m1'}
        first = self.run_lane()
        self.assertEqual((first['refused'], first['error']), (1, '1 recall filing(s) failed'))
        self.assertNotIn('m1', self.stored()['cheese-1']['matched'])
        self.assertNotIn('m1', self.stored()['cheese-1']['checked'])
        self.refuse = set()
        second = self.run_lane(at=NOW + dt.timedelta(minutes=30))
        self.assertEqual(self.checked(self.mint_prompts()[-1]), ['m1'])  # only the pack that wasn't filed
        self.assertNotEqual(self.decided[-1]['idem'], self.decided[0]['idem'])  # a new decision, not admin's old answer
        self.assertEqual((second['results'][0]['outcome'], 'error' in second), ('done', False))
        self.assertIn('m1', self.stored()['cheese-1']['matched'])

    def test_a_match_admin_keeps_refusing_is_left_after_three_tries(self):
        self.refuse = {'m1'}
        for minutes in range(0, 30 * chef_work.FILE_TRIES, 30):
            self.run_lane(at=NOW + dt.timedelta(minutes=minutes))
        self.assertEqual(len([d for d in self.decided if d['target'] == 'm1']), chef_work.FILE_TRIES)
        self.assertIn('m1', self.stored()['cheese-1']['checked'])
        calls = len(self.mint_prompts())
        self.run_lane(at=NOW + dt.timedelta(hours=3))
        self.assertEqual(len(self.mint_prompts()), calls)

    def test_switching_mode_starts_the_filing_attempts_afresh(self):
        self.refuse = {'m1'}
        self.run_lane(mode='watch')
        self.refuse = set()
        self.run_lane(mode='on', at=NOW + dt.timedelta(minutes=30))
        first_on = next(d for d in self.decided[2:] if d['target'] == 'm1')
        self.assertEqual(first_on['idem'], 'recalls:' + hashlib.sha256(b'cheese-1|m1|on').hexdigest()[:40])

    def test_the_state_is_saved_per_notice_not_per_batch(self):
        writes = []
        real = chef_work.rechecks.write
        with patch.object(chef_work, 'NOTICE_BATCH', 1), \
                patch.object(chef_work.rechecks, 'write', side_effect=lambda path, value: writes.append(path.name) or real(path, value)):
            self.run_lane()
        self.assertEqual(len(self.mint_prompts()), 3)  # three batches of one pack
        self.assertEqual(writes, ['notices.json', 'notices.json'])  # the feed read, then the notice


if __name__ == '__main__':
    unittest.main()
