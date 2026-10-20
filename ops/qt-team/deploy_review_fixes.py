"""Guarded 18 Oct code-review fixes: outlet-proof verification for StoreID storefronts, value-based
shared-page check, capture back-offs and settle logic, Chrome engine pin, and removal of the
unrequested test_browser_guard.py. Run deploy_browser_guard.py afterwards for the policy paths."""
import base64
from pathlib import Path
import setup

HERE = Path(__file__).resolve().parent
NAMES = ['menu_coverage.py', 'outlet_capture.py', 'test_menu_coverage.py', 'test_outlet_capture.py']
REMOVE = ['test_browser_guard.py']
PROFILES = ['qt-manager', 'qt-explorer', 'qt-cooker', 'qt-event']
payload = {n: base64.b64encode((HERE / n).read_bytes()).decode() for n in NAMES}
code = r'''
import pathlib,json,fcntl,hashlib,base64,os,subprocess,datetime,shutil,yaml
r=pathlib.Path('/opt/data/qt-team');payload=PAYLOAD;remove=REMOVE;profiles=PROFILES
with (r/'state/run.lock').open('a+') as work,(r/'state/telegram/reporter.lock').open('a+') as report:
 fcntl.flock(work,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(report,fcntl.LOCK_EX|fcntl.LOCK_NB)
 marker=r/'night-release.json';release=json.loads(marker.read_text())
 backup=r/'operator-tests/review-fixes-20261018';backup.mkdir(mode=0o700)
 protected=['policy.json','baseline.json','state/usage.jsonl','state/checkpoint.json','state/latest-publication.json'];before={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
 for n in list(payload)+remove:
  p=r/n
  if n in payload:compile(base64.b64decode(payload[n]),n,'exec')
  if n in release['hashes']:assert hashlib.sha256(p.read_bytes()).hexdigest()==release['hashes'][n],'Concurrent change '+n
  else:assert not p.exists(),'Unexpected file '+n
  if p.exists():(backup/n).write_bytes(p.read_bytes())
 (backup/'night-release.json').write_bytes(marker.read_bytes())
 try:
  for n,data in payload.items():
   p=r/n;tmp=p.with_suffix('.review-new');tmp.write_bytes(base64.b64decode(data));tmp.chmod(0o444);os.replace(tmp,p)
  for n in remove:(r/n).unlink()
  test=subprocess.run(['python','-m','unittest','test_workflow','test_publisher','test_telegram_reporter','test_learning','test_night_controls','test_recipe_policy','test_publication_delivery','test_menu_coverage','test_outlet_capture'],cwd=r,capture_output=True,text=True)
  (backup/'tests.txt').write_text(test.stdout+test.stderr);assert test.returncode==0,'Tests failed; code restored'
  assert before=={n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in protected}
  release['hashes'].update({n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in payload})
  for n in remove:release['hashes'].pop(n,None)
  tmp=marker.with_suffix('.review-new');tmp.write_text(json.dumps(release,indent=2));tmp.chmod(0o444);os.replace(tmp,marker)
 except Exception:
  for n in list(payload)+remove:
   old=backup/n
   if old.exists():
    tmp=(r/n).with_suffix('.restore');tmp.write_bytes(old.read_bytes());tmp.chmod(0o444);os.replace(tmp,r/n)
   elif (r/n).exists():(r/n).unlink()
  raise
# Pin the guarded Chrome engine (never auto/lightpanda) for the QT profiles and every new hermes process.
pins={}
for x in profiles:
 p=r.parent/'profiles'/x/'config.yaml';text=p.read_text();cfg=yaml.safe_load(text)
 if (cfg.get('browser') or {}).get('engine')=='chrome':pins[x]='already';continue
 assert 'browser' not in cfg,'Unexpected browser section in '+x
 new=text.rstrip('\n')+'\nbrowser:\n  engine: chrome\n';after=yaml.safe_load(new)
 assert {k:v for k,v in after.items() if k!='browser'}=={k:v for k,v in cfg.items()} and after['browser']=={'engine':'chrome'}
 bak=p.with_name('config.yaml.before-engine-20261018')
 if not bak.exists():shutil.copy2(p,bak)
 tmp=p.with_suffix('.yaml.new');tmp.write_text(new);shutil.copymode(p,tmp);os.replace(tmp,p);pins[x]='pinned'
env=pathlib.Path('/opt/data/.env');raw=env.read_bytes()
if b'AGENT_BROWSER_ENGINE' not in [l.split(b'=',1)[0].strip() for l in raw.splitlines() if b'=' in l]:
 with env.open('ab') as f:f.write((b'' if raw.endswith(b'\n') else b'\n')+b'AGENT_BROWSER_ENGINE=chrome\n')
 pins['env']='appended'
tail=[l for l in (backup/'tests.txt').read_text().splitlines() if l.startswith(('Ran ','OK','FAILED'))]
print(json.dumps({'files':list(payload),'removed':remove,'tests':tail,'protectedUnchanged':True,'pins':pins,'backup':str(backup),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
'''.replace('PAYLOAD', repr(payload)).replace('REMOVE', repr(REMOVE)).replace('PROFILES', repr(PROFILES))

if __name__ == '__main__':
    print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','stop','qt-telegram-listener.service'],check=True);print('Listener paused for reload')"))
    try:print(setup.remote_container(code, 'root'))
    finally:print(setup.helper.remote("import subprocess;subprocess.run(['systemctl','start','qt-telegram-listener.service'],check=True);print(subprocess.check_output(['systemctl','is-active','qt-telegram-listener.service']).decode().strip())"))
