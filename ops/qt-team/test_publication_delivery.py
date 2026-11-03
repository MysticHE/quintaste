import tempfile
import unittest
import datetime as dt
import hashlib
import io
import sys
from pathlib import Path
from unittest.mock import patch
import telegram_reporter as t
import telegram_controls as c
import publisher as p


class PublicationDelivery(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.patches=[patch.object(t,'ROOT',self.root),patch.object(t,'STATE',self.root/'state/telegram')]
        for x in self.patches:x.start()
        self.state={'deliveries':{}}
        self.changes=[{'kind':'venue','id':'venue-'+str(i),'name':'Venue '+str(i),'changeId':str(i)*64,
                      'afterHash':'a'*64,'beforeHash':'b'*64,'fields':['sourceUrls'],
                      'before':{'sourceUrls':[]},'after':{'sourceUrls':['https://example.org']}} for i in range(7)]
        self.live={'changes':self.changes,'venues':[{'id':c['id'],'hash':c['afterHash']} for c in self.changes]}
        self.pub={'revision':'f'*64,'status':'published','records':['venue:'+c['id'] for c in self.changes],'changes':self.changes}

    def tearDown(self):
        for x in self.patches:x.stop()
        self.temp.cleanup()

    def test_all_seven_venues_report_once_from_durable_receipt_even_if_latest_replaced(self):
        t.write(self.root/'state/publications/batch.json',self.pub)
        t.write(self.root/'state/latest-publication.json',{'status':'pending'})
        def capture(pub):
            self.assertEqual(len(pub['records']),1)
            rid=pub['records'][0].split(':')[1]
            return [{'kind':'venue','recordId':rid,'path':'fixture.jpg','caption':'Published '+rid}]
        with patch.object(t,'capture',side_effect=capture) as capture_call,patch.object(p,'request',return_value=self.live):
            for _ in range(10):t.publication_updates(self.state)
        self.assertEqual(capture_call.call_count,7)
        self.assertEqual(len(self.state['deliveries']),7)
        self.assertTrue(self.state['visuals']['f'*64]['complete'])
        self.assertTrue(all(v['buttons'][0][1]['callback_data'].startswith('revert:') for v in self.state['deliveries'].values()))

    def test_revert_exact_item_replay_does_not_write_again(self):
        data=c.photo_buttons(self.state,'venue','venue-0',self.live)[0][1]['callback_data']
        action=self.state['moderation'][data.split(':')[1]]
        receipt={'actionId':action['actionId'],'changeId':action['changeId']}
        with patch.object(p,'request',side_effect=[{'revision':'c'*64},{'reverts':[receipt]}]) as api:
            c.callback(self.state,data,1);c.callback(self.state,data,2)
        self.assertEqual(api.call_count,2)
        self.assertEqual(api.call_args_list[0].args[1],'/control/revert')
        self.assertEqual(api.call_args_list[0].args[2]['expectedHash'],'a'*64)
        self.assertEqual(action['stage'],'done')

    def test_revert_cannot_be_invoked_with_delete_or_confirm_action(self):
        data=c.photo_buttons(self.state,'venue','venue-0',self.live)[0][1]['callback_data']
        with patch.object(p,'request') as api:
            c.callback(self.state,data.replace('revert:','delete:'),1)
            c.callback(self.state,data.replace('revert:','confirm:'),2)
            api.assert_not_called()

    def test_caption_describes_actual_sources_and_hours(self):
        self.assertIn('refreshed: 1 links',t.change_caption(self.changes[0]))
        change={'fields':['hours'],'before':{'hours':{'summary':'10am–8pm'}},'after':{'hours':{'summary':'11am–9pm'}}}
        self.assertIn('10am–8pm → 11am–9pm',t.change_caption(change))
        change['before']=change['after']
        self.assertIn('times unchanged',t.change_caption(change))
        self.changes[0]['retainedSourceUrls']=['https://example.org']
        self.assertIn('holds remain',t.change_caption(self.changes[0]))

    def test_item_changed_after_capture_cannot_attach_newer_revert_button(self):
        t.write(self.root/'state/publications/batch.json',self.pub)
        with patch.object(t,'capture',return_value=[{'kind':'venue','recordId':'venue-0','path':'fixture.jpg','caption':'Published'}]),patch.object(p,'request',side_effect=[self.live,{'changes':[]}]):
            t.publication_updates(self.state)
        self.assertFalse(self.state['deliveries'])
        self.assertFalse(self.state['visuals']['f'*64].get('complete'))

    def test_failed_capture_backoff_survives_cleanup_and_next_receipt_runs(self):
        first=dict(self.pub,revision='a'*64,records=['venue:venue-0'],changes=self.changes[:1])
        second=dict(self.pub,revision='b'*64,records=['venue:venue-1'],changes=self.changes[1:2])
        t.write(self.root/'state/publications/01.json',first)
        t.write(self.root/'state/publications/02.json',second)
        with patch.object(t,'capture',side_effect=ValueError('capture unavailable')) as capture,patch.object(p,'request',return_value=self.live):
            t.publication_updates(self.state)
            t.maintenance(self.state)
            self.assertEqual(self.state['visuals']['a'*64]['attempts'],1)
            self.assertGreater(self.state['visuals']['a'*64]['nextAt'],0)
            t.publication_updates(self.state)
        self.assertEqual([c.args[0]['revision'] for c in capture.call_args_list],['a'*64,'b'*64])

    def test_superseded_record_is_terminal_without_screenshot_or_delivery(self):
        t.write(self.root/'state/publications/old.json',self.pub)
        with patch.object(t,'capture') as capture,patch.object(p,'request',return_value={'changes':[]}):
            t.publication_updates(self.state)
        capture.assert_not_called()
        visual=self.state['visuals']['f'*64]
        self.assertTrue(visual['complete'])
        self.assertTrue(all(v=='superseded' for v in visual['items'].values()))
        self.assertFalse(self.state['deliveries'])

    def test_expired_receipt_does_not_reannounce_historical_updates(self):
        old=dict(self.pub,publishedAt=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=8)).isoformat())
        t.write(self.root/'state/publications/old.json',old)
        with patch.object(t,'capture') as capture,patch.object(p,'request') as api:
            t.publication_updates(self.state)
        capture.assert_not_called();api.assert_not_called()
        self.assertEqual(self.state['visuals']['f'*64]['disposition'],'expired')
        self.assertTrue(self.state['visuals']['f'*64]['complete'])

    def test_newer_publications_are_reported_before_backlog(self):
        now=dt.datetime.now(dt.timezone.utc)
        for name,revision,age in [('01-old','a'*64,2),('02-new','b'*64,0)]:
            t.write(self.root/('state/publications/'+name+'.json'),dict(self.pub,revision=revision,publishedAt=(now-dt.timedelta(days=age)).isoformat()))
        with patch.object(t,'capture',side_effect=ValueError('capture unavailable')) as capture,patch.object(p,'request',return_value=self.live):
            t.publication_updates(self.state)
        self.assertEqual(capture.call_args.args[0]['revision'],'b'*64)

    def test_recipe_cover_uses_verified_public_bytes_without_browser_or_fake_login(self):
        from PIL import Image
        blob=io.BytesIO();Image.new('RGB',(960,720),'green').save(blob,format='JPEG')
        raw=blob.getvalue();sha=hashlib.sha256(raw).hexdigest()
        recipe={'id':'green-soup','name':'Green soup','author':'Original author','image':{'path':'/api/editorial/assets/'+sha+'.jpg','credit':'AI-generated recipe illustration'},
                'nutrition':{'basis':'estimate','perServing':{'kcal':278,'protein':16.7,'fibre':8.4,'sodium':346.6}}}
        publication={'revision':'c'*64,'records':['recipe:green-soup'],'changes':[{'kind':'recipe','id':'green-soup','changeId':'d'*64}]}
        response=unittest.mock.MagicMock();response.__enter__.return_value.read.return_value=raw
        with patch.object(t,'get_public',return_value=recipe),patch.object(t.urllib.request,'urlopen',return_value=response),patch.object(p,'request',return_value={'changes':publication['changes']}),patch.dict(sys.modules,{'playwright.sync_api':None,'PIL':None}):
            photos=t.capture(publication)
        self.assertEqual(len(photos),1)
        self.assertEqual(Path(photos[0]['path']).read_bytes(),raw)
        self.assertIn('AI-generated',photos[0]['caption'])
        self.assertIn('278 kcal',photos[0]['caption'])
        self.assertIn('Protein 16.7 g',photos[0]['caption'])
        self.assertEqual(photos[0]['recordId'],'green-soup')

    def test_explicit_latest_request_can_repeat_a_current_report(self):
        t.write(self.root/'state/latest-publication.json',self.pub)
        self.state['visuals']={'f'*64:{'attempts':0,'nextAt':0,'complete':True,'items':{'venue:venue-0':'queued'}}}
        self.state['latestRequested']='owner-request'
        photo={'kind':'venue','recordId':'venue-0','path':'fixture.jpg','caption':'Published'}
        with patch.object(t,'capture',return_value=[photo]) as capture,patch.object(p,'request',return_value=self.live):
            t.publication_updates(self.state)
        capture.assert_called_once()
        self.assertTrue(any(k.endswith(':request:owner-request') for k in self.state['deliveries']))

    def test_partial_supersession_still_reports_the_current_item(self):
        t.write(self.root/'state/publications/batch.json',self.pub)
        live=dict(self.live,changes=self.changes[1:])
        photo={'kind':'venue','recordId':'venue-1','path':'fixture.jpg','caption':'Published'}
        with patch.object(t,'capture',return_value=[photo]) as capture,patch.object(p,'request',return_value=live):
            t.publication_updates(self.state)
        self.assertEqual(capture.call_args.args[0]['records'],['venue:venue-1'])
        self.assertEqual(self.state['visuals']['f'*64]['items']['venue:venue-0'],'superseded')


if __name__=='__main__': unittest.main()
