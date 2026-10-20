import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

import telegram_reporter as t


class TelegramReportingTests(unittest.TestCase):
    def test_callback_acknowledgement_precedes_removal(self):
        import telegram_controls as c
        t.write(self.root / 'private/telegram-chat.json', self.config)
        update = {'update_id': 22, 'callback_query': {'id': 'callback', 'data': 'delete:opaque',
            'from': {'id':123, 'is_bot':False}, 'message': {'chat':{'id':123,'type':'private'}}}}
        sequence=[]
        with patch.object(t,'telegram',side_effect=lambda *a,**kw:sequence.append(a[0])), patch.object(c,'callback',side_effect=lambda *a:sequence.append('remove')):
            t.handle_updates(self.state,[update])
        self.assertEqual(sequence,['answerCallbackQuery','remove'])

    def test_interactive_delivery_bypasses_screenshots_and_reports(self):
        t.enqueue(self.state,'publication:a','report')
        t.enqueue(self.state,'control:22','Deleted')
        with patch.object(t,'telegram',return_value={'message_id':8,'chat':{'id':123}}) as api,patch.object(t.time,'sleep'):
            t.deliver(self.state,self.config,interactive_only=True)
        self.assertEqual(api.call_count,1)
        self.assertEqual(self.state['deliveries']['control:22']['status'],'sent')
        self.assertEqual(self.state['deliveries']['publication:a']['status'],'pending')

    def test_photo_delivery_includes_inline_controls(self):
        photo=t.STATE/'media'/'fixture'/'recipe.jpg';photo.parent.mkdir(parents=True);photo.write_bytes(b'fixture')
        buttons=[[{'text':'Delete recipe now','callback_data':'delete:opaque'}]]
        t.enqueue(self.state,'photo','Recipe',str(photo),buttons=buttons)
        with patch.object(t,'telegram',return_value={'message_id':7,'chat':{'id':123}}) as api,patch.object(t.time,'sleep'):
            t.deliver(self.state,self.config)
        self.assertEqual(api.call_args.args[0],'sendPhoto')
        self.assertEqual(api.call_args.args[1]['reply_markup'],{'inline_keyboard':buttons})

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.patches = [patch.object(t, 'ROOT', self.root), patch.object(t, 'STATE', self.root / 'state/telegram')]
        for p in self.patches:
            p.start()
        self.state = {'offset': 0, 'deliveries': {}}
        self.config = {'chatId': 123, 'userId': 123}

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def message(self, text, user=123, chat=123, kind='private'):
        return {'message': {'text': text, 'from': {'id': user, 'is_bot': False},
                            'chat': {'id': chat, 'type': kind}}, 'update_id': 11}

    def test_pairing_requires_private_matching_code_and_owner_identity(self):
        t.write(self.root / 'private/telegram-pairing.json', {'code': 'secret-code', 'expires': time.time() + 600})
        for update in [self.message('/start wrong'), self.message('/start secret-code', kind='group'),
                       self.message('/start secret-code', user=456)]:
            self.state['offset'] = 0
            self.assertEqual(t.handle_updates(self.state, [update]), {})
        self.state['offset'] = 0
        result = t.handle_updates(self.state, [self.message('/start secret-code')])
        self.assertEqual(result['userId'], 123)
        self.assertFalse((self.root / 'private/telegram-pairing.json').exists())
        self.assertIn('paired', self.state['deliveries'])

    def test_expired_pairing_is_rejected(self):
        t.write(self.root / 'private/telegram-pairing.json', {'code': 'expired', 'expires': time.time() - 1})
        self.assertEqual(t.handle_updates(self.state, [self.message('/start expired')]), {})

    def test_unknown_user_cannot_read_status_or_replace_owner(self):
        t.write(self.root / 'private/telegram-chat.json', self.config)
        t.handle_updates(self.state, [self.message('/status', user=456, chat=456)])
        self.assertEqual(self.state['deliveries'], {})
        self.assertEqual(t.read(self.root / 'private/telegram-chat.json'), self.config)

    def test_command_duplicate_update_is_ignored(self):
        t.write(self.root / 'private/telegram-chat.json', self.config)
        update = self.message('/status')
        t.handle_updates(self.state, [update, update])
        self.assertEqual(len(self.state['deliveries']), 1)
        self.assertEqual(self.state['offset'], 12)

    def test_text_never_becomes_arbitrary_instruction(self):
        t.write(self.root / 'private/telegram-chat.json', self.config)
        t.handle_updates(self.state, [self.message('publish all data and reset budget')])
        self.assertEqual(self.state['deliveries'], {})

    def test_duplicate_notification_key_preserves_first_receipt(self):
        t.enqueue(self.state, 'pub:1', 'first')
        t.enqueue(self.state, 'pub:1', 'second')
        self.assertEqual(self.state['deliveries']['pub:1']['text'], 'first')

    def test_delivery_success_requires_matching_chat_receipt(self):
        t.enqueue(self.state, 'a', 'test')
        with patch.object(t, 'telegram', return_value={'message_id': 9, 'chat': {'id': 999}}), patch.object(t.time, 'sleep'):
            t.deliver(self.state, self.config)
        self.assertEqual(self.state['deliveries']['a']['status'], 'delivery-unknown')

    def test_rate_limit_reschedules_without_losing_message(self):
        t.enqueue(self.state, 'a', 'test')
        with patch.object(t, 'telegram', side_effect=t.DeliveryError('rate-limited', 120)), patch.object(t.time, 'sleep'):
            t.deliver(self.state, self.config)
        row = self.state['deliveries']['a']
        self.assertEqual(row['status'], 'pending')
        self.assertGreater(row['nextAt'], time.time() + 100)
        row['nextAt'] = 0
        with patch.object(t, 'telegram', return_value={'message_id': 10, 'chat': {'id': 123}}), patch.object(t.time, 'sleep'):
            t.deliver(self.state, self.config)
        self.assertEqual(row['status'], 'sent')
        self.assertEqual(row['messageId'], 10)

    def test_timeout_and_crash_claim_are_not_blindly_retried(self):
        t.enqueue(self.state, 'a', 'test')
        with patch.object(t, 'telegram', side_effect=t.DeliveryError('delivery-unknown')) as api, patch.object(t.time, 'sleep'):
            t.deliver(self.state, self.config)
            t.deliver(self.state, self.config)
            self.assertEqual(api.call_count, 1)
        self.state['deliveries']['a']['status'] = 'sending'
        with patch.object(t, 'telegram') as api:
            t.deliver(self.state, self.config)
            api.assert_not_called()
        self.assertEqual(self.state['deliveries']['a']['status'], 'delivery-unknown')

    def test_unpublished_data_never_produces_publication_notice(self):
        t.write(self.root / 'state/latest-publication.json', {'status': 'pending'})
        t.publication_updates(self.state)
        self.assertFalse(self.state['deliveries'])

    def test_screenshot_failure_never_claims_visual_success(self):
        t.write(self.root / 'state/latest-publication.json', {'status': 'published', 'revision': 'a' * 64, 'records': [], 'publishedAt': '2026-10-17T07:46:00Z'})
        with patch.object(t, 'capture', side_effect=ValueError('unavailable')):
            t.publication_updates(self.state)
        self.assertFalse(self.state['visuals']['a' * 64].get('complete'))
        self.assertEqual(self.state['deliveries'], {})

    def test_live_photos_and_owner_replies_survive_completion_only_reporting(self):
        for key in ['error:run','digest:today','publication:rev','e2e-test:end','publication:rev:photo:0','control:123','ai-budget-80:month']:
            t.enqueue(self.state,key,'fixture')
        t.completion_reports(self.state)
        for key in ['error:run','digest:today','publication:rev']:
            self.assertEqual(self.state['deliveries'][key]['status'],'suppressed')
        # A supervised live run's end message is its one end summary, so it is delivered.
        for key in ['e2e-test:end','publication:rev:photo:0','control:123','ai-budget-80:month']:
            self.assertEqual(self.state['deliveries'][key]['status'],'pending')

    def test_queue_is_bounded(self):
        for i in range(100):
            t.enqueue(self.state, str(i), 'message')
        with self.assertRaises(RuntimeError):
            t.enqueue(self.state, 'overflow', 'message')

    def test_timezone_uses_singapore_and_handles_date_rollover(self):
        self.assertEqual(t.singapore_time('2026-10-17T08:13:00+00:00'), '17 Oct, 4:13 pm SGT')
        self.assertEqual(t.singapore_time('2026-10-17T20:00:00Z'), '18 Oct, 4:00 am SGT')

    def test_summary_is_useful_without_internal_counters(self):
        t.write(self.root / 'baseline.json', {'venues': [{'venueId': 'whole-earth', 'name': 'Whole Earth'}]})
        t.write(self.root / 'state/latest-publication.json', {'status': 'published', 'publishedAt': '2026-10-17T07:46:00Z',
                'records': ['venue:whole-earth', 'recipe:tomato-egg', 'event:event-one']})
        text = t.summary()
        self.assertIn('Whole Earth updated', text)
        self.assertIn('17 Oct, 3:46 pm SGT', text)
        self.assertIn('0/1 locations fully assessed', text)
        for noise in ('+00:00', 'records checked', 'invocation', 'Google calls', 'Run errors: 0'):
            self.assertNotIn(noise, text)

    def test_existing_photo_caption_keeps_original_capture_time(self):
        value = t.photo_caption('Live app screenshot — Whole Earth\nCaptured 2026-10-17T08:11:00Z\nhttps://example.org')
        self.assertIn('17 Oct, 4:11 pm SGT', value)
        self.assertNotIn('Captured', value)


