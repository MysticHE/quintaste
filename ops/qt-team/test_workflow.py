"""Contract and cost-boundary checks; no network, model calls or production writes."""
import copy
import datetime as dt
import json
import io
import re
from contextlib import redirect_stdout
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import workflow as w


class Boundaries(unittest.TestCase):
    def test_manager_review_receives_live_recipe_identities(self):
        import publisher
        import learning
        with tempfile.TemporaryDirectory() as directory, patch.object(w, 'ROOT', Path(directory)):
            w.write(Path(directory) / 'baseline.json', {'recipeNames': []})
            live = {'recipeNames': [{'id': 'live-recipe', 'name': 'Already Published Tofu'}]}
            result = {'decisions': [{'id': 'candidate', 'decision': 'hold'}], 'publication': 'not-published'}
            with patch.object(publisher, 'current_baseline', return_value=live) as current, \
                    patch.object(learning, 'offer', return_value=[]), \
                    patch.object(w, 'run_model', return_value=(result, {})) as model:
                w.review([{'records': [{'id': 'candidate'}]}], Path(directory) / 'manager', {'automaticProductionWrites': True})
            self.assertIn('Already Published Tofu', model.call_args.args[1])
            current.assert_called_once()

    def test_recipe_recovery_does_not_consume_daily_work_with_known_or_reused_results(self):
        for mode in ('existing-id', 'prior-name', 'consumed', 'fresh'):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory, patch.object(w, 'ROOT', Path(directory)):
                root = Path(directory)
                old = root / 'runs/20261017T000000Z/cooker'
                packet = {'role': 'qt-cooker', 'summary': 'Saved response', 'records': [
                    {'id': 'recipe-a', 'status': 'held', 'sources': [], 'recipe': {'name': 'Recipe A'}}]}
                receipt = {'exitCode': 0, 'completedAt': w.now(), 'sessionId': 'old',
                           'toolCalls': [{'name': 'web_extract'}], 'successfulExtractCalls': 1}
                w.write(old / 'response.json', packet)
                w.write(old / 'receipt.json', receipt)
                (old / 'stream.jsonl').write_text(json.dumps({'type': 'tool_result', 'name': 'web_extract', 'output': 'success'}))
                context = {'existingRecipeNames': [], 'priorCandidates': []}
                if mode == 'existing-id': context['existingRecipeNames'] = [{'id': 'recipe-a', 'name': 'Renamed Recipe'}]
                if mode == 'prior-name': context['priorCandidates'] = [' Recipe A ']
                if mode == 'consumed':
                    w.write(root / 'runs/20261017T010000Z/cooker/receipt.json', dict(receipt, reusedResponseFrom=str(old / 'response.json')))
                fresh = {'role': 'qt-cooker', 'summary': 'Fresh research', 'records': []}
                with patch.object(w, 'run_model', return_value=(fresh, dict(receipt, sessionId='new'))) as model:
                    result = w.worker('qt-cooker', context, root / 'runs/new/cooker', {})
                self.assertEqual(model.call_count, 0 if mode == 'fresh' else 1)
                self.assertEqual(result['sessionId'], 'old' if mode == 'fresh' else 'new')

    def test_scheduler_runpy_imports_adjacent_publisher_from_other_directory(self):
        import subprocess
        import sys
        file = Path(w.__file__).resolve()
        code = 'import runpy;runpy.run_path(' + repr(str(file)) + ',run_name="scheduler_import_check");import publisher;print(publisher.__file__)'
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, '-I', '-c', code], cwd=directory, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(Path(result.stdout.strip()).resolve(), file.with_name('publisher.py'))

    def venue(self):
        return {"role": "qt-explorer", "summary": "Checked", "records": [{"id": "venue-a", "status": "held", "sources": [], "checklist": dict.fromkeys(w.CHECKLIST, "missing")}]}

    def test_holds_are_valid_without_invented_sources(self):
        w.validate("qt-explorer", self.venue(), ["venue-a"])

    def test_cannot_accept_without_source(self):
        obj = self.venue(); obj["records"][0]["status"] = "proposed"
        with self.assertRaises(ValueError): w.validate("qt-explorer", obj, ["venue-a"])

    def test_cannot_drop_or_change_assigned_venue(self):
        with self.assertRaises(ValueError): w.validate("qt-explorer", self.venue(), ["venue-b"])
        obj = self.venue(); obj["records"] = []
        with self.assertRaises(ValueError): w.validate("qt-explorer", obj, ["venue-a"])

    def test_duplicate_venue_and_missing_checklist_rejected(self):
        obj = self.venue(); obj["records"] *= 2
        with self.assertRaises(ValueError): w.validate("qt-explorer", obj, ["venue-a"])
        obj = self.venue(); del obj["records"][0]["checklist"]["cover"]
        with self.assertRaises(ValueError): w.validate("qt-explorer", obj, ["venue-a"])

    def test_private_credential_and_google_urls_rejected(self):
        for url in ["http://example.com", "https://localhost/a", "https://127.0.0.1/", "https://169.254.169.254/", "https://user:secret@example.com/", "https://example.com:bad/", "https://maps.googleapis.com/maps/api/place"]:
            self.assertFalse(w.public_url(url), url)
        self.assertTrue(w.public_url("https://www.tzuchi.org.sg/en/"))
        self.assertTrue(w.public_url("https://www.google.com/maps/search/?api=1&query=MOD+Cafe"))  # Maps pages allowed; the paid API is not

    def test_past_and_naive_events_rejected(self):
        obj = {"role": "qt-event", "summary": "Check", "records": [{"id": "event-a", "status": "proposed", "sources": [{"url": "https://example.org/event", "evidence": "Official listing"}], "event": {"title": "Meal", "organiser": "Org", "location": "Singapore", "dietEvidence": "Vegetarian meal", "startsAt": "2025-01-01T10:00:00+08:00"}}]}
        with self.assertRaises(ValueError): w.validate("qt-event", obj)
        obj["records"][0]["event"]["startsAt"] = "2030-01-01T10:00:00"
        with self.assertRaises(ValueError): w.validate("qt-event", obj)

    def test_recipe_references_and_tested_claim(self):
        obj = {"role": "qt-cooker", "summary": "Check", "records": [{"id": "recipe-a", "status": "proposed", "sources": [{"url": "https://example.org/recipe", "evidence": "Author recipe"}], "recipe": {"name": "Tofu", "category": "With rice", "servings": 2, "minutes": 20, "ingredients": [{"id": "tofu", "name": "Tofu", "amount": 200, "unit": "g"}], "steps": [{"instruction": "Cook", "ingredientIds": ["tofu"]}], "kitchenTested": False}}]}
        obj['records'][0]['recipe']['diet'] = 'Vegetarian'
        w.validate("qt-cooker", obj)
        bad = copy.deepcopy(obj); bad["records"][0]["recipe"]["steps"][0]["ingredientIds"] = ["chicken"]
        with self.assertRaises(ValueError): w.validate("qt-cooker", bad)
        bad = copy.deepcopy(obj); bad["records"][0]["recipe"]["kitchenTested"] = True
        with self.assertRaises(ValueError): w.validate("qt-cooker", bad)
        bad = copy.deepcopy(obj); bad["records"][0]["recipe"]["servings"] = True
        with self.assertRaises(ValueError): w.validate("qt-cooker", bad)
        bad = copy.deepcopy(obj); bad['records'][0]['recipe']['diet'] = 'Unknown'
        with self.assertRaises(ValueError): w.validate('qt-cooker', bad)
        bad = copy.deepcopy(obj); bad['records'] *= 3
        with self.assertRaisesRegex(ValueError, 'quota'): w.validate('qt-cooker', bad)

    def test_budget_reserves_attempts_even_on_failure(self):
        policy = {"dailyModelInvocations": 1, "monthlyModelInvocations": 2, "monthlyImageAttempts": 1}
        with tempfile.TemporaryDirectory() as d, patch.object(w, "ROOT", Path(d)):
            w.reserve(policy, "model")
            with self.assertRaises(RuntimeError): w.reserve(policy, "model")
            w.reserve(policy, "image")
            with self.assertRaises(RuntimeError): w.reserve(policy, "image")
            self.assertEqual(len((Path(d)/"state/usage.jsonl").read_text().splitlines()), 2)

    def test_recipe_timing_normalization_preserves_explicit_total(self):
        obj = {'records': [{'recipe': {'minutes': {'prep': 5, 'cook': 5, 'total': 10}}}]}
        result = w.normalize_recipe_packet(obj)
        recipe = result['records'][0]['recipe']
        self.assertEqual(recipe['minutes'], 10)
        self.assertEqual(recipe['sourceTimingMinutes'], {'prep': 5, 'cook': 5, 'total': 10})
        self.assertIsInstance(obj['records'][0]['recipe']['minutes'], dict)
        missing = {'records': [{'recipe': {'minutes': {'prep': 5, 'cook': 5}}}]}
        self.assertEqual(w.normalize_recipe_packet(missing), missing)

    def test_recipe_timing_keeps_rest_and_estimated_label(self):
        # Overnight 18 Oct: Cooker's rest/estimated keys rejected every candidate as "Invalid duration".
        timing = {'total': 17, 'prep': 5, 'cook': 2, 'rest': 10, 'estimated': True}
        recipe = w.normalize_recipe_packet({'records': [{'recipe': {'minutes': timing}}]})['records'][0]['recipe']
        self.assertEqual(recipe['minutes'], 17)
        self.assertEqual(recipe['sourceTimingMinutes'], timing)
        odd = {'records': [{'recipe': {'minutes': {'total': 10, 'estimated': 'yes'}}}]}
        self.assertEqual(w.normalize_recipe_packet(odd), odd)

    def test_event_recheck_can_cancel_or_hold_without_losing_evidence(self):
        previous = [{'id': 'event-a', 'status': 'proposed', 'event': {'status': 'scheduled', 'startsAt': '2030-01-01T10:00:00+08:00', 'title': 'Meal', 'organiser': 'Org', 'location': 'Singapore', 'dietEvidence': 'Vegetarian'}, 'sources': [{'url': 'https://example.org'}]}]
        held = w.merge_events(previous, [{'id': 'event-a', 'status': 'held', 'sources': []}])[0]
        self.assertEqual(held['status'], 'held')
        self.assertEqual(held['event'], previous[0]['event'])
        self.assertEqual(held['previousVerifiedSources'], previous[0]['sources'])
        cancelled = w.merge_events(previous, [{'id': 'event-a', 'status': 'excluded', 'event': {'status': 'cancelled'}}])[0]
        self.assertEqual(cancelled['event']['status'], 'cancelled')
        self.assertEqual(previous[0]['event']['status'], 'scheduled')

    def event(self):
        return {'id':'event-a','status':'proposed','sources':[], 'event':{'title':'Meal','organiser':'Org','location':'Singapore','dietEvidence':'Vegetarian','startsAt':(dt.datetime.now(w.SG)+dt.timedelta(days=2)).isoformat(),'status':'scheduled'}}

    def test_partial_held_event_preserves_schedule_across_persistence_and_next_run(self):
        previous = [self.event()]
        merged = w.merge_events(previous,[{'id':'event-a','status':'held','event':{'status':'scheduled'},'sources':[]}])
        with tempfile.TemporaryDirectory() as folder:
            checkpoint=Path(folder)/'checkpoint.json'
            w.write(checkpoint,{'upcomingEvents':merged})
            upcoming,incomplete=w.upcoming_events(w.read(checkpoint)['upcomingEvents'])
        self.assertFalse(incomplete)
        self.assertEqual(upcoming[0]['event'],previous[0]['event'])
        merged[0]['event']['title']='Changed separately'
        self.assertEqual(previous[0]['event']['title'],'Meal')

    def test_invalid_event_merge_is_rejected_before_checkpoint_changes(self):
        previous=[self.event()]
        with tempfile.TemporaryDirectory() as folder:
            checkpoint=Path(folder)/'checkpoint.json'
            w.write(checkpoint,{'upcomingEvents':previous,'eventDiscoveryAt':'unchanged'})
            before=checkpoint.read_bytes()
            for patch_value in [None, {'startsAt':None}, {'startsAt':'invalid'}, {'startsAt':'2030-01-01T10:00:00'}]:
                with self.assertRaises(ValueError):
                    merged=w.merge_events(previous,[{'id':'event-a','status':'held','event':patch_value}])
                    w.write(checkpoint,{'upcomingEvents':merged,'eventDiscoveryAt':'advanced'})
                self.assertEqual(checkpoint.read_bytes(),before)

    def test_malformed_legacy_events_request_recovery_without_crashing(self):
        corrupt=self.event()
        del corrupt['event']['startsAt']
        upcoming,incomplete=w.upcoming_events([corrupt,self.event()])
        self.assertEqual(len(upcoming),1)
        self.assertEqual(incomplete,[corrupt])
        repaired=w.merge_events([corrupt],[self.event()])
        self.assertEqual(w.upcoming_events(repaired)[1],[])

    def test_expired_and_cancelled_events_are_retained_without_being_rechecked(self):
        expired=self.event()
        expired['event']['startsAt']='2020-01-01T10:00:00+08:00'
        cancelled=self.event()
        cancelled['id']='cancelled'
        cancelled['event']['status']='cancelled'
        merged=w.merge_events([expired,cancelled],[])
        self.assertEqual(len(merged),2)
        self.assertEqual(w.upcoming_events(merged),([],[]))

    def test_failed_recheck_does_not_advance_real_run_discovery_checkpoint(self):
        previous=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=8)).isoformat()
        original={'explorerReviewed':{},'cookCycle':dt.datetime.now(w.SG).strftime('%Y-%m'),
                  'eventDiscoveryAt':previous,'upcomingEvents':[self.event()],'pendingReview':[]}
        packet={'role':'qt-event','summary':'Held','records':[{'id':'event-a','status':'held','sources':[],'event':{'startsAt':None}}]}
        locks=[]
        with tempfile.TemporaryDirectory() as folder, patch.object(w,'ROOT',Path(folder)), \
                patch.object(w,'worker',return_value=packet), patch.object(w,'review',return_value={'decisions':[]}), \
                patch.object(w,'pending_recipe_images',return_value=([],{})), \
                patch.object(w,'recipe_image',return_value={'status':'not-needed'}), \
                patch.object(w,'live_health',return_value={'status':200}), \
                patch.dict('sys.modules',{'fcntl':SimpleNamespace(LOCK_EX=2,LOCK_NB=4,flock=lambda stream,*_:locks.append(stream))}), \
                redirect_stdout(io.StringIO()):
            # Only the OS lock is stubbed; exercise the actual checkpoint path.
            w.write(Path(folder)/'policy.json',{'runSeconds':4000,'maxExploreBatchesPerRun':1,'exploreBatchSize':1,'minimumFreeBytes':0})
            w.write(Path(folder)/'baseline.json',{'venues':[],'holds':{},'recipeNames':[],'catalogueRevision':'fixture'})
            checkpoint=Path(folder)/'state/checkpoint.json'
            w.write(checkpoint,original)
            with self.assertRaises(SystemExit):
                try:
                    w.run()
                finally:
                    for stream in locks:
                        stream.close()
            saved=w.read(checkpoint)
            self.assertEqual(saved['eventDiscoveryAt'],previous)
            self.assertEqual(saved['upcomingEvents'],original['upcomingEvents'])
            self.assertEqual(w.read(Path(folder)/'state/latest-report.json')['errors'][0]['role'],'qt-event')

    def test_completed_image_does_not_block_next_candidate_or_retry_on_quota(self):
        records = [{'id': name, 'status': 'proposed', 'recipe': {'name': name, 'ingredients': [{'name': 'Tofu'}]}, 'sources': []} for name in ['recipe-a', 'recipe-b']]
        packets = [{'role': 'qt-cooker', 'records': records}]
        review = {'decisions': [{'id': name, 'decision': 'ready-for-editorial-review'} for name in ['recipe-a', 'recipe-b']]}
        with tempfile.TemporaryDirectory() as d, patch.object(w, 'ROOT', Path(d)), patch.object(w, 'digest', side_effect=lambda x: x['recipeId']), patch.object(w, 'reserve', side_effect=RuntimeError('Monthly image-attempt budget reached')) as reserve:
            done = Path(d)/'images/recipe-a/result.json'; done.parent.mkdir(parents=True); done.write_text('{}')
            result = w.recipe_image(packets, review, {})
            self.assertEqual(result['status'], 'deferred-monthly-image-budget')
            self.assertEqual(result['recipeId'], 'recipe-b')
            reserve.assert_called_once()

    def test_image_recovery_reuses_existing_directory(self):
        packets = [{'role':'qt-cooker','records':[{'id':'recipe-a','status':'proposed','recipe':{'name':'Tofu','ingredients':[{'name':'Tofu'}]},'sources':[]}]}]
        reviewed = {'decisions':[{'id':'recipe-a','decision':'ready-for-editorial-review'}]}
        with tempfile.TemporaryDirectory() as d, patch.object(w,'ROOT',Path(d)), patch.object(w,'digest',return_value='recipe-a'), patch.object(w,'reserve'), patch.object(w.subprocess,'Popen') as launch:
            target = Path(d)/'images/recipe-a'; target.mkdir(parents=True)
            (target/'request.interrupted.json').write_text('{}')
            launch.return_value.wait.return_value = 1
            result = w.recipe_image(packets,reviewed,{})
            self.assertEqual(result['status'],'failed-provider')
            self.assertTrue((target/'request.json').exists())
            self.assertTrue((target/'request.interrupted.json').exists())
            launch.assert_called_once()

    def test_atomic_file_and_strict_json(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/"state.json"; w.write(p, {"previous": True}); w.write(p, {"next": True})
            self.assertEqual(w.read(p), {"next": True})
            self.assertFalse(p.with_name("state.json.tmp").exists())
        with self.assertRaises(json.JSONDecodeError): w.parse_json('success {"x":1}')
        with self.assertRaises(ValueError): w.parse_json('[]')




MENU_URL = 'https://greencafe.sg/menu'
MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Green%20Cafe&query_place_id=ChIJabcdefghij12'
MENU = '\n'.join(['# Green Cafe Menu', '## Mains', 'Mushroom Risotto (V) 18.9', 'Chicken Chop 16.9', 'Pumpkin Soup V 9.5',
                  'Truffle Fries 8', '## Vegan Corner', 'Tofu Rendang Bowl 15', 'Spaghetti Carbonara - vegetarian option available 17'])
LISTING = 'Google Maps listing\nGreen Cafe\nCafe\n10 Tampines Central 1, #01-02 Tampines One, Singapore 529536\ngreencafe.sg\n'


def veg_candidate(**extra):
    return dict({'candidateId': 'vo-green-cafe-abc123', 'googlePlaceId': 'ChIJabcdefghij12', 'triage': 'priority', 'nameHint': 'Green Cafe',
                 'nameConfirmed': False, 'address': '10 TAMPINES CENTRAL 1 TAMPINES ONE SINGAPORE 529536', 'building': 'TAMPINES ONE',
                 'unit': '#01-02', 'postalCode': '529536', 'point': {'latitude': 1.354, 'longitude': 103.945},
                 'website': 'https://greencafe.sg', 'mapsUrl': MAPS_URL}, **extra)


def veg_capture(root, url, content):
    import hashlib
    import time
    w.write(root / 'state/source-cache' / (hashlib.sha256(url.encode()).hexdigest() + '.json'),
            {'url': url, 'sha256': hashlib.sha256(content.encode()).hexdigest(), 'fetchedAt': w.now(), 'fetchedEpoch': time.time(),
             'result': {'content': content}})


def veg_finding(**extra):
    items = [('Mushroom Risotto', 18.9, 'V', 'Mushroom Risotto (V) 18.9'), ('Pumpkin Soup', 9.5, 'VG', 'Pumpkin Soup V 9.5'),
             ('Truffle Fries', 8, 'V', 'Truffle Fries 8'), ('Tofu Rendang Bowl', 15, 'VG', 'Vegan Corner'),
             ('Chicken Chop', 16.9, 'V', 'Chicken Chop 16.9'), ('Spaghetti Carbonara', 17, 'V', 'vegetarian option available')]
    return dict({'candidateId': 'vo-green-cafe-abc123', 'decision': 'qualifies', 'reason': 'Venue menu marks V dishes.',
                 'name': 'Green Cafe', 'branch': 'Tampines One', 'nameSourceUrl': MAPS_URL, 'postalSourceUrl': MAPS_URL,
                 'menu': {'sourceUrl': MENU_URL, 'sourceLabel': 'Venue website menu',
                          'items': [{'name': n, 'price': {'amount': a, 'currency': 'SGD', 'type': 'displayed'}, 'diet': d, 'labelQuote': q}
                                    for n, a, d, q in items]},
                 'sources': [{'url': MENU_URL, 'evidence': 'Menu with V marks'}, {'url': MAPS_URL, 'evidence': 'Maps listing with postcode'}]}, **extra)


def veg_packet(root, finding=None, candidate=None, listing=LISTING):
    import veg_options as vo
    veg_capture(root, MENU_URL, MENU)
    veg_capture(root, MAPS_URL, listing)
    response = {'role': 'qt-explorer', 'task': 'veg-options', 'summary': 'One candidate.', 'candidates': [finding or veg_finding()], 'gaps': []}
    return vo.check_packet(root, response, [candidate or veg_candidate()], {'successfulExtractCalls': 2, 'completedAt': w.now(), 'sessionId': 's'})


class VegOptions(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_queue_keeps_priority_normal_low_with_address_and_valid_ids(self):
        import veg_options as vo
        import veg_options_queue as q
        address = {'address': '1 RAFFLES PLACE SINGAPORE 048616', 'building': None, 'postalCode': '048616', 'latitude': 1.284, 'longitude': 103.851}
        identities = {'records': {
            'ChIJlow000000001': {'triage': 'low', 'name': {'value': 'Low Bar', 'source': 'google-unverified'}, 'address': address},
            'ChIJnormal000002': {'triage': 'normal', 'name': {'value': 'Café Été', 'source': 'website'}, 'address': address, 'unit': '#01-01'},
            'ChIJprio00000003': {'triage': 'priority', 'name': {'value': '素食 Place', 'source': 'google-unverified'}, 'address': address},
            'ChIJfullveg00004': {'triage': 'fully-veg-check', 'name': {'value': 'Veg', 'source': 'website'}, 'address': address},
            'ChIJnoaddress005': {'triage': 'priority', 'name': {'value': 'No Address', 'source': 'website'}, 'address': None}}}
        enrichment = {'records': {'ChIJnormal000002': {'triage': 'normal', 'website': 'https://cafe.example.sg'}}}
        rows = q.build(enrichment, identities)['candidates']
        self.assertEqual([r['triage'] for r in rows], ['priority', 'normal', 'low'])
        self.assertTrue(all(q.ID_PATTERN.fullmatch(r['candidateId']) for r in rows))
        self.assertTrue(rows[1]['candidateId'].startswith('vo-cafe-ete-') and rows[1]['nameConfirmed'] and rows[1]['website'])
        self.assertIn('query_place_id=ChIJprio00000003', rows[0]['mapsUrl'])
        self.assertEqual(len(vo.check_queue({'candidates': rows})), 3)

    def test_only_venue_labelled_priced_dishes_survive(self):
        record = veg_packet(self.root)['records'][0]
        self.assertEqual(record['status'], 'proposed')
        items = {i['name']: i for i in record['vegOptions']['place']['menu']['items']}
        self.assertEqual(sorted(items), ['Mushroom Risotto', 'Pumpkin Soup', 'Tofu Rendang Bowl'])
        self.assertEqual((items['Pumpkin Soup']['diet'], items['Tofu Rendang Bowl']['diet']), ('V', 'VG'))  # a V mark cannot prove vegan
        self.assertEqual(record['vegOptions']['droppedCauses'], {'no-venue-label': 1, 'meat-named': 1, 'label-conditional': 1})
        self.assertNotIn('Chicken', json.dumps(record))  # meat dishes are never stored
        place = record['vegOptions']['place']
        self.assertEqual((place['venueDiet'], place['alliumFreeClaim'], place['branch']), ('Vegetarian', False, 'Tampines One'))
        self.assertTrue(place['address'].startswith('#01-02, 10 Tampines Central 1'))

    def test_bare_prices_need_the_venues_own_site(self):
        listing = LISTING.replace('greencafe.sg', 'Order online')  # no official website on the listing either
        record = veg_packet(self.root, candidate=veg_candidate(website='https://othersite.sg'), listing=listing)['records'][0]
        self.assertEqual((record['status'], record['vegOptions']['cause']), ('held', 'too-few-verified-dishes'))

    def test_postcode_and_name_must_be_on_a_stored_page(self):
        record = veg_packet(self.root, candidate=veg_candidate(postalCode='529999'))['records'][0]
        self.assertEqual(record['vegOptions']['cause'], 'postcode-not-on-page')
        record = veg_packet(self.root, finding=veg_finding(name='Blue Diner'))['records'][0]
        self.assertEqual(record['vegOptions']['cause'], 'name-not-on-page')

    def test_explorer_not_qualified_and_missing_candidates(self):
        import veg_options as vo
        record = veg_packet(self.root, finding=veg_finding(decision='not-qualified', fullyVegetarian=True))['records'][0]
        self.assertEqual((record['status'], record['vegOptions']['cause']), ('excluded', 'fully-vegetarian'))
        with self.assertRaisesRegex(ValueError, 'every assigned'):
            vo.check_packet(self.root, {'role': 'qt-explorer', 'task': 'veg-options', 'summary': '', 'candidates': []}, [veg_candidate()], {})

    def test_settle_follows_review_publication_and_owner_removal(self):
        import veg_options as vo
        packet = veg_packet(self.root)
        w.write(self.root / 'state/veg-options/queue.json', {'candidates': [veg_candidate()]})
        vo.mark_dispatched(self.root, ['vo-green-cafe-abc123'], packet_path='x')
        w.write(self.root / 'outbox/20261019T010000Z.json', {'checkedAt': w.now(), 'packets': [packet],
                'manager': {'decisions': [{'id': 'vo-green-cafe-abc123', 'decision': 'hold', 'reason': 'Label unclear'}]}})
        row = vo.settle(self.root)['candidates']['vo-green-cafe-abc123']
        self.assertEqual((row['status'], row['cause']), ('held', 'manager-hold'))
        self.assertAlmostEqual(row['retryAt'] - dt.datetime.fromisoformat(row['updatedAt']).timestamp(), vo.HOLD_RETRY, delta=2)
        w.write(self.root / 'outbox/20261019T020000Z.json', {'checkedAt': w.now(), 'packets': [packet],
                'manager': {'decisions': [{'id': 'vo-green-cafe-abc123', 'decision': 'ready-for-editorial-review', 'reason': 'Labels shown'}]}})
        self.assertEqual(vo.settle(self.root)['candidates']['vo-green-cafe-abc123']['status'], 'verified')
        live = {'records': [{'kind': 'place', 'id': 'vo-green-cafe-abc123', 'hash': 'a' * 64, 'data': {}}], 'removals': [], 'reverts': []}
        self.assertEqual(vo.settle(self.root, live)['candidates']['vo-green-cafe-abc123']['status'], 'published')
        live = {'records': [], 'removals': [{'kind': 'place', 'id': 'vo-green-cafe-abc123'}], 'reverts': []}
        self.assertEqual(vo.settle(self.root, live)['candidates']['vo-green-cafe-abc123']['status'], 'removed')
        self.assertEqual(vo.due(self.root, 10), [])

    def test_tooling_holds_retry_next_day_then_weekly(self):
        import veg_options as vo
        row = {'status': 'pending'}
        for _ in range(4):
            vo.set_status(row, 'held', 'no-stored-capture', at='2026-10-19T00:00:00+00:00')
        start = dt.datetime.fromisoformat('2026-10-19T00:00:00+00:00').timestamp()
        self.assertEqual(row['retryAt'] - start, vo.WEEK_RETRY)
        vo.set_status(row, 'verified')
        vo.set_status(row, 'held', 'no-stored-capture', at='2026-10-19T00:00:00+00:00')
        self.assertEqual(row['retryAt'] - start, vo.SHORT_RETRY)

    def test_shop_grid_prices_below_the_title_count_but_never_the_next_dishs(self):
        import veg_options_check as vc
        # A shop-style menu (20 Oct 2026): title with its label, a description, then the price a few lines down.
        page = {'text': '\n'.join(['### Mushroom Risotto (V)', '', 'Arborio rice, wild mushrooms', '', 'S$ 18.00', '',
                                   '### Beef Ragu', '', 'S$ 22.00'])}
        price = lambda a: {'amount': a, 'currency': 'SGD', 'type': 'displayed'}
        dish = lambda name, a: vc.check_dish({'name': name, 'price': price(a), 'diet': 'V', 'labelQuote': '(V)'}, page, False)
        self.assertEqual(dish('Mushroom Risotto (V)', 18)[0]['name'], 'Mushroom Risotto (V)')
        self.assertEqual(dish('Mushroom Risotto (V)', 22)[1], 'price-not-in-capture')  # the next dish's price is not borrowed

    def test_vegan_phrasing_proves_a_veg_kitchen(self):
        import veg_kitchen_check as kc
        # Kept in step with the app's vegetarianWords (server/editorial/validation.mjs, 20 Oct 2026).
        self.assertTrue(kc.suitable_quote('Our desserts contain no animal products or byproducts.'))
        self.assertTrue(kc.suitable_quote('Everything we make is animal-free.'))
        self.assertFalse(kc.suitable_quote('Some dishes contain no animal products.'))  # a partial claim
        self.assertFalse(kc.suitable_quote('Vegan'))  # a label, not a statement

    def test_unpriced_dishes_only_when_the_venue_shows_no_price(self):
        import veg_options_check as vc, veg_kitchen_check as kc, veg_kitchen
        # Owner, 20 Oct 2026: "Price unavailable" in the app's exact shape, refused whenever a price shows next to the dish.
        unpriced = {'amount': None, 'currency': 'unknown', 'type': 'displayed'}
        page = {'text': '\n'.join(['Mushroom Risotto (V)', 'Arborio rice, wild mushrooms', 'Veggie Burger (V) 18.90', 'Tofu Bowl (V)', 'S$ 12'])}
        dish = lambda name: vc.check_dish({'name': name, 'price': unpriced, 'diet': 'V', 'labelQuote': '(V)'}, page, False)
        self.assertEqual(dish('Mushroom Risotto (V)')[0]['price'], unpriced)
        self.assertEqual(dish('Veggie Burger (V)')[1], 'price-on-page')
        self.assertEqual(dish('Tofu Bowl (V)')[1], 'price-on-page')  # the price on the next line counts too
        self.assertFalse(vc.price_ok({'amount': None, 'currency': 'SGD', 'type': 'displayed'}))
        self.assertFalse(vc.price_ok({'amount': None, 'currency': 'unknown', 'type': 'from'}))
        lines = page['text'].splitlines()
        self.assertEqual(kc.check_item({'name': 'Mushroom Risotto (V)', 'price': unpriced}, lines, False, True)[0]['price'], unpriced)
        self.assertEqual(kc.check_item({'name': 'Veggie Burger (V)', 'price': unpriced}, lines, False, True)[1], 'price-on-page')
        self.assertEqual(veg_kitchen.price_text(unpriced), 'price unavailable')
        # Sizes in the name or description are not prices (Sayang's order form, 20 Oct 2026).
        cakes = ['Rectangle 7x3.5" 3-layer Cake (8 pax)', '', 'Square cake, 1.5kg', 'Brownies 2.5 cm thick']
        self.assertEqual(kc.check_item({'name': 'Rectangle 7x3.5" 3-layer Cake (8 pax)', 'price': unpriced}, cakes, False, True)[1], None)
        self.assertEqual(kc.check_item({'name': 'Square cake', 'price': unpriced}, cakes, False, True)[1], None)
        self.assertEqual(kc.check_item({'name': 'Brownies', 'price': unpriced}, cakes, False, True)[1], None)
        self.assertTrue(vc.shows_price('Brownies 12.50'))

    def test_hours_match_as_times_of_day_not_as_text(self):
        import veg_options_check as vc
        # 20 Oct 2026: every proposed schedule failed because 3:00pm on the page never matched 15:00 in the schedule.
        self.assertEqual(vc.clock_minutes('Lunch : 11:00am – 3:00pm'), {660, 900})
        self.assertEqual(vc.clock_minutes('Monday 11\u202fam\u20139\u202fpm'), {660, 1260})  # Google Maps narrow spaces
        self.assertEqual(vc.clock_minutes('Tue 12 noon - 10.30pm'), {720, 1350})
        self.assertEqual(vc.clock_minutes('6pm to midnight'), {1080, 0})
        self.assertEqual(vc.clock_minutes('$10.30 for 9 pax'), set())  # prices and counts are not times
        page = {'text': 'Opening Hours\nLunch : 11:00am – 3:00pm\nDinner : 6:00pm – 11:00pm'}
        hours = {'summary': 'Lunch and dinner', 'schedule': ['Lunch 11:00–15:00', 'Dinner 18:00–23:00'], 'notes': '',
                 'sourceUrl': 'https://example.com/hours', 'checkedAt': '2026-10-20T00:00:00Z'}
        with patch.object(vc, 'capture', return_value=page):
            self.assertEqual(vc.check_hours(self.root, hours, {'https://example.com/hours'})['schedule'], hours['schedule'])
            wrong = dict(hours, schedule=['Dinner 18:00–22:00'])
            self.assertIsNone(vc.check_hours(self.root, wrong, {'https://example.com/hours'}))  # 22:00 is not on the page
            self.assertIsNone(vc.check_hours(self.root, hours, set()))  # the page must be cited

    def test_rechecks_and_retries_get_a_share_of_every_batch(self):
        import veg_options as vo
        rows = [{'candidateId': 'vo-new-%04d' % n} for n in range(30)] + [{'candidateId': 'vo-live-%04d' % n} for n in range(6)] \
            + [{'candidateId': 'vo-held-%04d' % n} for n in range(6)]
        state = {**{r['candidateId']: {'status': 'published', 'recheckAt': 1} for r in rows if 'live' in r['candidateId']},
                 **{r['candidateId']: {'status': 'held', 'retryAt': 1} for r in rows if 'held' in r['candidateId']}}
        with patch.object(vo, 'queue', return_value=rows), patch.object(vo, 'progress', return_value={'candidates': state}):
            batch = [c['candidateId'] for c in vo.due(self.root, 10)]
            self.assertEqual(batch[:4], ['vo-live-0000', 'vo-live-0001', 'vo-held-0000', 'vo-held-0001'])  # two each in ten
            self.assertTrue(all(c.startswith('vo-new-') for c in batch[4:]))  # new places fill the rest
            only_new = [c['candidateId'] for c in vo.due(self.root, 10, fresh_only=True)]
            self.assertEqual(only_new, ['vo-new-%04d' % n for n in range(10)])

    def test_section_headings_count_only_when_vegetarian_and_above_the_dish(self):
        import veg_options_check as vc
        page = {'text': '\n'.join(['## Vegetarian', '### Mains', 'Mapo Tofu S$12', '## Non-Vegetarian', 'Kung Pao Tofu S$13',
                                   'VEGAN', 'Green Curry S$14', 'SIDES', 'Garden Salad S$6'])}
        price = lambda a: {'amount': a, 'currency': 'SGD', 'type': 'displayed'}
        dish = lambda name, a, quote, diet='V': vc.check_dish({'name': name, 'price': price(a), 'diet': diet, 'labelQuote': quote}, page, False)
        self.assertEqual(dish('Mapo Tofu', 12, 'Vegetarian')[0]['labelAt'], 'section-heading')  # parent heading above a subheading
        self.assertEqual(dish('Kung Pao Tofu', 13, 'Non-Vegetarian')[1], 'no-venue-label')
        self.assertEqual(dish('Green Curry', 14, 'VEGAN', 'VG')[0]['diet'], 'VG')
        self.assertEqual(dish('Garden Salad', 6, 'VEGAN')[1], 'no-venue-label')  # a sibling section ends the vegan one
        self.assertEqual(dish('Mapo Tofu', 11, 'Vegetarian')[1], 'price-not-in-capture')

    def test_manager_review_gets_veg_rules_and_focused_excerpts(self):
        import learning
        packet = veg_packet(self.root)
        w.write(self.root / 'baseline.json', {'recipeNames': []})
        result = {'decisions': [{'id': 'vo-green-cafe-abc123', 'decision': 'hold', 'reason': 'x'}], 'publication': 'not-published'}
        with patch.object(w, 'ROOT', self.root), patch.object(learning, 'offer', return_value=[]), \
                patch.object(w, 'run_model', return_value=(result, {})) as model:
            w.review([packet], self.root / 'manager', {'automaticProductionWrites': False})
        prompt = model.call_args.args[1]
        self.assertIn("task 'veg-options'", prompt)
        self.assertIn('Mushroom Risotto (V) 18.9', prompt)


LIVE_PLACE = {'kind': 'place', 'id': 'vo-green-cafe-abc123', 'hash': 'a' * 64,
              'data': {'name': 'Green Cafe', 'checkedAt': '2026-09-01', 'menu': {'sourceUrl': MENU_URL, 'items': [
                  {'id': 'mushroom-risotto', 'name': 'Mushroom Risotto', 'price': {'amount': 18.9, 'currency': 'SGD', 'type': 'displayed'}, 'diet': 'V'}]}}}


class MixedKitchen(unittest.TestCase):
    """The regular Round's Mixed Kitchen stage and the monthly recheck of published places (owner, 19 Oct 2026)."""
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.patch = patch.object(w, 'ROOT', self.root)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        self.temp.cleanup()

    def queue(self, *ids):
        rows = [veg_candidate(candidateId=cid, googlePlaceId='ChIJ' + cid[-8:].replace('-', 'x') + 'abcd') for cid in ids]
        w.write(self.root / 'state/veg-options/queue.json', {'candidates': rows})

    def published(self, cid, days_ago, **extra):
        import veg_options as vo
        state = vo.progress(self.root)
        at = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days_ago)).isoformat()
        state['candidates'][cid] = dict({'status': 'published', 'updatedAt': at, 'publishedAt': at, 'attempts': 1}, **extra)
        vo.save_progress(self.root, state)

    def test_round_runs_mixed_kitchen_after_the_whole_menu_audit(self):
        names = [s.__name__ for s in self.round(3200).stages()]
        self.assertLess(names.index('explorer'), names.index('cover_search'))
        self.assertLess(names.index('cover_search'), names.index('mixed_kitchen'))
        self.assertLess(names.index('mixed_kitchen'), names.index('manager_review'))
        import run_veg_options_pilot as pilot
        w.shutil.rmtree(self.root / 'runs', ignore_errors=True)
        self.assertNotIn('mixed_kitchen', [s.__name__ for s in pilot.VegRound({'runSeconds': 3200}, set()).stages()])

    def test_due_offers_pending_then_live_rechecks_then_holds(self):
        import veg_options as vo
        self.queue('vo-held-place-000001', 'vo-green-cafe-abc123', 'vo-fresh-place-00002', 'vo-gone-place-000003')
        self.published('vo-green-cafe-abc123', 31)
        self.published('vo-gone-place-000003', 31)
        state = vo.progress(self.root)
        vo.set_status(vo.entry(state, 'vo-held-place-000001'), 'held', 'manager-hold', at='2026-01-01T00:00:00+00:00')
        vo.save_progress(self.root, state)
        due = vo.due(self.root, 10, live={'records': [LIVE_PLACE]})  # vo-gone-place is not live: no recheck offered
        # A share of every batch goes to due rechecks and retries first (20 Oct 2026), then new places.
        self.assertEqual([c['candidateId'] for c in due], ['vo-green-cafe-abc123', 'vo-held-place-000001', 'vo-fresh-place-00002'])
        self.assertEqual(due[0]['recheck']['publishedDishes'][0]['name'], 'Mushroom Risotto')
        self.assertEqual(vo.worker_view(due[0])['recheck']['menuSourceUrl'], MENU_URL)
        self.assertEqual([c['candidateId'] for c in vo.due(self.root, 10, fresh_only=True)], ['vo-fresh-place-00002'])
        self.published('vo-green-cafe-abc123', 29)
        self.assertNotIn('vo-green-cafe-abc123', [c['candidateId'] for c in vo.due(self.root, 10, live={'records': [LIVE_PLACE]})])

    def recheck_package(self, name, finding, decision):
        packet = veg_packet(self.root, finding=finding, candidate=veg_candidate(recheck={'publishedDishes': []}))
        self.assertTrue(packet['records'][0]['vegOptions']['recheck'])
        w.write(self.root / 'outbox' / name, {'checkedAt': w.now(), 'packets': [packet],
                'manager': {'decisions': [{'id': 'vo-green-cafe-abc123', 'decision': decision, 'reason': 'Reviewed'}]}})

    def test_recheck_keeps_the_place_live_and_two_misses_ask_the_owner(self):
        import veg_options as vo
        cid = 'vo-green-cafe-abc123'
        self.queue(cid)
        self.published(cid, 31)
        vo.mark_dispatched(self.root, [cid], packet_path='runs/x/validated.json')
        row = vo.progress(self.root)['candidates'][cid]
        self.assertEqual((row['status'], row['recheckPacket']), ('published', 'runs/x/validated.json'))
        self.assertEqual(vo.due(self.root, 5), [])
        self.recheck_package('20261019T010000Z.json', None, 'ready-for-editorial-review')
        row = vo.settle(self.root)['candidates'][cid]
        self.assertEqual((row['status'], row['lastRecheck']['result'], row['recheckMisses']), ('published', 'passed', 0))
        self.assertNotIn('recheckPacket', row)
        self.assertAlmostEqual(row['recheckAt'] - time_now(), vo.RECHECK, delta=60)
        self.recheck_package('20261019T020000Z.json', veg_finding(decision='not-qualified'), 'exclude')
        row = vo.settle(self.root)['candidates'][cid]
        self.assertEqual((row['recheckMisses'], row.get('ownerPrompt')), (1, None))
        self.assertAlmostEqual(row['recheckAt'] - time_now(), vo.MISS_RETRY, delta=60)
        self.recheck_package('20261019T030000Z.json', veg_finding(decision='held', reason='Menu page did not load'), 'hold')
        row = vo.settle(self.root)['candidates'][cid]
        self.assertEqual((row['lastRecheck']['result'], row['recheckMisses']), ('inconclusive', 1))  # tooling never counts as a miss
        self.assertAlmostEqual(row['recheckAt'] - time_now(), vo.SHORT_RETRY, delta=60)
        self.recheck_package('20261019T040000Z.json', veg_finding(decision='not-qualified'), 'exclude')
        row = vo.settle(self.root)['candidates'][cid]
        self.assertEqual((row['status'], row['recheckMisses'], row['ownerPrompt']['status']), ('published', 2, 'due'))
        self.assertEqual([cid for cid, _ in vo.owner_prompts(self.root)], [cid])
        self.assertEqual(vo.due(self.root, 5, at=time_now() + 90 * 86400), [])  # no recheck while the owner decides
        live = {'records': [], 'removals': [{'kind': 'place', 'id': cid}], 'reverts': []}
        row = vo.settle(self.root, live)['candidates'][cid]
        self.assertEqual((row['status'], row['ownerPrompt']['status']), ('removed', 'removed'))

    def test_failed_recheck_worker_retries_next_day_without_unpublishing(self):
        import veg_options as vo
        cid = 'vo-green-cafe-abc123'
        self.queue(cid)
        self.published(cid, 31)
        vo.mark_dispatched(self.root, [cid], cause='worker-failed')
        row = vo.progress(self.root)['candidates'][cid]
        self.assertEqual(row['status'], 'published')
        self.assertAlmostEqual(row['recheckAt'] - time_now(), vo.SHORT_RETRY, delta=60)

    def round(self, run_seconds, parallel=1, **policy):
        w.shutil.rmtree(self.root / 'runs', ignore_errors=True)  # run folders are named by the second
        tick = w.Round(dict({'runSeconds': run_seconds, 'automaticProductionWrites': True, 'workerSeconds': 900,
                             'maxExploreBatchesPerRun': 50, 'mixedKitchenParallel': parallel}, **policy), trial=False, nightly=False)
        tick.live = {'venues': [], 'records': [], 'removals': [], 'reverts': []}
        return tick

    def test_mixed_kitchen_gets_the_remaining_explorer_time_one_worker_at_a_time(self):
        import veg_options as vo
        self.queue('vo-green-cafe-abc123', 'vo-fresh-place-00002')
        tick = self.round(w.ROUND_RESERVE + 800)
        self.assertEqual(tick.mixed_kitchen_reserve(), w.MIN_EXPLORER_SECONDS)
        calls = []
        def worker(root, batch, folder, policy):
            calls.append(([c['candidateId'] for c in batch], policy['workerSeconds']))
            packet = {'role': 'qt-explorer', 'task': 'veg-options', 'records': []}
            w.write(folder / 'validated.json', packet)
            return packet
        with patch.object(vo, 'worker', side_effect=worker):
            tick.mixed_kitchen()
        self.assertEqual(len(calls), 1)  # both places in one worker of five; then nothing is due
        self.assertEqual(sorted(calls[0][0]), ['vo-fresh-place-00002', 'vo-green-cafe-abc123'])
        self.assertTrue(w.MIN_EXPLORER_SECONDS <= calls[0][1] <= 800)
        self.assertEqual({r['status'] for r in vo.progress(self.root)['candidates'].values()}, {'in-review'})
        self.assertEqual(len(tick.state['pendingReview']), 1)
        self.assertEqual(tick.mixed_kitchen_reserve(), 0)  # the stage has run this round
        short = self.round(w.ROUND_RESERVE + w.MIN_EXPLORER_SECONDS - 10)
        with patch.object(vo, 'worker', side_effect=AssertionError('no time left')):
            short.mixed_kitchen()

    def test_whole_menu_audit_leaves_one_mixed_kitchen_worker(self):
        import publisher
        import outlet_capture
        import diet_review
        import learning
        venue = {'venueId': 'branch-one'}
        audits = []
        def worker(role, context, folder, policy):
            audits.append(policy['workerSeconds'])
            packet = {'role': role, 'records': [{'id': 'branch-one', 'status': 'held'}]}
            w.write(folder / 'validated.json', packet)
            return packet
        for reserve, expected in ((w.MIN_EXPLORER_SECONDS, []), (0, [w.MIN_EXPLORER_SECONDS + 300])):
            audits.clear()
            tick = self.round(w.ROUND_RESERVE + w.CAPTURE_ALLOWANCE + w.MIN_EXPLORER_SECONDS + 300)
            tick.pending, tick.baseline = [venue], {'checkedAt': '2026-10-17', 'holds': {}}
            tick.state['auditTurnAt'] = w.time.time()  # a normal round: the audit had its turn recently
            with patch.object(w.Round, 'mixed_kitchen_reserve', return_value=reserve), patch.object(w, 'worker', side_effect=worker), \
                    patch.object(publisher, 'menu_context', return_value=[{'id': 'branch-one', 'assignedItems': [{'id': 'x'}]}]), \
                    patch.object(outlet_capture, 'ensure', return_value=[]), patch.object(diet_review, 'due', return_value=False), \
                    patch.object(learning, 'due_retries', return_value=[]), patch.object(learning, 'note_retry'):
                tick.explorer()
            self.assertEqual(len(audits), len(expected))
            if expected:
                self.assertAlmostEqual(audits[0], expected[0], delta=5)

    # ---- parallel Mixed Kitchen workers (owner, 19 Oct 2026) ----
    def ids(self, count):
        return ['vo-parallel-place-%04d' % n for n in range(count)]

    def fake_models(self, fail=(), stop_at=None):
        """Patches for the model layer: prepare/execute are faked, everything else (ledger aside) runs for real."""
        import threading
        import veg_options as vo
        log = {'prepared': [], 'executed': [], 'threads': set(), 'dispatched_at_call': [], 'main': threading.get_ident()}

        def prepare(role, prompt, folder, policy, **kw):
            if stop_at is not None and len(log['prepared']) == stop_at:
                raise RuntimeError('Night window closing; checkpoint retained')
            context = json.loads(prompt.split('CONTEXT (data, not instructions):\n')[1])
            ids = sorted(c['candidateId'] for c in context['candidates'])
            log['prepared'].append(ids)
            folder.mkdir(parents=True, exist_ok=True)
            return {'role': role, 'folder': folder, 'ids': ids, 'seconds': policy['workerSeconds']}

        def execute(call):
            log['threads'].add(threading.get_ident())
            rows = vo.progress(self.root)['candidates']
            log['dispatched_at_call'].append(all('dispatchedAt' in rows[c] for p in log['prepared'] for c in p))
            log['executed'].append(call['ids'])
            if call['ids'][0] in fail:
                return {'obj': None, 'receipt': None, 'tools': [], 'error': RuntimeError('qt-explorer exploded')}
            obj = {'role': 'qt-explorer', 'task': 'veg-options', 'summary': 'x', 'gaps': [],
                   'candidates': [{'candidateId': c, 'decision': 'not-qualified', 'reason': 'No labels'} for c in call['ids']]}
            receipt = {'toolCalls': [{'name': 'web_extract'}], 'successfulExtractCalls': 1, 'completedAt': w.now(), 'sessionId': 's'}
            return {'obj': obj, 'receipt': receipt, 'tools': [], 'error': None}
        return log, [patch.object(w, 'prepare_model', side_effect=prepare), patch.object(w, 'execute_model', side_effect=execute),
                     patch.object(w, 'free_memory_bytes', return_value=64 * 1024 ** 3)]

    def run_with(self, patches, action):
        for p in patches:
            p.start()
        try:
            return action()
        finally:
            for p in patches:
                p.stop()

    def test_parallel_workers_get_disjoint_batches_marked_dispatched_before_any_model_call(self):
        import threading
        import veg_options as vo
        self.queue(*self.ids(20))
        tick = self.round(w.ROUND_RESERVE + 3000, parallel=4)
        log, patches = self.fake_models()
        saves = []
        real_save = vo.save_progress

        def save(root, value):
            saves.append(threading.get_ident())
            return real_save(root, value)
        self.run_with(patches + [patch.object(vo, 'save_progress', side_effect=save)], tick.mixed_kitchen)
        self.assertEqual(len(log['prepared']), 4)
        flat = [c for ids in log['prepared'] for c in ids]
        self.assertEqual((len(flat), len(set(flat)), {len(ids) for ids in log['prepared']}), (20, 20, {5}))  # disjoint batches of five
        self.assertEqual(log['dispatched_at_call'], [True] * 4)  # every candidate was marked before the first call
        self.assertNotIn(log['main'], log['threads'])  # the model calls ran off the main thread
        self.assertEqual(set(saves), {log['main']})  # progress.json is only ever written by the main thread
        self.assertEqual(len(tick.state['pendingReview']), 4)
        self.assertEqual(sorted(p.name for p in tick.folder.glob('mixed-kitchen-*')), ['mixed-kitchen-%d' % n for n in range(4)])
        rows = vo.progress(self.root)['candidates']
        self.assertEqual({r['status'] for r in rows.values()}, {'in-review'})
        self.assertFalse(any('dispatchedAt' in r for r in rows.values()))
        self.assertEqual(vo.due(self.root, 50), [])

    def test_one_failed_worker_does_not_stop_the_others_or_lose_their_results(self):
        import veg_options as vo
        ids = self.ids(20)
        self.queue(*ids)
        tick = self.round(w.ROUND_RESERVE + 3000, parallel=4)
        log, patches = self.fake_models(fail={ids[5]})  # the second batch; the two after it still run
        self.run_with(patches, tick.mixed_kitchen)
        rows = vo.progress(self.root)['candidates']
        failed = set(ids[5:10])
        self.assertEqual({c for c, r in rows.items() if r['status'] == 'held'}, failed)
        self.assertTrue(all(rows[c]['cause'] == 'worker-failed' for c in failed))
        self.assertEqual({r['status'] for c, r in rows.items() if c not in failed}, {'in-review'})  # the other 15 were recorded
        self.assertEqual(len(tick.state['pendingReview']), 3)
        self.assertEqual(len(tick.packets), 3)
        self.assertTrue(any('exploded' in e['error'] for e in tick.errors))
        self.assertEqual(tick.state['nightFailures'][tick.day]['qt-explorer'], 1)  # one failure counted; later successes reset the streak

    def test_window_closing_releases_batches_that_never_started(self):
        import veg_options as vo
        ids = self.ids(20)
        self.queue(*ids)
        tick = self.round(w.ROUND_RESERVE + 3000, parallel=4)
        log, patches = self.fake_models(stop_at=2)
        rows = vo.queue(self.root)
        result = self.run_with(patches, lambda: tick.mixed_kitchen_wave(
            [rows[i:i + 5] for i in range(0, 20, 5)], [tick.folder / ('wave-%d' % n) for n in range(4)], 2000))
        self.assertEqual((result, len(log['executed'])), ('stop', 2))
        saved = vo.progress(self.root)['candidates']
        self.assertFalse(any('dispatchedAt' in r for r in saved.values()))
        self.assertEqual({r['status'] for c, r in saved.items() if c in ids[10:]}, {'pending'})
        self.assertEqual({c['candidateId'] for c in vo.due(self.root, 50)}, set(ids[10:]))  # still due next round

    def test_parallel_overlap_is_refused_and_a_crash_does_not_redispatch(self):
        import veg_options as vo
        self.queue(*self.ids(6))
        tick = self.round(w.ROUND_RESERVE + 3000, parallel=4)
        rows = vo.queue(self.root)
        with self.assertRaisesRegex(ValueError, 'overlap'):
            tick.mixed_kitchen_wave([rows[:3], rows[2:5]], [tick.folder / 'a', tick.folder / 'b'], 900)
        vo.reserve_dispatch(self.root, [r['candidateId'] for r in rows[:3]])  # a worker that never reported back
        self.assertEqual([c['candidateId'] for c in vo.due(self.root, 10)], [r['candidateId'] for r in rows[3:]])
        later = time_now() + vo.DISPATCH_HOLD + 60
        self.assertEqual(len(vo.due(self.root, 10, at=later)), 6)  # offered again once the hold has passed

    def test_parallel_setting_default_clamp_and_resource_fallback(self):
        settings = ({}, {'mixedKitchenParallel': 1}, {'mixedKitchenParallel': 0}, {'mixedKitchenParallel': 99},
                    {'mixedKitchenParallel': True}, {'mixedKitchenParallel': 'many'}, {'mixedKitchenParallel': 3.9})
        self.assertEqual([w.mixed_parallel(p) for p in settings], [4, 1, 1, 8, 4, 4, 3])
        tick = self.round(3200, parallel=6, minimumFreeBytes=1)
        with patch.object(w, 'free_memory_bytes', return_value=64 * 1024 ** 3):
            self.assertEqual(tick.mixed_parallel_workers(), 6)
        with patch.object(w, 'free_memory_bytes', return_value=int(3.5 * 1024 ** 3)):
            self.assertEqual(tick.mixed_parallel_workers(), 3)
        with patch.object(w, 'free_memory_bytes', return_value=0):
            self.assertEqual(tick.mixed_parallel_workers(), 1)
        usage = SimpleNamespace(free=0, total=1, used=1)
        with patch.object(w, 'free_memory_bytes', return_value=64 * 1024 ** 3), patch.object(w.shutil, 'disk_usage', return_value=usage):
            self.assertEqual(tick.mixed_parallel_workers(), 2)
        self.assertEqual(self.round(3200, parallel=2).mixed_parallel_workers(), 2)  # two or fewer is never checked

    def test_mixed_packets_do_not_starve_the_whole_menu_audit_when_parallel(self):
        paths = []
        for n in range(8):
            w.write(self.root / ('mixed%d.json' % n), {'task': 'veg-options', 'role': 'qt-explorer', 'records': []})
            paths.append(str(self.root / ('mixed%d.json' % n)))
        w.write(self.root / 'menu.json', {'role': 'qt-explorer', 'records': []})
        paths.append(str(self.root / 'menu.json'))
        sequential, parallel = self.round(3200, parallel=1), self.round(3200, parallel=4)
        sequential.state['pendingReview'] = list(paths)
        parallel.state['pendingReview'] = list(paths)
        self.assertEqual((sequential.review_backlogged(), parallel.review_backlogged()), (True, False))
        self.assertEqual(parallel.pending_review_split(), (8, 1))

    def test_parallel_rounds_review_more_than_one_group_and_one_worker_does_not(self):
        for parallel, expected in ((1, 1), (4, 3)):
            tick = self.round(w.ROUND_RESERVE + 6000, parallel=parallel)
            paths = []
            for n in range(12):
                w.write(self.root / ('m%d.json' % n), {'task': 'veg-options', 'records': []})
                paths.append(str(self.root / ('m%d.json' % n)))
            tick.state['pendingReview'] = paths

            def once(paths=paths, tick=tick):
                tick.reviewed = {'status': 'ok', 'decisions': []}
                tick.state['pendingReview'] = tick.state['pendingReview'][4:]
            with patch.object(w.Round, 'manager_review_once', side_effect=once) as review:
                tick.manager_review()
            self.assertEqual(review.call_count, expected)

    def test_pilot_uses_the_same_parallel_stage(self):
        import run_veg_options_pilot as pilot
        ids = self.ids(12)
        self.queue(*ids)
        tick = pilot.VegRound({'runSeconds': 3200, 'automaticProductionWrites': True, 'workerSeconds': 900, 'mixedKitchenParallel': 2,
                               '_deadline': time_now() + 3000, '_researchDeadline': time_now() + 2000}, set(ids))
        waves = []

        def wave(self, batches, folders, budget):
            waves.append(([[c['candidateId'] for c in x] for x in batches], [p.name for p in folders]))
            return 'ok'
        with patch.object(w.Round, 'mixed_kitchen_wave', wave), patch.object(w, 'free_memory_bytes', return_value=64 * 1024 ** 3):
            tick.veg_explorer()
        self.assertEqual([len(b) for b, _ in waves], [2, 1])
        self.assertEqual([len(x) for x in waves[0][0]], [5, 5])
        self.assertEqual(waves[0][1] + waves[1][1], ['veg-0', 'veg-1', 'veg-2'])
        self.assertEqual(sum(len(x) for b, _ in waves for x in b), 12)

    def test_model_call_split_keeps_run_model_behaviour(self):
        folder = self.root / 'call'
        events = [{'type': 'tool_use', 'name': 'web_extract', 'input': {'urls': ['https://x.example/']}},
                  {'type': 'tool_result', 'name': 'web_extract', 'output': 'ok'},
                  {'type': 'result', 'text': json.dumps({'role': 'qt-explorer', 'summary': 's'}), 'exit_code': 0, 'session_id': 'sess'}]

        class FakeProcess:
            def __init__(self, args, stdout, stderr, env, start_new_session):
                self.pid = 1
                for event in events:
                    stdout.write(json.dumps(event) + '\n')

            def wait(self, timeout=None):
                return 0
        policy = {'workerSeconds': 100, 'workerMaxTurns': 5, 'maxArtifactBytes': 100000}
        with patch.object(w.subprocess, 'Popen', FakeProcess):
            obj, receipt = w.run_model('qt-explorer', 'prompt', folder, policy)
        self.assertEqual((obj['role'], receipt['successfulExtractCalls'], receipt['sessionId']), ('qt-explorer', 1, 'sess'))
        self.assertTrue((folder / 'receipt.json').is_file() and (folder / 'response.json').is_file())
        self.assertEqual(len((self.root / 'state/usage.jsonl').read_text().splitlines()), 1)  # one ledger row, written by prepare
        # the thread half writes only its own folder, spends nothing and reports failures instead of raising
        other = self.root / 'other'
        other.mkdir()
        call = {'role': 'qt-explorer', 'folder': other, 'args': ['x'], 'seconds': 10, 'publication': False, 'maxArtifactBytes': 1, 'learningError': None}
        with patch.object(w.subprocess, 'Popen', FakeProcess):
            outcome = w.execute_model(call)
        self.assertIsInstance(outcome['error'], ValueError)  # over the bounded artifact size
        self.assertEqual(len(outcome['tools']), 1)
        self.assertEqual(len((self.root / 'state/usage.jsonl').read_text().splitlines()), 1)


