"""Provision the owner's QT Hermes team using the existing private SSH route.

No OAuth store is copied; supported Hermes profile credential fallback is used.
No application container, database, existing profile or default schedule is changed.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import os
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
QT = Path("C:/Users/huien/qt/quintaste")
spec = importlib.util.spec_from_file_location("hermes_setup", HERE.parent / "hermes-desktop" / "setup.py")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
EVIDENCE = Path(tempfile.gettempdir()) / "qt-hermes-setup"
REMOTE = "/opt/data/qt-team"
PROFILES = {"qt-manager": "QT Manager", "qt-explorer": "QT Explorer", "qt-cooker": "QT Cooker", "qt-event": "QT Event"}


def remote_container(code, user="10000"):
    wrapper = ("import subprocess\nr=subprocess.run(['docker','exec','--user'," + repr(user) +
               ",'--workdir','/opt/hermes','-i'," + repr(helper.CONTAINER) + ",'python','-'],input=" +
               repr(code) + ",text=True,capture_output=True)\n"
               "if r.returncode: raise RuntimeError(r.stderr[-1500:])\nprint(r.stdout)")
    return helper.remote(wrapper)


def urls(value):
    if isinstance(value, str):
        return [value] if value.startswith("https://") else []
    if isinstance(value, dict):
        return [u for v in value.values() for u in urls(v)]
    if isinstance(value, list):
        return [u for v in value for u in urls(v)]
    return []


def baseline():
    import re
    readiness = json.loads((QT / "data/menu-research/current-catalogue-readiness-2026-10-17.json").read_text(encoding="utf-8"))
    index = json.loads((QT / "data/menus/catalogue-index.json").read_text(encoding="utf-8"))
    venues = []
    for row in readiness["rows"]:
        source_urls = list(dict.fromkeys(u for u in urls(row) if "google." not in u and "onemap.gov.sg" not in u))
        venues.append({"venueId": row["venueId"], "name": row["name"], "address": row["address"],
                       "diet": row.get("venueDiet"), "hours": row.get("hours"),
                       "hasCover": bool(row.get("cover")), "coverHold": row.get("coverHold"),
                       "hoursHold": row.get("hoursHold"), "prices": row.get("displayPriceCoverage"),
                       "sourceUrls": source_urls[:10], "lastHoursReview": row.get("latestHoursReview")})
    recipe_result = subprocess.run(["node", "-r", str(QT.parent / "tmp/qa/menu-register-ts.cjs"), "-e",
        "const {recipes}=require('./src/data/recipes.ts');process.stdout.write(JSON.stringify(recipes.map(r=>({id:r.id,name:r.name}))));"],
        cwd=QT, text=True, encoding="utf-8", capture_output=True, check=True)
    names = json.loads(recipe_result.stdout)
    if not 1 <= len(names) <= 1000 or len({r['id'] for r in names}) != len(names):
        raise RuntimeError('Recipe baseline identity validation failed')
    ledger = QT / ".local/menu-identity-request-ledger.jsonl"
    return {"checkedAt": readiness["checkedAt"], "catalogueRevision": index["revision"],
            "venues": venues, "recipeNames": names,
            "holds": {"hours": 54, "covers": 1, "unknownPrices": 3387, "foodHolds": 2527},
            "googleLedger": {"requests": 2419, "cap": 2500, "remaining": 81,
                             "sha256": hashlib.sha256(ledger.read_bytes()).hexdigest(), "bytes": ledger.stat().st_size}}


def provision():
    payload = {f.name: base64.b64encode(f.read_bytes()).decode() for f in [HERE / "policy.json", HERE / "workflow.py", HERE / "recipe_policy.py", HERE / "image_worker.py", HERE / "extract_cache.py"]}
    payload["baseline.json"] = base64.b64encode(json.dumps(baseline(), ensure_ascii=False).encode()).decode()
    for name in PROFILES:
        payload[f"roles/{name}.md"] = base64.b64encode((HERE / "roles" / f"{name}.md").read_bytes()).decode()
    for name in ("AGENTS.md", "docs/COOK_READINESS.md", "docs/DEPLOYMENT_RUNBOOK.md", "docs/research/MENU_SOURCE_REGISTER.md", ".codex/menu-sync-handoff-2026-10-16.md", "src/types/food.ts"):
        payload["reference/" + name.replace("/", "__")] = base64.b64encode((QT / name).read_bytes()).decode()
    code = r'''
import base64,hashlib,json,pathlib,yaml,os
from hermes_cli.profiles import create_profile,get_profile_dir,set_profile_display_name
root=pathlib.Path('/opt/data'); target=root/'qt-team'
profiles=PROFILES
payload=PAYLOAD
existing={}
for p in [root,*[x for x in (root/'profiles').iterdir() if (x/'config.yaml').is_file() and x.name not in profiles]]:
 for n in ['config.yaml','.env','SOUL.md']:
  if (p/n).exists():existing[str(p/n)]=hashlib.sha256((p/n).read_bytes()).hexdigest()
if (target/'provision-receipt.json').exists(): raise RuntimeError('QT team is already provisioned; refusing replacement')
for name in profiles:
 p=get_profile_dir(name)
 if p.exists():
  meta=yaml.safe_load((p/'profile.yaml').read_text()) or {}
  if meta.get('display_name') != profiles[name]:raise RuntimeError('Unrelated existing profile: '+name)
target.mkdir(mode=0o755,exist_ok=True)
for name,encoded in payload.items():
 path=target/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(base64.b64decode(encoded));path.chmod(0o444)
for name in ['runs','state','outbox','images']:
 p=target/name;p.mkdir(exist_ok=True);os.chown(p,10000,10000);p.chmod(0o700)
cfg=yaml.safe_load((root/'config.yaml').read_text())
result=[]
for name,title in profiles.items():
 p=get_profile_dir(name)
 if not p.exists():p=create_profile(name,no_alias=True,no_skills=True,description=title+' — QuinTaste source research and reviewed data maintenance')
 set_profile_display_name(name,title)
 c=yaml.safe_load((p/'config.yaml').read_text()) or {}
 c['model']={k:v for k,v in cfg['model'].items() if k in ['default','provider','context_length']}
 c['timezone']='Asia/Singapore'
 c.setdefault('agent',{}).update(reasoning_effort='high',service_tier='normal',max_turns=18,run_budget_seconds=480)  # owner: high effort, normal speed (no priority/fast)
 c['web']={'backend':'firecrawl','search_backend':'openai-native','extract_backend':'qt-evidence'}
 c['plugins']={'enabled':['qt-evidence']}
 c['image_gen']=cfg.get('image_gen',{})
 c['platform_toolsets']={k:['web','qt_team'] for k in ['cli','cron','api_server','telegram','discord','homeassistant']}
 c.setdefault('approvals',{}).update(cron_mode='deny',single_query_mode='deny',unattended_mode='deny')
 c['command_allowlist']=[]
 c.setdefault('cron',{}).update(wrap_response=False,script_timeout_seconds=3000,max_parallel_jobs=1)
 c.setdefault('terminal',{})['cwd']=str(target)
 (p/'config.yaml').write_text(yaml.safe_dump(c,sort_keys=False),encoding='utf-8')
 (p/'SOUL.md').write_bytes((target/'roles'/f'{name}.md').read_bytes())
 plugin=p/'plugins/qt-evidence';plugin.mkdir(parents=True,exist_ok=True)
 (plugin/'plugin.yaml').write_text('name: qt-evidence\nversion: 1.0.0\ndescription: QT bounded source extraction cache\nkind: backend\nprovides_web_providers:\n  - qt-evidence\n')
 (plugin/'__init__.py').write_text("import sys\nsys.path.insert(0,'/opt/data/qt-team')\nfrom extract_cache import register\n")
 for f in p.rglob('*'):
  os.chown(f,10000,10000)
 os.chown(p,10000,10000)
 assert not (p/'auth.json').exists(), 'OAuth store unexpectedly copied'
 assert not any(k+'=' in (p/'.env').read_text() for k in ['TELEGRAM_BOT_TOKEN','API_SERVER_KEY'])
 result.append({'id':name,'displayName':title,'model':c['model'],'tools':['web'],'oauthCopied':False})
manager=get_profile_dir('qt-manager'); scripts=manager/'scripts';scripts.mkdir(exist_ok=True)
script=scripts/'qt-team-daily.py'
script.write_text("import runpy,sys\nsys.argv=['/opt/data/qt-team/workflow.py']\nrunpy.run_path(sys.argv[0],run_name='__main__')\n")
script.chmod(0o444)
assert all(hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h for p,h in existing.items()),'Existing profile changed'
receipt={'profiles':result,'existingProfilesUnchanged':True,'existingHashes':existing,'baseline':json.loads((target/'baseline.json').read_text())['googleLedger']}
(target/'provision-receipt.json').write_text(json.dumps(receipt,indent=2));(target/'provision-receipt.json').chmod(0o444)
print(json.dumps(receipt))
'''.replace("PROFILES", repr(PROFILES)).replace("PAYLOAD", repr(payload))
    # Root only provisions root-owned scripts; agents and all runs execute as uid 10000.
    result = json.loads(remote_container(code, "root"))
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / "provision.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({"created": result["profiles"], "existingProfilesUnchanged": result["existingProfilesUnchanged"]}, indent=2))


def inspect():
    print(remote_container(r'''
import json,pathlib,yaml,shutil,os
root=pathlib.Path('/opt/data');target=root/'qt-team'
result={'profiles':[],'workspaceExists':target.exists(),'freeBytes':shutil.disk_usage(root).free,'uid':os.getuid()}
for name in ['qt-manager','qt-explorer','qt-cooker','qt-event']:
 p=root/'profiles'/name
 if not p.exists(): continue
 c=yaml.safe_load((p/'config.yaml').read_text())
 result['profiles'].append({'id':name,'displayName':yaml.safe_load((p/'profile.yaml').read_text()).get('display_name'),'model':c.get('model'),'tools':c.get('platform_toolsets'),'timezone':c.get('timezone')})
result['latestReport']=json.loads((target/'state/latest-report.json').read_text()) if (target/'state/latest-report.json').exists() else None
result['jobs']=json.loads((root/'profiles/qt-manager/cron/jobs.json').read_text()) if (root/'profiles/qt-manager/cron/jobs.json').exists() else None
print(json.dumps(result,ensure_ascii=False))
'''))


def launch_trial():
    print(helper.remote(r'''
import pathlib,subprocess,json,datetime,os
p=pathlib.Path('/var/lib/hermes-desktop-setup/qt-team');p.mkdir(mode=0o700,exist_ok=True)
log=p/('trial-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.log')
with log.open('w') as out:
 proc=subprocess.Popen(['docker','exec','--user','10000','--workdir','/opt/hermes','hermes-agent-yril-hermes-agent-1','python','/opt/data/qt-team/workflow.py','--trial'],stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
os.chmod(log,0o600)
print(json.dumps({'launcherPid':proc.pid,'log':str(log),'started':True}))
'''))


def schedule():
    code = r'''
import os,json
os.environ['HERMES_HOME']='/opt/data/profiles/qt-manager'
os.environ['HERMES_TIMEZONE']='Asia/Singapore'
from cron.jobs import create_job,list_jobs
existing=[j for j in list_jobs(include_disabled=True) if j.get('name')=='QT Manager daily coordination']
if existing:
 print(json.dumps({'existing':True,'job':existing[0]}))
else:
 job=create_job(prompt='Run the fixed QT team coordinator. Resume due research checkpoints, independently review evidence and images, then publish only validated approved batches through the restricted app adapter. Preserve holds, budgets and checkpoints.',schedule='*/15 1-4 * * *',name='QT Manager daily coordination',script='qt-team-daily.py',no_agent=True,workdir='/opt/data/qt-team',deliver='local')
 print(json.dumps({'created':True,'job':job}))
'''
    print(remote_container(code))


def sync_code():
    payload = {name: base64.b64encode((HERE / name).read_bytes()).decode() for name in ["workflow.py", "recipe_policy.py", "policy.json", "image_worker.py", "extract_cache.py", "resume_trial.py", "publisher.py", "venue_images.py", "learning.py", "learning-policy.json", "night_window.py", "night_supervisor.py", "search_history.py", "telegram_controls.py"]}
    print(remote_container("import pathlib,base64,json\npayload="+repr(payload)+"\nfor name,data in payload.items():\n p=pathlib.Path('/opt/data/qt-team')/name;p.write_bytes(base64.b64decode(data));p.chmod(0o444)\nprint(json.dumps({'updated':list(payload)}))", "root"))


def deploy_review_fix(inspect_only=False):
    """Test and atomically update only the reviewed workflow, preserving all state."""
    import re
    source=(HERE/'workflow.py').read_text(encoding='utf-8')
    original_merge='''def merge_events(previous, records):
    prior = {r['id']: r for r in previous}
    for record in records:
        old = prior.get(record['id'])
        if old or (record.get('event') and record.get('status') == 'proposed'):
            merged = {**(old or {}), **record}
            if old and record.get('status') == 'held':
                merged['previousVerifiedSources'] = old.get('previousVerifiedSources', old.get('sources', []))
            prior[record['id']] = merged
    return list(prior.values())[-120:]
'''
    original=source.replace('import copy\n','',1)
    original=re.sub(r'def validate_stored_event\(record\):.*?(?=def live_health\(\):)',original_merge+'\n\n',original,flags=re.S)
    original=original.replace('    upcoming, incomplete_events = upcoming_events(state.get("upcomingEvents", []))\n    discovery_due = discovery_due or bool(incomplete_events)', '''    upcoming = [e for e in state.get("upcomingEvents", []) if e.get("status") in ("proposed", "held") and e.get('event', {}).get('status') != 'cancelled' and 0 < (dt.datetime.fromisoformat(e["event"]["startsAt"]) - dt.datetime.now(SG)).total_seconds() < 7 * 86400]''')
    original=original.replace('"incompleteSavedEvents": incomplete_events, ','')
    original=original.replace('            merged_events = merge_events(state.get("upcomingEvents", []), packet[\'records\'])\n','')
    original=original.replace('state["upcomingEvents"] = merged_events','state["upcomingEvents"] = merge_events(state.get("upcomingEvents", []), packet[\'records\'])')
    if inspect_only:
        import difflib
        live=base64.b64decode(helper.remote("import base64,pathlib\nprint(base64.b64encode(pathlib.Path('/docker/hermes-agent-yril/data/qt-team/workflow.py').read_bytes()).decode())").strip()).decode()
        print(''.join(difflib.unified_diff(original.splitlines(True),live.splitlines(True),fromfile='reviewed-predecessor',tofile='live-workflow')))
        return
    # Other development (for example publication) may be newer than the live
    # scheduler. Deploy only the reviewed hunks, never an unrelated full file.
    live=base64.b64decode(helper.remote("import base64,pathlib\nprint(base64.b64encode(pathlib.Path('/docker/hermes-agent-yril/data/qt-team/workflow.py').read_bytes()).decode())").strip()).decode().replace('\r\n','\n')
    candidate=live
    event_helpers=source[source.index('def validate_stored_event(record):'):source.index('def live_health():')].rstrip()+'\n'
    old_upcoming='''    upcoming = [e for e in state.get("upcomingEvents", []) if e.get("status") in ("proposed", "held") and e.get('event', {}).get('status') != 'cancelled' and 0 < (dt.datetime.fromisoformat(e["event"]["startsAt"]) - dt.datetime.now(SG)).total_seconds() < 7 * 86400]'''
    hunks=[
        ('import argparse\n','import argparse\nimport copy\n'),
        (original_merge,event_helpers),
        (old_upcoming,'    upcoming, incomplete_events = upcoming_events(state.get("upcomingEvents", []))\n    discovery_due = discovery_due or bool(incomplete_events)'),
        ('"upcoming": upcoming, "organisers":','"upcoming": upcoming, "incompleteSavedEvents": incomplete_events, "organisers":'),
        ('            packets.append(packet)\n            if discovery_due or trial:', '            merged_events = merge_events(state.get("upcomingEvents", []), packet[\'records\'])\n            packets.append(packet)\n            if discovery_due or trial:'),
        ('state["upcomingEvents"] = merge_events(state.get("upcomingEvents", []), packet[\'records\'])','state["upcomingEvents"] = merged_events'),
    ]
    for before,after in hunks:
        if candidate.count(before)!=1:
            raise RuntimeError('Live workflow no longer matches the reviewed event patch')
        candidate=candidate.replace(before,after,1)
    files={'workflow.py':base64.b64encode(candidate.encode()).decode(),
           'test_workflow.py':base64.b64encode((HERE/'test_workflow.py').read_bytes()).decode()}
    expected=hashlib.sha256(live.encode()).hexdigest()
    code='FILES='+repr(files)+'\nEXPECTED='+repr(expected)+'\n'+r'''
import base64,fcntl,hashlib,importlib.util,json,os,pathlib,subprocess,tempfile,time
root=pathlib.Path('/docker/hermes-agent-yril/data/qt-team')
target=root/'workflow.py'
assert hashlib.sha256(target.read_text().encode()).hexdigest()==EXPECTED,'Live workflow differs from the reviewed predecessor; refusing replacement'
test_code='files='+repr(FILES)+'\n'+r"""
import base64,json,pathlib,subprocess,tempfile
folder=pathlib.Path(tempfile.mkdtemp(prefix='qt-review-checks-'))
for name,content in files.items():(folder/name).write_bytes(base64.b64decode(content))
p=subprocess.run(['python','-m','unittest','discover','-s',str(folder),'-p','test_workflow.py'],text=True,capture_output=True)
print(json.dumps({'exit':p.returncode,'report':p.stderr[-2500:]}))
"""
p=subprocess.run(['docker','exec','--user','10000','-i','hermes-agent-yril-hermes-agent-1','python','-'],input=test_code,text=True,capture_output=True,timeout=45)
assert p.returncode==0,'Could not start remote fixture tests'
tests=json.loads(p.stdout)
assert tests['exit']==0,tests['report']
lock=(root/'state/run.lock').open('a+')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
assert hashlib.sha256(target.read_text().encode()).hexdigest()==EXPECTED,'Live workflow changed during preflight'
state_paths=[root/name for name in ['state/checkpoint.json','state/usage.jsonl','baseline.json','policy.json']]
before={str(path):hashlib.sha256(path.read_bytes()).hexdigest() for path in state_paths}
with tempfile.TemporaryDirectory(prefix='qt-review-preflight-') as folder:
 staged=pathlib.Path(folder)/'workflow.py'
 staged.write_bytes(base64.b64decode(FILES['workflow.py']))
 spec=importlib.util.spec_from_file_location('qt_review_preflight',staged)
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 checkpoint=json.loads((root/'state/checkpoint.json').read_text())
 module.merge_events(checkpoint.get('upcomingEvents',[]),[])
backup=pathlib.Path('/var/lib/hermes-desktop-setup')/time.strftime('qt-review-fixes-%Y%m%dT%H%M%SZ',time.gmtime())
backup.mkdir(mode=0o700)
saved=backup/'workflow.py'
saved.write_bytes(target.read_bytes());saved.chmod(0o600)
info=target.stat()
temp=target.with_name('workflow.review-tmp.py')
with temp.open('wb') as stream:
 stream.write(base64.b64decode(FILES['workflow.py']));stream.flush();os.fsync(stream.fileno())
os.chown(temp,info.st_uid,info.st_gid);os.chmod(temp,info.st_mode & 0o777)
os.replace(temp,target)
after={str(path):hashlib.sha256(path.read_bytes()).hexdigest() for path in state_paths}
assert before==after,'Workflow data changed unexpectedly'
print(json.dumps({'deployed':True,'workflow_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
 'state_and_budgets_preserved':True,'existing_event_metadata_valid':True,'fixture_tests':tests['report'].strip(),
 'backup':str(backup)},indent=2))
'''
    print(helper.remote(code))


def collect():
    payload = json.loads(remote_container(r'''
import json,pathlib,base64
root=pathlib.Path('/opt/data/qt-team'); files=[]
for n in ['state/latest-report.json','state/checkpoint.json','state/usage.jsonl','state/scheduler-probe.json','state/cache-acceptance.json','state/code-acceptance.json','state/acceptance-repair.json','state/recipe-identity-acceptance.json','state/final-acceptance.json','provision-receipt.json']:
 if (root/n).is_file():files.append(root/n)
files += list((root/'runs').glob('*/report.*')) + list((root/'runs').glob('*/recovery.json')) + list((root/'runs').glob('*/*/receipt.json')) + list((root/'runs').glob('*/*/validated.json')) + list((root/'outbox').glob('*.json')) + list((root/'images').glob('*/result.json')) + list((root/'images').glob('*/visual-review.json')) + list((root/'images').glob('*/interruption.json')) + list((root/'images').glob('*/candidate.jpg'))
print(json.dumps({str(p.relative_to(root)):base64.b64encode(p.read_bytes()).decode() for p in files}))
'''))
    for name, data in payload.items():
        p = EVIDENCE / "production" / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(base64.b64decode(data))
    print(json.dumps({"files": len(payload), "evidence": str(EVIDENCE / "production")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["provision", "inspect", "trial", "schedule", "sync-code", "collect", "deploy-review-fix", "inspect-review-fix"])
    args = parser.parse_args()
    {"provision": provision, "inspect": inspect, "trial": launch_trial, "schedule": schedule, "sync-code": sync_code, "collect": collect, "deploy-review-fix": deploy_review_fix, "inspect-review-fix": lambda: deploy_review_fix(inspect_only=True)}[args.action]()
