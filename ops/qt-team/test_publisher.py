"""Publication boundaries without network, model calls or live content writes."""
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import publisher as p
import workflow as w


class Publishing(unittest.TestCase):
    def test_owner_change_during_review_archives_stale_batch_without_rebasing(self):
        import io
        from urllib.error import HTTPError
        with tempfile.TemporaryDirectory() as d,patch.object(p,'ROOT',Path(d)):
            root=Path(d);(root/'state').mkdir();folder=root/'run'
            batch={'id':'old-batch','parent':'old','records':[{'kind':'venue','id':'v','data':{}}]}
            (root/'state/pending-publication.json').write_text(json.dumps(batch))
            (root/'state/pending-publication-outcomes.json').write_text('{}')
            rejected=HTTPError('https://example.test',409,'Conflict',{},io.BytesIO(b'{"error":"Publication baseline changed"}'))
            with patch.object(p,'request',side_effect=[{'revision':'new','removals':[]},rejected]) as api:
                result=p.run_publication({'automaticProductionWrites':True},folder)
            self.assertEqual(result['status'],'live-change-requires-new-review')
            self.assertEqual(api.call_count,2)
            self.assertFalse((root/'state/pending-publication.json').exists())
            self.assertEqual(json.loads((folder/'superseded-by-live-change.json').read_text()),batch)

    def test_venue_review_dates_match_app_calendar_contract_without_mutating_evidence(self):
        row={'id':'venue-one','proposals':[{'field':'menuPrices','newValue':[{'checkedAt':'2026-10-17T20:00:00Z'}]},
                                         {'field':'hours','newValue':{'checkedAt':'2026-10-17T09:56:32.990814+00:00'}}]}
        result=p.venue_data(row)
        self.assertEqual(result['menuPrices'][0]['checkedAt'],'2026-10-18')
        self.assertEqual(result['hours']['checkedAt'],'2026-10-17')
        self.assertEqual(row['proposals'][0]['newValue'][0]['checkedAt'],'2026-10-17T20:00:00Z')
        row['proposals'][0]['newValue'][0]['checkedAt']='2026-10-17T20:00:00'
        with self.assertRaises(ValueError):p.venue_data(row)

    def test_publication_reviewer_sees_live_recipe_identities(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'ROOT', Path(directory)):
            (Path(directory)/'baseline.json').write_text(json.dumps({'recipeNames': []}))
            live = {'recipeNames': [{'id': 'published-one', 'name': 'Already Published Tofu'}]}
            review = {'decisions': [{'key': 'recipe:new-one', 'decision': 'hold', 'reason': 'Duplicate'}], 'images': []}
            with patch.object(p, 'current_baseline', return_value=live) as current, \
                    patch.object(w, 'run_model', return_value=(review, {'toolCalls': []})) as model:
                p.publication_review([{'kind': 'recipe', 'id': 'new-one', 'sources': []}], [], [],
                                     Path(directory)/'review', {'automaticProductionWrites': True})
            self.assertIn('Already Published Tofu', model.call_args.args[1])
            current.assert_called_once()

    def package(self, role, row, decision='ready-for-editorial-review'):
        return {'packets':[{'role':role,'records':[row]}], 'manager':{'decisions':[{'id':row['id'],'decision':decision}]}}

    def live(self, records=None):
        return {'venues':[], 'records':records or [], 'recipeIdentities':[]}

    def test_cancellation_updates_existing_event_and_preserves_details(self):
        event={'id':'event-a','title':'Class','startsAt':(dt.datetime.now(dt.timezone.utc)+dt.timedelta(days=3)).isoformat(),'status':'scheduled','currency':None}
        row={'id':'event-a','status':'excluded','event':{'status':'cancelled'}}
        with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)), patch.object(p,'sources',return_value=[{'checkedAt':'2026-10-17','url':'https://example.org/event'}]):
            candidates,_,_=p.prepare([self.package('qt-event',row,'exclude')],self.live([{'kind':'event','id':'event-a','hash':'a'*64,'data':event}]))
        self.assertEqual(candidates[0]['data']['status'],'cancelled')
        self.assertEqual(candidates[0]['data']['title'],'Class')
        self.assertEqual(candidates[0]['expectedHash'],'a'*64)

    def test_unpublished_excluded_event_stays_out(self):
        row={'id':'event-a','status':'excluded','event':{'status':'cancelled'}}
        with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)):
            candidates,_,held=p.prepare([self.package('qt-event',row,'exclude')],self.live())
        self.assertEqual(candidates,[]);self.assertEqual(len(held),1)

    def test_existing_recipe_advances_revision_and_requires_unchanged_identity(self):
        row={'id':'recipe-a','status':'proposed'}
        live=self.live([{'kind':'recipe','id':'recipe-a','hash':'b'*64,'data':{'name':'Tofu','revision':2}}]);live['recipeIdentities']=[{'id':'recipe-a','name':'Tofu'}]
        with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)), patch.object(p,'sources',return_value=[{'checkedAt':'2026-10-17'}]), patch.object(p,'server_recipe_problem',return_value=None), patch.object(p,'recipe_data',return_value={'name':'Tofu','revision':1}):
            candidates,_,_=p.prepare([self.package('qt-cooker',row)],live)
        self.assertEqual(candidates[0]['data']['revision'],3)
        self.assertEqual(candidates[0]['expectedHash'],'b'*64)
        with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)), patch.object(p,'sources',return_value=[{}]), patch.object(p,'server_recipe_problem',return_value=None), patch.object(p,'recipe_data',return_value={'name':'Another dish'}):
            candidates,_,held=p.prepare([self.package('qt-cooker',row)],live)
        self.assertEqual(candidates,[]);self.assertIn('identity change',held[0]['reason'])

    def test_model_approval_without_pixel_delivery_cannot_publish_image(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);image=root/'images'/('a'*64);image.mkdir(parents=True)
            (root/'baseline.json').write_text(json.dumps({'recipeNames':[]}))
            (image/'inspection-candidate.json').write_text(json.dumps({'sha256':'b'*64,'deliveredPixels':False,'at':dt.datetime.now(dt.timezone.utc).isoformat()}))
            candidates=[{'kind':'recipe','id':'recipe-a','sources':[]}]
            images=[{'sha256':'b'*64,'file':str(image/'candidate.jpg'),'provenance':{'kind':'original-generated-recipe-illustration'}}]
            review={'decisions':[{'key':'recipe:recipe-a','decision':'approved','reason':'Looks good'}],'images':[{'sha256':'b'*64,'decision':'approved','reason':'Looks good'}]}
            receipt={'toolCalls':[{'name':'qt_review_image','input':{'requestHash':'a'*64}}]}
            with patch.object(p,'ROOT',root),patch.object(w,'run_model',return_value=(review,receipt)),self.assertRaisesRegex(ValueError,'pixels'):
                p.publication_review(candidates,images,[],root/'review',{})

    def test_manager_review_of_a_photo_already_carried_does_not_fail_the_batch(self):
        # 20 Oct 2026: Manager also reviewed Lazy Lizard's existing drawing (not a new upload) and every round failed.
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'baseline.json').write_text(json.dumps({'recipeNames':[]}))
            candidates=[{'kind':'recipe','id':'recipe-a','sources':[]}]
            review={'decisions':[{'key':'recipe:recipe-a','decision':'hold','reason':'Drawing not inspected'}],
                    'images':[{'sha256':'c'*64,'decision':'hold','reason':'Unavailable pixels'}],'summary':'x'}
            with patch.object(p,'ROOT',root),patch.object(w,'run_model',return_value=(review,{'toolCalls':[]})):
                result=p.publication_review(candidates,[],[],root/'review',{})
            self.assertEqual(result['images'],[])
            missing=dict(review,images=[])  # a new image Manager did not review still fails
            images=[{'sha256':'b'*64,'file':str(root/'x.jpg'),'provenance':{'kind':'place-dish-illustration'}}]
            with patch.object(p,'ROOT',root),patch.object(w,'run_model',return_value=(missing,{'toolCalls':[]})),self.assertRaisesRegex(ValueError,'Image review incomplete'):
                p.publication_review(candidates,images,[],root/'review2',{})

    def test_after_a_rejection_the_rejected_items_are_tried_alone_first(self):
        # 21 Oct 2026: a bad venue price change rejoined every full batch while innocent places were tried alone first.
        with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)):
            root=Path(d);(root/'state').mkdir()
            cands=[{'kind':'place','id':'vk-new'},{'kind':'place','id':'vo-a'},{'kind':'venue','id':'research-yes'}]
            self.assertEqual(p.isolation_order(cands),(cands,False))
            w.write(root/p.ISOLATE,{'at':w.now(),'reason':'Price change','suspects':['place:vo-a','venue:research-yes']})
            ordered,isolate=p.isolation_order(cands)
            self.assertTrue(isolate)
            self.assertEqual([c['id'] for c in ordered],['research-yes','vo-a','vk-new'])  # suspects first, venue first
            self.assertEqual(p.isolation_order([cands[0]]),([cands[0]],False))  # no suspect left: full batches again
            w.write(root/p.ISOLATE,{'at':w.now(),'reason':'old marker'})
            self.assertTrue(p.isolation_order(cands)[1])  # an older marker keeps one-item batches
            # publishing a suspect clears it of suspicion; the marker ends with the last one
            w.write(root/p.ISOLATE,{'at':w.now(),'reason':'Price change','suspects':['place:vk-a','venue:research-yes']})
            for item, left in ((('place','vk-a'),['venue:research-yes']),(('venue','research-yes'),None)):
                batch={'id':'qt-test','parent':'r1','assets':[],'records':[{'kind':item[0],'id':item[1],'proposalHash':'h','data':{}}]}
                w.write(root/'state/pending-publication.json',batch)
                def request(method,path,body=None):
                    return {'revision':'r1','removals':[],'changes':[]} if method=='GET' else {'id':'qt-test','revision':'r1','records':[],'changes':[]}
                with patch.object(p,'request',side_effect=request):
                    self.assertEqual(p.run_publication({'automaticProductionWrites':True},root/'run')['status'],'published')
                self.assertEqual(w.read(root/p.ISOLATE,{}).get('suspects') if (root/p.ISOLATE).exists() else None,left)

    def test_a_suspect_rejected_alone_is_held_and_ends_isolation(self):
        import io, urllib.error
        def rejected():
            raise urllib.error.HTTPError('u', 422, 'x', {}, io.BytesIO(b'{"error":"Price change must match the exact dish and sales-channel source"}'))
        with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)):
            root=Path(d);(root/'state').mkdir()
            w.write(root/p.ISOLATE,{'at':w.now(),'reason':'Price change','suspects':['venue:research-yes','place:vo-a']})
            batch={'id':'qt-test','parent':'r1','assets':[],'records':[{'kind':'venue','id':'research-yes','proposalHash':'h0','data':{}}]}
            w.write(root/'state/pending-publication.json',batch)
            with patch.object(p,'request',side_effect=lambda method,path,body=None:{'revision':'r1','removals':[]} if method=='GET' else rejected()):
                self.assertEqual(p.run_publication({'automaticProductionWrites':True},root/'run')['status'],'rejected-by-server')
            self.assertEqual(w.read(root/'state/publication-outcomes.json')['h0']['decision'],'hold')
            self.assertFalse((root/p.ISOLATE).exists())

    def test_a_covers_only_publication_keeps_one_item_batches_after_a_rejection(self):
        # 20 Oct 2026: covers published between rounds cleared the marker, so the rejected price change jammed batches again.
        for covers_only, kept in ((True, True), (False, False)):
            with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)):
                root=Path(d);(root/'state').mkdir()
                w.write(root/p.ISOLATE,{'at':w.now(),'reason':'Price change must match','batchId':'old'})
                batch={'id':'qt-test','parent':'r1','assets':[],'records':[{'kind':'place','id':'vk-a','proposalHash':'h0','data':{}}]}
                w.write(root/'state/pending-publication.json',batch)
                def request(method,path,body=None):
                    return {'revision':'r1','removals':[],'changes':[]} if method=='GET' else {'id':'qt-test','revision':'r1','records':['place:vk-a'],'changes':[]}
                with patch.object(p,'request',side_effect=request):
                    result=p.run_publication({'automaticProductionWrites':True},root/'run',covers_only=covers_only)
                self.assertEqual(result['status'],'published')
                self.assertEqual((root/p.ISOLATE).exists(),kept)

    def step_photo_fixture(self, root, steps, drawn, size=60_000):
        """A new recipe with `steps` steps; images for the cover and the 1-based steps in `drawn`."""
        import hashlib
        (root/'state').mkdir(exist_ok=True)
        data={'name':'Sweet potato balls','revision':1,'steps':[{'title':'Step %d'%n,'instruction':'Do thing %d'%n,'ingredientIds':[]} for n in range(1,steps+1)]}
        def image(name, **extra):
            folder=root/'images'/name;folder.mkdir(parents=True)
            raw=(name.encode()*size)[:size];digest=hashlib.sha256(raw).hexdigest();(folder/'candidate.jpg').write_bytes(raw)
            (folder/'result.json').write_text(json.dumps({'recipeId':'recipe-b','sha256':digest,'width':640,'height':480,'provider':'f','model':'f','prompt':'f',
                                                          'originalSha256':digest,'status':'generated-awaiting-visual-review',**extra}))
            return digest
        hashes={'cover':image('cover')}
        for n in drawn:
            hashes[n]=image('step%d'%n,step=n,stepKey=p.step_key('Do thing %d'%n))
        return data,hashes

    def prepare_recipe(self, root, data, live=None):
        row={'id':'recipe-b','status':'proposed'}
        with patch.object(p,'ROOT',root),patch.object(p,'sources',return_value=[{'checkedAt':'2026-10-22'}]),patch.object(p,'server_recipe_problem',return_value=None),\
                patch.object(p,'recipe_data',return_value=json.loads(json.dumps(data))):
            return p.prepare([self.package('qt-cooker',row)],live or self.live())

    def test_new_recipe_publishes_only_with_a_photo_for_every_step(self):
        # Owner, 22 Oct 2026: step photos are the crucial missing part of Cooker's recipes.
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            data,hashes=self.step_photo_fixture(root,3,[1,3])
            (root/'state/step-photos.json').write_text(json.dumps({'enabled':True}))
            candidates,images,held=self.prepare_recipe(root,data)
            self.assertEqual(candidates,[])
            self.assertIn('Awaiting step photos: 1 of 3 steps have none yet',held[0]['reason'])
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            data,hashes=self.step_photo_fixture(root,3,[1,2,3])
            (root/'state/step-photos.json').write_text(json.dumps({'enabled':True}))
            candidates,images,_=self.prepare_recipe(root,data)
            steps=candidates[0]['data']['steps']
            self.assertEqual([s['photo'] for s in steps],['/api/editorial/assets/%s.jpg'%hashes[n] for n in (1,2,3)])
            self.assertEqual(candidates[0]['data']['image']['path'],'/api/editorial/assets/%s.jpg'%hashes['cover'])  # a step photo is never the cover
            self.assertEqual({i['provenance']['kind'] for i in images},{'original-generated-recipe-illustration','original-generated-recipe-step-illustration'})
            self.assertEqual(len(images),4)
        with tempfile.TemporaryDirectory() as d:  # switched off: the cover alone, as before
            root=Path(d)
            data,_=self.step_photo_fixture(root,3,[])
            candidates,images,_=self.prepare_recipe(root,data)
            self.assertEqual((len(images),any('photo' in s for s in candidates[0]['data']['steps'])),(1,False))

    def test_step_photos_fit_one_publication_and_held_ones_are_redrawn(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            data,hashes=self.step_photo_fixture(root,8,range(1,9),size=150_000)  # 9 images, 1.35 MB: more than one publication carries
            (root/'state/step-photos.json').write_text(json.dumps({'enabled':True}))
            candidates,images,_=self.prepare_recipe(root,data)
            self.assertEqual((len(candidates),len(images)),(1,9))  # a single recipe still goes, alone
            review={'decisions':[{'key':'recipe:recipe-b','decision':'approved','reason':'Approved by QT Manager after review.'}],
                    'images':[{'sha256':i['sha256'],'decision':'hold' if i['sha256']==hashes[4] else 'approved','reason':'Step 4 shows a different pan.'} for i in images]}
            batch=p.make_batch(candidates,images,review,'a'*64,'qt-test')
            self.assertEqual((batch['records'],batch['assets']),([],[]))  # one held step photo: the recipe waits
            with patch.object(p,'ROOT',root):
                p.set_aside_held_images(review)
            self.assertEqual([x.name.split('.held-')[0] for x in (root/'images').glob('*.held-*')],['step4'])
            candidates,_,held=self.prepare_recipe(root,data)
            self.assertIn('1 of 8 steps have none yet',held[0]['reason'])  # step 4 is drawn again next round

    def test_later_image_is_reviewable_without_reextracting_published_recipe(self):
        import hashlib
        row={'id':'recipe-a','status':'proposed'}
        live=self.live([{'kind':'recipe','id':'recipe-a','hash':'b'*64,'data':{'name':'Tofu','revision':1}}])
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'state').mkdir();image=root/'images'/'request';image.mkdir(parents=True)
            (root/'state/publication-outcomes.json').write_text(json.dumps({p.sha(row):{'decision':'approved'}}))
            raw=b'fixture-image';image_hash=hashlib.sha256(raw).hexdigest();(image/'candidate.jpg').write_bytes(raw)
            (image/'result.json').write_text(json.dumps({'recipeId':'recipe-a','sha256':image_hash,'width':960,'height':720,'provider':'fixture','model':'fixture','prompt':'fixture','originalSha256':image_hash}))
            with patch.object(p,'ROOT',root),patch.object(p,'sources',return_value=[{'checkedAt':'2026-10-17'}]),patch.object(p,'server_recipe_problem',return_value=None), patch.object(p,'recipe_data',return_value={'name':'Tofu','revision':1}):
                candidates,images,_=p.prepare([self.package('qt-cooker',row)],live)
            self.assertEqual(candidates[0]['data']['revision'],2)
            self.assertEqual(len(images),1)
            self.assertNotEqual(candidates[0]['proposalHash'],p.sha(row))
            live['records'][0]['data']['image']=candidates[0]['data']['image']
            with patch.object(p,'ROOT',root):
                candidates,_,_=p.prepare([self.package('qt-cooker',row)],live)
            self.assertEqual(candidates,[])

    def test_reviewed_image_hash_must_still_match_at_send(self):
        with tempfile.TemporaryDirectory() as d:
            image=Path(d)/'candidate.jpg';image.write_bytes(b'changed')
            candidate={'kind':'recipe','id':'recipe-a','data':{'image':{'path':'/api/editorial/assets/'+('a'*64)+'.jpg'}}}
            review={'decisions':[{'key':'recipe:recipe-a','decision':'approved','reason':'Reviewed'}],'images':[{'sha256':'a'*64,'decision':'approved','reason':'Reviewed'}]}
            with self.assertRaisesRegex(ValueError,'changed after review'):
                p.make_batch([candidate],[{'sha256':'a'*64,'file':str(image)}],review,'0'*64,'test')

    def test_server_recipe_rules_are_checked_before_review(self):
        # 18 Oct: Jeera Aloo's "seasoning" passed Manager, then the server's 422 jammed every later publication.
        ok={'id':'jeera-aloo','name':'Jeera aloo','cuisine':'Indian','author':'Fixture','servings':4,'minutes':30,'categories':['With rice'],
            'steps':[{'title':'Cook','instruction':'Cook the potatoes.'}],'ingredients':[{'id':'potato','name':'potato','unit':'g'},{'id':'cumin','name':'cumin','unit':'tsp'}],
            'dietary':{'diet':'Vegan','contains':[]}}
        self.assertIsNone(p.server_recipe_problem(ok))
        self.assertIn('seasoning',p.server_recipe_problem(dict(ok,ingredients=[{'id':'mix','name':'cumin seasoning','unit':''}])))
        self.assertIn('format',p.server_recipe_problem(dict(ok,ingredients=[{'id':'soy_sauce','name':'light soy','unit':''}])))
        self.assertEqual(p.integral(4.0),4)
        self.assertIn('1 to 8',p.server_recipe_problem(dict(ok,servings=10)))
        self.assertIn('Dairy',p.server_recipe_problem(dict(ok,ingredients=[{'id':'butter','name':'butter','unit':'g'}])))
        # 22 Oct: golden milk's coconut and almond milk read as dairy, so its vegan claim was refused.
        plant=dict(ok,ingredients=[{'id':'coconut-milk','name':'light coconut milk','unit':'ml'},{'id':'almond-milk','name':'unsweetened almond milk','unit':'ml'}])
        self.assertIsNone(p.server_recipe_problem(plant))
        self.assertEqual(p.recipe_contains({'ingredients':plant['ingredients']}),[])
        self.assertEqual(p.recipe_contains({'ingredients':[{'name':'coconut milk'},{'name':'milk'}]}),['Dairy'])
        self.assertEqual(p.recipe_contains({'ingredients':[{'name':'ghee'}]}),['Dairy'])  # the app's fuller dairy list
        self.assertEqual(p.recipe_contains({'ingredients':[{'name':'cream of tartar'}]}),[])
        labels = Path(__file__).resolve().parents[2] / 'server/diet-labels.mjs'  # in the app repo only, not on the VPS
        if labels.exists():
            text = labels.read_text(encoding='utf-8')
            self.assertIn(r'(?<!\b(' + p.PLANT_WORDS + r')\s)\b(' + p.DAIRY_WORDS + r')\b', text)  # same words as the app

    def test_server_rejection_never_leaves_a_batch_stuck(self):
        import io, urllib.error
        def rejected():
            raise urllib.error.HTTPError('u', 422, 'x', {}, io.BytesIO(b'{"error":"Compound ingredient requires composition review"}'))
        for records, isolated, held in ((2, True, False), (1, False, True)):
            with tempfile.TemporaryDirectory() as d, patch.object(p,'ROOT',Path(d)):
                root=Path(d);(root/'state').mkdir()
                batch={'id':'qt-test','parent':'0'*64,'assets':[],'records':[{'kind':'event','id':f'e{i}','proposalHash':f'h{i}','data':{}} for i in range(records)]}
                w.write(root/'state/pending-publication.json',batch)
                live={'revision':'0'*64,'removals':[]}
                with patch.object(p,'request',side_effect=lambda method,path,body=None:live if method=='GET' else rejected()):
                    result=p.run_publication({'automaticProductionWrites':True},root/'run')
                self.assertEqual(result['status'],'rejected-by-server')
                self.assertFalse((root/'state/pending-publication.json').exists())
                self.assertEqual((root/p.ISOLATE).exists(),isolated)
                if isolated:self.assertEqual(w.read(root/p.ISOLATE)['suspects'],['event:e0','event:e1'])
                outcomes=w.read(root/'state/publication-outcomes.json',{})
                self.assertEqual('h0' in outcomes and outcomes['h0']['decision']=='hold',held)