class VegOptionsDigest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.patches = [patch.object(t, 'ROOT', self.root), patch.object(t, 'STATE', self.root / 'state/telegram')]
        for p in self.patches:
            p.start()
        self.state = {'offset': 0, 'deliveries': {}}

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def test_one_text_digest_with_remove_per_place_and_no_screenshot(self):
        import datetime as dt
        import publisher
        data = {'id': 'vo-green-cafe-abc123', 'name': 'Green Cafe', 'branch': 'Tampines One', 'address': '#01-02, 10 Tampines Central 1',
                'menu': {'items': [{'id': 'a'}, {'id': 'b'}, {'id': 'c'}]}}
        live = {'records': [{'kind': 'place', 'id': data['id'], 'hash': 'h' * 64, 'data': data}], 'changes': [], 'removals': []}
        pub = {'status': 'published', 'revision': 'c' * 64, 'publishedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
               'records': ['place:' + data['id']], 'changes': [{'kind': 'place', 'id': data['id'], 'changeId': 'd' * 64, 'afterHash': 'h' * 64, 'beforeHash': None}]}
        t.write(self.root / 'state/publications/qt-1.json', pub)
        with patch.object(publisher, 'request', return_value=live), patch.object(t, 'capture', side_effect=AssertionError('no screenshots')):
            t.publication_updates(self.state)
            t.publication_updates(self.state)
        [(key, item)] = self.state['deliveries'].items()
        self.assertTrue(key.endswith(':place-digest') and item['text'].startswith('Added to Explore (Mixed Kitchen)'))
        self.assertNotIn('veg options', item['text'])
        self.assertIn('Green Cafe · Tampines One · 3 vegetarian dishes', item['text'])
        token = item['buttons'][0][1]['callback_data'].split(':')[1]
        action = self.state['moderation'][token]
        self.assertEqual((item['buttons'][0][1]['text'], action['kind'], action['mode'], action['hash']), ('Remove', 'place', 'direct', 'h' * 64))
        self.assertTrue(self.state['visuals']['c' * 64]['complete'])
        self.assertIn('Mixed Kitchen place added', t.publication_text(pub))

    def test_recheck_or_cover_update_gets_revert_not_remove(self):
        import datetime as dt
        import publisher
        data = {'id': 'vo-green-cafe-abc123', 'name': 'Green Cafe', 'branch': 'Tampines One', 'menu': {'items': [{'id': 'a'}, {'id': 'b'}]}}
        change = {'kind': 'place', 'id': data['id'], 'changeId': 'd' * 64, 'afterHash': 'h' * 64, 'beforeHash': 'g' * 64, 'name': 'Green Cafe', 'fields': ['photo']}
        live = {'records': [{'kind': 'place', 'id': data['id'], 'hash': 'h' * 64, 'data': data}], 'changes': [change], 'removals': []}
        pub = {'status': 'published', 'revision': 'e' * 64, 'publishedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
               'records': ['place:' + data['id']], 'changes': [change]}
        with patch.object(publisher, 'request', return_value=live):
            t.place_digest(self.state, pub)
        [(_, item)] = self.state['deliveries'].items()
        self.assertTrue(item['text'].startswith('Updated in Explore (Mixed Kitchen)'))
        self.assertIn('(cover photo added)', item['text'])
        button = item['buttons'][0][1]
        action = self.state['moderation'][button['callback_data'].split(':')[1]]
        self.assertEqual((button['text'], action['mode'], action['kind'], action['changeId']), ('Revert this update', 'revert', 'place', 'd' * 64))
        self.assertIn('/place/catalogue-vo-green-cafe-abc123', item['buttons'][0][0]['url'])

    def test_mixed_kitchen_check_asks_remove_or_keep_and_records_the_tap(self):
        import publisher
        import telegram_controls as c
        import veg_options as vo
        import workflow as w
        rid = 'vo-green-cafe-abc123'
        w.write(self.root / 'state/veg-options/progress.json', {'version': 1, 'candidates': {rid: {
            'status': 'published', 'ownerPrompt': {'status': 'due', 'seq': 1, 'at': w.now(), 'reason': 'Menu no longer marks V dishes'}}}})
        live = {'records': [{'kind': 'place', 'id': rid, 'hash': 'h' * 64, 'data': {'name': 'Green Cafe'}}]}
        with patch.object(publisher, 'request', return_value=live):
            c.mixed_kitchen_requests(self.state)
            c.mixed_kitchen_requests(self.state)
        [(key, item)] = self.state['deliveries'].items()
        self.assertEqual(key, 'mixed-kitchen-check:' + rid + ':1')
        self.assertTrue(item['text'].startswith('Mixed Kitchen check: Green Cafe no longer shows 2 labelled dishes'))
        remove, keep = item['buttons'][1]
        self.assertEqual((remove['text'], keep['text']), ('Remove place', 'Keep'))
        c.callback(self.state, keep['callback_data'], 7)
        self.assertIn('checks it again in 30 days', self.state['deliveries']['control:7']['text'])
        t.write(t.STATE / 'state.json', self.state)
        row = vo.settle(self.root)['candidates'][rid]
        self.assertEqual((row['ownerPrompt']['status'], row['recheckMisses']), ('kept', 0))
        self.assertGreater(row['recheckAt'], time.time() + vo.RECHECK - 60)
        self.assertEqual(vo.owner_prompts(self.root), [])