VK_HOME, VK_MENU_URL = 'https://greenleaf.sg', 'https://greenleaf.sg/menu'
VK_MAPS = 'https://www.google.com/maps/search/?api=1&query=Green%20Leaf&query_place_id=ChIJvkgreenleaf123'
VK_HOME_TEXT = '\n'.join(['Green Leaf Kitchen', 'We are a 100% vegetarian restaurant serving plant-based Chinese food.',
                          '12 Bugis Street, Singapore 188652', 'Open daily 11am to 9pm'])
VK_MENU = '\n'.join(['# Green Leaf Menu', '## Mains', 'Braised Mock Duck 12.5', 'Sweet and Sour Fish 13', 'Mapo Tofu Rice 9.9',
                     'Salt Pepper Chicken 14', '## Drinks', 'Lemon Tea 3.5'])
VK_GOOD = [('Braised Mock Duck', 12.5), ('Sweet and Sour Fish', 13), ('Mapo Tofu Rice', 9.9), ('Salt Pepper Chicken', 14), ('Lemon Tea', 3.5)]


def vk_price(amount):
    return {'amount': amount, 'currency': 'SGD', 'type': 'displayed'}


def vk_candidate(**extra):
    return dict({'candidateId': 'vk-green-leaf-abc123', 'googlePlaceId': 'ChIJvkgreenleaf123', 'triage': 'fully-veg-check', 'source': 'google-typed',
                 'nameHint': 'Green Leaf Kitchen', 'nameConfirmed': False, 'address': '12 BUGIS STREET SINGAPORE 188652', 'building': None,
                 'unit': None, 'postalCode': '188652', 'point': {'latitude': 1.299, 'longitude': 103.855}, 'website': VK_HOME,
                 'mapsUrl': VK_MAPS}, **extra)


