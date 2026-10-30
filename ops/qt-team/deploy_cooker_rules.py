"""QT Cooker's new setup (owner, 28 Oct 2026; docs/RECIPE_SOURCING_PLAN.md): the owner's rulebook learned from the 32 recipes
deleted in admin (recipe_charter.py/json), the nutrient level and colour dish from international standards (recipe_standards.py),
the star rating made optional, the v3 nutrition table with vitamins, minerals, colours and grains from USDA SR Legacy and Taiwan FDA
(nutrition.py, nutrition_sg.json, built by scripts/nutrition/build_bot_v3.py), the publisher accepting content-checked recipes,
Cooker's shortlist and writing prompts, and the Cooker and Manager role files (their Hermes SOUL.md).

Guarded like deploy_veg_kitchen.py: waits for the run lock, takes the reporter lock, pauses the Telegram listener, refuses when a
live file is not the version this change was made from (git HEAD) or already this version, backs up under operator-tests, runs the
unit suite on the VPS and restores every file on failure. Never changes policy.json, the checkpoint (QT Cooker's pause lives there),
the usage ledger or publication state. Deploying does not resume QT Cooker.

    python -X utf8 deploy_cooker_rules.py
"""
import base64
import hashlib
import subprocess
import sys
import time
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['recipe_quality.py', 'recipe_charter.py', 'recipe_charter.json', 'recipe_standards.py', 'recipe_page.py', 'nutrition.py', 'nutrition_sg.json',
         'publisher.py', 'workflow.py', 'roles/qt-cooker.md', 'roles/qt-manager.md', 'learning.py']
TESTS = ['test_workflow', 'test_creator_scout', 'test_publisher', 'test_telegram_reporter', 'test_learning', 'test_night_controls', 'test_recipe_policy',
         'test_publication_delivery', 'test_menu_coverage', 'test_outlet_capture', 'test_gamer']

code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,time
r=pathlib.Path('/opt/data/qt-team');payload=__QT_PAYLOAD__;base=__QT_BASE__
for attempt in range(20):
 work=(r/'state/run.lock').open('a+')
 try:fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);break
 except BlockingIOError:work.close();time.sleep(4)
else:raise SystemExit('Run lock busy; nothing changed')
with work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(report,fcntl.LOCK_EX)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/('operator-tests/cooker-rules-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
 souls={x:r.parent/'profiles'/x/'SOUL.md' for x in ('qt-cooker','qt-manager')}
 for x,soul in souls.items():(backup/(x+'-SOUL.md')).write_bytes(soul.read_bytes())
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json','state/publication-outcomes.json']
 before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()}
 created=[]
 for n,data in payload.items():
  p=r/n;new=hashlib.sha256(base64.b64decode(data)).hexdigest()
  if n.endswith('.py'):compile(base64.b64decode(data),n,'exec')
  if p.exists():
   live=hashlib.sha256(p.read_bytes()).hexdigest()
   assert live in base.get(n,[])+[new],'Live '+n+' is not the version this change was made from; nothing changed'
   (backup/n.replace('/','__')).write_bytes(p.read_bytes())
  else:created.append(n)
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix(p.suffix+'.cr-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.cr-new');tmp.write_bytes((r/'roles'/(x+'.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  test=subprocess.run(['python','-m','unittest']+__QT_TESTS__,cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; files restored'
  imported=subprocess.run(['python','-c','import json,recipe_quality,recipe_charter,recipe_standards,nutrition,publisher,workflow;'
    't=nutrition.table(workflow.ROOT);c=recipe_charter.load(workflow.ROOT);'
    'print("ok",len(t["foods"]),"foods",c["version"],c["allowedCategories"])'],cwd=r,capture_output=True,text=True,user=10000,group=10000)
  assert imported.stdout.startswith('ok'),'Import check failed: '+imported.stderr[-300:]
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected if (r/n).exists()},'Protected file changed'
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  tmp=marker.with_suffix('.cr-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in payload:
   p=r/n
   if n in created:p.unlink(missing_ok=True);continue
   tmp=p.with_suffix(p.suffix+'.restore');tmp.write_bytes((backup/n.replace('/','__')).read_bytes());tmp.chmod(0o444);os.replace(tmp,p)
  for x,soul in souls.items():
   tmp=soul.with_suffix('.restore');tmp.write_bytes((backup/(x+'-SOUL.md')).read_bytes());os.chown(tmp,10000,10000);tmp.chmod(0o444);os.replace(tmp,soul)
  raise
 cooldown=json.loads((r/'state/checkpoint.json').read_text()).get('roleCooldown',{}).get('qt-cooker')
 tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
 print(json.dumps({'files':list(payload),'created':created,'import':imported.stdout.strip(),'tests':tail,'protectedUnchanged':True,
                   'cookerPause':cooldown,'backup':str(backup)}))
'''.replace('__QT_TESTS__', repr(TESTS))

PROBE = r'''
import fcntl,time
for _ in range(20):
    with open('/opt/data/qt-team/state/run.lock','a+') as f:
        try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(f,fcntl.LOCK_UN);print('free');break
        except BlockingIOError:pass
    time.sleep(4)
else:print('busy')
'''


CRLF, LF = bytes([13, 10]), bytes([10])


def base_hashes():
    """sha256 of each file as committed (git HEAD), with LF or CRLF line endings (past deploys copied Windows working files):
    the only live versions this change may replace."""
    out = {}
    for name in NAMES:
        shown = subprocess.run(['git', 'show', 'HEAD:ops/qt-team/' + name], cwd=HERE, capture_output=True)
        if shown.returncode == 0:
            lf = shown.stdout.replace(CRLF, LF)
            out[name] = [hashlib.sha256(lf).hexdigest(), hashlib.sha256(lf.replace(LF, CRLF)).hexdigest()]
    return out


def build():
    payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
    for name, data in payload.items():
        if name.endswith('.py'):
            compile(base64.b64decode(data), name, 'exec')
    # Placeholders contain '_', which base64 never produces, so no payload text can be replaced by mistake.
    return code.replace('__QT_BASE__', repr(base_hashes())).replace('__QT_PAYLOAD__', repr(payload))


if __name__ == '__main__':
    if len(sys.argv) > 1:
        raise SystemExit(__doc__)
    remote = build()
    for attempt in range(45):  # up to ~70 min; ticks hold the lock, with gaps between ticks
        if setup.remote_container(PROBE).strip().endswith('free'):
            break
        time.sleep(15)
    else:
        raise SystemExit('Run lock stayed busy (a tick is running); nothing changed')
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:
        print(setup.remote_container(remote, 'root'))
    finally:
        print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