class VegKitchenDigest(unittest.TestCase):
    """Telegram for Veg Kitchen places: one digest per batch with Remove per place, and the owner's Remove / Keep check."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.patches = [patch.object(t, 'ROOT', self.root), patch.object(t, 'STATE', self.root / 'state/telegram')]
        for p in self.patches:
            p.start()
        self.state = {'offset': 0, 'deliveries': {}}
        self.data = {'id': 'vk-green-leaf-abc123', 'name': 'Green Leaf Kitchen', 'branch': '', 'address': '12 Bugis Street Singapore 188652',
                     'menu': {'items': [{'id': 'a'}, {'id': 'b'}, {'id': 'c'}, {'id': 'd'}]}}

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def publication(self, ids, revision='c' * 64, before=None):
        import datetime as dt
        changes = [{'kind': 'place', 'id': i, 'changeId': 'd' * 64, 'afterHash': 'h' * 64, 'beforeHash': before, 'name': i} for i in ids]
        return {'status': 'published', 'revision': revision, 'publishedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                'records': ['place:' + i for i in ids], 'changes': changes}

    def test_one_text_digest_with_remove_per_place_titled_veg_kitchen(self):
        import publisher
        live = {'records': [{'kind': 'place', 'id': self.data['id'], 'hash': 'h' * 64, 'data': self.data}], 'changes': [], 'removals': []}
        pub = self.publication([self.data['id']])
        t.write(self.root / 'state/publications/qt-1.json', pub)
        with patch.object(publisher, 'request', return_value=live), patch.object(t, 'capture', side_effect=AssertionError('no screenshots')):
            t.publication_updates(self.state)
            t.publication_updates(self.state)
        [(key, item)] = self.state['deliveries'].items()
        self.assertTrue(key.endswith(':place-digest:veg-kitchen'))
        self.assertTrue(item['text'].startswith('Added to Explore (Veg Kitchen)'))
        self.assertIn('Green Leaf Kitchen · Bugis Street · 4 dishes', item['text'])
        self.assertNotIn('Mixed Kitchen', item['text'])
        self.assertIn('whole kitchen is vegetarian or vegan', item['text'])
        remove = item['buttons'][0][1]
        action = self.state['moderation'][remove['callback_data'].split(':')[1]]
        self.assertEqual((remove['text'], action['kind'], action['mode'], action['hash']), ('Remove', 'place', 'direct', 'h' * 64))
        self.assertIn('/place/catalogue-vk-green-leaf-abc123', item['buttons'][0][0]['url'])
        self.assertTrue(self.state['visuals']['c' * 64]['complete'])
        self.assertIn('1 Veg Kitchen place added', t.publication_text(pub))
        self.assertNotIn('Mixed Kitchen', t.publication_text(pub))

    def test_a_batch_with_both_kinds_sends_one_digest_per_task(self):
        import publisher
        mixed = {'id': 'vo-green-cafe-abc123', 'name': 'Green Cafe', 'branch': 'Tampines One', 'menu': {'items': [{'id': 'a'}, {'id': 'b'}]}}
        live = {'records': [{'kind': 'place', 'id': d['id'], 'hash': 'h' * 64, 'data': d} for d in (self.data, mixed)], 'changes': [], 'removals': []}
        pub = self.publication([self.data['id'], mixed['id']])
        with patch.object(publisher, 'request', return_value=live):
            t.place_digest(self.state, pub)
            t.place_digest(self.state, pub)  # delivered once per task
        items = {k.rsplit(':place-digest', 1)[1]: v for k, v in self.state['deliveries'].items()}
        self.assertEqual(sorted(items), ['', ':veg-kitchen'])
        self.assertTrue(items['']['text'].startswith('Added to Explore (Mixed Kitchen)'))
        self.assertIn('Green Cafe · Tampines One · 2 vegetarian dishes', items['']['text'])
        self.assertNotIn('Green Leaf', items['']['text'])
        self.assertTrue(items[':veg-kitchen']['text'].startswith('Added to Explore (Veg Kitchen)'))
        self.assertNotIn('Green Cafe', items[':veg-kitchen']['text'])
        text = t.publication_text(pub)
        self.assertIn('1 Mixed Kitchen place added', text)
        self.assertIn('1 Veg Kitchen place added', text)
        self.assertTrue(self.state['visuals']['c' * 64]['complete'])

    def test_a_recheck_or_cover_update_gets_revert_not_remove(self):
        import publisher
        change = dict(self.publication([self.data['id']], 'e' * 64, before='g' * 64)['changes'][0], fields=['photo'])
        live = {'records': [{'kind': 'place', 'id': self.data['id'], 'hash': 'h' * 64, 'data': self.data}], 'changes': [change], 'removals': []}
        pub = dict(self.publication([self.data['id']], 'e' * 64, before='g' * 64), changes=[change])
        with patch.object(publisher, 'request', return_value=live):
            t.place_digest(self.state, pub)
        [(_, item)] = self.state['deliveries'].items()
        self.assertTrue(item['text'].startswith('Updated in Explore (Veg Kitchen)'))
        self.assertIn('(cover photo added)', item['text'])
        button = item['buttons'][0][1]
        action = self.state['moderation'][button['callback_data'].split(':')[1]]
        self.assertEqual((button['text'], action['mode'], action['kind'], action['changeId']), ('Revert this update', 'revert', 'place', 'd' * 64))

    def test_unclear_place_asks_veg_vegan_mixed_or_skip_once_and_records_the_tap(self):
        import telegram_controls as c
        import veg_kitchen as vk
        import workflow as w
        rid = 'vk-green-leaf-abc123'
        row = {'candidateId': rid, 'googlePlaceId': 'ChIJvkgreenleaf123', 'nameHint': 'Green Leaf Kitchen', 'address': '12 BUGIS STREET SINGAPORE 188652',
               'postalCode': '188652', 'point': {'latitude': 1.299, 'longitude': 103.855}, 'source': 'google-typed', 'triage': 'fully-veg-check',
               'mapsUrl': 'https://www.google.com/maps/search/?api=1&query=Green&query_place_id=ChIJvkgreenleaf123'}
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [row]})
        state = vk.progress(self.root)
        vk.set_status(vk.entry(state, rid), 'held', 'owner-check', 'Menu is all mock meat; Google says vegetarian')
        vk.save_progress(self.root, state)
        with patch.object(vk, 'queue', return_value=[row]):
            c.owner_check_requests(self.state)
            c.owner_check_requests(self.state)
        [(key, item)] = self.state['deliveries'].items()
        self.assertEqual(key, 'vkcheck:' + rid)
        self.assertTrue(item['text'].startswith('Is this place fully vegetarian?' + chr(10) + 'Green Leaf Kitchen'))
        self.assertIn('Menu is all mock meat', item['text'])
        labels = [b['text'] for line in item['buttons'] for b in line]
        self.assertEqual(labels, ['Veg Kitchen', 'Vegan Kitchen', 'Mixed Kitchen', 'Skip', 'Open on Google Maps'])
        veg = item['buttons'][0][0]['callback_data']
        c.callback(self.state, veg, 7)
        self.assertIn('is a Veg Kitchen (vegetarian)', self.state['deliveries']['control:7']['text'])
        c.callback(self.state, veg, 8)  # a second tap changes nothing
        self.assertNotIn('Thanks', self.state['deliveries'].get('control:8', {}).get('text', ''))
        saved = w.read(vk.owner_checks_file(self.root), {})[rid]
        self.assertEqual((saved['choice'], saved['approval']), ('veg', 'owner-telegram-' + veg.split(':')[1]))

    def test_veg_kitchen_check_asks_remove_or_keep_and_records_the_tap(self):
        import publisher
        import telegram_controls as c
        import veg_kitchen as vk
        import workflow as w
        rid = 'vk-green-leaf-abc123'
        w.write(self.root / 'state/veg-kitchen/progress.json', {'version': 1, 'candidates': {rid: {
            'status': 'published', 'ownerPrompt': {'status': 'due', 'seq': 1, 'at': w.now(), 'reason': 'The page no longer says the kitchen is vegetarian'}}}})
        live = {'records': [{'kind': 'place', 'id': rid, 'hash': 'h' * 64, 'data': {'name': 'Green Leaf Kitchen'}}]}
        with patch.object(publisher, 'request', return_value=live):
            c.veg_kitchen_requests(self.state)
            c.veg_kitchen_requests(self.state)
        [(key, item)] = self.state['deliveries'].items()
        self.assertEqual(key, 'veg-kitchen-check:' + rid + ':1')
        self.assertTrue(item['text'].startswith('Veg Kitchen check: Green Leaf Kitchen could not be confirmed as fully vegetarian or vegan'))
        remove, keep = item['buttons'][1]
        self.assertEqual((remove['text'], keep['text']), ('Remove place', 'Keep'))
        c.callback(self.state, keep['callback_data'], 7)
        self.assertIn('checks it again in 30 days', self.state['deliveries']['control:7']['text'])
        t.write(t.STATE / 'state.json', self.state)
        row = vk.settle(self.root)['candidates'][rid]
        self.assertEqual((row['ownerPrompt']['status'], row['recheckMisses']), ('kept', 0))
        self.assertGreater(row['recheckAt'], time.time() + vk.RECHECK - 60)
        self.assertEqual(vk.owner_prompts(self.root), [])
        # a Mixed Kitchen prompt for the same id would not be read as ours: each task reads its own action key
        self.assertIn('vegKitchen', next(iter(self.state['moderation'].values())))

    def test_status_lines_for_both_queues(self):
        import workflow as w
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [dict(
            candidateId='vk-green-leaf-abc123', googlePlaceId='ChIJvkgreenleaf123', source='lead', postalCode='188652', address='12 BUGIS STREET',
            point={'latitude': 1.299, 'longitude': 103.855}, mapsUrl='https://www.google.com/maps/search/?api=1&query=x')]})
        self.assertTrue(t.veg_kitchen_line().startswith('\nVeg Kitchen: 0 in Explore, 1 not yet checked'))
        self.assertEqual(t.mixed_kitchen_line(), '')  # no Mixed Kitchen queue here: nothing mixed up

if __name__ == '__main__':
    unittest.main()