def vk_finding(**extra):
    items = [{'name': n, 'price': vk_price(a)} for n, a in VK_GOOD]
    items += [{'name': 'Dragon Roll', 'price': vk_price(20)},          # not on the page
              {'name': 'Lemon Tea', 'price': vk_price(4)},             # wrong price (and a repeat)
              {'name': 'Mapo Tofu Rice', 'price': vk_price(9.9)},      # repeated name
              {'name': 'Free Tea', 'price': {'amount': -1, 'currency': 'SGD', 'type': 'displayed'}}]
    return dict({'candidateId': 'vk-green-leaf-abc123', 'decision': 'qualifies', 'reason': 'Whole venue vegetarian.', 'name': 'Green Leaf Kitchen',
                 'branch': '', 'nameSourceUrl': VK_HOME, 'postalSourceUrl': VK_HOME, 'venueDiet': 'Vegetarian',
                 'dietProof': {'sourceUrl': VK_HOME, 'quote': 'We are a 100% vegetarian\nrestaurant serving plant-based Chinese food.'},
                 'hours': {'summary': 'Daily 11am-9pm', 'schedule': ['Daily 11am - 9pm'], 'notes': '', 'sourceUrl': VK_HOME,
                           'checkedAt': w.now(), 'timezone': 'Asia/Singapore'},
                 'menu': {'sourceUrl': VK_MENU_URL, 'sourceLabel': 'Venue website menu', 'items': items},
                 'sources': [{'url': VK_HOME, 'evidence': 'Home page'}, {'url': VK_MENU_URL, 'evidence': 'Menu page'}]}, **extra)


