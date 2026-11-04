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
