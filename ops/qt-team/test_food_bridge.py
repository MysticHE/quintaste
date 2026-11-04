import hashlib,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import food_bridge as f
import chef_work,bot_blockers,telegram_controls,chef_admin,telegram_reporter

class FoodBridge(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  self.patch=patch.object(f,'ROOT',self.root);self.patch.start();self.addCleanup(self.patch.stop)
  self.raw=b'fixture JPEG bytes';self.digest=hashlib.sha256(self.raw).hexdigest()
  self.job={'id':'00000000-0000-4000-8000-000000000001','token':'00000000-0000-4000-8000-000000000002','kind':'listing','payload':{'data':{'ingredients':'tofu'}},'prior':{},'photos':[{'slot':'item','digest':self.digest},{'slot':'detail','digest':self.digest}]}
  self.answer={'decision':'clear','reason':'The exact complete fields support tofu.','confidence':.99,'photosReviewed':[self.digest,self.digest]}
 def events(self):
  file=str(self.root/'food-review'/self.job['id']/self.job['token']/(self.digest+'.jpg'))
  return [{'type':'tool_use','name':'vision_analyze','tool_call_id':'v','input':{'image_url':file}},
   {'type':'tool_result','name':'vision_analyze','tool_call_id':'v','output':json.dumps({'success':True,'analysis':'A fixture label with a meat-free ingredient list.'})}]
 def test_actual_image_events_and_unique_pixels_are_required(self):
  with patch.object(f,'download',side_effect=lambda c,j,p,file:file.write_bytes(self.raw)) as download,patch.object(f.hermes_run,'run',return_value=({'text':json.dumps(self.answer)},self.events())) as run,patch.object(f,'call',return_value={'ok':True}) as call:
   f.handle('safety',self.job)
  self.assertEqual(download.call_count,1);self.assertEqual(run.call_args.kwargs['toolset'],'vision')
  self.assertEqual(call.call_args.args[1],'food-result');self.assertEqual(call.call_args.args[2]['result'],self.answer)
  self.assertFalse((self.root/'food-review'/self.job['id']/self.job['token']).exists())
 def test_exact_event_sources_and_verdict_labels_enter_the_reviewer(self):
  self.job['kind']='editorial-event';self.job['photos']=[]
  self.job['payload']['data']={'title':'Vegetarian event','organiser':'Fixture organiser','sourceEvidence':[{'url':'https://example.com/event','evidence':'The organiser offers a vegetarian menu.'}]}
  with patch.object(f.hermes_run,'run',return_value=({'text':json.dumps({**self.answer,'photosReviewed':[]})},[])) as run,patch.object(f,'call',return_value={'ok':True}):f.handle('safety',self.job)
  prompt=run.call_args.args[1]
  self.assertIn('editorial-event',prompt);self.assertIn('Fixture organiser',prompt);self.assertIn('sourceEvidence',prompt)
  self.assertIn('not a QT Vegetarian/five-pungent-free badge',prompt)
 def test_only_real_read_excerpts_from_one_official_url_are_accepted(self):
  url='https://example.com/event';quote='This exact cooking class serves a fully plant-based menu.'
  events=[{'type':'tool_use','name':'web_extract','tool_call_id':'read','input':{'urls':[url]}},
          {'type':'tool_result','name':'web_extract','tool_call_id':'read','output':json.dumps({'success':True,'content':quote})}]
  answer={'sources':[{'url':url,'quote':quote}]}
  self.assertEqual(len(f.evidence_from_events(answer,events,{'example.com'})),1)
  for invalid in ([],[{**events[0],'input':{'urls':[url,'https://example.com/other']}},events[1]],[events[0],{**events[1],'is_error':True}]):
   self.assertEqual(f.evidence_from_events(answer,invalid,{'example.com'}),[])
  self.assertEqual(f.evidence_from_events({'sources':[{'url':url,'quote':'An invented confirmation which was never in the page.'}]},events,{'example.com'}),[])
  self.assertEqual(f.evidence_from_events(answer,events,{'other.example'}),[])
 def test_actual_hermes_idless_read_results_are_correlated_only_when_sequential(self):
  url='https://example.com/event';other='https://example.com/other'
  quote='This exact cooking class serves a fully plant-based menu.'
  use=lambda u:{'type':'tool_use','name':'web_extract','input':{'urls':[u]}}
  result={'type':'tool_result','name':'web_extract','output':json.dumps({'success':True,'content':quote}),'is_error':False}
  answer={'sources':[{'url':url,'quote':quote},{'url':other,'quote':quote}]}
  sequential=[use(url),result,use(other),result]
  self.assertEqual([s['url'] for s in f.evidence_from_events(answer,sequential,{'example.com'})],[url,other])
  for ambiguous in ([use(url),use(other),result,result],[result,use(url)],[use(url),{**result,'is_error':True}],
                    [use(url),{**result,'tool_call_id':'unknown'}],
                    [{**use(url),'input':{'urls':[url,other]}},result]):
   self.assertEqual(f.evidence_from_events(answer,ambiguous,{'example.com'}),[])
 def test_a_source_recheck_requeues_mint_instead_of_asking_the_owner_immediately(self):
  self.job['kind']='editorial-event';self.job['photos']=[];self.job['prior']={'mint':{'decision':'uncertain'}}
  with patch.object(f,'event_evidence',return_value=[{'url':'https://example.com/event'}]) as research,patch.object(f,'call',return_value={'requeued':True}) as call,patch.object(f.hermes_run,'run') as model:
   f.handle('head',self.job)
  research.assert_called_once();model.assert_not_called();self.assertEqual(call.call_args.args[1],'food-evidence')
 def test_lychee_has_a_private_work_directory_before_hermes_starts(self):
  self.job['payload']['data']['sources']=['https://example.com/event'];self.job['prior']={'mint':{'decision':'uncertain'}}
  def run(*args,**kwargs):
   self.assertEqual(args[0],'qt-event');self.assertTrue(args[2].is_dir());self.assertEqual(kwargs['seconds'],180)
   self.assertNotIn('terminal',kwargs['allowed']);return {'text':'{"sources":[]}'},[]
  with patch.object(f.hermes_run,'run',side_effect=run):self.assertEqual(f.event_evidence(self.job,self.root),[])
 def test_an_inaccessible_source_check_does_not_repeat_or_invent_an_answer(self):
  self.job['kind']='editorial-event';self.job['photos']=[];self.job['prior']={'mint':{'decision':'uncertain'}}
  response={'requeued':False,'sourceRecheck':{'status':'unavailable','sources':[]}}
  with patch.object(f,'event_evidence',side_effect=RuntimeError('source inaccessible')) as research,patch.object(f,'call',side_effect=[response,{'ok':True}]) as call,patch.object(f.hermes_run,'run',return_value=({'text':json.dumps({**self.answer,'decision':'uncertain','photosReviewed':[]})},[])) as model:
   f.handle('head',self.job)
  self.assertEqual(research.call_count,1);self.assertEqual(call.call_args_list[0].args[2]['sources'],[]);self.assertIn('unavailable',model.call_args.args[1])
  self.job['prior']['evidenceAttempted']=True
  with patch.object(f,'event_evidence') as research,patch.object(f,'call',return_value={'ok':True}),patch.object(f.hermes_run,'run',return_value=({'text':json.dumps({**self.answer,'decision':'uncertain','photosReviewed':[]})},[])):
   f.handle('head',self.job)
  research.assert_not_called()
 def test_food_cards_describe_the_actual_status_without_an_automatic_hold_headline(self):
  ask={'chef':'Mint','foodReview':True,'confidence':.97,'foodStatus':{'label':'Needs evidence','mint':'Needs evidence','kaya':'Needs evidence','threshold':.95}}
  text='\n'.join(telegram_controls.chef_request_lines(ask))
  self.assertIn('Why: Needs evidence',text);self.assertNotIn('Kaya disagreed',text);self.assertNotIn('hold a',text)
  self.assertIn('not the chance',text)
 def test_fabricated_model_attestation_without_pixels_routes_uncertainty(self):
  with patch.object(f,'download',side_effect=lambda c,j,p,file:file.write_bytes(self.raw)),patch.object(f.hermes_run,'run',return_value=({'text':json.dumps(self.answer)},[])),patch.object(f,'call',return_value={'ok':True}) as call:
   f.handle('safety',self.job)
  self.assertTrue(call.call_args.args[2]['error'])
 def test_exhausted_claim_never_runs_a_model(self):
  self.job['exhausted']=True
  with patch.object(f.hermes_run,'run') as run,patch.object(f,'call',return_value={'ok':True}) as call:f.handle('head',self.job)
  run.assert_not_called();self.assertTrue(call.call_args.args[2]['error'])
 def test_invalid_claim_cannot_escape_work_directory(self):
  self.job['id']='../other'
  with self.assertRaises(ValueError):f.handle('safety',self.job)
 def test_shared_privacy_switch_only_opens_its_owned_lanes(self):
  (self.root/'policy.json').write_text(json.dumps({'foodSafetyMemberContent':True}))
  self.assertTrue(chef_work.member_text_allowed(self.root,'member-recipes'));self.assertTrue(chef_work.member_text_allowed(self.root,'recalls'))
  self.assertFalse(chef_work.member_text_allowed(self.root,'place-reports'));self.assertFalse(chef_work.member_text_allowed(self.root))
 def test_disabled_processing_makes_no_claim(self):
  (self.root/'policy.json').write_text('{}')
  with patch.object(f,'call') as call:self.assertFalse(f.turn())
  call.assert_not_called()
 def test_capacity_contention_defers_the_claim_without_an_unproven_food_finding(self):
  with patch.object(f.hermes_run,'run',side_effect=TimeoutError('capacity busy')),patch.object(f,'download',side_effect=lambda c,j,p,file:file.write_bytes(self.raw)),patch.object(f,'call',return_value={'ok':True}) as call,patch.object(bot_blockers,'record'):
   f.handle('safety',self.job)
  self.assertEqual(call.call_args.args[1],'food-heartbeat');self.assertTrue(call.call_args.args[2]['defer'])
 def test_runtime_failures_file_only_one_case_after_retries(self):
  with patch.object(chef_admin,'call',return_value={'id':'case-fixture'}) as call:
   bot_blockers.record(self.root,'head','qt-explorer');bot_blockers.record(self.root,'head','qt-explorer');call.assert_not_called()
   bot_blockers.record(self.root,'head','qt-explorer');bot_blockers.record(self.root,'head','qt-explorer');self.assertEqual(call.call_count,1)
   bot_blockers.record(self.root,'head','qt-explorer',failed=False)
 def test_exact_issue_link_rejects_injection(self):
  self.assertTrue(telegram_controls.chef_admin_button(self.job['id'])['url'].endswith('/console/chefs?id='+self.job['id']))
  with self.assertRaises(ValueError):telegram_controls.chef_admin_button('../bad?url=https://other')
 def test_food_uncertainty_requires_an_explicit_review_not_an_ambiguous_tap(self):
  ask={'id':self.job['id'],'at':'1','chef':'Mint','lane':'Food content checks','action':'hold','item':'a food submission','why':'disagree','foodReview':True}
  state={'deliveries':{}}
  with patch.object(chef_admin,'has_key',return_value=True),patch.object(chef_admin,'asks',return_value=[ask]):telegram_controls.chef_requests(state)
  card=state['deliveries']['chef:'+ask['id']];self.assertEqual(card['buttons'],[[telegram_controls.chef_admin_button(ask['id'])]])
  self.assertEqual(state['chefTokens'],{})
 def test_every_batched_question_has_its_own_exact_link(self):
  from uuid import UUID
  asks=[{'id':str(UUID(int=n+1)),'at':str(n+1),'chef':'Mint','lane':'Food content checks','action':'hold','foodReview':True} for n in range(45)]
  state={'deliveries':{}}
  def fetch(root,after=None):return [a for a in asks if after is None or int(a['at'])>int(after)][:20]
  with patch.object(chef_admin,'has_key',return_value=True),patch.object(chef_admin,'asks',side_effect=fetch):telegram_controls.chef_requests(state)
  urls=[b['url'] for card in state['deliveries'].values() for row in card['buttons'] for b in row]
  self.assertEqual(len(state['deliveries']),2);self.assertEqual(len(urls),45)
  self.assertEqual(set(urls),{telegram_controls.chef_admin_button(a['id'])['url'] for a in asks})
 def test_changed_revision_finishes_without_a_false_runtime_incident(self):
  import urllib.error
  self.job['photos']=[]
  with patch.object(f.hermes_run,'run',side_effect=urllib.error.HTTPError('https://fixture.invalid',409,'Changed',{},None)),patch.object(f,'call') as call:
   f.handle('safety',self.job)
  call.assert_not_called()
 def test_blocker_cursor_advances_after_the_exact_card_is_queued(self):
  import staff_alerts
  state={'deliveries':{},'staffAlerts':{'seen':{},'blockerAfter':'1'}}
  value={'botBlockers':[{'id':self.job['id'],'scope':'food-checks','at':'2'}]}
  with patch.object(chef_admin,'has_key',return_value=True),patch.object(chef_admin,'call',return_value=value) as call:
   staff_alerts.check(state,self.root)
  self.assertTrue(call.call_args.args[3].endswith('?blockedAfter=1'))
  self.assertEqual(state['staffAlerts']['blockerAfter'],'2')
  self.assertEqual(state['deliveries']['bot-blocker:'+self.job['id']]['buttons'][0][0]['url'],chef_admin.ADMIN_ORIGIN+'/console/cases?id='+self.job['id'])

if __name__=='__main__':unittest.main()