def vk_packet(root, finding=None, candidate=None, home=VK_HOME_TEXT, extra_pages=()):
    import veg_kitchen as vk
    veg_capture(root, VK_HOME, home)
    veg_capture(root, VK_MENU_URL, VK_MENU)
    for url, text in extra_pages:
        veg_capture(root, url, text)
    response = {'role': 'qt-explorer', 'task': 'veg-kitchen', 'summary': 'One candidate.', 'candidates': [finding or vk_finding()], 'gaps': []}
    return vk.check_packet(root, response, [candidate or vk_candidate()], {'successfulExtractCalls': 2, 'completedAt': w.now(), 'sessionId': 's'})


def vk_evidence(*urls, day=None):
    return [{'url': u, 'checkedAt': day or dt.datetime.now(dt.timezone.utc).date().isoformat()} for u in (urls or (VK_HOME, VK_MENU_URL))]


def vk_live(**extra):
    return dict({'venues': [], 'records': [], 'removals': [], 'reverts': []}, **extra)


def vk_photo(sha='c' * 64):
    return {'author': 'Jane Tan', 'sourceUrl': 'https://commons.wikimedia.org/wiki/File:Green_Leaf.jpg', 'license': 'CC BY-SA 4.0',
            'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/', 'capturedAt': None, 'path': '/api/catalogue-photos/' + sha + '.jpg',
            'width': 960, 'height': 720, 'checkedAt': '2026-10-19',
            'changes': 'AI-assisted enhancement of an owner-approved photo of this branch; original credit and licence retained.'}


