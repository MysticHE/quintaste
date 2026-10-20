import tempfile
import unittest
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
        with patch.object(t,'capture',return_value=[{'kind':'venue','recordId':'venue-0','path':'fixture.jpg','caption':'Published'}]),patch.object(p,'request',return_value={'changes':[]}):
            t.publication_updates(self.state)
        self.assertFalse(self.state['deliveries'])
        self.assertFalse(self.state['visuals']['f'*64].get('complete'))


if __name__=='__main__': unittest.main()