class VegOptionsPublishing(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        from test_workflow import veg_candidate, veg_packet
        self.packet = veg_packet(self.root)
        w.write(self.root / 'state/veg-options/queue.json', {'candidates': [veg_candidate()]})

    def tearDown(self):
        self.temp.cleanup()

    def prepare(self, decision='ready-for-editorial-review', **live):
        state = dict({'revision': 'r' * 64, 'venues': [], 'records': [], 'recipeIdentities': [], 'removals': [], 'reverts': []}, **live)
        package = {'checkedAt': w.now(), 'packets': [self.packet], 'manager': {'decisions': [{'id': 'vo-green-cafe-abc123', 'decision': decision, 'reason': 'ok'}]}}
        with patch.object(p, 'ROOT', self.root):
            return p.prepare([package], state)

    def test_approved_record_becomes_a_new_place_item(self):
        import veg_options as vo
        candidates, _, held = self.prepare()
        self.assertEqual(held, [])
        item = candidates[0]
        self.assertEqual((item['kind'], item['id'], item['expectedHash']), ('place', 'vo-green-cafe-abc123', None))
        data = item['data']
        self.assertIsNone(vo.place_problem(data))
        self.assertEqual(set(data['sourceUrls']), {s['url'] for s in item['sources']})
        self.assertIn(data['menu']['sourceUrl'], data['sourceUrls'])
        self.assertEqual((data['kitchen'], data['googlePlaceId'], len(data['menu']['items'])), ('options', 'ChIJabcdefghij12', 3))
        batch = p.make_batch(candidates, [], {'decisions': [{'key': 'place:vo-green-cafe-abc123', 'decision': 'approved', 'reason': 'ok'}], 'images': []}, 'r' * 64, 'qt-x')
        review = batch['records'][0]['review']
        self.assertTrue(10 <= len(review['reason']) <= 1800 and review['dataHash'] == p.sha(data))

    def test_manager_hold_owner_removal_and_listed_venue_block_publication(self):
        self.assertEqual(self.prepare('hold')[0], [])
        self.assertEqual(self.prepare(removals=[{'kind': 'place', 'id': 'vo-green-cafe-abc123'}])[0], [])
        other = [{'kind': 'place', 'id': 'vo-green-cafe-ffffff', 'reason': 'x'}]
        candidates, _, held = self.prepare(reverts=[dict(other[0], kind='place')])
        self.assertEqual(len(candidates), 1)  # a different Google place is not blocked
        venue = {'id': 'green-cafe', 'hash': 'b' * 64, 'data': {'googlePlaceId': 'ChIJabcdefghij12'}}
        candidates, _, held = self.prepare(venues=[venue])
        self.assertEqual((candidates, held[0]['reason']), ([], 'Already listed in Explore as a vegetarian place'))

    def test_server_mirror_rejects_meat_free_contract_breaks(self):
        import veg_options as vo
        candidates, _, _ = self.prepare()
        data = json.loads(json.dumps(candidates[0]['data']))
        data['alliumFreeClaim'] = True
        self.assertIn('allium', vo.place_problem(data))
        data = json.loads(json.dumps(candidates[0]['data']))
        data['venueDiet'] = 'Vegan'
        self.assertIn('Vegan', vo.place_problem(data))
        data['menu']['items'] = data['menu']['items'][:1]
        self.assertIn('2 to 200', vo.place_problem(data))

    def photo(self, sha='c' * 64):
        return {'author': 'Jane Tan', 'sourceUrl': 'https://commons.wikimedia.org/wiki/File:Green_Cafe.jpg', 'license': 'CC BY-SA 4.0',
                'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/', 'capturedAt': None,
                'path': '/api/catalogue-photos/' + sha + '.jpg', 'width': 960, 'height': 720, 'checkedAt': '2026-10-19',
                'changes': 'AI-assisted enhancement of an owner-approved photo of this branch; original credit and licence retained.'}

    def test_recheck_publishes_only_a_changed_listing_as_an_update_keeping_the_cover(self):
        import veg_options as vo
        first, _, _ = self.prepare()
        live_data = dict(first[0]['data'], photo=self.photo())
        record = {'kind': 'place', 'id': 'vo-green-cafe-abc123', 'hash': 'f' * 64, 'data': live_data}
        _, _, held = self.prepare(records=[record])
        self.assertIn('unchanged', held[0]['reason'])  # same dishes and prices: audit only, nothing sent
        changed = json.loads(json.dumps(live_data))
        changed['menu']['items'][0]['price']['amount'] = 17.5
        candidates, images, held = self.prepare(records=[dict(record, data=changed)])
        self.assertEqual((held, images), ([], []))
        item = candidates[0]
        self.assertEqual((item['kind'], item['expectedHash']), ('place', 'f' * 64))
        self.assertEqual(item['data']['photo'], live_data['photo'])
        self.assertEqual(item['data']['menu']['items'][0]['price']['amount'], 18.9)
        self.assertIsNone(vo.place_problem(item['data']))
        # The carried photo is already live: no pixel review is needed for the update to be sent.
        batch = p.make_batch(candidates, [], {'decisions': [{'key': 'place:vo-green-cafe-abc123', 'decision': 'approved', 'reason': 'Prices match'}], 'images': []}, 'r' * 64, 'qt-x')
        self.assertEqual(len(batch['records']), 1)

    def test_place_photo_must_match_the_cover_contract(self):
        import veg_options as vo
        candidates, _, _ = self.prepare()
        data = dict(candidates[0]['data'], photo=self.photo())
        self.assertIsNone(vo.place_problem(data))
        for broken in ({'path': 'https://maps.googleapis.com/x.jpg'}, {'width': 99}, {'sourceUrl': 'http://example.com/p'}, {'extra': 1}):
            self.assertIn('photo', vo.place_problem(dict(data, photo=dict(self.photo(), **broken))))

    def test_owner_approved_cover_for_a_place_is_a_full_place_update(self):
        import hashlib
        import cover_photos
        import veg_options as vo
        first, _, _ = self.prepare()
        record = {'kind': 'place', 'id': 'vo-green-cafe-abc123', 'hash': 'f' * 64, 'data': first[0]['data']}
        raw = b'enhanced-cover'
        image_sha = hashlib.sha256(raw).hexdigest()
        folder = self.root / 'images' / 'req'
        folder.mkdir(parents=True)
        (folder / 'candidate.jpg').write_bytes(raw)
        w.write(folder / 'result.json', {'venueId': record['id'], 'referenceSha256': 'b' * 64, 'sha256': image_sha, 'width': 960, 'height': 720,
                                         'provider': 'fixture', 'model': 'fixture', 'prompt': 'enhance'})
        photo = {k: v for k, v in self.photo().items() if k in ('author', 'sourceUrl', 'license', 'licenseUrl', 'capturedAt')}
        entry = {'venueId': record['id'], 'kind': 'place', 'name': 'Green Cafe', 'address': 'x', 'sha256': 'b' * 64, 'status': 'approved',
                 'rightsApprovalId': 'owner-telegram-' + 'a' * 24, 'approvedBy': 'telegram-owner', 'approvedAt': w.now(),
                 'identityEvidence': 'Green Cafe at Tampines One', 'photo': photo}
        w.write(self.root / 'approved-references/registry.json', {'version': 1, 'entries': [entry]})
        from test_workflow import veg_capture
        veg_capture(self.root, photo['sourceUrl'], 'Green Cafe Tampines One photo CC BY-SA 4.0')
        live = {'records': [record], 'venues': [], 'removals': [], 'reverts': []}
        candidates, images, held = [], {}, []
        with patch.object(p, 'ROOT', self.root), patch.object(cover_photos, 'enhancement', return_value=dict(w.read(folder / 'result.json'), file=str(folder / 'candidate.jpg'))), \
                patch.object(p, 'owner_tapped', return_value=True):
            p.cover_candidates(live, {('place', record['id']): 'f' * 64}, {}, candidates, held, images)
        self.assertEqual(held, [])
        [item] = candidates
        self.assertEqual((item['kind'], item['id'], item['expectedHash']), ('place', record['id'], 'f' * 64))
        self.assertEqual({k: v for k, v in item['data'].items() if k != 'photo'}, record['data'])  # full live data, photo added
        self.assertEqual(item['data']['photo']['path'], '/api/catalogue-photos/' + image_sha + '.jpg')
        self.assertIsNone(vo.place_problem(item['data']))
        self.assertEqual(images[image_sha]['provenance']['reference']['rightsApprovalId'], entry['rightsApprovalId'])
        candidates.clear()
        with patch.object(p, 'ROOT', self.root), patch.object(cover_photos, 'enhancement', return_value=dict(w.read(folder / 'result.json'), file=str(folder / 'candidate.jpg'))), \
                patch.object(p, 'owner_tapped', return_value=True):
            p.cover_candidates(dict(live, records=[]), {}, {}, candidates, held, {})
        self.assertEqual(candidates, [])  # a place no longer live never gets a cover


class VegKitchenPublishing(unittest.TestCase):
    """Veg Kitchen places (ids vk-..., owner 20 Oct 2026) reach the app as kind "place" through the same Manager-reviewed batch."""
    CID = 'vk-green-leaf-abc123'

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        from test_workflow import vk_candidate, vk_packet
        self.packet = vk_packet(self.root)
        w.write(self.root / 'state/veg-kitchen/queue.json', {'candidates': [vk_candidate()]})

    def tearDown(self):
        self.temp.cleanup()

    def prepare(self, decision='ready-for-editorial-review', packets=None, ids=None, **live):
        state = dict({'revision': 'r' * 64, 'venues': [], 'records': [], 'recipeIdentities': [], 'removals': [], 'reverts': []}, **live)
        package = {'checkedAt': w.now(), 'packets': packets or [self.packet],
                   'manager': {'decisions': [{'id': i, 'decision': decision, 'reason': 'ok'} for i in (ids or [self.CID])]}}
        with patch.object(p, 'ROOT', self.root):
            return p.prepare([package], state)

    def test_approved_record_becomes_a_new_place_item_and_is_sent_exactly_as_reviewed(self):
        import veg_kitchen as vk
        candidates, images, held = self.prepare()
        self.assertEqual((held, images), ([], []))
        [item] = candidates
        self.assertEqual((item['kind'], item['id'], item['expectedHash']), ('place', self.CID, None))
        data = item['data']
        self.assertIsNone(vk.place_problem(data))
        self.assertNotIn('kitchen', data)
        self.assertEqual(set(data['sourceUrls']), {s['url'] for s in item['sources']})
        self.assertTrue({data['dietProof']['sourceUrl'], data['menu']['sourceUrl']} <= set(data['sourceUrls']))
        self.assertIsNone(p.place_problem(data))  # the publisher picks the Veg Kitchen contract by id
        data['menu']['items'][1]['price']['amount'] = 13.0  # a whole float must be hashed as the server reads it
        batch = p.make_batch(candidates, [], {'decisions': [{'key': 'place:' + self.CID, 'decision': 'approved', 'reason': 'ok'}], 'images': []}, 'r' * 64, 'qt-x')
        sent = batch['records'][0]
        self.assertTrue(10 <= len(sent['review']['reason']) <= 1800)
        self.assertEqual(sent['review']['dataHash'], p.sha(sent['data']))
        self.assertIs(type(sent['data']['menu']['items'][1]['price']['amount']), int)
        self.assertEqual(batch['records'][0]['expectedHash'], None)

    def test_hold_removal_revert_and_duplicates_block_publication(self):
        self.assertEqual(self.prepare('hold')[0], [])
        self.assertEqual(self.prepare(removals=[{'kind': 'place', 'id': self.CID}])[0], [])
        candidates, _, held = self.prepare(reverts=[{'kind': 'place', 'id': 'vk-other-place-ffffff', 'reason': 'x'}])
        self.assertEqual(len(candidates), 1)  # a different place is not blocked
        venue = {'id': 'green-leaf', 'hash': 'b' * 64, 'data': {'googlePlaceId': 'ChIJvkgreenleaf123'}}
        candidates, _, held = self.prepare(venues=[venue])
        self.assertEqual((candidates, held[0]['reason']), ([], 'Already listed in Explore as a vegetarian place'))
        twin = {'kind': 'place', 'id': 'vo-green-leaf-ffffff', 'hash': 'c' * 64, 'data': {'name': 'Green Leaf Kitchen', 'postalCode': '188652'}}
        candidates, _, held = self.prepare(records=[twin])
        self.assertEqual((candidates, held[0]['reason']), ([], 'Another place already has this name and postcode'))
        removal = {'kind': 'place', 'id': 'vk-old-id-000000', 'identity': 'place:greenleafkitchen|188652'}
        candidates, _, held = self.prepare(removals=[removal])
        self.assertEqual((candidates, 'Owner removed' in held[0]['reason']), ([], True))  # the same name and postcode under another id

    def test_two_places_with_one_name_and_postcode_never_share_a_batch(self):
        from test_workflow import vk_candidate, vk_finding, vk_packet
        second_id = 'vk-green-leaf-def456'
        second = vk_packet(self.root, finding=vk_finding(candidateId=second_id), candidate=vk_candidate(candidateId=second_id, googlePlaceId='ChIJvkgreenleaf456'))
        candidates, _, held = self.prepare(packets=[self.packet, second], ids=[self.CID, second_id])
        self.assertEqual([c['id'] for c in candidates], [self.CID])
        self.assertEqual(held[0]['id'], second_id)
        self.assertIn('later batch', held[0]['reason'])
        outcomes = w.read(self.root / 'state/publication-outcomes.json', {})
        self.assertEqual(outcomes, {})  # held, not decided: it is proposed again next round (then as a duplicate of the live place)
        # the same Google place under another name and postcode is refused by the server too
        annex_id = 'vk-green-leaf-ghi789'
        annex = vk_packet(self.root, finding=vk_finding(candidateId=annex_id), candidate=vk_candidate(candidateId=annex_id))
        annex['records'][0]['vegKitchen']['place'].update(name='Green Leaf Annex', postalCode='188653')
        candidates, _, held = self.prepare(packets=[self.packet, annex], ids=[self.CID, annex_id])
        self.assertEqual(([c['id'] for c in candidates], held[0]['id']), ([self.CID], annex_id))
        self.assertIn('Google place', held[0]['reason'])

    def test_recheck_update_carries_the_live_hash_and_unchanged_listings_are_audit_only(self):
        import veg_kitchen as vk
        first, _, _ = self.prepare()
        live_data = dict(first[0]['data'], photo=self.photo())
        record = {'kind': 'place', 'id': self.CID, 'hash': 'f' * 64, 'data': live_data}
        candidates, _, held = self.prepare(records=[record])
        self.assertEqual(candidates, [])
        self.assertIn('unchanged', held[0]['reason'])
        changed = json.loads(json.dumps(live_data))
        changed['menu']['items'][0]['price']['amount'] = 17.5
        candidates, images, held = self.prepare(records=[dict(record, data=changed)])
        self.assertEqual((held, images), ([], []))
        [item] = candidates
        self.assertEqual((item['kind'], item['expectedHash']), ('place', 'f' * 64))
        self.assertEqual(item['data']['photo'], live_data['photo'])  # the live cover stays and needs no pixel review
        self.assertEqual(item['data']['menu']['items'][0]['price']['amount'], 12.5)
        self.assertIsNone(vk.place_problem(item['data']))

    def photo(self, sha='c' * 64):
        from test_workflow import vk_photo
        return vk_photo(sha)

    def test_owner_approved_cover_for_a_veg_kitchen_place_is_a_full_place_update(self):
        import hashlib
        import cover_photos
        import veg_kitchen as vk
        first, _, _ = self.prepare()
        record = {'kind': 'place', 'id': self.CID, 'hash': 'f' * 64, 'data': first[0]['data']}
        # the cover search treats the place like any other live place without a photo, with Veg Kitchen wording
        live = {'records': [record], 'venues': [], 'removals': [], 'reverts': []}
        target = cover_photos.due(self.root, {'venues': []}, live)
        self.assertEqual((target['venueId'], target['kind']), (self.CID, 'place'))
        self.assertIn('Veg Kitchen place', cover_photos.prompt(target, []))
        self.assertIn('1 Veg Kitchen place(s)', cover_photos.summary_line(self.root, [], live))
        raw = b'enhanced-cover'
        image_sha = hashlib.sha256(raw).hexdigest()
        folder = self.root / 'images' / 'req'
        folder.mkdir(parents=True)
        (folder / 'candidate.jpg').write_bytes(raw)
        w.write(folder / 'result.json', {'venueId': record['id'], 'referenceSha256': 'b' * 64, 'sha256': image_sha, 'width': 960, 'height': 720,
                                         'provider': 'fixture', 'model': 'fixture', 'prompt': 'enhance'})
        photo = {k: v for k, v in self.photo().items() if k in ('author', 'sourceUrl', 'license', 'licenseUrl', 'capturedAt')}
        entry = {'venueId': record['id'], 'kind': 'place', 'name': 'Green Leaf Kitchen', 'address': 'x', 'sha256': 'b' * 64, 'status': 'approved',
                 'rightsApprovalId': 'owner-telegram-' + 'a' * 24, 'approvedBy': 'telegram-owner', 'approvedAt': w.now(),
                 'identityEvidence': 'Green Leaf Kitchen at Bugis', 'photo': photo}
        w.write(self.root / 'approved-references/registry.json', {'version': 1, 'entries': [entry]})
        from test_workflow import veg_capture
        veg_capture(self.root, photo['sourceUrl'], 'Green Leaf Kitchen Bugis photo CC BY-SA 4.0')
        candidates, images, held = [], {}, []
        with patch.object(p, 'ROOT', self.root), patch.object(cover_photos, 'enhancement', return_value=dict(w.read(folder / 'result.json'), file=str(folder / 'candidate.jpg'))), \
                patch.object(p, 'owner_tapped', return_value=True):
            p.cover_candidates(live, {('place', record['id']): 'f' * 64}, {}, candidates, held, images)
        self.assertEqual(held, [])
        [item] = candidates
        self.assertEqual((item['kind'], item['id'], item['expectedHash']), ('place', record['id'], 'f' * 64))
        self.assertEqual({k: v for k, v in item['data'].items() if k != 'photo'}, record['data'])  # full live data, photo added
        self.assertIsNone(vk.place_problem(item['data']))
        self.assertTrue(cover_photos.caption(dict(entry, photo=self.photo())).startswith('Veg Kitchen cover photo'))

    def test_approved_drawing_is_published_right_after_the_tap_and_never_loops(self):
        # Owner, 20 Oct 2026: an approved drawing goes live within minutes, not after the next full round.
        import time
        import cover_photos
        import cover_publish
        with cover_photos.Registry(self.root) as reg:
            reg.data['entries'] = [{'venueId': self.CID, 'sha256': 'd' * 64, 'status': 'pending-owner', 'basis': 'illustration',
                                   'photo': {'sourceUrl': 'https://greenleaf.sg/menu'}},
                                  {'venueId': 'vk-photo-place-000001', 'sha256': 'e' * 64, 'status': 'pending-owner',
                                   'photo': {'sourceUrl': 'https://commons.wikimedia.org/wiki/File:X.jpg'}}]
            reg.save()
        self.assertEqual(cover_photos.decide(self.root, self.CID, 'd' * 64, True, 'a' * 24), 'approved')
        self.assertEqual(cover_photos.decide(self.root, 'vk-photo-place-000001', 'e' * 64, True, 'b' * 24), 'approved')
        self.assertEqual(list(cover_publish.due(self.root)), [self.CID])  # a photo still needs enhancement in a round
        with patch.object(cover_publish.subprocess, 'Popen') as popen, patch.object(cover_publish, 'run_lock_free', return_value=False):
            self.assertFalse(cover_publish.maybe_start(self.root))  # a running round publishes it itself
        popen.assert_not_called()
        with patch.object(cover_publish.subprocess, 'Popen') as popen, patch.object(cover_publish, 'run_lock_free', return_value=True):
            self.assertTrue(cover_publish.maybe_start(self.root))
        self.assertTrue(popen.call_args.args[0][1].endswith('cover_publish.py'))
        # a round that already published the cover clears the request without counting a try (no extra run)
        with patch.object(cover_photos, 'publishable', return_value=[]):
            self.assertEqual(cover_publish.drop_live(self.root, {'records': [], 'venues': []}), {})
        self.assertEqual(cover_publish.due(self.root), {})
        cover_publish.request(self.root, self.CID)
        live = {'records': [], 'venues': [], 'removals': [], 'reverts': []}
        waiting = [{'entry': {'venueId': self.CID}, 'image': {}, 'source': {}}]  # the shape publishable() returns
        with patch.object(cover_photos, 'publishable', return_value=waiting):
            self.assertEqual(cover_publish.settle(self.root, {'status': 'failed'}, live)[self.CID]['attempts'], 1)
            self.assertEqual(cover_publish.due(self.root), {})  # retried only after RETRY_SECONDS
            later = time.time() + cover_publish.RETRY_SECONDS + 1
            self.assertEqual(list(cover_publish.due(self.root, at=later)), [self.CID])
            cover_publish.settle(self.root, {'status': 'failed'}, None)  # status unknown: still counted
            cover_publish.settle(self.root, {'status': 'failed'}, live)
            self.assertEqual(cover_publish.due(self.root, at=later + 3600), {})  # at most MAX_ATTEMPTS tries
            cover_publish.request(self.root, self.CID)
            self.assertEqual(cover_publish.settle(self.root, {'status': 'all-held'}, live), {})  # a Manager hold is an answer
        cover_publish.request(self.root, self.CID)
        with patch.object(cover_photos, 'publishable', return_value=[]):
            self.assertEqual(cover_publish.settle(self.root, {'status': 'published'}, live), {})  # live now
        # the covers-only publication never reads research packets
        w.write(self.root / 'outbox/20261020T010000Z.json', {'packets': [], 'manager': {'decisions': []}})
        with patch.object(p, 'ROOT', self.root), patch.object(p, 'request', return_value={'revision': 'r', 'records': [], 'venues': []}),                 patch.object(p, 'prepare', return_value=([], {}, [])) as prepare:
            self.assertEqual(p.run_publication({'automaticProductionWrites': True}, self.root / 'runs/c', covers_only=True)['status'], 'no-eligible-changes')
        self.assertEqual(prepare.call_args.args[0], [])

    def test_dessert_and_drink_shops_draw_the_product_not_the_flavour_name(self):
        # Owner, 20 Oct 2026: QT Manager held bread drawn for a "Banana Bread" gelato at an ice-cream shop.
        import cover_photos
        place = lambda name, category='': {'name': name, 'venueDiet': 'Vegan',
                                           'menu': {'items': [{'name': 'Earl Grey Banana Bread', 'category': category}]}}
        kinds = [(cover_photos.shop_kind(place(n, c)) or ('kitchen',))[0] for n, c in (
            ('Kind Kones - Suntec', ''), ('Oat About', 'Gelato'), ('LiHO Bubble Tea', ''), ('Bread Garden Bakery', ''),
            ('Pang Pang Kopi (Singpost Centre)', 'Noodles'), ('Ricehouse Vegetarian', 'Rice'))]
        self.assertEqual(kinds, ['dessert', 'dessert', 'drinks', 'bakery', 'kitchen', 'kitchen'])
        text = cover_photos.illustration_prompt(place('Kind Kones - Suntec'))
        self.assertIn('scoop of plant-based ice cream', text)
        self.assertIn('not a loaf of bread', text)
        self.assertIn('Plates or bowls', cover_photos.illustration_prompt(place('Ricehouse Vegetarian', 'Rice')))

    def test_owner_approved_dish_illustration_becomes_a_credited_place_cover(self):
        # Owner, 20 Oct 2026: a place without a reusable photo gets an illustration of its own dishes, approved on Telegram.
        import hashlib
        import cover_photos
        import venue_images
        first, _, _ = self.prepare()
        record = {'kind': 'place', 'id': self.CID, 'hash': 'f' * 64, 'data': first[0]['data']}
        live = {'records': [record], 'venues': [], 'removals': [], 'reverts': []}
        dish = record['data']['menu']['items'][0]['name']
        text = cover_photos.illustration_prompt(record['data'])
        self.assertIn(dish, text)
        self.assertIn('not a photograph', text)
        self.assertIn('No text, letters', text)
        raw = b'drawn-cover'
        sha = hashlib.sha256(raw).hexdigest()

        def fake_run(request, policy):
            self.assertEqual((request['kind'], request['placeId']), ('place-illustration', self.CID))
            folder = self.root / 'images' / ('c' * 64)
            folder.mkdir(parents=True, exist_ok=True)
            (folder / 'candidate.jpg').write_bytes(raw)
            w.write(folder / 'result.json', {'placeId': self.CID, 'sha256': sha, 'width': 960, 'height': 720, 'provider': 'fixture',
                                             'model': 'fixture', 'prompt': request['prompt'], 'sourceKind': 'place-dish-illustration'})
            return {'status': 'generated-awaiting-visual-review', 'requestHash': 'c' * 64}
        with patch.object(venue_images, 'run_request', side_effect=fake_run):
            drawn = cover_photos.illustrate(self.root, {}, live)
        self.assertEqual(drawn['status'], 'approved-for-manager-review')  # owner, 20 Oct 2026: no Telegram approval for drawings
        [entry] = cover_photos.entries(self.root)
        self.assertEqual((entry['basis'], entry['status'], entry['photo']['author']), ('illustration', 'approved', 'QuinTaste illustration'))
        self.assertEqual(entry['rightsApprovalId'], cover_photos.STANDING_APPROVAL)
        import cover_publish
        self.assertEqual(list(cover_publish.due(self.root)), [self.CID])  # published right away, not after the next round
        self.assertTrue((cover_photos.refs(self.root) / (sha + '.jpg')).is_file())  # what the Telegram listener sends the owner
        self.assertTrue(cover_photos.caption(entry).startswith('Veg Kitchen cover illustration'))
        self.assertIsNone(cover_photos.illustration_target(self.root, live))  # one open drawing per place
        with patch.object(venue_images, 'run_request', side_effect=AssertionError('no second drawing')):
            self.assertIsNone(cover_photos.illustrate(self.root, {}, live))
        # no enhancement step and no Telegram tap: the drawing itself goes to QT Manager with an illustration credit
        self.assertIsNone(cover_photos.enhance(self.root, {}))
        candidates, images, held = [], {}, []
        with patch.object(p, 'ROOT', self.root):
            p.cover_candidates(live, {('place', record['id']): 'f' * 64}, {}, candidates, held, images)
        self.assertEqual(held, [])
        [item] = candidates
        photo = item['data']['photo']
        self.assertEqual((photo['author'], photo['license'], photo['licenseUrl'], photo['capturedAt']), ('QuinTaste illustration', 'QuinTaste illustration', None, None))
        self.assertIn('not a photo of the venue', photo['changes'])
        provenance = images[sha]['provenance']
        self.assertEqual((provenance['kind'], provenance['placeId'], provenance['requestHash']), ('place-dish-illustration', self.CID, 'c' * 64))
        self.assertEqual((provenance['ownerApproval']['rightsApprovalId'], provenance['ownerApproval']['approvedBy']),
                         (cover_photos.STANDING_APPROVAL, cover_photos.STANDING_BY))
        cited = {u for u in [*record['data']['sourceUrls'], record['data']['menu']['sourceUrl'], (record['data'].get('dietProof') or {}).get('sourceUrl')] if u}
        self.assertTrue(cited <= {s['url'] for s in item['sources']})  # every source the place cites travels with the cover
        # once QT Manager has reviewed the drawing and the place still has no photo, it was held: a new drawing may follow later
        w.write(self.root / 'state/publication-outcomes.json', {cover_photos.proposal_hash(sha, sha): {'decision': 'hold'}})
        with cover_photos.Registry(self.root) as reg:
            reg.data['entries'][0]['proposedAt'] = '2026-01-01T00:00:00+00:00'
            reg.save()
        self.assertEqual(cover_photos.illustration_target(self.root, live)[2], 1)  # second try
        # a venue may never use an illustration as its cover
        with cover_photos.Registry(self.root) as reg:
            reg.data['entries'][0]['kind'] = 'venue'
            reg.save()
        candidates, images, held = [], {}, []
        venue_live = dict(live, venues=[{'id': self.CID, 'data': {}}], records=[])
        with patch.object(p, 'ROOT', self.root), patch.object(p, 'owner_tapped', return_value=True):
            p.cover_candidates(venue_live, {}, {}, candidates, held, images)
        self.assertEqual(candidates, [])

    def test_final_review_prompt_has_the_veg_kitchen_rule_a_compact_menu_and_excerpts(self):
        w.write(self.root / 'baseline.json', {'recipeNames': []})
        candidates, _, _ = self.prepare()
        review = {'decisions': [{'key': 'place:' + self.CID, 'decision': 'approved', 'reason': 'Whole-venue statement shown'}], 'images': []}
        with patch.object(p, 'ROOT', self.root), patch.object(w, 'run_model', return_value=(review, {'toolCalls': []})) as model:
            p.publication_review(candidates, [], [], self.root / 'review', {'automaticProductionWrites': False})
        prompt = model.call_args.args[1]
        self.assertIn("whose id starts with 'vk-'", prompt)
        self.assertIn('Braised Mock Duck · S$12.5', prompt)
        self.assertIn('"itemCount":5', prompt)
        self.assertIn('We are a 100% vegetarian restaurant serving plant-based Chinese food.', prompt)
        self.assertEqual(len(candidates[0]['data']['menu']['items']), 5)  # the candidate itself is untouched


class CoverTargets(unittest.TestCase):
    def test_venues_first_then_live_places_and_never_platform_photos(self):
        import cover_photos
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            baseline = {'venues': [{'venueId': 'covered', 'hasCover': True}, {'venueId': 'closed-one', 'name': 'Closed', 'address': 'x'},
                                   {'venueId': 'open-one', 'name': 'Open', 'address': 'y'}]}
            place = {'kind': 'place', 'id': 'vo-green-cafe-abc123', 'data': {'name': 'Green Cafe', 'branch': 'Tampines One', 'postalCode': '529536',
                                                                            'address': '10 Tampines Central 1', 'sourceUrls': []}}
            live = {'venues': [{'id': 'closed-one', 'data': {'closed': {'status': 'permanently-closed'}}}], 'records': [place]}
            self.assertEqual(cover_photos.due(root, baseline, live)['venueId'], 'open-one')
            w.write(cover_photos.searches_file(root), {'open-one': {'at': w.now()}})
            target = cover_photos.due(root, baseline, live)
            self.assertEqual((target['venueId'], target['kind']), ('vo-green-cafe-abc123', 'place'))
            self.assertIn('529536', target['address'])
            self.assertIn('Branch: Tampines One', cover_photos.prompt(target, []))
            self.assertIsNone(cover_photos.due(root, baseline, dict(live, records=[dict(place, data=dict(place['data'], photo={'path': 'x'}))])))
            self.assertIn('Mixed Kitchen place', cover_photos.summary_line(root, baseline['venues'], live))
        for host in ('lh3.googleusercontent.com', 'www.google.com.sg', 'scontent.fbcdn.net', 'www.instagram.com', 'food.grab.com', 'www.foodpanda.sg', 'p16.tiktokcdn.com'):
            self.assertTrue(cover_photos.blocked_host(host), host)
        for host in ('upload.wikimedia.org', 'commons.wikimedia.org', 'live.staticflickr.com', 'greencafe.sg'):
            self.assertFalse(cover_photos.blocked_host(host), host)
        problem = cover_photos.check(Path('.'), {'imageUrl': 'https://lh3.googleusercontent.com/p/a.jpg', 'pageUrl': 'https://www.google.com/maps/place/x'}, {})
        self.assertIn('never reused', problem)

if __name__=='__main__':unittest.main()


class ServerNumbers(unittest.TestCase):
    def test_whole_floats_are_sent_and_hashed_as_the_server_serialises_them(self):
        import publisher
        data = {'id': 'pumpkin', 'nutrition': {'perServing': {'kcal': 109.0, 'protein': 3.0, 'fat': 1.5}}, 'menu': [{'price': {'amount': 6.0}}]}
        sent = publisher.js_numbers(data)
        self.assertEqual(publisher.js_json(sent), '{"id":"pumpkin","nutrition":{"perServing":{"kcal":109,"protein":3,"fat":1.5}},"menu":[{"price":{"amount":6}}]}')
        review = {'decisions': [{'key': 'recipe:pumpkin', 'decision': 'approved', 'reason': 'Matches the captured source.'}], 'images': []}
        batch = publisher.make_batch([{'kind': 'recipe', 'id': 'pumpkin', 'data': data}], [], review, 'p' * 64, 'b')
        record = batch['records'][0]
        self.assertEqual(record['data'], sent)
        self.assertEqual(record['review']['dataHash'], publisher.sha(sent))

