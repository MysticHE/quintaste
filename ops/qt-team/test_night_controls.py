import datetime as dt
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
import night_window as n
import telegram_reporter as t
import telegram_controls as c
import publisher as p
import workflow as w
import search_history as h


class NightControls(unittest.TestCase):
    def test_screenshot_deletes_exact_item_in_one_click_and_replay_does_not_write(self):
        buttons=c.photo_buttons(self.state,'recipe','dish-one',self.live)
        data=buttons[0][1]['callback_data'];token=data.split(':')[1]
        action=self.state['moderation'][token]
        after={'removals':[{'actionId':action['actionId'],'expectedHash':'a'*64}]}
        with patch.object(p,'request',side_effect=[{'revision':'b'*64},after]) as request:
            c.callback(self.state,data,40)
            c.callback(self.state,data,41)
            self.assertEqual(request.call_count,2)
        self.assertEqual(action['stage'],'done')
        sent=request.call_args_list[0].args[2]
        self.assertEqual((sent['kind'],sent['id'],sent['expectedHash']),('recipe','dish-one','a'*64))

    def test_screenshot_button_cannot_bypass_owner_or_confirmation_mode(self):
        data=c.photo_buttons(self.state,'recipe','dish-one',self.live)[0][1]['callback_data']
        with patch.object(p,'request') as request:
            t.handle_updates(self.state,[{'update_id':3,'callback_query':{'id':'test','data':data,'from':{'id':999,'is_bot':False},'message':{'chat':{'id':123,'type':'private'}}}}])
            request.assert_not_called()
        self.state['moderation']={}
        token=self.select()
        with patch.object(p,'request') as request:
            c.callback(self.state,'delete:'+token,4)
            request.assert_not_called()

    def test_direct_delete_expiry_stale_and_uncertain_delivery_are_not_success(self):
        data=c.photo_buttons(self.state,'recipe','dish-one',self.live)[0][1]['callback_data']
        action=self.state['moderation'][data.split(':')[1]]
        with patch.object(p,'request',side_effect=TimeoutError) as request:
            c.callback(self.state,data,5)
        self.assertEqual(action['stage'],'pending')
        self.assertNotIn('Deleted:',self.state['deliveries']['control:5']['text'])
        stable=action['actionId'];action['expires']=time.time()-1
        with patch.object(p,'request') as request:
            c.callback(self.state,data,6);request.assert_not_called()
        self.assertEqual(action['actionId'],stable)

    def test_photo_buttons_only_bind_existing_recipe_or_event(self):
        self.assertEqual(c.photo_buttons(self.state,'venue','dish-one',self.live),[])
        self.assertEqual(c.photo_buttons(self.state,'recipe','other',self.live),[])
        a=c.photo_buttons(self.state,'recipe','dish-one',self.live)
        b=c.photo_buttons(self.state,'recipe','dish-one',self.live)
        self.assertEqual(a,b)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.patches = [patch.object(t,'ROOT',self.root),patch.object(t,'STATE',self.root/'state/telegram'),patch.object(w,'ROOT',self.root)]
        for patcher in self.patches: patcher.start()
        self.state = {'offset':0,'deliveries':{}}
        self.config = {'chatId':123,'userId':123}
        t.write(self.root/'private/telegram-chat.json',self.config)
        self.live = {'records':[{'kind':'recipe','id':'dish-one','hash':'a'*64,'data':{'name':'Tofu'}}]}

    def tearDown(self):
        for patcher in self.patches: patcher.stop()
        self.temp.cleanup()

    def test_explorer_and_cooker_all_day_and_event_only_6_to_10_pm(self):
        # Owner schedule, 18 Oct 2026: rolling ticks all day; Event starts between 18:00 and 21:45 SGT.
        # Owner, 30 Oct 2026: Cooker works any hour (until the day's recipe target is published).
        for hour in (0, 3, 9, 13, 23):
            window=n.limits(dt.datetime(2026,10,18,hour,0,tzinfo=n.SG))
            self.assertTrue(window['active'] and window['research'])
            self.assertEqual(window['researchDeadline'],window['deadline']-n.RESEARCH_TAIL)
            self.assertTrue(n.role_open('qt-explorer',dt.datetime(2026,10,18,hour,0,tzinfo=n.SG)))
        for hour,minute,open_ in [(17,59,False),(18,0,True),(21,45,True),(21,46,False),(22,0,False),(2,0,False)]:
            at=dt.datetime(2026,10,18,hour,minute,tzinfo=n.SG)
            self.assertEqual((n.role_open('qt-cooker',at),n.role_open('qt-event',at)),(True,open_),(hour,minute))

    def test_80_percent_alert_once_and_month_reset(self):
        t.write(self.root/'policy.json',{'monthlyModelInvocations':2000})
        at=dt.datetime.now(n.SG)
        file=self.root/'state/usage.jsonl'; file.parent.mkdir(exist_ok=True)
        rows=[{'kind':'model','month':at.strftime('%Y-%m')}]*1599
        file.write_text('\n'.join(map(json.dumps,rows)))
        c.budget_alerts(self.state);self.assertEqual(len(self.state['deliveries']),0)
        rows.append({'kind':'acceptance-model','month':at.strftime('%Y-%m')})
        file.write_text('\n'.join(map(json.dumps,rows)))
        c.budget_alerts(self.state);c.budget_alerts(self.state)
        self.assertEqual(len(self.state['deliveries']),1)
        rows += [{'kind':'model','month':at.strftime('%Y-%m')}]*400
        file.write_text('\n'.join(map(json.dumps,rows)))
        c.budget_alerts(self.state);self.assertEqual(len(self.state['deliveries']),2)
        self.assertEqual(n.usage(self.root,{'monthlyModelInvocations':2000},at+dt.timedelta(days=32))['used'],0)

    def select(self):
        with patch.object(p,'request',return_value=self.live):
            c.menu(self.state)
        token=next(iter(self.state['moderation']))
        c.callback(self.state,'select:'+token,1)
        return next(k for k,v in self.state['moderation'].items() if v['stage']=='confirm')

    def test_requires_separate_confirmation_then_idempotent_replay(self):
        with patch.object(p,'request',return_value=self.live) as request:
            c.menu(self.state)
            token=next(iter(self.state['moderation']))
            c.callback(self.state,'confirm:'+token,1)
            self.assertEqual(request.call_count,1)
        self.state['moderation']={}
        token=self.select();action=self.state['moderation'][token]
        after={'removals':[{'actionId':action['actionId'],'expectedHash':'a'*64}]}
        with patch.object(p,'request',side_effect=[{'revision':'b'*64},after]) as request:
            c.callback(self.state,'confirm:'+token,2)
            c.callback(self.state,'confirm:'+token,3)
            self.assertEqual(request.call_count,2)
        self.assertEqual(action['stage'],'done')

    def test_cancel_expiry_and_unknown_owner_never_write(self):
        token=self.select()
        c.callback(self.state,'cancel:'+token,2)
        with patch.object(p,'request') as request:
            c.callback(self.state,'confirm:'+token,3)
            self.state['moderation'][token].update(stage='confirm',expires=time.time()-1)
            c.callback(self.state,'confirm:'+token,4)
            update={'update_id':5,'callback_query':{'id':'test','data':'confirm:'+token,'from':{'id':456,'is_bot':False},'message':{'chat':{'id':123,'type':'private'}}}}
            t.handle_updates(self.state,[update]);request.assert_not_called()

    def test_uncertain_transport_retains_same_action_id(self):
        token=self.select();before=self.state['moderation'][token]['actionId']
        with patch.object(p,'request',side_effect=TimeoutError):
            c.callback(self.state,'confirm:'+token,2)
        self.assertEqual(self.state['moderation'][token]['stage'],'pending')
        self.assertEqual(self.state['moderation'][token]['actionId'],before)
        stored=t.read(t.STATE/'state.json')
        self.assertEqual(stored['moderation'][token]['stage'],'pending')

    def test_monthly_cap_counts_acceptance_attempts_and_no_daily_ceiling(self):
        at=dt.datetime.now(n.SG)
        file=self.root/'state/usage.jsonl';file.parent.mkdir(exist_ok=True)
        file.write_text(json.dumps({'kind':'acceptance-model','day':at.date().isoformat(),'month':at.strftime('%Y-%m')})+'\n')
        policy={'dailyModelInvocations':None,'monthlyModelInvocations':2}
        w.reserve(policy,'model')
        with self.assertRaisesRegex(RuntimeError,'Monthly'): w.reserve(policy,'model')

    def test_closed_window_does_not_reserve_or_launch_model(self):
        with patch.object(w,'reserve') as reserve,patch.object(w.subprocess,'Popen') as launch:
            with self.assertRaisesRegex(RuntimeError,'cutoff'):
                w.run_model('qt-explorer','test',self.root/'job',{'workerSeconds':480,'_deadline':time.time()+1000,'_researchDeadline':time.time()-1})
            reserve.assert_not_called();launch.assert_not_called()

    def test_native_query_history_normalizes_without_claiming_enforcement(self):
        h.remember(self.root,[{'name':'web_search','input':{'query':'  Tofu  Singapore '}}],'qt-cooker')
        h.remember(self.root,[{'name':'web_search','input':{'query':'tofu singapore'}}],'qt-event')
        self.assertEqual(len(t.read(self.root/'state/search-history.json')),1)
        self.assertIn('cannot be intercepted',h.context(self.root))

    def test_every_round_runs_cooker_event_then_explorer_until_venues_done(self):
        from types import SimpleNamespace
        from contextlib import redirect_stdout
        import io
        policy={'monthlyModelInvocations':2000,'runSeconds':3200,'minimumFreeBytes':0,'maxExploreBatchesPerRun':1,'exploreBatchSize':1}
        t.write(self.root/'policy.json',policy)
        t.write(self.root/'baseline.json',{'venues':[{'venueId':'branch-one'},{'venueId':'branch-two'}],'holds':{},'recipeNames':[],'checkedAt':'2026-10-17','catalogueRevision':'fixture'})
        completed=[];locks=[]
        def worker(role,context,folder,policy,prior_sources=None):
            completed.append(role)
            records=[{'id':v['venueId'],'status':'held'} for v in context.get('venues',[])]
            packet={'role':role,'records':records}
            t.write(folder/'validated.json',packet)
            return packet
        window={'active':True,'deadline':time.time()+12000,'researchDeadline':time.time()+9000}
        with patch.object(n,'limits',return_value=window),patch.object(n,'role_open',return_value=True),patch.object(w,'worker',side_effect=worker),patch.object(w,'review',return_value={'decisions':[]}),patch.object(w,'pending_recipe_images',return_value=([],{})),patch.object(w,'recipe_image',return_value={'status':'not-needed'}),patch.object(w,'live_health',return_value={'status':200}),patch.dict('sys.modules',{'fcntl':SimpleNamespace(LOCK_EX=2,LOCK_NB=4,flock=lambda stream,*args:locks.append(stream))}),redirect_stdout(io.StringIO()):
            try:
                w.run(nightly=True);time.sleep(1.05)
                w.run(nightly=True);time.sleep(1.05)
                w.run(nightly=True)
            finally:
                for lock in locks:lock.close()
        # Owner rules: no daily caps inside the window (18 Oct 2026). Owner, 30 Oct 2026: with no time limits Cooker works every
        # round while the day's recipes are needed, and Explorer still runs in the same round after the kitchen roles.
        self.assertEqual(completed,['qt-cooker','qt-event','qt-explorer','qt-cooker','qt-event','qt-explorer','qt-cooker','qt-event'])
        checkpoint=t.read(self.root/'state/checkpoint.json')
        self.assertEqual(set(checkpoint['explorerReviewed']),{'branch-one','branch-two'})
        self.assertEqual(checkpoint['pendingReview'],[])


if __name__=='__main__':unittest.main()