class VegKitchen(unittest.TestCase):
    """Veg Kitchen additions (owner, 20 Oct 2026): the queue, the code checks, the app-contract mirror and the state machine."""
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def use_root(self):
        patcher = patch.object(w, 'ROOT', self.root)
        patcher.start()
        self.addCleanup(patcher.stop)

    def place(self, **kw):
        import veg_kitchen as vk
        row = vk_packet(self.root, **kw)['records'][0]
        self.assertEqual((row['status'], row['vegKitchen']['cause']), ('proposed', None))
        return row, vk.place_data(self.root, row, vk_evidence(), vk_live())

    def test_queue_builds_leads_first_then_google_typed_and_drops_unusable_places(self):
        import io
        from contextlib import redirect_stdout
        import veg_kitchen as vk
        import veg_kitchen_queue as q
        import veg_options as vo
        address = {'address': '12 BUGIS STREET SINGAPORE 188652', 'building': 'BUGIS ONE', 'postalCode': '188652', 'latitude': 1.299, 'longitude': 103.855}
        other = dict(address, postalCode='188700')
        known = lambda name, addr, **kw: dict({'triage': 'fully-veg-check', 'name': {'value': name, 'source': 'google-unverified'}, 'address': addr}, **kw)
        identities = {'records': {
            'ChIJlead00000005': known('Lead Place', address, website='https://lead.sg/'), 'ChIJtyped0000001': known('Typed One', address),
            'ChIJtyped0000002': known('Typed Two', other), 'ChIJtyped0000003': known('Typed Three', address),
            'ChIJtyped0000004': known('Typed Four', None), 'ChIJlisted000006': known('Listed Six', address),
            'ChIJnormal000007': dict(known('Normal Seven', address), triage='normal'), 'ChIJtyped0000008': known('Typed Eight', address, unit='#01-02'),
            'ChIJtyped0000009': known('Typed  Eight', address)}}  # the same name and postcode: the app lists one place per identity
        enrichment = {'records': {pid: {'triage': r['triage'], 'website': 'https://x.sg'} for pid, r in identities['records'].items()}}
        enrichment['records']['ChIJtyped0000003']['status'] = 'CLOSED_TEMPORARILY'
        leads = [{'id': 'vo-lead-x', 'placeId': 'ChIJlead00000005', 'name': 'Lead Place', 'postal': '188652', 'cause': 'fully-vegetarian'},
                 {'id': 'vo-lead-y', 'placeId': 'ChIJtyped0000001', 'name': 'Typed One', 'postal': '188652', 'cause': 'fully-vegetarian'}]
        live = {'venues': [{'id': 'v', 'data': {'googlePlaceId': 'ChIJlisted000006'}}],
                'records': [{'kind': 'place', 'id': 'vo-other', 'data': {'name': 'Typed Two', 'postalCode': '188700'}}]}
        queue, dropped = q.build(enrichment, identities, leads, live)
        rows = queue['candidates']
        self.assertEqual([r['source'] for r in rows], ['lead', 'lead', 'google-typed'])
        self.assertEqual([r['googlePlaceId'] for r in rows], ['ChIJlead00000005', 'ChIJtyped0000001', 'ChIJtyped0000008'])
        self.assertEqual(dropped, {'duplicate': 2, 'already-listed': 2, 'closed': 1, 'no-address': 1, 'same-name-postcode': 1})
        self.assertTrue(all(q.ID_PATTERN.fullmatch(r['candidateId']) for r in rows))
        self.assertEqual(([bool(r.get('leadNote')) for r in rows], rows[0]['triage'], rows[2]['triage']), ([True, True, False], 'lead', 'fully-veg-check'))
        self.assertEqual((rows[2]['unit'], rows[2]['nameConfirmed'], rows[0]['website']), ('#01-02', False, 'https://lead.sg/'))
        self.assertEqual(len(vk.check_queue(queue)), 3)
        with self.assertRaises(ValueError):
            vo.check_queue(queue)  # a Veg Kitchen queue is never a Mixed Kitchen queue
        # the command line: files in, queue out, a plain list of live places (a /control/state document works too)
        files = {n: self.root / (n + '.json') for n in ('enrichment', 'identities', 'leads', 'live', 'out')}
        for name, data in (('enrichment', enrichment), ('identities', identities), ('leads', leads), ('live', [{'googlePlaceId': 'ChIJtyped0000008'}])):
            files[name].write_text(json.dumps(data), encoding='utf-8')
        out = io.StringIO()
        with redirect_stdout(out):
            q.main(['q', 'build', *(str(files[n]) for n in ('enrichment', 'identities', 'leads', 'out')), '--live-places', str(files['live'])])
        self.assertEqual((json.loads(out.getvalue())['queued'], json.loads(files['out'].read_text(encoding='utf-8'))['candidates'][-1]['googlePlaceId']),
                         (5, 'ChIJtyped0000009'))

    def test_verified_place_follows_the_app_contract_and_drops_what_the_page_does_not_show(self):
        import veg_kitchen as vk
        row, data = self.place()
        block = row['vegKitchen']
        self.assertEqual(block['droppedCauses'], {'name-not-in-capture': 1, 'price-not-in-capture': 1, 'duplicate-name': 1, 'price-format': 1})
        self.assertNotIn('Dragon Roll', json.dumps(row))  # a dropped line is never stored by name
        self.assertEqual([i['name'] for i in data['menu']['items']], [n for n, _ in VK_GOOD])
        self.assertTrue(all(set(i) <= {'id', 'name', 'category', 'price'} for i in data['menu']['items']))  # no per-dish diet
        self.assertNotIn('kitchen', data)
        self.assertIsNone(vk.place_problem(data))
        proof = data['dietProof']
        self.assertEqual(proof['quote'], 'We are a 100% vegetarian restaurant serving plant-based Chinese food.')  # whitespace folded to single spaces
        self.assertFalse(vk.kc.has_control(proof['quote']))
        today = dt.datetime.now(vk.kc.SG).date().isoformat()
        dates = [data['checkedAt'], proof['checkedAt'], data['menu']['checkedAt'], data['hours']['checkedAt']]
        self.assertTrue(all(re.fullmatch(r'\d{4}-\d{2}-\d{2}', d) and d <= today for d in dates))  # day-only Singapore dates, never in the future
        self.assertEqual((data['venueDiet'], data['alliumFreeClaim'], data['address']), ('Vegetarian', False, '12 Bugis Street Singapore 188652'))
        self.assertTrue(set(data['sourceUrls']) >= {VK_HOME, VK_MENU_URL})

    def test_whole_venue_proof_refuses_negation_options_labels_and_delivery_apps(self):
        cases = [('We are a 100% vegetarian restaurant', None), ('All our dishes are vegan', None), ('No meat, no fish: a fully vegetarian kitchen', None),
                 ('No animal products, 100% vegan', None), ('100% vegetarian, with vegan options', None), ('纯素餐厅', None),
                 ("We don't serve meat, we are vegan", 'diet-proof-unsuitable'),  # the app refuses this denial pattern too
                 ('Not suitable for vegetarians', 'diet-proof-unsuitable'), ('本店不是素食餐厅', 'diet-proof-unsuitable'),
                 ('We offer vegetarian options', 'diet-proof-unsuitable'), ('A vegetarian-friendly cafe', 'diet-proof-unsuitable'),
                 ('This is not a vegetarian restaurant', 'diet-proof-unsuitable'), ('Non-vegetarian dishes are available', 'diet-proof-unsuitable'),
                 ('Non vegetarian and vegetarian menus', 'diet-proof-unsuitable'), ("Sadly we aren't vegan", 'diet-proof-unsuitable'),
                 ('Mostly vegetarian food', 'diet-proof-unsuitable'),
                 # 20 Oct 2026: a bare label or a quote with no diet claim is unclear, not a denial, so the owner is asked on Telegram
                 ('Vegan', 'owner-check'), ('Great noodles', 'owner-check')]
        for quote, cause in cases:
            with self.subTest(quote=quote):
                home = 'Green Leaf Kitchen\n' + quote + '\n12 Bugis Street, Singapore 188652\nOpen daily 11am to 9pm'
                record = vk_packet(self.root, finding=vk_finding(dietProof={'sourceUrl': VK_HOME, 'quote': quote}), home=home)['records'][0]
                self.assertEqual(record['vegKitchen']['cause'], cause)
        record = vk_packet(self.root, finding=vk_finding(dietProof={'sourceUrl': VK_HOME, 'quote': 'It is 100% vegetarian here'}))['records'][0]
        self.assertEqual(record['vegKitchen']['cause'], 'owner-check')  # not on the stored page: the owner is asked instead of a silent hold
        # Google and delivery-app pages describe a venue; they are never its own statement
        for url in ('https://food.grab.com/sg/en/restaurant/green-leaf-kitchen/SGDD1', VK_MAPS, 'https://www.foodpanda.sg/restaurant/abcd/green-leaf'):
            finding = vk_finding(dietProof={'sourceUrl': url, 'quote': 'We are a 100% vegetarian restaurant'},
                                 sources=[{'url': u, 'evidence': 'x'} for u in (VK_HOME, VK_MENU_URL, url)])
            record = vk_packet(self.root, finding=finding, extra_pages=[(url, 'Green Leaf Kitchen We are a 100% vegetarian restaurant 188652')])['records'][0]
            self.assertEqual(record['vegKitchen']['cause'], 'diet-proof-unsuitable')
        # a page that neither names the venue nor is on its website
        blog = 'https://blog.example.sg/best-vegetarian'
        finding = vk_finding(dietProof={'sourceUrl': blog, 'quote': 'Many of these cafes are 100% vegetarian'},
                             sources=[{'url': u, 'evidence': 'x'} for u in (VK_HOME, VK_MENU_URL, blog)])
        record = vk_packet(self.root, finding=finding, extra_pages=[(blog, 'Our favourite places. Many of these cafes are 100% vegetarian.')])['records'][0]
        self.assertEqual(record['vegKitchen']['cause'], 'diet-page-unrelated')
        record = vk_packet(self.root, finding=finding, extra_pages=[(blog, 'Green Leaf Kitchen is great. Many of these cafes are 100% vegetarian.')])['records'][0]
        self.assertEqual(record['status'], 'proposed')  # the page names the venue

    def test_vegan_needs_a_vegan_quote_and_otherwise_falls_back_to_vegetarian(self):
        vegan = vk_packet(self.root, finding=vk_finding(venueDiet='Vegan', dietProof={'sourceUrl': VK_HOME, 'quote': 'We are a 100% vegetarian restaurant'}))['records'][0]
        self.assertEqual(vegan['vegKitchen']['place']['venueDiet'], 'Vegetarian')
        self.assertIn('listed as Vegetarian', vegan['notes'])
        home = VK_HOME_TEXT.replace('100% vegetarian restaurant', '100% vegan restaurant')
        vegan = vk_packet(self.root, finding=vk_finding(venueDiet='Vegan', dietProof={'sourceUrl': VK_HOME, 'quote': 'We are a 100% vegan restaurant'}), home=home)['records'][0]
        self.assertEqual(vegan['vegKitchen']['place']['venueDiet'], 'Vegan')

    def test_explorer_outcomes_are_recorded_with_their_causes(self):
        mixed = vk_packet(self.root, finding=vk_finding(decision='not-qualified', reason='mixed-kitchen: sells fish'))['records'][0]
        self.assertEqual((mixed['status'], mixed['vegKitchen']['cause']), ('excluded', 'mixed-kitchen'))
        other = vk_packet(self.root, finding=vk_finding(decision='not-qualified', reason='no menu'))['records'][0]
        self.assertEqual(other['vegKitchen']['cause'], 'explorer-not-qualified')
        held = vk_packet(self.root, finding=vk_finding(decision='held', reason='site down'))['records'][0]
        self.assertEqual((held['status'], held['vegKitchen']['cause']), ('held', 'explorer-held'))
        closure = {'status': 'permanently-closed', 'sourceUrl': VK_MAPS, 'quote': 'Permanently closed'}
        sources = [{'url': u, 'evidence': 'x'} for u in (VK_HOME, VK_MENU_URL, VK_MAPS)]
        for decision in ('qualifies', 'not-qualified'):
            closed = vk_packet(self.root, finding=vk_finding(decision=decision, closure=closure, sources=sources),
                               extra_pages=[(VK_MAPS, 'Green Leaf Kitchen\nPermanently closed\n188652')])['records'][0]
            self.assertEqual((closed['status'], closed['vegKitchen']['cause']), ('excluded', 'closed'))
        unproven = vk_packet(self.root, finding=vk_finding(closure=closure, sources=sources),
                             extra_pages=[(VK_MAPS, 'Green Leaf Kitchen open daily 188652')])['records'][0]
        self.assertEqual(unproven['status'], 'proposed')  # a closure quote must be on the stored page
        record = vk_packet(self.root, finding=vk_finding(name='Blue Diner'))['records'][0]
        self.assertEqual(record['vegKitchen']['cause'], 'name-not-on-page')
        record = vk_packet(self.root, candidate=vk_candidate(postalCode='188999'))['records'][0]
        self.assertEqual(record['vegKitchen']['cause'], 'postcode-not-on-page')
        few = vk_finding()
        few['menu']['items'] = few['menu']['items'][:2]
        record = vk_packet(self.root, finding=few)['records'][0]
        self.assertEqual((record['status'], record['vegKitchen']['cause']), ('held', 'too-few-verified-items'))
        record = vk_packet(self.root, candidate=vk_candidate(website='https://elsewhere.sg'))['records'][0]
        self.assertEqual(record['vegKitchen']['cause'], 'too-few-verified-items')  # bare prices need the venue's own site

    def test_place_contract_mirror_rejects_every_way_the_app_would(self):
        import veg_kitchen as vk
        _, data = self.place()
        tomorrow = (dt.datetime.now(vk.kc.SG).date() + dt.timedelta(days=1)).isoformat()
        copy_ = lambda: json.loads(json.dumps(data))
        proof = lambda **kw: dict(data['dietProof'], **kw)
        broken = {'kitchen key': dict(data, kitchen='options'), 'extra field': dict(data, extra=1), 'bad id': dict(data, id='vo-green-leaf-abc123'),
                  'allium claim': dict(data, alliumFreeClaim=True), 'future date': dict(data, checkedAt=tomorrow),
                  'vegan without a vegan quote': dict(data, venueDiet='Vegan', dietProof=proof(quote='We are a 100% vegetarian restaurant')),
                  'no googlePlaceId key': {k: v for k, v in data.items() if k != 'googlePlaceId'}}
        for label, place in broken.items():
            with self.subTest(label):
                self.assertTrue(vk.place_problem(place))
        edits = {'tab in quote': lambda p: p['dietProof'].update(quote='100%\tvegetarian'), 'newline in quote': lambda p: p['dietProof'].update(quote='100%\nvegetarian'),
                 'quote too long': lambda p: p['dietProof'].update(quote='vegetarian ' * 30), 'negated quote': lambda p: p['dietProof'].update(quote='not a vegetarian place'),
                 'proof not in sourceUrls': lambda p: p['dietProof'].update(sourceUrl='https://other.example.sg/x'),
                 'future proof date': lambda p: p['dietProof'].update(checkedAt=tomorrow), 'future menu date': lambda p: p['menu'].update(checkedAt=tomorrow),
                 'two items': lambda p: p['menu'].update(items=p['menu']['items'][:2]), 'repeated name': lambda p: p['menu']['items'][1].update(name='braised MOCK duck'),
                 'repeated id': lambda p: p['menu']['items'][1].update(id=p['menu']['items'][0]['id']), 'short id': lambda p: p['menu']['items'][0].update(id='ab'),
                 'bad dish diet': lambda p: p['menu']['items'][0].update(diet='X'), 'not SGD': lambda p: p['menu']['items'][0]['price'].update(currency='USD'),
                 'hours key': lambda p: p['hours'].pop('notes')}
        for label, edit in edits.items():
            with self.subTest(label):
                place = copy_()
                edit(place)
                self.assertTrue(vk.place_problem(place))
        place = copy_()
        place['menu']['items'][0]['diet'] = 'V'  # allowed by the contract (the server drops it); the bot never sends one
        self.assertIsNone(vk.place_problem(place))

    def test_item_ids_are_unique_slugs_of_at_least_three_characters(self):
        import veg_kitchen_check as kc
        used = set()
        ids = [kc.item_id(n, used) for n in ('Ma', 'Ma', 'Tea', 'tea!', '麻婆豆腐', '麻婆豆腐', 'A' * 90)]
        self.assertEqual(ids[:4], ['ma-dish', 'ma-dish-2', 'tea', 'tea-2'])
        self.assertTrue(all(re.fullmatch(r'[a-z0-9][a-z0-9-]{2,80}', i) for i in ids))
        self.assertEqual(len(set(ids)), len(ids))

    def test_place_data_updates_a_live_place_only_when_users_would_see_a_change(self):
        import veg_kitchen as vk
        row, data = self.place()
        live_data = json.loads(json.dumps(data))
        record = lambda d: {'kind': 'place', 'id': d['id'], 'hash': 'f' * 64, 'data': d}
        with self.assertRaisesRegex(ValueError, 'unchanged'):
            vk.place_data(self.root, row, vk_evidence(), vk_live(records=[record(live_data)]))
        changed = json.loads(json.dumps(live_data))
        changed['menu']['items'][0]['price']['amount'] = 11
        changed['photo'] = vk_photo()
        update = vk.place_data(self.root, row, vk_evidence(), vk_live(records=[record(changed)]))
        self.assertEqual((update['photo'], update['menu']['items'][0]['price']['amount']), (vk_photo(), 12.5))  # the cover stays
        old = json.loads(json.dumps(live_data))
        old['checkedAt'] = (dt.date.today() - dt.timedelta(days=vk.STALE_DAYS + 5)).isoformat()
        refreshed = vk.place_data(self.root, row, vk_evidence(), vk_live(records=[record(old)]))
        self.assertEqual(refreshed['menu']['items'][0]['name'], 'Braised Mock Duck')  # an old check date is refreshed
        big = json.loads(json.dumps(live_data))
        big['menu']['items'] = [dict(big['menu']['items'][i % 5], id='dish-%d' % i, name='Dish %d' % i) for i in range(12)]
        with self.assertRaisesRegex(ValueError, 'verified only 5 of 12'):
            vk.place_data(self.root, row, vk_evidence(), vk_live(records=[record(big)]))  # a partial re-read never shrinks the menu
        # identity: the same name and postcode under another id, a catalogue venue, an owner removal
        other = dict(live_data, id='vo-green-leaf-ffffff')
        with self.assertRaisesRegex(ValueError, 'Another place'):
            vk.place_data(self.root, row, vk_evidence(), vk_live(records=[record(other)]))
        venue = {'id': 'green-leaf', 'hash': 'b' * 64, 'data': {'googlePlaceId': data['googlePlaceId']}}
        with self.assertRaisesRegex(ValueError, 'Already listed'):
            vk.place_data(self.root, row, vk_evidence(), vk_live(venues=[venue]))
        removal = {'kind': 'place', 'id': 'vk-gone', 'identity': 'place:greenleafkitchen|188652'}
        with self.assertRaisesRegex(ValueError, 'Owner removed'):
            vk.place_data(self.root, row, vk_evidence(), vk_live(removals=[removal]))
        with self.assertRaisesRegex(ValueError, 'fresh captures'):
            vk.place_data(self.root, row, vk_evidence(VK_HOME), vk_live())  # the menu page has no attached capture

    def test_places_the_owner_confirmed_are_researched_first(self):
        import veg_kitchen as vk
        ids = ['vk-first-place-000001', 'vk-second-place-00002', 'vk-owner-said-veg-0003']
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [vk_candidate(candidateId=c, googlePlaceId='ChIJ' + c[-8:].replace('-', 'x') + 'abcd') for c in ids]})
        state = vk.progress(self.root)
        state['candidates'][ids[2]] = {'status': 'pending', 'ownerDiet': 'Vegan', 'ownerConfirmedAt': w.now(), 'ownerApproval': 'owner-telegram-' + 'a' * 24}
        vk.save_progress(self.root, state)
        due = vk.due(self.root, 2)
        self.assertEqual([c['candidateId'] for c in due], [ids[2], ids[0]])
        self.assertEqual(due[0]['ownerDiet'], 'Vegan')

    def test_settle_follows_review_publication_and_owner_removal_in_its_own_files(self):
        import veg_kitchen as vk
        import veg_options as vo
        cid = 'vk-green-leaf-abc123'
        packet = vk_packet(self.root)
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [vk_candidate()]})
        vk.mark_dispatched(self.root, [cid], packet_path='x')
        decision = lambda d: {'checkedAt': w.now(), 'packets': [packet], 'manager': {'decisions': [{'id': cid, 'decision': d, 'reason': 'Reviewed'}]}}
        w.write(self.root / 'outbox/20261020T010000Z.json', decision('hold'))
        row = vk.settle(self.root)['candidates'][cid]
        self.assertEqual((row['status'], row['cause']), ('held', 'manager-hold'))
        self.assertAlmostEqual(row['retryAt'] - dt.datetime.fromisoformat(row['updatedAt']).timestamp(), vo.HOLD_RETRY, delta=2)
        w.write(self.root / 'outbox/20261020T020000Z.json', decision('ready-for-editorial-review'))
        self.assertEqual(vk.settle(self.root)['candidates'][cid]['status'], 'verified')
        listed = {'records': [{'kind': 'place', 'id': cid, 'hash': 'a' * 64, 'data': {}}, {'kind': 'place', 'id': 'vo-green-cafe-abc123', 'hash': 'b' * 64, 'data': {}}],
                  'removals': [], 'reverts': []}
        self.assertEqual(vk.settle(self.root, listed)['candidates'][cid]['status'], 'published')
        self.assertNotIn('vo-green-cafe-abc123', vk.progress(self.root)['candidates'])  # the other task's place is not ours
        self.assertEqual(set(vo.settle(self.root, listed)['candidates']), {'vo-green-cafe-abc123'})  # and ours is not Mixed Kitchen's
        gone = {'records': [], 'removals': [{'kind': 'place', 'id': cid}], 'reverts': []}
        self.assertEqual(vk.settle(self.root, gone)['candidates'][cid]['status'], 'removed')
        self.assertEqual(vk.due(self.root, 10), [])
        # Mixed Kitchen's owner-removal guard also knows the Google place of a removed Veg Kitchen place
        data = {'id': 'vo-x-000000', 'name': 'Other Name', 'postalCode': '188111', 'googlePlaceId': 'ChIJvkgreenleaf123'}
        self.assertTrue(vo.owner_blocked(self.root, data, gone))

    def test_unclear_place_asks_the_owner_and_each_answer_is_applied_by_the_round(self):
        import veg_kitchen as vk
        import veg_options as vo
        cid = 'vk-green-leaf-abc123'
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [vk_candidate()]})
        w.write(self.root / 'state/veg-options/queue.json', {'candidates': []})

        def round_(n, finding, decision, candidate=None):
            packet = vk_packet(self.root, finding=finding, candidate=candidate)
            vk.mark_dispatched(self.root, [cid], packet_path='x')
            w.write(self.root / 'outbox' / ('20261020T0%d0000Z.json' % n), {'checkedAt': w.now(), 'packets': [packet],
                    'manager': {'decisions': [{'id': cid, 'decision': decision, 'reason': 'Reviewed'}]}})
            return packet['records'][0], vk.settle(self.root)['candidates'][cid]
        # no statement in the venue's own words: held for the owner, and offered once as a Telegram question
        record, row = round_(1, vk_finding(dietProof={'sourceUrl': VK_HOME, 'quote': 'Great noodles'}), 'hold')
        self.assertEqual((record['vegKitchen']['cause'], row['status'], row['cause']), ('owner-check', 'held', 'owner-check'))
        self.assertEqual([r['candidateId'] for r in vk.owner_check_view(self.root)], [cid])
        self.assertEqual(vk.record_owner_check(self.root, cid, 'veg', 'a' * 24), 'recorded')
        self.assertEqual(vk.record_owner_check(self.root, cid, 'mixed', 'b' * 24), 'stale')  # one answer per question
        self.assertEqual(vk.record_owner_check(self.root, cid, 'meat', 'c' * 24), 'stale')
        self.assertEqual(vk.settle(self.root)['candidates'][cid]['status'], 'pending')  # researched again at once
        self.assertEqual(vk.owner_check_view(self.root), [])
        self.assertEqual(vk.due(self.root, 5, fresh_only=True)[0]['ownerDiet'], 'Vegetarian')
        # the next round needs no quote: the owner's answer is the whole-venue proof, the menu and identity checks still run
        record, row = round_(2, vk_finding(dietProof=None, decision='qualifies'), 'ready-for-editorial-review')
        self.assertEqual((record['status'], record['vegKitchen']['cause']), ('proposed', None))
        place = vk.place_data(self.root, record, vk_evidence(), vk_live())
        self.assertEqual((place['dietProof']['confirmedBy'], place['venueDiet']), ('owner-telegram-' + 'a' * 24, 'Vegetarian'))
        self.assertIsNone(vk.place_problem(place))
        self.assertEqual(row['status'], 'verified')
        # Mixed Kitchen moves the place to that queue once; Skip excludes it
        state = vk.progress(self.root)
        vk.set_status(state['candidates'][cid], 'held', 'owner-check')
        state['candidates'][cid].pop('ownerDiet')
        vk.save_progress(self.root, state)
        data = vo.read(vk.owner_checks_file(self.root), {})
        self.assertTrue(data[cid]['applied'])
        self.assertEqual(vk.record_owner_check(self.root, cid, 'mixed', 'd' * 24), 'recorded')
        self.assertEqual(vk.settle(self.root)['candidates'][cid]['cause'], 'owner-mixed')
        moved = vo.read(self.root / 'state/veg-options/queue.json', {})['candidates']
        self.assertEqual([(r['candidateId'], r['source']) for r in moved], [('vo-green-leaf-abc123', 'owner-mixed')])
        self.assertFalse(vk.add_to_mixed_kitchen(self.root, vk_candidate()))  # never twice

    def test_due_offers_pending_then_rechecks_with_the_published_statement_then_holds(self):
        import veg_kitchen as vk
        ids = ['vk-held-place-000001', 'vk-green-leaf-abc123', 'vk-fresh-place-00002', 'vk-gone-place-000003']
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [vk_candidate(candidateId=c, googlePlaceId='ChIJ' + c[-8:].replace('-', 'x') + 'abcd') for c in ids]})
        state = vk.progress(self.root)
        old = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=31)).isoformat()
        for cid in ('vk-green-leaf-abc123', 'vk-gone-place-000003'):
            state['candidates'][cid] = {'status': 'published', 'updatedAt': old, 'publishedAt': old}
        vk.set_status(vk.entry(state, 'vk-held-place-000001'), 'held', 'manager-hold', at='2026-01-01T00:00:00+00:00')
        vk.save_progress(self.root, state)
        _, data = self.place()
        live = vk_live(records=[{'kind': 'place', 'id': 'vk-green-leaf-abc123', 'hash': 'a' * 64, 'data': data}])
        due = vk.due(self.root, 10, live=live)
        self.assertEqual([c['candidateId'] for c in due], ['vk-green-leaf-abc123', 'vk-held-place-000001', 'vk-fresh-place-00002'])  # vk-gone is not live
        view = vk.worker_view(due[0])
        self.assertEqual((view['recheck']['dietProofQuote'], view['recheck']['menuSourceUrl'], view['recheck']['publishedItems'][0]['name']),
                         (data['dietProof']['quote'], VK_MENU_URL, 'Braised Mock Duck'))
        self.assertEqual(view['source'], 'google-typed')
        self.assertEqual([c['candidateId'] for c in vk.due(self.root, 10, fresh_only=True)], ['vk-fresh-place-00002'])

    def test_two_failed_statements_in_a_row_ask_the_owner_and_tooling_never_counts(self):
        import veg_kitchen as vk
        cid = 'vk-green-leaf-abc123'
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [vk_candidate()]})
        state = vk.progress(self.root)
        old = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=31)).isoformat()
        state['candidates'][cid] = {'status': 'published', 'updatedAt': old, 'publishedAt': old}
        vk.save_progress(self.root, state)
        outcomes = []

        def recheck(n, finding, decision):
            packet = vk_packet(self.root, finding=finding, candidate=vk_candidate(recheck={'publishedItems': []}))
            self.assertTrue(packet['records'][0]['vegKitchen']['recheck'])
            w.write(self.root / 'outbox' / ('20261020T0%d0000Z.json' % n), {'checkedAt': w.now(), 'packets': [packet],
                    'manager': {'decisions': [{'id': cid, 'decision': decision, 'reason': 'Reviewed'}]}})
            row = vk.settle(self.root)['candidates'][cid]
            outcomes.append((row['lastRecheck']['result'], row['recheckMisses']))
        recheck(1, None, 'ready-for-editorial-review')
        recheck(2, vk_finding(decision='not-qualified', reason='mixed-kitchen'), 'exclude')
        recheck(3, vk_finding(decision='held', reason='site down'), 'hold')
        recheck(4, vk_finding(dietProof={'sourceUrl': VK_HOME, 'quote': 'We are 100% vegetarian here'}), 'hold')  # the statement is not on the page
        row = vk.progress(self.root)['candidates'][cid]
        self.assertEqual(outcomes, [('passed', 0), ('missed', 1), ('inconclusive', 1), ('missed', 2)])
        self.assertEqual((row['status'], row['ownerPrompt']['status']), ('published', 'due'))
        self.assertEqual([c for c, _ in vk.owner_prompts(self.root)], [cid])
        few = vk_finding()
        few['menu']['items'] = few['menu']['items'][:2]
        self.assertEqual(vk.recheck_result(vk_packet(self.root, finding=few)['records'][0], 'hold'), 'inconclusive')  # too few items is not a statement miss
        self.assertEqual(vk.due(self.root, 5, at=time_now() + 90 * 86400), [])  # no recheck while the owner decides

    def test_manager_review_gets_the_veg_kitchen_rules_a_compact_menu_and_focused_excerpts(self):
        import learning
        packet = vk_packet(self.root)
        w.write(self.root / 'baseline.json', {'recipeNames': []})
        result = {'decisions': [{'id': 'vk-green-leaf-abc123', 'decision': 'hold', 'reason': 'x'}], 'publication': 'not-published'}
        with patch.object(w, 'ROOT', self.root), patch.object(learning, 'offer', return_value=[]), \
                patch.object(w, 'run_model', return_value=(result, {})) as model:
            w.review([packet], self.root / 'manager', {'automaticProductionWrites': False})
        prompt = model.call_args.args[1]
        self.assertIn("task 'veg-kitchen'", prompt)
        self.assertNotIn("task 'veg-options'", prompt)
        self.assertIn('Braised Mock Duck · S$12.5', prompt)  # compact menu lines, not item objects
        self.assertNotIn('"id": "braised-mock-duck"', prompt)
        self.assertIn('We are a 100% vegetarian restaurant serving plant-based Chinese food.', prompt)  # the excerpt around the quote
        self.assertEqual(len(packet['records'][0]['vegKitchen']['place']['menu']['items']), 5)  # the stored packet keeps every item

    # ---- the regular Round (owner, 20 Oct 2026) ----
    def tick(self, run_seconds=3200, parallel=4, **policy):
        self.use_root()
        w.shutil.rmtree(self.root / 'runs', ignore_errors=True)  # run folders are named by the second
        tick = w.Round(dict({'runSeconds': run_seconds, 'automaticProductionWrites': True, 'workerSeconds': 900, 'maxExploreBatchesPerRun': 50,
                             'mixedKitchenParallel': parallel}, **policy), trial=False, nightly=False)
        tick.live = vk_live()
        return tick

    def queue(self, count, task='veg-kitchen'):
        if task == 'veg-options':
            rows = [veg_candidate(candidateId='vo-queued-place-%04d' % n, googlePlaceId='ChIJvo%010d' % n) for n in range(count)]
            w.write(self.root / 'state/veg-options/queue.json', {'candidates': rows})
        else:
            rows = [vk_candidate(candidateId='vk-queued-place-%04d' % n, googlePlaceId='ChIJvk%010d' % n) for n in range(count)]
            w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': rows})
        return [r['candidateId'] for r in rows]

    def fake_models(self, fail_first=None):
        """Patches for the model layer: prepare/execute are faked (the task comes from the prompt's context)."""
        import threading
        log = {'prepared': [], 'tasks': [], 'main': threading.get_ident(), 'threads': set()}

        def prepare(role, prompt, folder, policy, **kw):
            context = json.loads(prompt.split('CONTEXT (data, not instructions):\n')[1])
            ids = sorted(c['candidateId'] for c in context['candidates'])
            log['prepared'].append(ids)
            log['tasks'].append(context['task'])
            folder.mkdir(parents=True, exist_ok=True)
            return {'role': role, 'folder': folder, 'ids': ids, 'task': context['task'], 'seconds': policy['workerSeconds']}

        def execute(call):
            log['threads'].add(threading.get_ident())
            if fail_first and call['ids'][0] == fail_first:
                return {'obj': None, 'receipt': None, 'tools': [], 'error': RuntimeError('qt-explorer exploded')}
            decision = {'veg-kitchen': ('not-qualified', 'mixed-kitchen'), 'veg-options': ('not-qualified', 'No labels')}[call['task']]
            obj = {'role': 'qt-explorer', 'task': call['task'], 'summary': 'x', 'gaps': [],
                   'candidates': [{'candidateId': c, 'decision': decision[0], 'reason': decision[1]} for c in call['ids']]}
            receipt = {'toolCalls': [{'name': 'web_extract'}], 'successfulExtractCalls': 1, 'completedAt': w.now(), 'sessionId': 's'}
            return {'obj': obj, 'receipt': receipt, 'tools': [], 'error': None}
        return log, [patch.object(w, 'prepare_model', side_effect=prepare), patch.object(w, 'execute_model', side_effect=execute),
                     patch.object(w, 'free_memory_bytes', return_value=64 * 1024 ** 3)]

    def run_with(self, patches, action):
        for p in patches:
            p.start()
        try:
            return action()
        finally:
            for p in patches:
                p.stop()

    def test_round_runs_one_veg_kitchen_wave_before_mixed_kitchen(self):
        import veg_kitchen as vk
        names = [s.__name__ for s in self.tick().stages()]
        self.assertLess(names.index('cover_search'), names.index('veg_kitchen'))
        self.assertLess(names.index('veg_kitchen'), names.index('mixed_kitchen'))
        self.queue(24)
        tick = self.tick(w.ROUND_RESERVE + 3000)
        log, patches = self.fake_models()
        self.assertEqual(tick.veg_kitchen_reserve(), w.MIXED_WAVE_SECONDS)
        self.run_with(patches, tick.veg_kitchen)
        self.assertEqual(tick.veg_kitchen_reserve(), 0)  # the stage has run this round
        flat = [c for batch in log['prepared'] for c in batch]
        self.assertEqual(([len(b) for b in log['prepared']], len(set(flat)), set(log['tasks'])), ([4, 4, 4, 4], 16, {'veg-kitchen'}))  # ONE wave: 4 workers of 4
        self.assertNotIn(log['main'], log['threads'])  # the model calls ran off the main thread
        self.assertEqual(sorted(p.name for p in tick.folder.glob('veg-kitchen-*')), ['veg-kitchen-%d' % n for n in range(4)])
        rows = vk.progress(self.root)['candidates']
        self.assertEqual(({r['status'] for r in rows.values()}, sorted(rows)), ({'in-review'}, sorted(flat)))
        self.assertEqual(len(vk.due(self.root, 50)), 8)  # the rest waits for the next round
        self.assertEqual((tick.pending_review_counts()['veg-kitchen'], len(tick.state['pendingReview'])), (4, 4))

    def test_the_audit_gets_a_turn_when_the_kitchen_queues_never_empty(self):
        self.queue(20)
        self.queue(20, 'veg-options')
        tick = self.tick(w.ROUND_RESERVE + 6000)
        tick.pending = [{'venueId': 'waiting-venue'}]
        self.assertEqual(tick.explorer_queue_reserve(), 0)  # first round: the audit has never had a turn
        self.assertGreater(tick.state['auditTurnAt'], 0)
        later = self.tick(w.ROUND_RESERVE + 6000)
        later.state['auditTurnAt'] = tick.state['auditTurnAt']
        later.pending = [{'venueId': 'waiting-venue'}]
        self.assertEqual(later.explorer_queue_reserve(), 2 * w.MIXED_WAVE_SECONDS)  # next round: the queues keep their time
        idle = self.tick(w.ROUND_RESERVE + 6000)
        idle.pending = []
        self.assertEqual(idle.explorer_queue_reserve(), 2 * w.MIXED_WAVE_SECONDS)  # nothing to audit: no turn is spent
        self.assertNotIn('auditTurnAt', idle.state)

    def test_veg_kitchen_and_mixed_kitchen_share_a_round_and_keep_their_own_state(self):
        import veg_kitchen as vk
        import veg_options as vo
        self.queue(20)
        self.queue(20, 'veg-options')
        tick = self.tick(w.ROUND_RESERVE + 6000)
        log, patches = self.fake_models()
        self.assertEqual((tick.veg_kitchen_reserve(), tick.mixed_kitchen_reserve(), tick.explorer_queue_reserve()),
                         (w.MIXED_WAVE_SECONDS, w.MIXED_WAVE_SECONDS, 2 * w.MIXED_WAVE_SECONDS))
        self.run_with(patches, lambda: (tick.veg_kitchen(), tick.mixed_kitchen()))
        by_task = {t: [b for b, k in zip(log['prepared'], log['tasks']) if k == t] for t in ('veg-kitchen', 'veg-options')}
        self.assertEqual([len(b) for b in by_task['veg-kitchen']], [4, 4, 4, 4])
        self.assertEqual(sum(len(b) for b in by_task['veg-options']), 20)  # Mixed Kitchen still gets the rest of the time
        self.assertTrue(all(c.startswith('vk-') for b in by_task['veg-kitchen'] for c in b) and all(c.startswith('vo-') for b in by_task['veg-options'] for c in b))
        self.assertEqual((len(vk.progress(self.root)['candidates']), len(vo.progress(self.root)['candidates'])), (16, 20))

    def test_veg_kitchen_pauses_at_twelve_packets_waiting_and_without_time_or_a_queue(self):
        self.queue(8)
        paths = []
        for n in range(12):
            w.write(self.root / ('v%d.json' % n), {'task': 'veg-kitchen', 'records': []})
            paths.append(str(self.root / ('v%d.json' % n)))
        waiting = self.tick(w.ROUND_RESERVE + 3000)
        waiting.state['pendingReview'] = paths[:11]
        self.assertEqual(waiting.veg_kitchen_reserve(), w.MIXED_WAVE_SECONDS)
        paused = self.tick(w.ROUND_RESERVE + 3000)
        paused.state['pendingReview'] = paths
        with patch.object(w, 'prepare_model', side_effect=AssertionError('paused')):
            self.assertEqual(paused.veg_kitchen_reserve(), 0)
            paused.veg_kitchen()
        self.assertTrue(any('catch up' in n['note'] for n in paused.notes))
        short = self.tick(w.ROUND_RESERVE + w.MIN_EXPLORER_SECONDS - 10)
        with patch.object(w, 'prepare_model', side_effect=AssertionError('no time left')):
            short.veg_kitchen()
        (self.root / 'state/veg-kitchen/queue.json').unlink()
        none = self.tick(w.ROUND_RESERVE + 3000)
        self.assertEqual(none.veg_kitchen_reserve(), 0)
        with patch.object(w, 'prepare_model', side_effect=AssertionError('no queue')):
            none.veg_kitchen()

    def test_one_failed_veg_kitchen_worker_is_held_for_a_retry_and_keeps_the_others(self):
        import veg_kitchen as vk
        ids = self.queue(8)
        tick = self.tick(w.ROUND_RESERVE + 3000, parallel=2)
        log, patches = self.fake_models(fail_first=ids[0])
        self.run_with(patches, tick.veg_kitchen)
        rows = vk.progress(self.root)['candidates']
        self.assertEqual({rows[c]['status'] for c in ids[:4]}, {'held'})
        self.assertTrue(all(rows[c]['cause'] == 'worker-failed' for c in ids[:4]))
        self.assertEqual({rows[c]['status'] for c in ids[4:]}, {'in-review'})
        self.assertTrue(any('Veg Kitchen' in e['error'] and 'exploded' in e['error'] for e in tick.errors))

    def test_review_counts_keep_veg_kitchen_packets_apart_from_the_whole_menu_audit(self):
        tick = self.tick()
        paths = []
        for n, task in enumerate(['veg-kitchen'] * 3 + ['veg-options'] * 2 + [None]):
            w.write(self.root / ('p%d.json' % n), dict({'role': 'qt-explorer', 'records': []}, **({'task': task} if task else {})))
            paths.append(str(self.root / ('p%d.json' % n)))
        tick.state['pendingReview'] = paths
        self.assertEqual(tick.pending_review_counts(), {'veg-options': 2, 'veg-kitchen': 3, 'other': 1})
        self.assertEqual(tick.pending_review_split(), (2, 1))
        self.assertTrue(tick.mixed_review_waiting())

    def test_pilot_runs_the_veg_kitchen_task_with_the_same_wave_and_workers_of_four(self):
        import run_veg_options_pilot as pilot
        import run_veg_kitchen_pilot  # noqa: F401  (the entry point imports)
        import veg_kitchen as vk
        self.use_root()
        ids = self.queue(10)
        tick = pilot.VegRound({'runSeconds': 3200, 'automaticProductionWrites': True, 'workerSeconds': 900, 'mixedKitchenParallel': 2,
                               '_deadline': time_now() + 3000, '_researchDeadline': time_now() + 2000}, set(ids), vk)
        waves = []

        def wave(self_, task, batches, folders, budget):
            waves.append((task, [[c['candidateId'] for c in x] for x in batches], [p.name for p in folders]))
            return 'ok'
        with patch.object(w.Round, 'explorer_wave', wave), patch.object(w, 'free_memory_bytes', return_value=64 * 1024 ** 3):
            tick.veg_explorer()
        self.assertEqual([t for t, _, _ in waves], [vk, vk])
        self.assertEqual([[len(x) for x in b] for _, b, _ in waves], [[4, 4], [2]])
        self.assertEqual(waves[0][2] + waves[1][2], ['veg-0', 'veg-1', 'veg-2'])
        self.assertEqual([s.__name__ for s in tick.stages()], ['veg_explorer', 'veg_review', 'veg_publish', 'report'])


def time_now():
    import time
    return time.time()


if __name__ == "__main__":
    unittest.main()
