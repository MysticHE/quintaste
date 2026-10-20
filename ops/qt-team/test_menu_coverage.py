import copy
import hashlib
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
import menu_coverage as m
import publisher as p
import telegram_reporter as t


class FullMenuCoverage(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.url='https://example.org/menu';self.menu={'id':'venue-one','sections':[{'id':'section-one','scope':'branch-delivery','sourceUrl':self.url,'items':[{'id':'dish-'+str(i),'name':'Dish '+str(i),'price':{'amount':8,'currency':'SGD','type':'displayed'}} for i in range(68)]}]}
        self.capture={'sha256':'a'*64,'fetchedAt':'2026-10-17T12:00:00Z','fetchedEpoch':time.time(),'result':{'content':'\n'.join(i['name']+'\nSGD 8.00' for i in self.menu['sections'][0]['items'])}}
        m.write(self.root/'state/source-cache'/(hashlib.sha256(self.url.encode()).hexdigest()+'.json'),self.capture)

    def tearDown(self):self.temp.cleanup()

    def packet(self,assignment,held=0):
        row={'id':'venue-one','sources':[{'url':self.url}],'menuReview':{'items':[dict(sectionId=i['sectionId'],itemId=i['itemId'],status='held' if n<held else 'verified',price=i['price'],sourceUrl=self.url,reason='Exact name, source currency and displayed amount checked.') for n,i in enumerate(assignment['assignedItems'])]}}
        return {'role':'qt-explorer','checkedAt':'2026-10-17T12:00:00Z','records':[row],'menuAssignments':[assignment]}

    def approve(self,packet,decision='ready-for-editorial-review'):
        return m.accept(self.root,[packet],[{'id':'venue-one','decision':decision,'reason':'Independent source review'}])['venue-one']

    def test_all_68_in_inventory_and_assignment_not_first_50(self):
        a=m.plan(self.root,self.menu)
        self.assertEqual((a['totalItems'],len(a['assignedItems'])),(68,68))
        response=type('Response',(),{'read':lambda s,n:__import__('json').dumps({'venues':[self.menu]}).encode(),'__enter__':lambda s:s,'__exit__':lambda *a:None})()
        with patch.object(p,'ROOT',self.root),patch.object(p.urllib.request,'urlopen',return_value=response):
            actual=p.menu_context([{'venueId':'venue-one'}])[0]
        self.assertEqual(len(actual['assignedItems']),68)

    def test_one_item_response_cannot_complete_or_advance_68_item_review(self):
        a=m.plan(self.root,self.menu);packet=self.packet(a);packet['records'][0]['menuReview']['items']=packet['records'][0]['menuReview']['items'][:1]
        with self.assertRaisesRegex(ValueError,'every assigned'):self.approve(packet)
        self.assertEqual(m.get(self.root,'venue-one')['verified'],0)

    def test_independent_manager_approval_required(self):
        a=m.plan(self.root,self.menu);result=self.approve(self.packet(a),'hold')
        self.assertEqual((result['verified'],result['held'],result['complete']),(0,68,False))
        self.assertFalse(m.due(self.root,'venue-one'))

    def test_menu_audit_can_be_approved_while_other_venue_fields_remain_held(self):
        a=m.plan(self.root,self.menu);packet=self.packet(a,held=2)
        result=m.accept(self.root,[packet],[{'id':'venue-one','decision':'hold','menuReviewDecision':'approved','reason':'Menu evidence accepted; hours and two dishes remain held.'}])['venue-one']
        self.assertEqual((result['verified'],result['held'],result['complete']),(66,2,False))

    def test_full_review_with_two_holds_is_not_full_verification_and_does_not_loop(self):
        a=m.plan(self.root,self.menu);result=self.approve(self.packet(a,held=2))
        self.assertEqual((result['verified'],result['held'],result['pending'],result['complete']),(66,2,0,False))
        self.assertEqual(m.plan(self.root,self.menu)['assignedItems'],[])
        self.assertEqual(m.completed(self.root,[{'venueId':'venue-one'}]),{})
        self.assertEqual(len(list((self.root/'state/menu-reviews').glob('*.json'))),1)

    def test_large_menu_resumes_remaining_dishes_without_repeating_first_chunk(self):
        for i in range(68,105):self.menu['sections'][0]['items'].append({'id':'dish-'+str(i),'name':'Dish '+str(i),'price':{'amount':8,'currency':'SGD','type':'displayed'}})
        a=m.plan(self.root,self.menu);self.assertEqual((a['totalItems'],len(a['assignedItems'])),(105,80))
        packet=self.packet(a,held=80);self.approve(packet)
        following=m.plan(self.root,self.menu)
        self.assertEqual(len(following['assignedItems']),25)
        self.assertFalse({m.key(i) for i in a['assignedItems']} & {m.key(i) for i in following['assignedItems']})

    def test_changed_dish_invalidates_only_that_dish_and_new_month_resets_review(self):
        a=m.plan(self.root,self.menu);self.assertTrue(self.approve(self.packet(a))['complete'])
        self.menu['sections'][0]['items'][0]['price']['amount']=9
        self.assertEqual(len(m.plan(self.root,self.menu)['assignedItems']),1)
        with patch.object(m,'month',return_value='2026-11'):
            self.assertEqual(len(m.plan(self.root,self.menu)['assignedItems']),68)

    def test_category_only_capture_cannot_verify_any_dish(self):
        a=m.plan(self.root,self.menu);self.capture['result']['content']='68 dishes; S$ 8.00'
        m.write(self.root/'state/source-cache'/(hashlib.sha256(self.url.encode()).hexdigest()+'.json'),self.capture)
        packet=self.packet(a);result=self.approve(packet)
        self.assertEqual((result['verified'],result['held']),(0,68))
        self.assertEqual(m.downgrades(packet['records'][0]),{'name-not-in-capture':68})
        import validation_feedback as f
        f.note(self.root,'qt-explorer',{'venue-one':m.downgrades(packet['records'][0])})
        self.assertIn("68 'verified' claims were held: 68 dish name not found",f.context(self.root,'qt-explorer'))
        self.assertEqual(f.context(self.root,'qt-cooker'),'')

    def test_named_dish_without_matching_price_cannot_be_verified(self):
        self.assertFalse(m.price_matches('Dish one\nS$ 9.00','Dish one',{'amount':8}))
        self.assertTrue(m.price_matches('Dish one\nS$ 8.00','Dish one',{'amount':8}))
        self.assertFalse(m.price_matches('Dish one\nS$ 8.00','Dish one',{'amount':8,'maxAmount':12}))

    def test_uncited_or_uncaptured_alternative_page_holds_and_cited_capture_verifies(self):
        a=m.plan(self.root,self.menu);packet=self.packet(a);packet['records'][0]['menuReview']['items'][0]['sourceUrl']='https://example.org/another-branch'
        result=self.approve(packet)
        self.assertEqual((result['verified'],result['held']),(67,1))
        self.assertEqual(m.downgrades(packet['records'][0]),{'source-not-cited':1})
        held=m.read(m.filename(self.root,'venue-one'))['items'][m.key(a['assignedItems'][0])]
        self.assertLess(held['retryAt']-time.time(),m.SHORT_RETRY+60)  # a source problem is rechecked next night, not in a week
        alt='https://other-platform.example/listing/venue-one'
        def try_alternative(content,month):
            m.write(self.root/'state/source-cache'/(hashlib.sha256(alt.encode()).hexdigest()+'.json'),dict(self.capture,url=alt,result={'content':content}))
            with patch.object(m,'month',return_value=month):
                a=m.plan(self.root,self.menu);packet=self.packet(a);item=packet['records'][0]['menuReview']['items'][0]
                item['sourceUrl']=alt;packet['records'][0]['sources'].append({'url':alt})
                return self.approve(packet)['verified'],item
        self.menu['postalCode']='123456'
        verified,item=try_alternative(self.capture['result']['content'],'2026-11')  # another site, no branch postal code
        self.assertEqual((verified,item['autoHeld']),(67,'alternative-unconfirmed'))
        verified,item=try_alternative('Venue One, Singapore 123456\n'+self.capture['result']['content'],'2026-12')
        self.assertEqual((verified,item['alternativeSource']),(68,alt))

    def test_alternative_page_must_be_the_same_listing_or_a_single_branch_page(self):
        grab='https://food.grab.com/sg/en/restaurant/'
        self.assertFalse(m.same_branch_page(grab+'other-place/SGDD1',grab+'venue-one/SGDD05316','',None))
        self.assertTrue(m.same_branch_page(grab+'venue-one-renamed/SGDD05316',grab+'venue-one/SGDD05316','',None))
        self.assertTrue(m.same_branch_page('https://www.foodpanda.sg/restaurant/w1hc/a-b?opening_type=delivery','https://www.foodpanda.sg/restaurant/w1hc/a','',None))
        self.assertFalse(m.same_branch_page('https://chain.example/outlets','https://x.example/a','560554 120722 640498','560554'))
        self.assertTrue(m.price_matches('1. Tea\nS$3.00','Tea',{'amount':3}))
        self.assertFalse(m.price_matches('Milk Tea S$3.00','Tea',{'amount':3}))

    def test_null_or_text_price_on_verified_claim_is_held_not_a_crash(self):
        a=m.plan(self.root,self.menu);packet=self.packet(a)
        packet['records'][0]['menuReview']['items'][0]['price']=None
        packet['records'][0]['menuReview']['items'][1]['price']='SGD 8'
        self.assertEqual(self.approve(packet)['verified'],66)
        self.assertEqual(m.downgrades(packet['records'][0]),{'price-format':2})

    def test_duplicate_ids_rejected(self):
        self.menu['sections'][0]['items'].append(copy.deepcopy(self.menu['sections'][0]['items'][0]))
        with self.assertRaisesRegex(ValueError,'duplicate'):m.plan(self.root,self.menu)

    def test_legacy_spot_check_does_not_create_menu_completion(self):
        result=m.accept(self.root,[{'role':'qt-explorer','records':[{'id':'venue-one'}]}],[])
        self.assertEqual(result,{})

    def test_audit_only_reviews_go_to_one_summary_not_separate_messages(self):
        a=m.plan(self.root,self.menu);self.approve(self.packet(a,held=2))
        with patch.object(t,'ROOT',self.root):
            text=t.menu_digest('2026-10-17T00:00:00+00:00')
            self.assertEqual(t.menu_digest('2030-01-01T00:00:00+00:00'),'')
        self.assertIn('Menu audits (no app data changed):',text)
        self.assertIn('venue one: 66/68 verified, 2 held (Exact name',text)
        self.assertFalse(hasattr(t,'menu_review_updates'))

    def use_url(self,url,**capture):
        self.url=url
        for section in self.menu['sections']:section['sourceUrl']=url
        m.write(self.root/'state/source-cache'/(hashlib.sha256(url.encode()).hexdigest()+'.json'),dict(self.capture,url=url,**capture))

    def test_branch_parameter_ignored_by_storefront_holds_instead_of_verifying(self):
        # A server that ignores ?StoreID= serves one default menu whatever branch is requested.
        self.use_url('https://example.org/menu?StoreID=a')
        other='https://example.org/menu?lang=EN&StoreID=b'
        m.write(self.root/'state/source-cache'/(hashlib.sha256(other.encode()).hexdigest()+'.json'),dict(self.capture,url=other))
        result=self.approve(self.packet(m.plan(self.root,self.menu)))
        self.assertEqual((result['verified'],result['held']),(0,68))
        row=next(iter(m.read(m.filename(self.root,'venue-one'))['items'].values()))
        self.assertEqual(row['reason'],m.SHARED_REASON)

    def test_same_page_variants_and_tracking_tags_do_not_hold_verified_dishes(self):
        self.use_url('https://example.org/menu?StoreID=a&lang=EN')
        for variant in ('https://example.org/menu?lang=EN&StoreID=a','https://example.org/menu?StoreID=a&utm_source=x','https://example.org/menu'):
            m.write(self.root/'state/source-cache'/(hashlib.sha256(variant.encode()).hexdigest()+'.json'),dict(self.capture,url=variant))
        self.assertEqual(self.approve(self.packet(m.plan(self.root,self.menu)))['verified'],68)

    def test_outlet_storefront_needs_outlet_confirmed_capture(self):
        url='https://orders.greendot.sg/?StoreID=4b9717ab-a5dc-432c-8cd5-20627535147a&Service=PickUp&lang=EN'
        self.use_url(url)
        result=self.approve(self.packet(m.plan(self.root,self.menu)))
        self.assertEqual((result['verified'],result['held']),(0,68))
        self.assertEqual(next(iter(m.read(m.filename(self.root,'venue-one'))['items'].values()))['reason'],m.OUTLET_REASON)
        self.use_url(url,result=dict(self.capture['result'],qtCapture={'method':'browser-outlet-selected','storeId':'4b9717ab-a5dc-432c-8cd5-20627535147a'}))
        with patch.object(m,'month',return_value='2026-11'):
            self.assertEqual(self.approve(self.packet(m.plan(self.root,self.menu)))['verified'],68)

    def test_manager_decline_keeps_explorer_reason(self):
        self.approve(self.packet(m.plan(self.root,self.menu),held=68),'hold')
        row=next(iter(m.read(m.filename(self.root,'venue-one'))['items'].values()))
        self.assertTrue(row['reason'].startswith('Manager did not approve this audit. Explorer: Exact name'))

    def test_hold_reasons_group_and_month_totals_separate_assessed_from_verified(self):
        groups=m.reason_groups([{'reason':'main-source-incomplete'}]*50+[{'reason':'Wrong branch'}]*6)
        self.assertEqual(groups,[('Main source incomplete',50),('Wrong branch',6)])
        a=m.plan(self.root,self.menu);self.approve(self.packet(a,held=2))
        self.assertEqual(m.month_totals(self.root),{'started':1,'assessed':1,'complete':0,'verified':66,'held':2,'pending':0})
        with patch.object(t,'ROOT',self.root):
            text=t.coverage_text(0,174)
        self.assertIn('1/174 locations fully assessed, 0 with every dish verified',text);self.assertIn('66 verified · 2 held',text)



class OwnMenuAndDietProof(unittest.TestCase):
    def setUp(self):self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
    def tearDown(self):self.temp.cleanup()

    def test_own_menu_dollar_prices_below_the_name_or_in_brackets(self):
        # Real stored pages, 20 Oct 2026: Padma (price on the next line), Greendot (bracketed), a shop grid (price under the title).
        padma = '### Gravys\n\n###### Dhal Fry\n\n$8.00\n\n###### Paneer Butter Masala\n\n$10.50'
        self.assertTrue(m.price_matches(padma, 'Dhal Fry', {'amount': 8}, bare=True))
        self.assertTrue(m.price_matches(padma, 'Paneer Butter Masala', {'amount': 10.5}, bare=True))
        self.assertFalse(m.price_matches(padma, 'Dhal Fry', {'amount': 10.5}, bare=True))  # never the next dish's price
        self.assertFalse(m.price_matches(padma, 'Dhal Fry', {'amount': 8}))  # other pages still need S$/SGD
        greendot = 'Bento Set A: Braised Mushroom & Tau Kwa ($7.90)\nBento Set B: Sweet & Sour Soya Nuggets ($7.90)'
        self.assertTrue(m.price_matches(greendot, 'Bento Set A: Braised Mushroom & Tau Kwa', {'amount': 7.9}, bare=True))
        grid = '- [![Aloo Tikki](https://x.example/aloo.png)](https://x.example/p/aloo)\n\n  ### [Aloo Tikki](https://x.example/p/aloo)\n\n  $11.90\n\n  Add to cart'
        self.assertTrue(m.price_matches(grid, 'Aloo Tikki', {'amount': 11.9}, bare=True))
        self.assertTrue(m.price_matches('Lush Strawberry\n$100.00 – $139.00', 'Lush Strawberry', {'amount': 100, 'maxAmount': 139}, bare=True))

    def test_bare_prices_count_only_on_the_venues_own_menu_at_the_end_of_the_line(self):
        body="Aloha Burger (AF) brioche bun, plant-based patty 22.9\nMOD Sliders choice of four +2 to mix flavor 18.9\nLatte | 5.9 | 6.9"
        self.assertTrue(m.price_matches(body,'Aloha Burger',{'amount':22.9},bare=True))
        self.assertFalse(m.price_matches(body,'Aloha Burger',{'amount':22.9}))  # other pages still need S$/SGD
        self.assertFalse(m.price_matches(body,'MOD Sliders',{'amount':2},bare=True))  # a number inside the description
        self.assertTrue(m.price_matches(body,'Latte',{'amount':5.9,'type':'from'},bare=True))
        self.assertTrue(m.price_matches('Fried Mantou with condensed milk 7 [AF] [VG]','Fried Mantou (with condensed milk)',{'amount':7},bare=True))
        self.assertTrue(m.price_matches('Latte Hot 5.9 Iced 6.9','Latte',{'amount':6.9},bare=True))
        self.assertTrue(m.price_matches('Espresso Hot 4.9 Iced -','Espresso',{'amount':4.9},bare=True))
        self.assertFalse(m.price_matches('Fried Mantou with condensed milk 7 [12]','Fried Mantou (with condensed milk)',{'amount':12},bare=True))
        self.assertTrue(m.FOREIGN.search('Nasi lemak RM 12'))

    def test_diet_quote_may_come_from_the_page_title_and_a_missing_capture_retries_once(self):
        import diet_review as d
        url='https://cafe.example/about'
        cache=self.root/'state/source-cache'/(hashlib.sha256(url.encode()).hexdigest()+'.json')
        record=lambda: {'id':'cafe','dietReview':{'diet':'vegetarian','sourceUrl':url,'quote':'Cafe | Vegetarian & Plant-Based Dining'}}
        self.assertEqual(d.check(self.root,record(),{'name':'Cafe'})['diet'],'retry')   # page not stored yet
        self.assertNotIn('cafe',m.read(self.root/'state/diet-flags.json',{}))
        self.assertEqual(d.check(self.root,record(),{'name':'Cafe'})['diet'],'not-confirmed')  # second miss asks the owner
        self.assertIn('cafe',m.read(self.root/'state/diet-flags.json',{}))
        m.write(cache,{'result':{'title':'Cafe | Vegetarian & Plant-Based Dining','content':'We serve plant-based meals.'}})
        self.assertEqual(d.check(self.root,record(),{'name':'Cafe'})['diet'],'vegetarian')
        self.assertNotIn('cafe',m.read(self.root/'state/diet-flags.json',{}))
        doubt={'id':'bar','dietReview':{'diet':'not-confirmed','note':'collagen add-on'}}
        self.assertEqual(d.check(self.root,doubt,{'name':'Bar'})['diet'],'not-confirmed')  # Explorer's own doubt goes straight to the owner
        self.assertIn('bar',m.read(self.root/'state/diet-flags.json',{}))

    def test_scanned_pdf_is_transcribed_and_labelled(self):
        import io
        import pdf_capture as c
        from PIL import Image
        buffer=io.BytesIO();Image.new('RGB',(400,600),'white').save(buffer,'PDF')
        with patch.object(c,'_transcribe',return_value='Aloha Burger 22.9') as transcribe:
            result=c._read(buffer.getvalue(),'f'*64)
        self.assertEqual((result['method'],transcribe.call_count),('vision-transcription',1))
        self.assertTrue(result['text'].startswith(c.TRANSCRIBED) and result['text'].endswith('Aloha Burger 22.9'))
        self.assertTrue(c.looks_like_pdf('https://x.example/_files/ugd/menu.pdf?download=1'))
        self.assertTrue(c.looks_like_pdf('https://x.example/menu','HTTP 422: Unprocessable entity'))
        self.assertFalse(c.looks_like_pdf('https://x.example/menu','HTTP 404'))

    def test_google_maps_page_is_stored_and_a_challenge_pauses_maps_for_a_day(self):
        import maps_capture as g
        self.assertTrue(g.is_maps('https://www.google.com/maps/search/?api=1&query=MOD+Cafe'))
        self.assertTrue(g.is_maps('https://maps.google.com.sg/maps?q=x'))
        self.assertFalse(g.is_maps('https://maps.googleapis.com/maps/api/place/details/json'))  # the paid API stays off
        self.assertFalse(g.is_maps('https://www.google.com/search?q=mod+cafe'))
        page={'url':'https://www.google.com/maps/place/Fennel','title':'Fennel - Google Maps','h1':'fennel by komala vilas',
              'text':'fennel by komala vilas\n4.2\nPermanently closed\n413 River Valley Rd, Singapore 248311','hours':[],'results':[]}
        with patch.object(g,'STATE',self.root/'maps.json'),patch.object(g.time,'sleep'):
            row=g.capture('https://www.google.com/maps/search/?api=1&query=Fennel',browse_fn=lambda url,session:page,clock=lambda:1000.0)
            self.assertIn('Permanently closed',row['content']);self.assertEqual(row['qtCapture']['method'],'browser-google-maps')
            blocked=g.capture('https://www.google.com/maps/search/?api=1&query=x',clock=lambda:2000.0,
                              browse_fn=lambda url,session:{'url':'https://www.google.com/sorry/index','title':'','head':'unusual traffic'})
            self.assertIn('paused',blocked['error'])
            later=g.capture('https://www.google.com/maps/search/?api=1&query=y',browse_fn=lambda url,session:page,clock=lambda:3000.0)
            self.assertIn('paused',later['error'])  # no retry until the day is over

    def test_google_maps_lane_is_one_file_lock_held_for_the_whole_capture(self):
        import maps_capture as g
        page={'url':'https://www.google.com/maps/place/Fennel','title':'Fennel','h1':'Fennel','text':'Fennel\n248311','hours':[],'results':[]}
        events=[]
        real=g.lane
        def lane():
            events.append('enter')
            with real() as held:
                yield held
            events.append('exit')
        import contextlib
        def browse(url,session):
            events.append('browse')
            return page
        with patch.object(g,'STATE',self.root/'maps.json'),patch.object(g.time,'sleep'),patch.object(g,'lane',contextlib.contextmanager(lane)):
            g.capture('https://www.google.com/maps/search/?api=1&query=Fennel',browse_fn=browse,clock=lambda:1000.0)
        self.assertEqual(events,['enter','browse','exit'])  # the browser runs only while the lane is held
        self.assertTrue((self.root/'maps.json.lock').is_file())  # the lock file every process shares
        self.assertEqual(sorted(x.name for x in self.root.glob('maps.json*')),['maps.json','maps.json.lock'])  # no stray temp file

    def test_closure_needs_the_quote_on_the_stored_page(self):
        import diet_review as d
        url='https://www.google.com/maps/place/Fennel'
        m.write(self.root/'state/source-cache'/(hashlib.sha256(url.encode()).hexdigest()+'.json'),
                {'result':{'title':'fennel by komala vilas','content':'4.2\nPermanently closed\n413 River Valley Rd'}})
        made_up={'id':'cafe','closure':{'status':'permanently-closed','sourceUrl':url,'quote':'Closed for good'}}
        self.assertIsNone(d.closure_check(self.root,made_up,{'name':'Cafe'}))
        self.assertIsNone(d.closure_check(self.root,{'id':'cafe'},{'name':'Cafe'}))
        real={'id':'fennel','closure':{'status':'permanently-closed','sourceUrl':url,'quote':'Permanently closed'}}
        self.assertEqual(d.closure_check(self.root,real,{'name':'Fennel'})['status'],'permanently-closed')
        self.assertIn('fennel',m.read(self.root/'state/closure-flags.json',{}))
        live={'venues':[{'id':'fennel','hash':'h'*64,'data':{}}],'records':[],'reverts':[]}
        with patch.object(p,'ROOT',self.root):
            m.write(self.root/'state/source-cache'/(hashlib.sha256(url.encode()).hexdigest()+'.json'),
                    {'fetchedAt':'2026-10-19T05:48:00+00:00','fetchedEpoch':time.time(),'sha256':'a'*64,'result':{'content':'Permanently closed'}})
            candidates,held=[],[]
            p.closure_candidates(live,{('venue','fennel'):'h'*64},{},candidates,held)
            self.assertEqual(candidates[0]['data']['closed']['status'],'permanently-closed');self.assertEqual(held,[])
            live['venues'][0]['data']={'closed':candidates[0]['data']['closed']}
            again=[];p.closure_candidates(live,{},{},again,held)
            self.assertEqual(again,[])  # already hidden
            live['venues'][0]['data']={};live['reverts']=[{'kind':'venue','id':'fennel','proposalHash':candidates[0]['proposalHash']}]
            p.closure_candidates(live,{},{},again,held)
            self.assertEqual((again,held[0]['reason']),([],'Closure: Owner restored this venue; automatic removal blocked'))


if __name__=='__main__':unittest.main()
