"""One owner-authorised real Explorer/Manager acceptance run, exact 68-item target."""
import base64
from pathlib import Path
import setup

HERE=Path(__file__).resolve().parent
source=(HERE/'evidence/2026-10-17/menu-coverage/source-web.txt').read_bytes()
driver=r'''
import pathlib,sys,json,fcntl,time,datetime,hashlib,base64,re,subprocess,os
r=pathlib.Path('/opt/data/qt-team');sys.path.insert(0,str(r));import workflow as w;import publisher as p;import menu_coverage as m
folder=r/'runs/full-menu-acceptance-20261017'
with (r/'state/run.lock').open('a+') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 policy=w.read(r/'policy.json');original=p.request('GET','/control/state');before_policy=hashlib.sha256((r/'policy.json').read_bytes()).hexdigest()
 url='https://www.foodpanda.sg/restaurant/fqw9/zhen-xiang-su-shi-zhen-xiang-vegetarian-325-woodlands-st-32'
 raw=base64.b64decode(SOURCE).decode();body='\n'.join(re.findall(r'^L\d+: ?(.*)$',raw,re.M))
 assert 'Western Vegetarian Pork Rib Rice Set' in body and len(body)>8000
 capture_path=r/'state/source-cache'/(hashlib.sha256(url.encode()).hexdigest()+'.json')
 with (r/'state/source-cache/.lock').open('a+') as source_lock:
  fcntl.flock(source_lock,fcntl.LOCK_EX)
  if capture_path.exists():(folder/'previous-partial-capture.json').write_bytes(capture_path.read_bytes())
  w.write(capture_path,{'url':url,'fetchedAt':w.now(),'fetchedEpoch':time.time(),'sha256':hashlib.sha256(body.encode()).hexdigest(),'blocked':False,
    'acquisition':'Operator public web reader, source crawled today; original returned lines retained. Not a new Firecrawl fetch.',
    'result':{'url':url,'title':'Zhen Xiang Vegetarian (325 Woodlands St 32)','content':body,'raw_content':body,'metadata':{'operatorCapture':True}}})
 (folder/'source-web.txt').write_text(raw)
 baseline=p.current_baseline(w.read(r/'baseline.json'));venue=next(v for v in baseline['venues'] if v['venueId']=='zhen-xiang-woodlands-street-32')
 assignment=p.menu_context([venue]);assert assignment[0]['totalItems']==68 and len(assignment[0]['assignedItems'])==68
 w.write(folder/'assignment.json',assignment)
 context={'venues':[venue],'baselineDate':baseline['checkedAt'],'preservedHolds':baseline['holds'],'heldRetries':[],
   'knownMenuItems':assignment,'acceptanceInstruction':'Review all 68 assigned dishes. A complete public page capture is already in the shared web_extract cache for the exact menu URL; read that once. Two baseline names may no longer match; hold exact-name mismatches, never rename or drop dishes automatically. No need to search each dish. Propose only actual changed facts; unchanged facts belong in menuReview. This is an operator-requested daytime acceptance run under the normal monthly allowance.'}
 packet=w.worker('qt-explorer',context,folder/'explorer',policy)
 # Persist pending work before independent review, just like the scheduled path.
 state=w.read(r/'state/checkpoint.json');pending=str(folder/'explorer/validated.json');state.setdefault('pendingReview',[]).append(pending);state.setdefault('explorerAttempted',{})[venue['venueId']]=w.now();w.write(r/'state/checkpoint.json',state)
 reviewed=w.review([packet],folder/'manager',policy)
 coverage=m.accept(r,[packet],reviewed['decisions'])
 package={'version':1,'runId':folder.name,'checkedAt':w.now(),'packets':[packet],'manager':reviewed,'publication':'not-published'}
 w.write(r/'outbox'/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-full-menu.json'),package)
 state=w.read(r/'state/checkpoint.json');state['pendingReview']=[v for v in state['pendingReview'] if v!=pending];state['explorerReviewed']=m.completed(r,baseline['venues']);w.write(r/'state/checkpoint.json',state)
 candidates,images,held=p.prepare([package],p.request('GET','/control/state'));w.write(folder/'publication-candidates.json',{'candidates':candidates,'held':held})
 publication={'status':'reviewed-no-data-changes','productionWrites':0}
 if candidates:
  assert not (r/'state/pending-publication.json').exists()
  decision=p.publication_review(candidates,images,held,folder/'publication-review',policy)
  batch=p.make_batch(candidates,images,decision,p.request('GET','/control/state')['revision'],'qt-full-menu-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S'))
  if batch['records']:
   w.write(r/'state/pending-publication.json',batch);w.write(r/'state/pending-publication-outcomes.json',w.read(r/'state/publication-outcomes.json',{}))
   publication=p.run_publication(policy,folder/'publication')
 after=p.request('GET','/control/state');assert after['removals']==original['removals'];assert before_policy==hashlib.sha256((r/'policy.json').read_bytes()).hexdigest()
 w.write(folder/'result.json',{'status':'finished','checkedAt':w.now(),'coverage':coverage,'publication':publication,'ownerRemovalsPreserved':True,'policyUnchanged':True,'dishResults':packet['records'][0]['menuReview']['items'],'manager':reviewed})
 print(json.dumps({'status':'finished','coverage':coverage,'publication':publication}),flush=True)
runtime=r/'telegram-runtime/venv/bin/python'
subprocess.run([str(runtime),str(r/'telegram_reporter.py')],cwd=r,env=dict(os.environ,PLAYWRIGHT_BROWSERS_PATH=str(r/'telegram-runtime/browsers')),check=True)
'''.replace('SOURCE',repr(base64.b64encode(source).decode()))

if __name__=='__main__':
    print(setup.remote_container(r'''
import pathlib,base64,subprocess,json
r=pathlib.Path('/opt/data/qt-team');folder=r/'runs/full-menu-acceptance-20261017';folder.mkdir()
p=folder/'run.py';p.write_bytes(base64.b64decode(DRIVER));p.chmod(0o400)
with (folder/'operator.log').open('w') as log:
 child=subprocess.Popen(['python',str(p)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
print(json.dumps({'pid':child.pid,'folder':str(folder),'targetDishes':68}))
'''.replace('DRIVER',repr(base64.b64encode(driver.encode()).decode()))))
